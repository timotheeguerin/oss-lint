import { describe, expect, it } from "vitest";

import { lint } from "./run.js";
import type { RepoContext, Rule } from "./types.js";

const fakeRepo: RepoContext = {
  root: "/fake",
  readFile: async () => "",
  exists: async () => false,
  glob: async () => [],
};

describe("lint engine", () => {
  it("returns no diagnostics when there are no rules", async () => {
    const result = await lint(fakeRepo, []);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it("collects diagnostics reported by a rule and tags them with rule id and severity", async () => {
    const rule: Rule = {
      id: "sample-rule",
      description: "reports one problem",
      defaultSeverity: "error",
      check: ({ report }) => {
        report({ severity: "error", message: "boom", location: { file: "a.txt" } });
      },
    };

    const result = await lint(fakeRepo, [rule]);
    expect(result.errorCount).toBe(1);
    expect(result.diagnostics[0]).toMatchObject({ ruleId: "sample-rule", severity: "error", message: "boom" });
  });

  it("skips rules configured as off", async () => {
    const rule: Rule = {
      id: "sample-rule",
      description: "reports one problem",
      defaultSeverity: "error",
      check: ({ report }) => report({ severity: "error", message: "boom" }),
    };

    const result = await lint(fakeRepo, [rule], { rules: { "sample-rule": { severity: "off" } } });
    expect(result.diagnostics).toHaveLength(0);
  });
});
