// wiki: one self-contained HTML page built from a base.
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { check } from "./check";
import { FAMILY, isExternal, loadBase, resolveTarget, toPosix, type Concept } from "./base";
import template from "./wiki.tpl" with { type: "text" };

export type WikiOptions = { out?: string; noOpen?: boolean; public?: boolean };

function folderOf(c: Concept): string {
  const d = dirname(c.id);
  return d === "." ? "" : toPosix(d);
}

export function wikiData(base: string, opts: WikiOptions = {}) {
  const { concepts, byPath } = loadBase(base);
  const idOf = (fromFile: string, target: string) => (isExternal(target) ? null : byPath.get(resolveTarget(fromFile, target))?.id ?? null);
  const link = (fromFile: string, l: { text: string; target: string }) => ({ text: l.text, url: l.target, id: idOf(fromFile, l.target) });
  const data = concepts.map((c) => ({
    id: toPosix(c.id),
    file: opts.public ? null : resolve(c.path),
    folder: folderOf(c),
    title: c.title,
    description: c.description,
    body: c.body.replace(/^## Connections[\s\S]*$/m, "").trim(),
    source: c.body.match(/^Source:\s*(.+)$/m)?.[1] ?? null,
    links: c.links.map((l) => link(c.path, l)),
    connections: c.connections.map((k) => ({
      sentence: k.sentence,
      opener: k.opener,
      family: k.opener ? FAMILY[k.opener] : "untyped",
      targets: k.links.map((l) => link(c.path, l)),
    })),
  }));
  data.sort((a, b) => a.folder.localeCompare(b.folder) || a.title.localeCompare(b.title));
  const folders = [...new Set(data.map((c) => c.folder))].sort();
  const health = check(base);
  return { public: !!opts.public, base: opts.public ? basename(base) : base, generated: new Date().toISOString(), folders, concepts: data, errors: health.errors, warnings: health.warnings };
}

export function wiki(base: string, opts: WikiOptions = {}) {
  const data = wikiData(base, opts);
  const html = template.replace("/*DATA*/", JSON.stringify(data).replace(/<\/script/gi, "<\\/script"));
  let out = opts.out;
  if (!out) {
    const dir = join(tmpdir(), "concepts");
    mkdirSync(dir, { recursive: true });
    out = join(dir, `${basename(resolve(base, ".."))}-${Date.now()}.html`);
  }
  writeFileSync(out, html);
  if (!opts.noOpen) {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    const args = process.platform === "win32" ? ["", out] : [out];
    spawn(cmd, args, { detached: true, stdio: "ignore", shell: process.platform === "win32" }).unref();
  }
  return { out, count: data.concepts.length, errors: data.errors.length };
}
