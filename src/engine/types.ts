/** Severity levels a rule can report. */
export type Severity = "error" | "warning" | "off";

/** A location within a file where a diagnostic was found. */
export interface DiagnosticLocation {
  /** Path to the file, relative to the repo root. */
  readonly file: string;
  /** 1-based line number, when known. */
  readonly line?: number;
  /** 1-based column number, when known. */
  readonly column?: number;
}

/** A single problem reported by a rule. */
export interface Diagnostic {
  /** Id of the rule that produced this diagnostic. */
  readonly ruleId: string;
  readonly severity: Exclude<Severity, "off">;
  readonly message: string;
  readonly location?: DiagnosticLocation;
}

/**
 * Read-only view of the repository a rule operates on. The context is shared
 * across rules so that expensive parsing can be cached and reused.
 */
export interface RepoContext {
  /** Absolute path to the repository root being linted. */
  readonly root: string;
  /** Read a file relative to {@link RepoContext.root}. Rejects if missing. */
  readFile(relativePath: string): Promise<string>;
  /** Return true if a file/directory exists relative to the repo root. */
  exists(relativePath: string): Promise<boolean>;
  /** Glob for files relative to the repo root (respecting .gitignore). */
  glob(patterns: string | readonly string[]): Promise<string[]>;
}

/** Options passed to a rule, validated against the rule's schema. */
export type RuleOptions = Record<string, unknown>;

/** A collector rules push diagnostics into. */
export interface RuleReporter {
  report(diagnostic: Omit<Diagnostic, "ruleId">): void;
}

/** Everything a rule receives when it runs. */
export interface RuleCheckContext {
  readonly repo: RepoContext;
  readonly options: RuleOptions;
  readonly report: RuleReporter["report"];
}

/** A single lint rule. Rules are pure functions over the {@link RepoContext}. */
export interface Rule {
  /** Stable, unique rule id (kebab-case), e.g. `lockfile-registry-allowed`. */
  readonly id: string;
  /** Short human-readable description of what the rule enforces. */
  readonly description: string;
  /** Default severity when enabled without an explicit level. */
  readonly defaultSeverity: Exclude<Severity, "off">;
  /** Run the rule and report diagnostics via {@link RuleCheckContext.report}. */
  check(context: RuleCheckContext): Promise<void> | void;
}
