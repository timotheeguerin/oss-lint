import type { Rule } from "../engine/types.js";

/**
 * Built-in rule registry.
 *
 * Rules are intentionally not implemented yet — this scaffold only establishes
 * the engine and CLI. Add rules here as they are implemented, e.g.
 * `lockfile-registry-allowed`, `npmrc-registry-allowed`, `npmrc-no-credentials`.
 */
export const builtinRules: readonly Rule[] = [];

/** Look up a built-in rule by id. */
export function getRule(id: string): Rule | undefined {
  return builtinRules.find((rule) => rule.id === id);
}
