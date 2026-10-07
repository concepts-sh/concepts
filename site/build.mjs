#!/usr/bin/env node
// Builds the static site into site/dist. No dependencies.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, cpSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { writeIcons } from "./icons.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(here, "dist");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// ---------- markdown ----------

function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function slug(s) { return s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, (m, c) => `<code>${c}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return s;
}

function markdown(src) {
  const lines = src.split("\n");
  const html = [];
  const headings = [];
  let i = 0;
  const peek = () => lines[i];
  while (i < lines.length) {
    const line = peek();
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      html.push(`<pre${lang ? ` data-lang="${esc(lang)}"` : ""}><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length, text = inline(h[2]), id = slug(h[2]);
      if (level === 2) headings.push({ id, text });
      html.push(`<h${level} id="${id}">${text}</h${level}>`);
      i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { html.push("<hr>"); i++; continue; }
    if (line.startsWith("> ")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith("> ")) buf.push(lines[i++].slice(2));
      html.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      html.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    const li = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (m && m[1].length === li[1].length) { items.push(m[3]); i++; }
        else if (lines[i].match(/^\s{2,}\S/) && items.length) { items[items.length - 1] += " " + lines[i].trim(); i++; }
        else break;
      }
      html.push(`<${ordered ? "ol" : "ul"}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>\s|\||\s*([-*]|\d+\.)\s)/.test(lines[i])) buf.push(lines[i++]);
    html.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return { html: html.join("\n"), headings };
}

// ---------- code colouring ----------
// Runs over already-escaped code so the samples read like the files they show:
// front-matter keys, headings, links, comments, and connection openers by family.

const OPENER_CLASS = [
  [/^(- )(Kind of|Kinds:|Part of|Parts:)(?=[\s])/, "o-h"],
  [/^(- )(Same as|Replaces|Replaced by)(?=[\s])/, "o-i"],
  [/^(- )(Not)(?=[\s])/, "o-c"],
  [/^(- )(Requires|Required by|Causes|Caused by|Used for|Uses)(?=[\s])/, "o-a"],
];

function colour(code) {
  return code.split("\n").map((line) => {
    if (/^---\s*$/.test(line)) return `<span class="k">${line}</span>`;
    const fm = line.match(/^(title|description):(.*)$/);
    if (fm) return `<span class="k">${fm[1]}:</span>${fm[2]}`;
    if (/^#{1,6}\s/.test(line)) return `<span class="h">${line}</span>`;
    let out = line;
    for (const [re, cls] of OPENER_CLASS) {
      if (re.test(out)) { out = out.replace(re, (m, dash, word) => `${dash}<span class="${cls}">${word}</span>`); break; }
    }
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<span class="l">[${t}]</span><span class="u">(${u})</span>`);
    out = out.replace(/(\s)(#\s.*)$/, (m, s, c) => `${s}<span class="c">${c}</span>`);
    return out;
  }).join("\n");
}

function colourBlocks(html) {
  return html.replace(/<pre([^>]*)><code>([\s\S]*?)<\/code><\/pre>/g, (m, attrs, code) => `<pre${attrs}><code>${colour(code)}</code></pre>`);
}

// ---------- pages ----------

// The stylesheet is cached for a day by nginx, so its URL carries a hash of its content:
// every build that changes it is a new URL, and no visitor sees new pages with old styles.
const css = readFileSync(join(here, "style.css"));
const cssHash = createHash("sha256").update(css).digest("hex").slice(0, 10);
// The icons are versioned the same way, from the generator's source, so a colour change is a new URL.
const iconHash = createHash("sha256").update(readFileSync(join(here, "icons.mjs"))).digest("hex").slice(0, 10);
const layout = readFileSync(join(here, "layout.html"), "utf8")
  .replace('href="/style.css"', `href="/style.css?v=${cssHash}"`)
  .replace(/href="\/(favicon\.ico|favicon\.svg|apple-touch-icon\.png)"/g, (m, f) => `href="/${f}?v=${iconHash}"`)
  .replace('content="https://concepts.sh/icon-512.png"', `content="https://concepts.sh/icon-512.png?v=${iconHash}"`);
const pages = [
  { file: "index.html", title: "Concepts", nav: "home", source: join(here, "content", "index.html"), raw: true },
  { file: "spec.html", title: "Specification", nav: "spec", source: join(root, "SPEC.md"), toc: true },
  { file: "best-practices.html", title: "Best practices", nav: "best-practices", source: join(here, "content", "best-practices.md"), toc: true },
  { file: "examples.html", title: "Examples", nav: "examples", source: join(here, "content", "examples.md"), toc: true },
];

for (const p of pages) {
  const src = readFileSync(p.source, "utf8");
  let body, toc = "";
  if (p.raw) body = src;
  else {
    const r = markdown(src);
    body = `<article class="prose">${r.html}</article>`;
    if (p.toc && r.headings.length >= 3) toc = `<nav class="toc"><p>On this page</p><ul>${r.headings.map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`).join("")}</ul></nav>`;
  }
  const html = layout
    .replace(/\{\{title\}\}/g, p.title === "Concepts" ? "Concepts" : `${p.title} · Concepts`)
    .replace("{{content}}", colourBlocks(body))
    .replace("{{toc}}", toc)
    .replace(new RegExp(`\\{\\{nav:${p.nav}\\}\\}`), ' class="active"')
    .replace(/\{\{nav:[a-z-]+\}\}/g, "");
  writeFileSync(join(out, p.file), html);
}
copyFileSync(join(here, "style.css"), join(out, "style.css"));
writeIcons(out);

// ---------- for agents: markdown mirrors, the skill, llms.txt ----------

const spec = readFileSync(join(root, "SPEC.md"), "utf8");
const bestPractices = readFileSync(join(here, "content", "best-practices.md"), "utf8");
const examples = readFileSync(join(here, "content", "examples.md"), "utf8");
writeFileSync(join(out, "spec.md"), spec);
writeFileSync(join(out, "best-practices.md"), bestPractices);
writeFileSync(join(out, "examples.md"), examples);
cpSync(join(root, "skills", "concepts"), join(out, "skill"), { recursive: true });
const skill = readFileSync(join(root, "skills", "concepts", "SKILL.md"), "utf8");

const llms = `# Concepts

> An open format for agent knowledge. A \`.concepts/\` folder of plain markdown defines what each term, entity and idea in a project means, and how they connect. Skills tell an agent how to do a task; concepts tell it what things are.

Agents need skills. They also need concepts. The idea behind the format: intelligence means having a sufficient number of clear, correct and essential concepts in your mind, and having established a sufficient number of clear, correct and essential connections among them.

A concept is one markdown file with two required fields, \`title\` and \`description\` (a one-sentence definition), a free body, and an optional \`## Connections\` list. A connection is a sentence whose first word is one of eight relationship types: Kind of, Part of, Same as, Replaces, Not, Requires, Causes, Used for. The map, \`.concepts/index.md\`, lists every concept on one line and is read on every turn through \`AGENTS.md\`.

## Format

- [Specification](https://concepts.sh/spec.md): structure, the concept file, the eight relationship types, style, the map, loading, changes, validity, compatibility.
- [Best practices](https://concepts.sh/best-practices.md): nine rules for writing concepts.
- [Examples](https://concepts.sh/examples.md): three complete bases.

## For agents

- [The concepts skill](https://concepts.sh/skill/SKILL.md): how an agent reads, writes and maintains a base. Install with \`npx concepts-sh init\` or \`npx skills add concepts-sh/concepts\`.
- [Format reference](https://concepts.sh/skill/references/format.md): the spec condensed for the skill.
- [Relationship types](https://concepts.sh/skill/references/types.md): the eight types with example sentences.
- [Style](https://concepts.sh/skill/references/style.md): the writing rules.
- [Template](https://concepts.sh/skill/references/template.md): a concept file to copy.

## Optional

- [Everything in one file](https://concepts.sh/llms-full.txt): the spec, best practices, examples and the skill, concatenated.
- [Source repository](https://github.com/concepts-sh/concepts): the standard, the skill, the CLI and this site.
`;
writeFileSync(join(out, "llms.txt"), llms);
const sep = (name) => `\n\n---\n\n<!-- ${name} -->\n\n`;
writeFileSync(join(out, "llms-full.txt"), `<!-- concepts.sh, everything in one file -->\n\n${spec}${sep("best-practices.md")}${bestPractices}${sep("examples.md")}${examples}${sep("skill/SKILL.md")}${skill}`);

console.log(`built ${pages.length} pages, icons, markdown mirrors and llms.txt → ${out} (style.css?v=${cssHash})`);
