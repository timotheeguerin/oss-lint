import type { Diagnostic, RepoContext, Rule, RuleOptions, Severity } from "./types.js";

/** Per-rule configuration entry. */
export interface RuleConfig {
  readonly severity?: Severity;
  readonly options?: RuleOptions;
}

/** Resolved configuration for a lint run. */
export interface LintConfig {
  /** Map of ruleId -> configuration. Absent rules run with their defaults. */
  readonly rules?: Readonly<Record<string, RuleConfig>>;
}

export interface LintResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly errorCount: number;
  readonly warningCount: number;
}

/**
 * Run the given rules against a repo context and collect diagnostics.
 * Rule logic itself lives in each {@link Rule}; this is the engine plumbing.
 */
export async function lint(repo: RepoContext, rules: readonly Rule[], config: LintConfig = {}): Promise<LintResult> {
  const diagnostics: Diagnostic[] = [];

  for (const rule of rules) {
    const ruleConfig = config.rules?.[rule.id];
    const severity: Severity = ruleConfig?.severity ?? rule.defaultSeverity;
    if (severity === "off") {
      continue;
    }

    await rule.check({
      repo,
      options: ruleConfig?.options ?? {},
      report: (diagnostic) => {
        diagnostics.push({ ...diagnostic, ruleId: rule.id, severity });
      },
    });
  }

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;
  return { diagnostics, errorCount, warningCount };
}
