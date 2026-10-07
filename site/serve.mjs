#!/usr/bin/env node
// Local preview of site/dist with the same clean-URL rule as nginx: /spec serves spec.html.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.argv[2] || 8766);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const candidates = [join(dist, path), join(dist, path + ".html"), join(dist, path, "index.html")];
  const file = candidates.find((f) => existsSync(f) && statSync(f).isFile());
  if (!file) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`http://localhost:${port}/`));
