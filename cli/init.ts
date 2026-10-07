// init: the folder, the map, the AGENTS.md block, and the skill in every agent's folder.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const AGENTS_BLOCK = `## Concepts

Read \`.concepts/index.md\` before you work on domain logic. Open a concept file when a task touches the concept. Follow the concepts skill to add or change concepts.
`;

export function init(root: string): string[] {
  const made: string[] = [];
  const base = join(root, ".concepts");
  if (!existsSync(base)) { mkdirSync(base, { recursive: true }); made.push(".concepts/"); }
  const map = join(base, "index.md");
  if (!existsSync(map)) { writeFileSync(map, "# Concepts\n"); made.push(".concepts/index.md"); }

  const agents = join(root, "AGENTS.md");
  const current = existsSync(agents) ? readFileSync(agents, "utf8") : "";
  if (!current.includes("## Concepts")) {
    writeFileSync(agents, (current ? current.replace(/\s*$/, "\n\n") : "") + AGENTS_BLOCK);
    made.push(current ? "AGENTS.md (block added)" : "AGENTS.md");
  }
  const claude = join(root, "CLAUDE.md");
  if (existsSync(claude)) {
    const t = readFileSync(claude, "utf8");
    if (!t.includes("@.concepts/index.md")) { writeFileSync(claude, t.replace(/\s*$/, "\n") + "\n@.concepts/index.md\n"); made.push("CLAUDE.md (import added)"); }
  }

  // The skill ships with this package: copied into .agents/skills/, linked from the folders Claude Code and Cursor read.
  const skillSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "concepts");
  const skillDst = join(root, ".agents", "skills", "concepts");
  if (existsSync(skillSrc) && !existsSync(skillDst)) { copyDir(skillSrc, skillDst); made.push(".agents/skills/concepts/"); }
  if (existsSync(skillDst)) {
    for (const agentDir of [".claude", ".cursor"]) {
      const linkDir = join(root, agentDir, "skills");
      const link = join(linkDir, "concepts");
      if (existsSync(link)) continue;
      mkdirSync(linkDir, { recursive: true });
      try { symlinkSync(relative(linkDir, skillDst), link, "dir"); } catch { copyDir(skillDst, link); }
      made.push(`${agentDir}/skills/concepts`);
    }
  }
  return made;
}

function copyDir(src: string, dst: string) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    const s = join(src, name), d = join(dst, name);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else writeFileSync(d, readFileSync(s));
  }
}
