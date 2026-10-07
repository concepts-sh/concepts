#!/usr/bin/env node
// concepts: init, check, wiki.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { check } from "./check";
import { init } from "./init";
import { wiki, type WikiOptions } from "./wiki";

const argv = process.argv.slice(2);
const flags: WikiOptions = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out") { flags.out = resolve(argv[i + 1]); argv.splice(i, 2); i--; }
  else if (argv[i] === "--no-open") { flags.noOpen = true; argv.splice(i, 1); i--; }
  else if (argv[i] === "--public") { flags.public = true; argv.splice(i, 1); i--; }
}
const [cmd, arg] = argv;
const root = process.cwd();

function baseOrExit(): string {
  const base = resolve(arg || join(root, ".concepts"));
  if (!existsSync(base)) { console.error(`no base at ${base}`); process.exit(2); }
  return base;
}

if (cmd === "check") {
  const { errors, warnings, count } = check(baseOrExit());
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`error: ${e}`);
  console.log(`${count} concepts, ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
} else if (cmd === "init") {
  const made = init(root);
  console.log(made.length ? `created: ${made.join(", ")}` : "nothing to do");
  console.log("Next: ask your agent to set up concepts.");
} else if (cmd === "wiki") {
  const r = wiki(baseOrExit(), flags);
  console.log(`${r.count} concepts, ${r.errors} errors → ${r.out}`);
} else {
  console.log("usage: concepts <init | check [path] | wiki [path] [--out file] [--no-open] [--public]>");
  process.exit(cmd ? 2 : 0);
}
