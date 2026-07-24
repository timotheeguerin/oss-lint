import pc from "picocolors";

import type { Diagnostic, LintResult } from "../engine/index.js";

export type ReporterFormat = "pretty" | "json";

function formatLocation(diagnostic: Diagnostic): string {
  const loc = diagnostic.location;
  if (!loc) {
    return "";
  }
  const parts = [loc.file];
  if (loc.line !== undefined) {
    parts.push(String(loc.line));
    if (loc.column !== undefined) {
      parts.push(String(loc.column));
    }
  }
  return parts.join(":");
}

function pretty(result: LintResult): string {
  if (result.diagnostics.length === 0) {
    return pc.green("✔ No problems found");
  }

  const lines = result.diagnostics.map((d) => {
    const badge = d.severity === "error" ? pc.red("error") : pc.yellow("warning");
    const where = formatLocation(d);
    const prefix = where ? `${pc.dim(where)} ` : "";
    return `  ${prefix}${badge} ${d.message} ${pc.dim(d.ruleId)}`;
  });

  const summary = `${result.errorCount} error(s), ${result.warningCount} warning(s)`;
  return [...lines, "", result.errorCount > 0 ? pc.red(summary) : pc.yellow(summary)].join("\n");
}

/** Render a lint result in the requested format. */
export function formatResult(result: LintResult, format: ReporterFormat): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }
  return pretty(result);
}
