#!/usr/bin/env node
/** Validate MAP schema fixtures and repository manifests without network access. */

import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

type JsonSchema = boolean | Record<string, unknown>;

const WORKSPACE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA_ROOT = join(WORKSPACE_ROOT, "library/schemas");
const DRAFT = "https://json-schema.org/draft/2020-12/schema";

interface Contract {
  readonly name: string;
  readonly schema: string;
  readonly fixtures: string;
}

const CONTRACTS: readonly Contract[] = [
  { name: "document", schema: "document.schema.json", fixtures: "document" },
  { name: "project", schema: "project.schema.json", fixtures: "project" },
];

const failures: string[] = [];

for (const contract of CONTRACTS) {
  const schemaPath = join(SCHEMA_ROOT, contract.schema);
  const schema = await readJson(schemaPath) as Record<string, unknown>;
  if (schema.$schema !== DRAFT) {
    failures.push(`${display(schemaPath)}: $schema must be ${DRAFT}`);
    continue;
  }

  const fixtureRoot = join(SCHEMA_ROOT, "fixtures", contract.fixtures);
  const validPaths = await jsonFiles(join(fixtureRoot, "valid"));
  const invalidPaths = await jsonFiles(join(fixtureRoot, "invalid"));
  if (validPaths.length === 0 || invalidPaths.length < 3) {
    failures.push(`${display(fixtureRoot)}: requires valid and at least three invalid fixtures`);
  }

  for (const fixturePath of validPaths) {
    const errors = validate(await readJson(fixturePath), schema, schema);
    if (errors.length > 0) {
      failures.push(`${display(fixturePath)}: expected valid; ${withRemediation(errors[0]!)}`);
    }
  }
  for (const fixturePath of invalidPaths) {
    const errors = validate(await readJson(fixturePath), schema, schema);
    if (errors.length === 0) {
      failures.push(`${display(fixturePath)}: expected invalid; add a failing field`);
    }
  }
}

const projectSchema = await readJson(join(SCHEMA_ROOT, "project.schema.json")) as Record<string, unknown>;
for (const [name, value] of [
  [".map/map.config.json", await readJson(join(WORKSPACE_ROOT, ".map/map.config.json"))],
  ["tooling/packages/cli/templates/workspace/map.config.json", await renderedInitConfig()],
] as const) {
  const errors = validate(value, projectSchema, projectSchema);
  if (errors.length > 0) failures.push(`${name}: ${withRemediation(errors[0]!)}`);
}

if (failures.length > 0) {
  failures.forEach((failure) => process.stderr.write(`error: ${failure}\n`));
  process.stderr.write(`schema validation failed with ${failures.length} error(s).\n`);
  process.exit(1);
}

process.stdout.write(`schemas OK: ${CONTRACTS.length} contracts, repository and init manifests valid.\n`);

function validate(
  value: unknown,
  schema: JsonSchema,
  root: Record<string, unknown>,
  path = "$",
): string[] {
  if (schema === true) return [];
  if (schema === false) return [`${path} is not allowed`];

  const reference = schema.$ref;
  if (typeof reference === "string") {
    return validate(value, resolveReference(reference, root), root, path);
  }

  const errors: string[] = [];
  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach((candidate) => errors.push(...validate(value, candidate as JsonSchema, root, path)));
  }
  for (const keyword of ["anyOf", "oneOf"] as const) {
    const candidates = schema[keyword];
    if (!Array.isArray(candidates)) continue;
    const matches = candidates.filter(
      (candidate) => validate(value, candidate as JsonSchema, root, path).length === 0,
    ).length;
    if ((keyword === "anyOf" && matches === 0) || (keyword === "oneOf" && matches !== 1)) {
      errors.push(`${path} must match ${keyword === "anyOf" ? "at least" : "exactly"} one allowed shape`);
    }
  }

  if (schema.const !== undefined && !deepEqual(value, schema.const)) {
    errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => deepEqual(value, item))) {
    errors.push(`${path} must be one of ${schema.enum.map(String).join(", ")}`);
  }

  const expectedType = schema.type;
  if (typeof expectedType === "string" && !matchesType(value, expectedType)) {
    errors.push(`${path} must be ${expectedType}`);
    return errors;
  }

  if (typeof value === "string") validateString(value, schema, path, errors);
  if (typeof value === "number") validateNumber(value, schema, path, errors);
  if (Array.isArray(value)) validateArray(value, schema, root, path, errors);
  if (isRecord(value)) validateObject(value, schema, root, path, errors);
  return errors;
}

function validateString(
  value: string,
  schema: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (typeof schema.minLength === "number" && value.length < schema.minLength) {
    errors.push(`${path} must contain at least ${schema.minLength} character(s)`);
  }
  if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) {
    errors.push(`${path} must match ${schema.pattern}`);
  }
  if (schema.format === "date-time" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
    errors.push(`${path} must be an RFC 3339 UTC timestamp`);
  }
}

function validateNumber(
  value: number,
  schema: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (typeof schema.minimum === "number" && value < schema.minimum) {
    errors.push(`${path} must be >= ${schema.minimum}`);
  }
  if (typeof schema.maximum === "number" && value > schema.maximum) {
    errors.push(`${path} must be <= ${schema.maximum}`);
  }
}

function validateArray(
  value: unknown[],
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (typeof schema.minItems === "number" && value.length < schema.minItems) {
    errors.push(`${path} must contain at least ${schema.minItems} item(s)`);
  }
  if (schema.uniqueItems === true && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) {
    errors.push(`${path} must contain unique items`);
  }
  if (schema.items !== undefined) {
    value.forEach((item, index) => {
      errors.push(...validate(item, schema.items as JsonSchema, root, `${path}[${index}]`));
    });
  }
}

function validateObject(
  value: Record<string, unknown>,
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (typeof schema.minProperties === "number" && Object.keys(value).length < schema.minProperties) {
    errors.push(`${path} must contain at least ${schema.minProperties} field(s)`);
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  required.forEach((key) => {
    if (typeof key === "string" && !(key in value)) errors.push(`${path}.${key} is required`);
  });

  const properties = isRecord(schema.properties) ? schema.properties : {};
  const patterns = isRecord(schema.patternProperties) ? schema.patternProperties : {};
  for (const [key, item] of Object.entries(value)) {
    if (key in properties) {
      errors.push(...validate(item, properties[key] as JsonSchema, root, `${path}.${key}`));
      continue;
    }
    const matching = Object.entries(patterns).filter(([pattern]) => new RegExp(pattern, "u").test(key));
    if (matching.length > 0) {
      matching.forEach(([, candidate]) => {
        errors.push(...validate(item, candidate as JsonSchema, root, `${path}.${key}`));
      });
      continue;
    }
    if (schema.additionalProperties === false) errors.push(`${path}.${key} is not allowed`);
  }
}

function resolveReference(reference: string, root: Record<string, unknown>): JsonSchema {
  if (!reference.startsWith("#/")) throw new Error(`unsupported external schema reference: ${reference}`);
  let current: unknown = root;
  for (const encoded of reference.slice(2).split("/")) {
    const key = encoded.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isRecord(current) || !(key in current)) throw new Error(`unresolved schema reference: ${reference}`);
    current = current[key];
  }
  if (typeof current !== "boolean" && !isRecord(current)) {
    throw new Error(`schema reference is not a schema: ${reference}`);
  }
  return current;
}

function matchesType(value: unknown, type: string): boolean {
  if (type === "object") return isRecord(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function jsonFiles(path: string): Promise<string[]> {
  return (await readdir(path, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(path, entry.name))
    .sort();
}

async function renderedInitConfig(): Promise<unknown> {
  const path = join(WORKSPACE_ROOT, "tooling/packages/cli/templates/workspace/map.config.json");
  const values: Readonly<Record<string, unknown>> = {
    schemaVersion: 3,
    projectName: "schema-fixture",
    createdAt: "2026-09-13T08:00:00.000Z",
    languages: ["typescript"],
    analyzers: ["typescript"],
    include: ["src/**"],
    exclude: ["**/node_modules/**"],
  };
  let source = await readFile(path, "utf8");
  for (const [key, value] of Object.entries(values)) {
    source = source.replaceAll(`{{${key}}}`, JSON.stringify(value));
  }
  return JSON.parse(source);
}

function display(path: string): string {
  return relative(WORKSPACE_ROOT, path);
}

function withRemediation(error: string): string {
  return `${error}; update that field to match the linked schema guide or prefix experimental metadata with 'x-'`;
}
