import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { createNodeRepoContext, lint } from "../engine/index.js";
import { formatResult, type ReporterFormat } from "../reporters/index.js";
import { builtinRules } from "../rules/index.js";

process.setSourceMapsEnabled(true);

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(resolve(here, "../../package.json"), "utf8")) as { version: string };

async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .scriptName("oss-lint")
    .strict()
    .help()
    .showHelpOnFail(false)
    .version(pkg.version)
    .command(
      "$0 [dir]",
      "Lint a repository for open-source good practices",
      (cmd) =>
        cmd
          .positional("dir", {
            type: "string",
            description: "Directory to lint",
            default: ".",
          })
          .option("format", {
            type: "string",
            choices: ["pretty", "json"] as const,
            description: "Output format",
            default: "pretty" as ReporterFormat,
          }),
      async (args) => {
        const repo = createNodeRepoContext(resolve(args.dir));
        const result = await lint(repo, builtinRules);
        // eslint-disable-next-line no-console
        console.log(formatResult(result, args.format as ReporterFormat));
        process.exitCode = result.errorCount > 0 ? 1 : 0;
      },
    )
    .parseAsync();
}

await main();
