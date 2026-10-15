const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPNG(width, height, drawFn) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type);
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([lenBuf, body, crcBuf]);
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function drawBrutalistIcon(x, y, w, h, isMaskable = false) {
  // Normalize coordinates 0.0 to 1.0
  const nx = x / w;
  const ny = y / h;

  // Background
  const bgCol = [17, 17, 17, 255]; // #111111

  // Card geometry: In maskable, keep within safe zone (center 75%)
  const margin = isMaskable ? 0.16 : 0.08;
  const cardW = 1 - margin * 2;
  const cardH = 1 - margin * 2;
  const cardX = margin;
  const cardY = margin;
  const shadowOffset = isMaskable ? 0.04 : 0.05;
  const borderWidth = isMaskable ? 0.03 : 0.035;

  // Shadow check
  const inShadow = (nx >= cardX + shadowOffset && nx <= cardX + cardW + shadowOffset &&
                    ny >= cardY + shadowOffset && ny <= cardY + cardH + shadowOffset);
  // Main card check
  const inCard = (nx >= cardX && nx <= cardX + cardW && ny >= cardY && ny <= cardY + cardH);

  if (inCard) {
    // Border check
    const onBorder = (nx <= cardX + borderWidth || nx >= cardX + cardW - borderWidth ||
                      ny <= cardY + borderWidth || ny >= cardY + cardH - borderWidth);
    if (onBorder) {
      return [5, 5, 5, 255]; // #050505
    }

    // Inside card - yellow base #FFE66D
    // Local coords inside card [0..1]
    const lx = (nx - cardX) / cardW;
    const ly = (ny - cardY) / cardH;

    // Bold Sigma + Sprint Bolt math symbol
    // Top bar
    if (ly >= 0.22 && ly <= 0.33 && lx >= 0.22 && lx <= 0.78) return [5, 5, 5, 255];
    // Bottom bar
    if (ly >= 0.67 && ly <= 0.78 && lx >= 0.22 && lx <= 0.78) return [5, 5, 5, 255];
    
    // Diagonal chevron connecting top-right & bottom-right to center
    // Upper diagonal: from (0.74, 0.28) to (0.42, 0.50)
    // Lower diagonal: from (0.42, 0.50) to (0.74, 0.72)
    const dUpper = Math.abs((lx - 0.42) - (0.74 - 0.42) * ((0.50 - ly) / (0.50 - 0.28)));
    const dLower = Math.abs((lx - 0.42) - (0.74 - 0.42) * ((ly - 0.50) / (0.72 - 0.50)));
    
    if (ly >= 0.28 && ly <= 0.50 && dUpper < 0.10) return [5, 5, 5, 255];
    if (ly >= 0.50 && ly <= 0.72 && dLower < 0.10) return [5, 5, 5, 255];

    // Neon accent stamp (Pink square at top right)
    if (lx >= 0.72 && lx <= 0.82 && ly >= 0.15 && ly <= 0.25) return [255, 119, 183, 255];

    // Lime accent stamp (bottom left)
    if (lx >= 0.16 && lx <= 0.26 && ly >= 0.75 && ly <= 0.85) return [198, 245, 95, 255];

    return [255, 230, 109, 255]; // #FFE66D
  }

  if (inShadow) {
    return [5, 5, 5, 255];
  }

  return bgCol;
}

const outDir = path.join(__dirname, '..', 'assets', 'icons');
fs.mkdirSync(outDir, { recursive: true });

console.log('Generating icon-192.png...');
const p192 = createPNG(192, 192, (x, y, w, h) => drawBrutalistIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-192.png'), p192);

console.log('Generating icon-512.png...');
const p512 = createPNG(512, 512, (x, y, w, h) => drawBrutalistIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), p512);

console.log('Generating icon-maskable-512.png...');
const pMask = createPNG(512, 512, (x, y, w, h) => drawBrutalistIcon(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), pMask);

console.log('All icons generated successfully!');
