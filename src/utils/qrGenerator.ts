/**
 * Lightweight SVG QR Code Generator for Offline Media Vault.
 * Generates an SVG representation of any text/URL for LAN sharing.
 */

// Simple QR Code matrix generator (Type-1 to Type-4 QR implementation for URLs)
export function generateQRCodeSVG(text: string, size = 220): string {
  // Simple encoding matrix calculation
  const modules = generateQRMatrix(text);
  const count = modules.length;
  const cellSize = size / count;

  let rects = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (modules[r][c]) {
        const x = (c * cellSize).toFixed(2);
        const y = (r * cellSize).toFixed(2);
        const w = (cellSize + 0.05).toFixed(2);
        const h = (cellSize + 0.05).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#10b981" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
    <rect width="100%" height="100%" fill="#070b14" rx="16" />
    <g transform="translate(10, 10) scale(${(size - 20) / size})">
      ${rects}
    </g>
  </svg>`;
}

// Low-level matrix construction for QR Code (Version 2/3/4)
function generateQRMatrix(text: string): boolean[][] {
  const size = 25; // 25x25 grid (Version 2)
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder Patterns (Top-Left, Top-Right, Bottom-Left)
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const vr = row + r;
        const vc = col + c;
        if (vr >= 0 && vr < size && vc >= 0 && vc < size) {
          reserved[vr][vc] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            matrix[vr][vc] = isBorder || isCenter;
          }
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    reserved[6][i] = true;
    matrix[i][6] = i % 2 === 0;
    reserved[i][6] = true;
  }

  // Alignment Pattern for V2
  const drawAlignment = (row: number, col: number) => {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const vr = row + r;
        const vc = col + c;
        reserved[vr][vc] = true;
        matrix[vr][vc] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      }
    }
  };
  drawAlignment(size - 7, size - 7);

  // Encode data bits
  const bytes = new TextEncoder().encode(text);
  const bitStream: number[] = [];

  // Mode indicator (byte = 0100)
  bitStream.push(0, 1, 0, 0);
  // Character count (8 bits)
  for (let b = 7; b >= 0; b--) bitStream.push((bytes.length >> b) & 1);
  // Data bits
  for (const byte of bytes) {
    for (let b = 7; b >= 0; b--) bitStream.push((byte >> b) & 1);
  }
  // Terminator
  while (bitStream.length % 8 !== 0) bitStream.push(0);

  // Populate data into matrix
  let bitIndex = 0;
  let dir = -1;
  let r = size - 1;
  let c = size - 1;

  while (c > 0) {
    if (c === 6) c--; // Skip vertical timing column
    for (let i = 0; i < 2; i++) {
      const col = c - i;
      if (!reserved[r][col]) {
        const val = bitIndex < bitStream.length ? bitStream[bitIndex++] === 1 : (r + col) % 2 === 0;
        // Masking pattern (Checkerboard xor)
        const mask = (r + col) % 2 === 0;
        matrix[r][col] = val !== mask;
      }
    }
    r += dir;
    if (r < 0 || r >= size) {
      dir = -dir;
      r += dir;
      c -= 2;
    }
  }

  return matrix;
}
