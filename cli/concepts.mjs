#!/usr/bin/env node
// concepts — init, check, wiki. One file, no dependencies. Runs under Node 18+ or Bun.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, symlinkSync } from "node:fs";
import { join, dirname, basename, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const OPENERS = [
  "kind of", "kinds", "part of", "parts", "same as", "replaces", "replaced by",
  "not", "requires", "required by", "causes", "caused by", "used for", "uses",
];
// Hierarchy openers and the direction they assert: child → parent.
const PARENT_OF = { "kind of": "self→target", "kinds": "target→self", "part of": "self→target", "parts": "target→self" };

// ---------- parsing ----------

function parseConcept(path, base) {
  const text = readFileSync(path, "utf8");
  const c = { path, id: relative(base, path).replace(/\.md$/, ""), title: null, description: null, links: [], connections: [], body: "" };
  let rest = text;
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) c[m[1]] = m[2].trim();
    }
    rest = text.slice(fm[0].length);
  }
  c.body = rest;
  const connIdx = rest.search(/^## Connections\s*$/m);
  const connText = connIdx >= 0 ? rest.slice(connIdx) : "";
  for (const m of rest.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)) c.links.push({ text: m[1], target: m[2] });
  for (const line of connText.split("\n")) {
    const m = line.match(/^\s*[-*]\s+(.*\S)\s*$/);
    if (!m) continue;
    const sentence = m[1];
    const lower = sentence.toLowerCase();
    const opener = OPENERS.filter((o) => lower.startsWith(o + " ") || lower.startsWith(o + ":"))
      .sort((a, b) => b.length - a.length)[0] || null;
    const links = [...sentence.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)].map((x) => ({ text: x[1], target: x[2] }));
    c.connections.push({ sentence, opener, links });
  }
  return c;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".md") && name !== "index.md") out.push(p);
  }
  return out;
}

function loadBase(base) {
  const concepts = walk(base).map((p) => parseConcept(p, base));
  const byPath = new Map(concepts.map((c) => [resolve(c.path), c]));
  return { base, concepts, byPath };
}

function isExternal(target) {
  return /^[a-z]+:\/\//i.test(target) || target.startsWith("#");
}

function resolveTarget(fromFile, target) {
  return resolve(dirname(fromFile), target.split("#")[0]);
}

function titleOf(byPath, fromFile, target) {
  const c = byPath.get(resolveTarget(fromFile, target));
  return c ? c.title : null;
}

// ---------- the map ----------

function mapFileFor(conceptPath, base) {
  // A folder with its own index.md owns its concepts; otherwise the root map does.
  let dir = dirname(conceptPath);
  while (dir.length >= base.length) {
    const idx = join(dir, "index.md");
    if (existsSync(idx)) return idx;
    if (dir === base) break;
    dir = dirname(dir);
  }
  return join(base, "index.md");
}

function expectedMapLine(c, mapFile, byPath) {
  const rel = relative(dirname(mapFile), c.path).split(sep).join("/");
  const conns = c.connections
    .filter((k) => k.opener)
    .map((k) => {
      const names = k.links.map((l) => (titleOf(byPath, c.path, l.target) || l.text).toLowerCase());
      // "Kinds: a, b" and "Parts: a, b" take a colon; every other opener is followed by its target.
      const colon = k.opener === "kinds" || k.opener === "parts" ? ": " : " ";
      return `${k.opener}${colon}${names.join(", ")}`;
    });
  // The tail is a new sentence after the description, so its first opener is capitalized.
  const joined = conns.join("; ");
  const tail = conns.length ? " " + joined[0].toUpperCase() + joined.slice(1) + "." : "";
  return `- [${c.title}](${rel}): ${c.description}${tail}`;
}

function normalize(s) {
  return s.replace(/\s+/g, " ").trim();
}

// ---------- check ----------

function check(base) {
  const errors = [];
  const warnings = [];
  const { concepts, byPath } = loadBase(base);
  const err = (c, msg) => errors.push(`${relative(process.cwd(), c.path || c)}: ${msg}`);
  const warn = (c, msg) => warnings.push(`${relative(process.cwd(), c.path || c)}: ${msg}`);

  // 2. title and one-sentence description
  for (const c of concepts) {
    if (!c.title) err(c, "missing title");
    if (!c.description) err(c, "missing description");
    else if (c.description.split(/[.!?]\s+(?=[A-Z])/).length > 1) err(c, "description is more than one sentence");
  }

  // 6. unique titles
  const seen = new Map();
  for (const c of concepts) {
    if (!c.title) continue;
    if (seen.has(c.title)) err(c, `title "${c.title}" is also used by ${relative(process.cwd(), seen.get(c.title))}`);
    else seen.set(c.title, c.path);
  }

  // 1. links resolve; 4. connections have an opener and a link
  for (const c of concepts) {
    for (const l of c.links) {
      if (isExternal(l.target)) continue;
      if (!existsSync(resolveTarget(c.path, l.target))) err(c, `link does not resolve: ${l.target}`);
    }
    for (const k of c.connections) {
      if (!k.opener) warn(c, `connection without a type opener: "${k.sentence}"`);
      if (!k.links.length) err(c, `connection without a link: "${k.sentence}"`);
    }
  }

  // 5. no Kind/Part loops; no Not + Same as pair
  const parent = new Map(); // child path -> Set(parent path)
  const pairs = new Map(); // "a|b" -> Set(openers)
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
          parent.get(child).add(par);
        }
        if (k.opener === "not" || k.opener === "same as") {
          const key = [me, t].sort().join("|");
          if (!pairs.has(key)) pairs.set(key, new Set());
          pairs.get(key).add(k.opener);
        }
      }
    }
  }
  for (const [key, set] of pairs) {
    if (set.has("not") && set.has("same as")) err(key.split("|")[0], `both Not and Same as with ${relative(process.cwd(), key.split("|")[1])}`);
  }
  const state = new Map();
  const visit = (n, stack) => {
    if (state.get(n) === 2) return;
    if (state.get(n) === 1) { err(n, `Kind/Part loop: ${stack.map((s) => relative(process.cwd(), s)).join(" → ")} → ${relative(process.cwd(), n)}`); return; }
    state.set(n, 1);
    for (const p of parent.get(n) || []) visit(p, [...stack, n]);
    state.set(n, 2);
  };
  for (const n of parent.keys()) visit(n, []);

  // 3. map lines match files
  const mapCache = new Map();
  const claimed = new Map();
  for (const c of concepts) {
    const mapFile = mapFileFor(c.path, base);
    if (!mapCache.has(mapFile)) mapCache.set(mapFile, existsSync(mapFile) ? readFileSync(mapFile, "utf8") : null);
    const mapText = mapCache.get(mapFile);
    if (mapText === null) { err(c, `no map at ${relative(process.cwd(), mapFile)}`); continue; }
    const rel = relative(dirname(mapFile), c.path).split(sep).join("/");
    const lines = mapText.split("\n").filter((l) => l.includes(`](${rel})`));
    if (lines.length === 0) { err(c, `no line in ${relative(process.cwd(), mapFile)}; expected:\n    ${expectedMapLine(c, mapFile, byPath)}`); continue; }
    if (lines.length > 1) err(c, `${lines.length} lines in the map; expected one`);
    const expected = expectedMapLine(c, mapFile, byPath);
    if (normalize(lines[0]) !== normalize(expected)) err(c, `map line does not match the file; expected:\n    ${expected}\n  found:\n    ${lines[0].trim()}`);
    claimed.set(rel, true);
  }
  // map lines that point at nothing
  for (const [mapFile, text] of mapCache) {
    if (!text) continue;
    for (const m of text.matchAll(/^- \[[^\]]*\]\(([^)\s]+)\)/gm)) {
      const t = m[1];
      if (isExternal(t)) continue;
      if (!existsSync(resolve(dirname(mapFile), t))) err(mapFile, `map line points at a missing file: ${t}`);
    }
  }

  return { errors, warnings, count: concepts.length };
}

// ---------- init ----------

const AGENTS_BLOCK = `## Concepts

Read \`.concepts/index.md\` before you work on domain logic. Open a concept file when a task touches the concept. Follow the concepts skill to add or change concepts.
`;

function init(root) {
  const base = join(root, ".concepts");
  const made = [];
  if (!existsSync(base)) { mkdirSync(base, { recursive: true }); made.push(".concepts/"); }
  const idx = join(base, "index.md");
  if (!existsSync(idx)) { writeFileSync(idx, "# Concepts\n"); made.push(".concepts/index.md"); }
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
  // The skill ships inside this package. It is copied once into .agents/skills/, the folder
  // Codex, Amp and others read, and linked into the folders Claude Code and Cursor read.
  const skillSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "concepts");
  const skillDst = join(root, ".agents", "skills", "concepts");
  if (existsSync(skillSrc) && !existsSync(skillDst)) {
    copyDir(skillSrc, skillDst);
    made.push(".agents/skills/concepts/");
  }
  if (existsSync(skillDst)) {
    for (const agentDir of [".claude", ".cursor"]) {
      const linkDir = join(root, agentDir, "skills");
      const link = join(linkDir, "concepts");
      if (existsSync(link)) continue;
      mkdirSync(linkDir, { recursive: true });
      try { symlinkSync(relative(linkDir, skillDst), link, "dir"); }
      catch { copyDir(skillDst, link); } // no symlinks here (some Windows setups): a copy works too
      made.push(`${agentDir}/skills/concepts`);
    }
  }
  return made;
}

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    const s = join(src, name), d = join(dst, name);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else writeFileSync(d, readFileSync(s));
  }
}

// ---------- wiki ----------

const FAMILY = {
  "kind of": "hierarchy", "kinds": "hierarchy", "part of": "hierarchy", "parts": "hierarchy",
  "same as": "identity", "replaces": "identity", "replaced by": "identity",
  "not": "contrast",
  "requires": "association", "required by": "association", "causes": "association",
  "caused by": "association", "used for": "association", "uses": "association",
};

function wikiData(base, opts = {}) {
  const { concepts, byPath } = loadBase(base);
  const idOf = (fromFile, target) => {
    const c = byPath.get(resolveTarget(fromFile, target));
    return c ? c.id : null;
  };
  const folders = [...new Set(concepts.map((c) => dirname(c.id) === "." ? "" : dirname(c.id).split(sep).join("/")))].sort();
  const data = concepts.map((c) => {
    const source = (c.body.match(/^Source:\s*(.+)$/m) || [])[1] || null;
    const bodyOnly = c.body.replace(/^## Connections[\s\S]*$/m, "").trim();
    return {
      id: c.id.split(sep).join("/"),
      file: opts.public ? null : resolve(c.path),
      folder: dirname(c.id) === "." ? "" : dirname(c.id).split(sep).join("/"),
      title: c.title,
      description: c.description,
      body: bodyOnly,
      source,
      links: c.links.map((l) => ({ text: l.text, url: l.target, id: isExternal(l.target) ? null : idOf(c.path, l.target) })),
      connections: c.connections.map((k) => ({
        sentence: k.sentence,
        opener: k.opener,
        family: k.opener ? FAMILY[k.opener] : "untyped",
        targets: k.links.map((l) => ({ text: l.text, url: l.target, id: isExternal(l.target) ? null : idOf(c.path, l.target) })),
      })),
    };
  });
  data.sort((a, b) => a.folder.localeCompare(b.folder) || a.title.localeCompare(b.title));
  const health = check(base);
  return { public: !!opts.public, base: opts.public ? basename(base) : base, generated: new Date().toISOString(), folders, concepts: data, errors: health.errors, warnings: health.warnings };
}

function wikiHtml(data) {
  const json = JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
  return WIKI_TEMPLATE.replace("/*DATA*/", json);
}

const WIKI_TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Concepts</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.30.4/cytoscape.min.js"></script>
<style>
:root { --bg:#fff; --fg:#1a1a1a; --muted:#666; --line:#e5e5e5; --panel:#fafafa; --accent:#2563eb;
  --hier:#2563eb; --ident:#7c3aed; --contrast:#dc2626; --assoc:#059669; --untyped:#9ca3af; }
@media (prefers-color-scheme: dark) { :root { --bg:#111; --fg:#e8e8e8; --muted:#9a9a9a; --line:#2a2a2a; --panel:#181818; --accent:#60a5fa;
  --hier:#60a5fa; --ident:#a78bfa; --contrast:#f87171; --assoc:#34d399; --untyped:#6b7280; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display:grid; grid-template-columns: 280px 1fr 360px; height:100vh; }
nav, aside { overflow:auto; background:var(--panel); border-color:var(--line); padding:16px; }
nav { border-right:1px solid var(--line); } aside { border-left:1px solid var(--line); }
main { overflow:auto; padding: 28px 40px; max-width: 820px; }
a { color:var(--accent); text-decoration:none; } a:hover { text-decoration:underline; }
h1 { font-size:24px; margin:0 0 4px; } h2 { font-size:15px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin:28px 0 8px; }
.desc { font-size:17px; margin:0 0 20px; }
.crumb { color:var(--muted); font-size:13px; margin-bottom:8px; }
nav input { width:100%; padding:8px 10px; border:1px solid var(--line); border-radius:6px; background:var(--bg); color:var(--fg); margin-bottom:12px; font-size:14px; }
nav .folder { font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin:14px 0 4px; }
nav .item { display:block; padding:3px 6px; border-radius:4px; color:var(--fg); font-size:14px; }
nav .item.active, nav .item:hover { background:var(--line); text-decoration:none; }
nav .top a { display:block; font-size:14px; padding:3px 6px; color:var(--fg); }
.conn { list-style:none; padding:0; margin:0; }
.conn li { padding:8px 10px; border-left:3px solid var(--untyped); margin:6px 0; background:var(--panel); border-radius:0 6px 6px 0; }
.conn li.hierarchy { border-color:var(--hier); } .conn li.identity { border-color:var(--ident); }
.conn li.contrast { border-color:var(--contrast); } .conn li.association { border-color:var(--assoc); }
.conn .from { color:var(--muted); font-size:13px; }
code { background:var(--line); padding:1px 5px; border-radius:4px; font-size:13px; }
pre { background:var(--panel); border:1px solid var(--line); padding:12px; border-radius:6px; overflow:auto; }
.meta { color:var(--muted); font-size:13px; margin-top:24px; }
.meta button { font-size:12px; padding:3px 8px; margin-left:6px; border:1px solid var(--line); background:var(--bg); color:var(--fg); border-radius:4px; cursor:pointer; }
#graph { height:320px; border:1px solid var(--line); border-radius:6px; background:var(--bg); }
.legend { font-size:12px; color:var(--muted); margin-top:8px; } .legend span { display:inline-block; width:10px; height:10px; border-radius:2px; margin:0 4px 0 10px; vertical-align:middle; }
.ghost { color:var(--muted); font-style:italic; }
.health li { margin:4px 0; } .health .err { color:var(--contrast); } .health .warn { color:#b45309; }
.order li { margin:3px 0; }
.home .line { margin:6px 0; } .home .line .d { color:var(--muted); }
#bigwrap { display:none; position:fixed; inset:0; background:var(--bg); z-index:10; } #big { width:100%; height:100%; }
#bigwrap button { position:absolute; top:12px; right:12px; z-index:11; }
#bigfoot { position:absolute; left:16px; right:16px; bottom:10px; display:flex; justify-content:space-between; align-items:center; font-size:13px; color:var(--muted); pointer-events:none; }
#big { height: calc(100% - 40px); }
</style>
</head>
<body>
<nav>
  <input id="q" placeholder="Search concepts" autocomplete="off">
  <div class="top"><a href="#">Map</a><a href="#!order">Read in order</a><a href="#!health">Health</a><a href="#!graph">Whole graph</a><a id="home" href="/" style="display:none">&larr; concepts.sh</a></div>
  <div id="list"></div>
</nav>
<main id="main"></main>
<aside>
  <h2 style="margin-top:0">Focus</h2>
  <div id="graph"></div>
  <div class="legend"><span style="background:var(--hier)"></span>hierarchy<span style="background:var(--assoc)"></span>association<span style="background:var(--ident)"></span>identity<span style="background:var(--contrast)"></span>contrast</div>
  <div id="side"></div>
</aside>
<div id="bigwrap"><button onclick="closeBig()">Close</button><div id="big"></div><div id="bigfoot"><span id="bigtip"></span><span id="biglegend" class="legend"></span></div></div>
<script>
var DATA = /*DATA*/;
var byId = {}; DATA.concepts.forEach(function (c) { byId[c.id] = c; });
var backlinks = {}; DATA.concepts.forEach(function (c) { c.links.forEach(function (l) { if (l.id) { (backlinks[l.id] = backlinks[l.id] || []); if (backlinks[l.id].indexOf(c.id) < 0) backlinks[l.id].push(c.id); } }); });
var inbound = {}; DATA.concepts.forEach(function (c) { c.connections.forEach(function (k) { k.targets.forEach(function (t) { if (t.id) (inbound[t.id] = inbound[t.id] || []).push({ from: c.id, k: k }); }); }); });

function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
function href(c, url) { // rewrite a link relative to concept c into an in-page route or leave it external
  if (/^[a-z]+:\/\//i.test(url)) return url;
  var parts = (c.folder ? c.folder.split("/") : []);
  url.split("#")[0].split("/").forEach(function (seg) { if (seg === "..") parts.pop(); else if (seg && seg !== ".") parts.push(seg); });
  var id = parts.join("/").replace(/\.md$/, "");
  return byId[id] ? "#" + id : url;
}
function inline(c, s) {
  s = esc(s);
  s = s.replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) { var h = href(c, u); var ext = h === u && /^[a-z]+:\/\//i.test(u); return '<a href="' + esc(h) + '"' + (ext ? ' target="_blank" class="ghost"' : "") + ">" + t + "</a>"; });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|\s)\*([^*]+)\*/g, "$1<em>$2</em>");
  return s;
}
function md(c, text) {
  var out = [], para = [], inCode = false, code = [];
  function flush() { if (para.length) { out.push("<p>" + inline(c, para.join(" ")) + "</p>"); para = []; } }
  text.split("\n").forEach(function (line) {
    if (line.trim().indexOf("\x60\x60\x60") === 0) { if (inCode) { out.push("<pre>" + esc(code.join("\n")) + "</pre>"); code = []; inCode = false; } else { flush(); inCode = true; } return; }
    if (inCode) { code.push(line); return; }
    var h = line.match(/^(#{1,6})\s+(.*)$/); var li = line.match(/^\s*[-*]\s+(.*)$/);
    if (h) { flush(); out.push("<h2>" + inline(c, h[2]) + "</h2>"); }
    else if (li) { flush(); if (out[out.length - 1] && out[out.length - 1].slice(-5) === "</ul>") out[out.length - 1] = out[out.length - 1].slice(0, -5) + "<li>" + inline(c, li[1]) + "</li></ul>"; else out.push("<ul><li>" + inline(c, li[1]) + "</li></ul>"); }
    else if (!line.trim()) flush();
    else para.push(line);
  });
  flush(); return out.join("\n");
}

function renderList(filter) {
  var q = (filter || "").toLowerCase(), html = "";
  DATA.folders.forEach(function (f) {
    var items = DATA.concepts.filter(function (c) { return c.folder === f && (!q || (c.title + " " + c.description).toLowerCase().indexOf(q) >= 0); });
    if (!items.length) return;
    html += '<div class="folder">' + esc(f || "root") + "</div>";
    items.forEach(function (c) { html += '<a class="item" data-id="' + esc(c.id) + '" href="#' + esc(c.id) + '" title="' + esc(c.description) + '">' + esc(c.title) + "</a>"; });
  });
  document.getElementById("list").innerHTML = html;
}
document.getElementById("q").addEventListener("input", function (e) { renderList(e.target.value); });

function renderHome() {
  var html = '<div class="home"><h1>Concepts</h1><p class="desc">' + DATA.concepts.length + " concepts in " + DATA.folders.length + " folder" + (DATA.folders.length === 1 ? "" : "s") + ". Built " + esc(DATA.generated.slice(0, 16).replace("T", " ")) + " from <code>" + esc(DATA.base) + "</code>.</p>";
  DATA.folders.forEach(function (f) {
    html += "<h2>" + esc(f || "root") + "</h2>";
    DATA.concepts.filter(function (c) { return c.folder === f; }).forEach(function (c) {
      var tail = c.connections.filter(function (k) { return k.opener; }).map(function (k) { return k.opener + (k.opener === "kinds" || k.opener === "parts" ? ": " : " ") + k.targets.map(function (t) { return (t.id && byId[t.id] ? byId[t.id].title : t.text).toLowerCase(); }).join(", "); }).join("; ");
      html += '<div class="line"><a href="#' + esc(c.id) + '">' + esc(c.title) + "</a>: " + esc(c.description) + (tail ? ' <span class="d">' + esc(tail.charAt(0).toUpperCase() + tail.slice(1)) + ".</span>" : "") + "</div>";
    });
  });
  document.getElementById("main").innerHTML = html + "</div>";
  renderFocus(null);
}

function renderConcept(c) {
  var html = '<div class="crumb">' + esc(c.folder || "root") + "</div><h1>" + esc(c.title) + '</h1><p class="desc">' + inline(c, c.description) + "</p>";
  html += md(c, c.body.replace(/^Source:\s*.*$/m, ""));
  if (c.connections.length) {
    html += "<h2>Connections</h2><ul class=\"conn\">";
    c.connections.forEach(function (k) { html += '<li class="' + k.family + '">' + inline(c, k.sentence) + "</li>"; });
    html += "</ul>";
  }
  var inb = inbound[c.id] || [];
  if (inb.length) {
    html += "<h2>Said about it elsewhere</h2><ul class=\"conn\">";
    inb.forEach(function (x) { var f = byId[x.from]; html += '<li class="' + x.k.family + '"><div class="from"><a href="#' + esc(f.id) + '">' + esc(f.title) + "</a></div>" + inline(f, x.k.sentence) + "</li>"; });
    html += "</ul>";
  }
  var bl = (backlinks[c.id] || []).filter(function (id) { return !inb.some(function (x) { return x.from === id; }); });
  if (bl.length) html += "<h2>Also mentioned in</h2><p>" + bl.map(function (id) { return '<a href="#' + esc(id) + '">' + esc(byId[id].title) + "</a>"; }).join(", ") + "</p>";
  html += '<div class="meta">';
  if (c.source) html += "Source: " + inline(c, c.source) + "<br>";
  if (c.file) html += "File: <code>" + esc(c.file) + "</code> <a href=\"vscode://file" + esc(c.file) + "\">Open in editor</a> <button onclick=\"copyFix('" + esc(c.file) + "')\">Copy fix prompt</button>";
  html += "</div>";
  document.getElementById("main").innerHTML = html;
  renderFocus(c);
}
function copyFix(file) { var t = "In " + file + ", the concept is wrong because: "; navigator.clipboard.writeText(t).then(function () { alert("Copied: " + t); }); }

function readingOrder() {
  var after = {}; var indeg = {}; DATA.concepts.forEach(function (c) { after[c.id] = []; indeg[c.id] = 0; });
  function edge(a, b) { if (a && b && byId[a] && byId[b] && a !== b) { after[a].push(b); indeg[b]++; } } // a before b
  DATA.concepts.forEach(function (c) { c.connections.forEach(function (k) { k.targets.forEach(function (t) {
    if (!t.id) return;
    if (k.opener === "requires" || k.opener === "kind of" || k.opener === "part of") edge(t.id, c.id);
    if (k.opener === "required by" || k.opener === "kinds" || k.opener === "parts") edge(c.id, t.id);
  }); }); });
  var ready = DATA.concepts.filter(function (c) { return indeg[c.id] === 0; }).map(function (c) { return c.id; }).sort();
  var out = [], done = {};
  while (ready.length) { var id = ready.shift(); out.push(id); done[id] = true; after[id].forEach(function (b) { if (--indeg[b] === 0) ready.push(b); }); ready.sort(); }
  DATA.concepts.forEach(function (c) { if (!done[c.id]) out.push(c.id); });
  return out;
}
function renderOrder() {
  var html = "<h1>Read in order</h1><p class=\"desc\">Prerequisites first, from Requires, Kind of and Part of.</p><ol class=\"order\">";
  readingOrder().forEach(function (id) { var c = byId[id]; html += '<li><a href="#' + esc(id) + '">' + esc(c.title) + "</a> <span class=\"ghost\">" + esc(c.description) + "</span></li>"; });
  document.getElementById("main").innerHTML = html + "</ol>"; renderFocus(null);
}
function renderHealth() {
  var html = "<h1>Health</h1><ul class=\"health\">";
  DATA.errors.forEach(function (e) { html += '<li class="err">' + esc(e) + "</li>"; });
  DATA.warnings.forEach(function (w) { html += '<li class="warn">' + esc(w) + "</li>"; });
  var orphans = DATA.concepts.filter(function (c) { return !c.connections.length && !(inbound[c.id] || []).length; });
  orphans.forEach(function (c) { html += '<li class="warn">' + esc(c.id) + ": no connections in or out</li>"; });
  var retired = DATA.concepts.filter(function (c) { return c.connections.some(function (k) { return k.opener === "replaced by"; }); });
  retired.forEach(function (c) { html += "<li>" + esc(c.id) + ": retired (Replaced by)</li>"; });
  var ext = 0; DATA.concepts.forEach(function (c) { c.links.forEach(function (l) { if (!l.id && /^[a-z]+:\/\//i.test(l.url)) ext++; }); });
  html += "<li>" + ext + " external link" + (ext === 1 ? "" : "s") + "</li>";
  if (!DATA.errors.length && !DATA.warnings.length && !orphans.length) html += "<li>All six checks pass.</li>";
  document.getElementById("main").innerHTML = html + "</ul>"; renderFocus(null);
}

var EDGE_COLOR = { hierarchy: "var(--hier)", identity: "var(--ident)", contrast: "var(--contrast)", association: "var(--assoc)", untyped: "var(--untyped)" };
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name.slice(4, -1)).trim(); }
function style() {
  return [
    { selector: "node", style: { label: "data(label)", "font-size": 11, "text-wrap": "wrap", "text-max-width": 110, "text-valign": "center", "text-halign": "center", "background-color": cssVar("var(--panel)"), "border-color": cssVar("var(--muted)"), "border-width": 1, color: cssVar("var(--fg)"), width: 120, height: 36, shape: "round-rectangle" } },
    { selector: "node.center", style: { "border-color": cssVar("var(--accent)"), "border-width": 2, "font-weight": "bold" } },
    { selector: "node.ghost", style: { "border-style": "dashed", color: cssVar("var(--muted)") } },
    { selector: "node.colored", style: { "border-color": "data(color)", "border-width": 2 } },
    { selector: ":parent", style: { "background-opacity": 0.06, "border-color": cssVar("var(--line)"), "text-valign": "top", "font-size": 11, color: cssVar("var(--muted)"), padding: 12 } },
    { selector: "edge", style: { width: 1.5, "curve-style": "bezier", "target-arrow-shape": "triangle", "arrow-scale": 0.8, label: "data(label)", "font-size": 9, color: cssVar("var(--muted)"), "text-rotation": "autorotate", "text-background-color": cssVar("var(--bg)"), "text-background-opacity": 1, "text-background-padding": 2 } },
  ].concat(Object.keys(EDGE_COLOR).map(function (f) { return { selector: "edge." + f, style: { "line-color": cssVar(EDGE_COLOR[f]), "target-arrow-color": cssVar(EDGE_COLOR[f]) } }; }))
   .concat([{ selector: "edge.quiet", style: { label: "" } }]);
}
function dedupe(edges) { // both sides may state one relationship; draw it once
  var seen = {}; return edges.filter(function (e) { var k = e.data.source + ">" + e.data.target + ":" + e.data.label; var r = [e.data.target, e.data.source].join(">") + ":" + e.data.label; if (seen[k] || (e.classes === "contrast" || e.classes === "identity") && seen[r]) return false; seen[k] = true; return true; });
}
var focusCy = null;
function renderFocus(c) {
  var el = document.getElementById("graph"), side = document.getElementById("side");
  if (!c) { el.innerHTML = ""; side.innerHTML = '<p class="ghost">Open a concept to see its neighbourhood: parents above, children below, associations left, identity and contrast right.</p>'; if (focusCy) { focusCy.destroy(); focusCy = null; } return; }
  side.innerHTML = "";
  var nodes = {}, edges = [], groups = { up: [], down: [], left: [], right: [] };
  function add(id, label, ghost) { if (!nodes[id]) nodes[id] = { data: { id: id, label: label }, classes: ghost ? "ghost" : "" }; }
  add(c.id, c.title); nodes[c.id].classes = "center";
  function place(id, group) { if (groups[group].indexOf(id) < 0 && id !== c.id) groups[group].push(id); }
  c.connections.forEach(function (k) { k.targets.forEach(function (t) {
    var id = t.id || t.url, label = t.id ? byId[t.id].title : t.text; add(id, label, !t.id);
    var o = k.opener;
    if (o === "kind of" || o === "part of") { place(id, "up"); edges.push({ data: { source: c.id, target: id, label: o, title: k.sentence }, classes: k.family }); }
    else if (o === "kinds" || o === "parts") { place(id, "down"); edges.push({ data: { source: id, target: c.id, label: o === "kinds" ? "kind of" : "part of", title: k.sentence }, classes: k.family }); }
    else if (k.family === "identity" || k.family === "contrast") { place(id, "right"); edges.push({ data: { source: c.id, target: id, label: o || "related", title: k.sentence }, classes: k.family }); }
    else { place(id, "left"); edges.push({ data: { source: c.id, target: id, label: o || "related", title: k.sentence }, classes: k.family }); }
  }); });
  (inbound[c.id] || []).forEach(function (x) {
    var f = byId[x.from], o = x.k.opener; add(f.id, f.title);
    if (o === "kind of" || o === "part of") { place(f.id, "down"); edges.push({ data: { source: f.id, target: c.id, label: o, title: x.k.sentence }, classes: x.k.family }); }
    else if (o === "kinds" || o === "parts") { place(f.id, "up"); edges.push({ data: { source: c.id, target: f.id, label: o === "kinds" ? "kind of" : "part of", title: x.k.sentence }, classes: x.k.family }); }
    else if (x.k.family === "identity" || x.k.family === "contrast") { place(f.id, "right"); edges.push({ data: { source: f.id, target: c.id, label: o || "related", title: x.k.sentence }, classes: x.k.family }); }
    else { place(f.id, "left"); edges.push({ data: { source: f.id, target: c.id, label: o || "related", title: x.k.sentence }, classes: x.k.family }); }
  });
  edges = dedupe(edges);
  var pos = {}; pos[c.id] = { x: 0, y: 0 };
  function spread(ids, axis, fixed) { var gap = axis === "x" ? 140 : 56; ids.forEach(function (id, i) { var v = (i - (ids.length - 1) / 2) * gap; pos[id] = axis === "x" ? { x: v, y: fixed } : { x: fixed, y: v }; }); }
  spread(groups.up, "x", -130); spread(groups.down, "x", 130); spread(groups.left, "y", -260); spread(groups.right, "y", 260);
  var elements = Object.keys(nodes).map(function (id) { var n = nodes[id]; n.position = pos[id] || { x: 0, y: 0 }; return n; }).concat(edges);
  if (focusCy) focusCy.destroy();
  focusCy = cytoscape({ container: el, elements: elements, style: style(), layout: { name: "preset", fit: true, padding: 20 }, userZoomingEnabled: true });
  focusCy.on("tap", "node", function (e) { var id = e.target.id(); if (byId[id]) location.hash = "#" + id; else if (/^[a-z]+:\/\//i.test(id)) window.open(id, "_blank"); });
  focusCy.on("mouseover", "edge", function (e) { side.innerHTML = '<p class="' + "" + '">' + esc(e.target.data("title")) + "</p>"; });
}

var bigCy = null;
var FOLDER_COLORS = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#db2777", "#0891b2", "#65a30d", "#dc2626"];
function renderBig() {
  document.getElementById("bigwrap").style.display = "block";
  var elements = [], folderIndex = {};
  DATA.folders.forEach(function (f, i) { folderIndex[f] = i; });
  DATA.concepts.forEach(function (c) { elements.push({ data: { id: c.id, label: c.title, color: FOLDER_COLORS[folderIndex[c.folder] % FOLDER_COLORS.length] }, classes: "colored" }); });
  var ghosts = {};
  DATA.concepts.forEach(function (c) { c.connections.forEach(function (k) { k.targets.forEach(function (t) {
    var id = t.id || t.url; if (!t.id && !ghosts[id]) { ghosts[id] = true; elements.push({ data: { id: id, label: t.text, color: "#9ca3af" }, classes: "ghost colored" }); }
    elements.push({ data: { source: c.id, target: id, label: k.opener || "related", title: k.sentence }, classes: k.family + " quiet" });
  }); }); });
  elements = elements.filter(function (e) { return !e.data.source; }).concat(dedupe(elements.filter(function (e) { return e.data.source; })));
  var legend = DATA.folders.map(function (f, i) { return '<span style="background:' + FOLDER_COLORS[i % FOLDER_COLORS.length] + '"></span>' + esc(f || "root"); }).join("");
  document.getElementById("biglegend").innerHTML = legend + '<span style="background:var(--hier)"></span>hierarchy<span style="background:var(--assoc)"></span>association<span style="background:var(--ident)"></span>identity<span style="background:var(--contrast)"></span>contrast';
  if (bigCy) bigCy.destroy();
  bigCy = cytoscape({ container: document.getElementById("big"), elements: elements, style: style(), layout: { name: "cose", animate: false, randomize: true, numIter: 1500, nodeRepulsion: function () { return 9000; }, idealEdgeLength: function () { return 130; }, edgeElasticity: function () { return 60; }, gravity: 0.25, padding: 60 } });
  bigCy.on("tap", "node", function (e) { var id = e.target.id(); if (byId[id]) { closeBig(); location.hash = "#" + id; } });
  bigCy.on("mouseover", "edge", function (e) { document.getElementById("bigtip").textContent = e.target.data("title"); });
  bigCy.on("mouseout", "edge", function () { document.getElementById("bigtip").textContent = ""; });
}
function closeBig() { document.getElementById("bigwrap").style.display = "none"; if (location.hash === "#!graph") location.hash = "#"; }

function route() {
  var h = decodeURIComponent(location.hash.slice(1));
  document.querySelectorAll("nav .item").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-id") === h); });
  if (h === "!order") return renderOrder();
  if (h === "!health") return renderHealth();
  if (h === "!graph") return renderBig();
  if (byId[h]) { renderConcept(byId[h]); document.getElementById("main").scrollTop = 0; return; }
  renderHome();
}
if (DATA.public) document.getElementById("home").style.display = "block";
renderList(""); window.addEventListener("hashchange", route); route();
</script>
</body>
</html>`;

function wiki(base, opts) {
  const data = wikiData(base, opts);
  const html = wikiHtml(data);
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

// ---------- main ----------

const argv = process.argv.slice(2);
const flags = { out: null, noOpen: false, public: false };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out") { flags.out = resolve(argv[i + 1]); argv.splice(i, 2); i--; }
  else if (argv[i] === "--no-open") { flags.noOpen = true; argv.splice(i, 1); i--; }
  else if (argv[i] === "--public") { flags.public = true; argv.splice(i, 1); i--; }
}
const [cmd, arg] = argv;
const root = process.cwd();

if (cmd === "check") {
  const base = resolve(arg || join(root, ".concepts"));
  if (!existsSync(base)) { console.error(`no base at ${base}`); process.exit(2); }
  const { errors, warnings, count } = check(base);
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`error: ${e}`);
  console.log(`${count} concepts, ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
} else if (cmd === "init") {
  const made = init(root);
  console.log(made.length ? `created: ${made.join(", ")}` : "nothing to do");
  console.log("Next: ask your agent to set up concepts.");
} else if (cmd === "wiki") {
  const base = resolve(arg || join(root, ".concepts"));
  if (!existsSync(base)) { console.error(`no base at ${base}`); process.exit(2); }
  const r = wiki(base, flags);
  console.log(`${r.count} concepts, ${r.errors} errors → ${r.out}`);
} else {
  console.log("usage: concepts <init | check [path] | wiki [path] [--out file] [--no-open] [--public]>");
  process.exit(cmd ? 2 : 0);
}
