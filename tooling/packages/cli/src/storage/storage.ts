/**
 * Storage abstraction.
 *
 * Everything that touches the filesystem goes through this interface so the rest of
 * the codebase stays testable and replaceable (e.g. an in-memory storage in tests,
 * or a remote storage later). Keep it small and intention-revealing.
 */

export interface Storage {
  exists(path: string): Promise<boolean>;
  /** Create a directory (and parents). No error if it already exists. */
  ensureDir(path: string): Promise<void>;
  /** Names of the subdirectories of `path`. Empty when `path` does not exist. */
  listDirs(path: string): Promise<readonly string[]>;
  /**
   * Relative paths of all files under `path`, recursively (e.g. template trees).
   * Empty when `path` does not exist.
   */
  listFiles(path: string): Promise<readonly string[]>;
  readFile(path: string): Promise<string>;
  /**
   * Write a file. If `overwrite` is false and the file exists, the write is skipped
   * and `false` is returned. Returns `true` when the file was written.
   */
  writeFile(
    path: string,
    contents: string,
    options?: { overwrite?: boolean },
  ): Promise<boolean>;
  /** Delete a file. No error if it does not exist. */
  removeFile(path: string): Promise<void>;
}
