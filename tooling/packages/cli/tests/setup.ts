/**
 * Pins the registry source for the whole suite: tests must not depend on the
 * developer's user cache (~/.map/registry.json) or the network, so they always
 * read the snapshot bundled with the package.
 */

import { join } from "node:path";

process.env["MAP_REGISTRY"] = join(
  import.meta.dirname,
  "..",
  "registry-snapshot",
  "registry.json",
);
