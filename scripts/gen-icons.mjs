// Pure-Node PNG icon generator (no native deps). Draws the app mark:
// an indigo rounded square with a white checkmark and a band-meter stripe.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// --- minimal PNG encoder ---------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- drawing helpers -------------------------------------------------------
function hex(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}
function makeCanvas(size) {
  return { size, buf: Buffer.alloc(size * size * 4) };
}
function px(cv, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= cv.size || y >= cv.size) return;
  const i = (y * cv.size + x) * 4;
  const ia = a / 255;
  const br = cv.buf[i];
  const bg = cv.buf[i + 1];
  const bb = cv.buf[i + 2];
  const ba = cv.buf[i + 3] / 255;
  const outA = ia + ba * (1 - ia);
  if (outA === 0) {
    cv.buf[i] = cv.buf[i + 1] = cv.buf[i + 2] = cv.buf[i + 3] = 0;
    return;
  }
  cv.buf[i] = Math.round((r * ia + br * ba * (1 - ia)) / outA);
  cv.buf[i + 1] = Math.round((g * ia + bg * ba * (1 - ia)) / outA);
  cv.buf[i + 2] = Math.round((b * ia + bb * ba * (1 - ia)) / outA);
  cv.buf[i + 3] = Math.round(outA * 255);
}
function fillRoundRect(cv, x0, y0, w, h, radius, color, alpha = 255) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dxL = x - (x0 + radius);
      const dxR = x - (x0 + w - 1 - radius);
      const dyT = y - (y0 + radius);
      const dyB = y - (y0 + h - 1 - radius);
      let inside = true;
      if (dxL < 0 && dyT < 0) inside = dxL * dxL + dyT * dyT <= radius * radius;
      else if (dxR > 0 && dyT < 0) inside = dxR * dxR + dyT * dyT <= radius * radius;
      else if (dxL < 0 && dyB > 0) inside = dxL * dxL + dyB * dyB <= radius * radius;
      else if (dxR > 0 && dyB > 0) inside = dxR * dxR + dyB * dyB <= radius * radius;
      if (inside) px(cv, x, y, color, alpha);
    }
  }
}
// thick line via per-pixel distance to segment
function drawThickLine(cv, x1, y1, x2, y2, thickness, color) {
  const minX = Math.floor(Math.min(x1, x2) - thickness);
  const maxX = Math.ceil(Math.max(x1, x2) + thickness);
  const minY = Math.floor(Math.min(y1, y2) - thickness);
  const maxY = Math.ceil(Math.max(y1, y2) + thickness);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const r = thickness / 2;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let t = ((x - x1) * dx + (y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px0 = x1 + t * dx;
      const py0 = y1 + t * dy;
      const dist = Math.hypot(x - px0, y - py0);
      const aa = r - dist; // anti-alias edge
      if (aa >= 1) px(cv, x, y, color);
      else if (aa > 0) px(cv, x, y, color, Math.round(aa * 255));
    }
  }
}

function renderIcon(size, { maskable }) {
  const cv = makeCanvas(size);
  const indigo = hex('#4338CA');
  const white = hex('#ffffff');
  const green = hex('#0e9f6e');
  const amber = hex('#c2710c');
  const red = hex('#d4451f');

  // background
  if (maskable) {
    // full-bleed for safe zone
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) px(cv, x, y, indigo);
  } else {
    fillRoundRect(cv, 0, 0, size, size, Math.round(size * 0.22), indigo);
  }

  // content inset (smaller for maskable safe zone)
  const pad = maskable ? size * 0.26 : size * 0.2;
  const inner = size - pad * 2;

  // checkmark
  const t = Math.max(2, Math.round(inner * 0.14));
  const x1 = pad + inner * 0.16;
  const y1 = pad + inner * 0.52;
  const x2 = pad + inner * 0.42;
  const y2 = pad + inner * 0.74;
  const x3 = pad + inner * 0.86;
  const y3 = pad + inner * 0.26;
  drawThickLine(cv, x1, y1, x2, y2, t, white);
  drawThickLine(cv, x2, y2, x3, y3, t, white);

  // band-meter stripe near the bottom (red -> amber -> green)
  const barY = Math.round(pad + inner * 0.9);
  const barH = Math.max(3, Math.round(inner * 0.08));
  const barX = Math.round(pad + inner * 0.06);
  const barW = Math.round(inner * 0.88);
  const r = Math.round(barH / 2);
  fillRoundRect(cv, barX, barY, Math.round(barW * 0.33), barH, r, red);
  fillRoundRect(cv, barX + Math.round(barW * 0.33), barY, Math.round(barW * 0.34), barH, 0, amber);
  fillRoundRect(cv, barX + Math.round(barW * 0.67), barY, Math.round(barW * 0.33), barH, r, green);

  return encodePNG(size, size, cv.buf);
}

function writePNG(name, buf) {
  const p = resolve(OUT, name);
  writeFileSync(p, buf);
  console.log('wrote', p, `(${buf.length} bytes)`);
}

writePNG('icon-192.png', renderIcon(192, { maskable: false }));
writePNG('icon-512.png', renderIcon(512, { maskable: false }));
writePNG('icon-512-maskable.png', renderIcon(512, { maskable: true }));
writePNG('apple-touch-icon.png', renderIcon(180, { maskable: false }));
console.log('icons done');
