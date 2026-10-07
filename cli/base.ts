// Reading a concept base: files, front-matter, links, connections.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export type Link = { text: string; target: string };
export type Connection = { sentence: string; opener: string | null; links: Link[] };
export type Concept = {
  path: string;
  id: string;
  title: string;
  description: string;
  body: string;
  links: Link[];
  connections: Connection[];
};
export type Base = { base: string; concepts: Concept[]; byPath: Map<string, Concept> };

export const OPENERS = [
  "kind of", "kinds", "part of", "parts", "same as", "replaces", "replaced by",
  "not", "requires", "required by", "causes", "caused by", "used for", "uses",
];

// Hierarchy openers and the direction they assert: child -> parent.
export const PARENT_OF: Record<string, "self→target" | "target→self"> = {
  "kind of": "self→target", kinds: "target→self", "part of": "self→target", parts: "target→self",
};

export const FAMILY: Record<string, string> = {
  "kind of": "hierarchy", kinds: "hierarchy", "part of": "hierarchy", parts: "hierarchy",
  "same as": "identity", replaces: "identity", "replaced by": "identity",
  not: "contrast",
  requires: "association", "required by": "association", causes: "association",
  "caused by": "association", "used for": "association", uses: "association",
};

const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;

export function parseConcept(path: string, base: string): Concept {
  const text = readFileSync(path, "utf8");
  const c: Concept = { path, id: relative(base, path).replace(/\.md$/, ""), title: "", description: "", body: "", links: [], connections: [] };
  let rest = text;
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^(title|description):\s*(.*)$/);
      if (m) c[m[1] as "title" | "description"] = m[2].trim();
    }
    rest = text.slice(fm[0].length);
  }
  c.body = rest;
  for (const m of rest.matchAll(LINK)) c.links.push({ text: m[1], target: m[2] });

  const connIdx = rest.search(/^## Connections\s*$/m);
  const connText = connIdx >= 0 ? rest.slice(connIdx) : "";
  for (const line of connText.split("\n")) {
    const m = line.match(/^\s*[-*]\s+(.*\S)\s*$/);
    if (!m) continue;
    const sentence = m[1];
    const lower = sentence.toLowerCase();
    const opener = OPENERS.filter((o) => lower.startsWith(o + " ") || lower.startsWith(o + ":")).sort((a, b) => b.length - a.length)[0] ?? null;
    const links = [...sentence.matchAll(LINK)].map((x) => ({ text: x[1], target: x[2] }));
    c.connections.push({ sentence, opener, links });
  }
  return c;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".md") && name !== "index.md") out.push(p);
  }
  return out;
}

export function loadBase(base: string): Base {
  const concepts = walk(base).map((p) => parseConcept(p, base));
  return { base, concepts, byPath: new Map(concepts.map((c) => [resolve(c.path), c])) };
}

export function isExternal(target: string): boolean {
  return /^[a-z]+:\/\//i.test(target) || target.startsWith("#");
}

export function resolveTarget(fromFile: string, target: string): string {
  return resolve(dirname(fromFile), target.split("#")[0]);
}

export function toPosix(p: string): string {
  return p.split(sep).join("/");
}

// A folder with its own index.md owns its concepts; otherwise the root map does.
export function mapFileFor(conceptPath: string, base: string): string {
  let dir = dirname(conceptPath);
  while (dir.length >= base.length) {
    const idx = join(dir, "index.md");
    if (existsSync(idx)) return idx;
    if (dir === base) break;
    dir = dirname(dir);
  }
  return join(base, "index.md");
}

export function expectedMapLine(c: Concept, mapFile: string, byPath: Map<string, Concept>): string {
  const rel = toPosix(relative(dirname(mapFile), c.path));
  const parts = c.connections
    .filter((k) => k.opener)
    .map((k) => {
      const names = k.links.map((l) => (byPath.get(resolveTarget(c.path, l.target))?.title || l.text).toLowerCase());
      const colon = k.opener === "kinds" || k.opener === "parts" ? ": " : " ";
      return `${k.opener}${colon}${names.join(", ")}`;
    });
  const joined = parts.join("; ");
  const tail = parts.length ? " " + joined[0].toUpperCase() + joined.slice(1) + "." : "";
  return `- [${c.title}](${rel}): ${c.description}${tail}`;
}
