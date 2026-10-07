// The six validity checks from the spec.
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { expectedMapLine, isExternal, loadBase, mapFileFor, PARENT_OF, resolveTarget, toPosix } from "./base";

export type CheckResult = { errors: string[]; warnings: string[]; count: number };

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
const show = (p: string) => relative(process.cwd(), p);

export function check(base: string): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { concepts, byPath } = loadBase(base);
  const err = (path: string, msg: string) => errors.push(`${show(path)}: ${msg}`);
  const warn = (path: string, msg: string) => warnings.push(`${show(path)}: ${msg}`);

  // 2. title and a one-sentence description
  for (const c of concepts) {
    if (!c.title) err(c.path, "missing title");
    if (!c.description) err(c.path, "missing description");
    else if (c.description.split(/[.!?]\s+(?=[A-Z])/).length > 1) err(c.path, "description is more than one sentence");
  }

  // 6. unique titles
  const seen = new Map<string, string>();
  for (const c of concepts) {
    if (!c.title) continue;
    const other = seen.get(c.title);
    if (other) err(c.path, `title "${c.title}" is also used by ${show(other)}`);
    else seen.set(c.title, c.path);
  }

  // 1. links resolve; 4. connections have an opener and a link
  for (const c of concepts) {
    for (const l of c.links) {
      if (!isExternal(l.target) && !existsSync(resolveTarget(c.path, l.target))) err(c.path, `link does not resolve: ${l.target}`);
    }
    for (const k of c.connections) {
      if (!k.opener) warn(c.path, `connection without a type opener: "${k.sentence}"`);
      if (!k.links.length) err(c.path, `connection without a link: "${k.sentence}"`);
    }
  }

  // 5. no Kind/Part loops; no Not + Same as pair
  const parent = new Map<string, Set<string>>();
  const pairs = new Map<string, Set<string>>();
  for (const c of concepts) {
    for (const k of c.connections) {
      if (!k.opener) continue;
      for (const l of k.links) {
        if (isExternal(l.target)) continue;
        const t = resolveTarget(c.path, l.target);
        const me = resolve(c.path);
        const dir = PARENT_OF[k.opener];
        if (dir) {
          const [child, par] = dir === "self→target" ? [me, t] : [t, me];
          if (!parent.has(child)) parent.set(child, new Set());
          parent.get(child)!.add(par);
        }
        if (k.opener === "not" || k.opener === "same as") {
          const key = [me, t].sort().join("|");
          if (!pairs.has(key)) pairs.set(key, new Set());
          pairs.get(key)!.add(k.opener);
        }
      }
    }
  }
  for (const [key, set] of pairs) {
    const [a, b] = key.split("|");
    if (set.has("not") && set.has("same as")) err(a, `both Not and Same as with ${show(b)}`);
  }
  const state = new Map<string, 1 | 2>();
  const visit = (n: string, stack: string[]) => {
    if (state.get(n) === 2) return;
    if (state.get(n) === 1) { err(n, `Kind/Part loop: ${[...stack, n].map(show).join(" → ")}`); return; }
    state.set(n, 1);
    for (const p of parent.get(n) ?? []) visit(p, [...stack, n]);
    state.set(n, 2);
  };
  for (const n of parent.keys()) visit(n, []);

  // 3. map lines match files
  const maps = new Map<string, string | null>();
  for (const c of concepts) {
    const mapFile = mapFileFor(c.path, base);
    if (!maps.has(mapFile)) maps.set(mapFile, existsSync(mapFile) ? readFileSync(mapFile, "utf8") : null);
    const text = maps.get(mapFile);
    if (text == null) { err(c.path, `no map at ${show(mapFile)}`); continue; }
    const rel = toPosix(relative(dirname(mapFile), c.path));
    const lines = text.split("\n").filter((l) => l.includes(`](${rel})`));
    const expected = expectedMapLine(c, mapFile, byPath);
    if (lines.length === 0) { err(c.path, `no line in ${show(mapFile)}; expected:\n    ${expected}`); continue; }
    if (lines.length > 1) err(c.path, `${lines.length} lines in the map; expected one`);
    if (normalize(lines[0]) !== normalize(expected)) err(c.path, `map line does not match the file; expected:\n    ${expected}\n  found:\n    ${lines[0].trim()}`);
  }
  for (const [mapFile, text] of maps) {
    if (!text) continue;
    for (const m of text.matchAll(/^- \[[^\]]*\]\(([^)\s]+)\)/gm)) {
      if (!isExternal(m[1]) && !existsSync(resolve(dirname(mapFile), m[1]))) err(mapFile, `map line points at a missing file: ${m[1]}`);
    }
  }

  return { errors, warnings, count: concepts.length };
}
