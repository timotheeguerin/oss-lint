import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import { globby } from "globby";

import type { RepoContext } from "./types.js";

/** Node.js-backed {@link RepoContext} rooted at a directory on disk. */
export function createNodeRepoContext(root: string): RepoContext {
  const absoluteRoot = resolve(root);
  const toAbsolute = (relativePath: string): string =>
    isAbsolute(relativePath) ? relativePath : join(absoluteRoot, relativePath);

  return {
    root: absoluteRoot,
    readFile: (relativePath) => readFile(toAbsolute(relativePath), "utf8"),
    exists: (relativePath) => Promise.resolve(existsSync(toAbsolute(relativePath))),
    glob: (patterns) =>
      globby(patterns as string | string[], {
        cwd: absoluteRoot,
        gitignore: true,
        dot: true,
      }),
  };
}
