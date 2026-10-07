// Generates the favicon set with no dependencies: a black tile with the concepts mark
// (one node, three connections). Writes favicon.svg, favicon.ico and apple-touch-icon.png.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const BLUE = [17, 19, 24]; // the tile colour: near-black, matching the site's text colour
// Geometry in a 32-unit square.
const CENTER = [16, 17, 4.6];
const SATELLITES = [[7, 8, 2.7], [25, 8, 2.7], [16, 28, 2.7]];
const LINE_W = 2.3;
const TILE_R = 7;

function insideTile(x, y) {
  const r = TILE_R, cx = Math.min(Math.max(x, r), 32 - r), cy = Math.min(Math.max(y, r), 32 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function insideMark(x, y) {
  if (Math.hypot(x - CENTER[0], y - CENTER[1]) <= CENTER[2]) return true;
  for (const [sx, sy, sr] of SATELLITES) {
    if (Math.hypot(x - sx, y - sy) <= sr) return true;
    if (distToSegment(x, y, CENTER[0], CENTER[1], sx, sy) <= LINE_W / 2) return true;
  }
  return false;
}

function raster(size, markOnly) {
  const px = new Uint8Array(size * size * 4);
  const ss = 4; // supersampling per axis
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let tile = 0, mark = 0;
    for (let i = 0; i < ss; i++) for (let j = 0; j < ss; j++) {
      const u = ((x + (i + 0.5) / ss) / size) * 32, v = ((y + (j + 0.5) / ss) / size) * 32;
      if (insideTile(u, v)) { tile++; if (insideMark(u, v)) mark++; }
    }
    const n = ss * ss, a = tile / n, m = tile ? mark / tile : 0;
    const o = (y * size + x) * 4;
    if (markOnly) { px[o] = BLUE[0]; px[o + 1] = BLUE[1]; px[o + 2] = BLUE[2]; px[o + 3] = Math.round(255 * (mark / n)); continue; }
    px[o] = Math.round(BLUE[0] + (255 - BLUE[0]) * m);
    px[o + 1] = Math.round(BLUE[1] + (255 - BLUE[1]) * m);
    px[o + 2] = Math.round(BLUE[2] + (255 - BLUE[2]) * m);
    px[o + 3] = Math.round(255 * a);
  }
  return px;
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, markOnly) {
  const px = raster(size, markOnly);
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) { rows[y * (size * 4 + 1)] = 0; Buffer.from(px.buffer, y * size * 4, size * 4).copy(rows, y * (size * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function ico(pngBuf, size) {
  const h = Buffer.alloc(6); h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);
  const e = Buffer.alloc(16); e[0] = size === 256 ? 0 : size; e[1] = size === 256 ? 0 : size; e[2] = 0; e[3] = 0;
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngBuf.length, 8); e.writeUInt32LE(22, 12);
  return Buffer.concat([h, e, pngBuf]);
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="${TILE_R}" fill="rgb(${BLUE.join(",")})"/><path d="M16 17 L7 8 M16 17 L25 8 M16 17 L16 28" stroke="#fff" stroke-width="${LINE_W}" fill="none"/><circle cx="16" cy="17" r="${CENTER[2]}" fill="#fff"/><circle cx="7" cy="8" r="2.7" fill="#fff"/><circle cx="25" cy="8" r="2.7" fill="#fff"/><circle cx="16" cy="28" r="2.7" fill="#fff"/></svg>`;

export function writeIcons(dir) {
  writeFileSync(join(dir, "favicon.svg"), SVG);
  writeFileSync(join(dir, "favicon.ico"), ico(png(32), 32));
  writeFileSync(join(dir, "apple-touch-icon.png"), png(180));
  writeFileSync(join(dir, "icon-512.png"), png(512));
}

export function pngBuffer(size, markOnly) { return png(size, markOnly); }
