/**
 * Minimal zero-dependency QR Code generator (ISO/IEC 18004, Byte mode, EC Level M, Versions 1–10).
 * Supports up to 213 UTF-8 bytes — plenty for LINE oaMessage deep links.
 */

type VersionSpec = {
  version: number;
  /** Data codewords per block group: [count, dataCodewords] */
  groups: [number, number][];
  ecPerBlock: number;
  alignments: number[];
  remainderBits: number;
};

// Error Correction Level M specifications (ISO/IEC 18004 Table 9 & Table E.1).
const SPECS: VersionSpec[] = [
  { version: 1, groups: [[1, 16]], ecPerBlock: 10, alignments: [], remainderBits: 0 },
  { version: 2, groups: [[1, 28]], ecPerBlock: 16, alignments: [6, 18], remainderBits: 7 },
  { version: 3, groups: [[1, 44]], ecPerBlock: 26, alignments: [6, 22], remainderBits: 7 },
  { version: 4, groups: [[2, 32]], ecPerBlock: 18, alignments: [6, 26], remainderBits: 7 },
  { version: 5, groups: [[2, 43]], ecPerBlock: 24, alignments: [6, 30], remainderBits: 7 },
  { version: 6, groups: [[4, 27]], ecPerBlock: 16, alignments: [6, 34], remainderBits: 7 },
  { version: 7, groups: [[4, 31]], ecPerBlock: 18, alignments: [6, 22, 38], remainderBits: 0 },
  {
    version: 8,
    groups: [
      [2, 38],
      [2, 39],
    ],
    ecPerBlock: 22,
    alignments: [6, 24, 42],
    remainderBits: 0,
  },
  {
    version: 9,
    groups: [
      [3, 36],
      [2, 37],
    ],
    ecPerBlock: 22,
    alignments: [6, 26, 46],
    remainderBits: 0,
  },
  {
    version: 10,
    groups: [
      [4, 43],
      [1, 44],
    ],
    ecPerBlock: 26,
    alignments: [6, 28, 50],
    remainderBits: 0,
  },
];

// GF(256) with primitive polynomial 0x11d (x^8 + x^4 + x^3 + x^2 + 1).
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

function rsGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGenerator(ecLen);
  const res = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[ecLen - 1] = 0;
    for (let j = 0; j < ecLen; j++) {
      res[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return res;
}

function totalDataBytes(spec: VersionSpec): number {
  return spec.groups.reduce((sum, [count, size]) => sum + count * size, 0);
}

function pickSpec(byteLen: number): VersionSpec {
  for (const spec of SPECS) {
    const countBits = spec.version <= 9 ? 8 : 16;
    const capacityBits = totalDataBytes(spec) * 8;
    if (4 + countBits + byteLen * 8 <= capacityBits) return spec;
  }
  throw new Error("QR payload exceeds maximum supported length");
}

function encodeCodewords(bytes: Uint8Array, spec: VersionSpec): number[] {
  const totalData = totalDataBytes(spec);
  const countBits = spec.version <= 9 ? 8 : 16;
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };

  // Byte mode indicator (0100) + length + payload.
  pushBits(0b0100, 4);
  pushBits(bytes.length, countBits);
  for (const b of bytes) pushBits(b, 8);

  // Terminator (up to 4 zeros) + pad to byte boundary + 0xEC / 0x11 pad bytes.
  const capacityBits = totalData * 8;
  const termLen = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const data = new Uint8Array(totalData);
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data[i / 8] = b;
  }
  const padBytes = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < totalData; i++, p++) {
    data[i] = padBytes[p & 1];
  }

  // Split into RS blocks & interleave data then EC codewords.
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (const [count, size] of spec.groups) {
    for (let i = 0; i < count; i++) {
      const block = data.slice(offset, offset + size);
      offset += size;
      dataBlocks.push(block);
      ecBlocks.push(rsRemainder(block, spec.ecPerBlock));
    }
  }

  const out: number[] = [];
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const b of ecBlocks) out.push(b[i]);
  }
  return out;
}

function buildMatrix(spec: VersionSpec): {
  size: number;
  modules: Uint8Array;
  isFunc: Uint8Array;
} {
  const size = 17 + spec.version * 4;
  const modules = new Uint8Array(size * size);
  const isFunc = new Uint8Array(size * size);

  const setFunc = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    modules[r * size + c] = dark ? 1 : 0;
    isFunc[r * size + c] = 1;
  };

  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
        setFunc(r, c, dist !== 2 && dist !== 4);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    setFunc(6, i, dark);
    setFunc(i, 6, dark);
  }

  // Alignment patterns.
  const coords = spec.alignments;
  for (const r of coords) {
    for (const c of coords) {
      if (isFunc[r * size + c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(r + dr, c + dc, dist !== 1);
        }
      }
    }
  }

  // Reserve format info strips + dark module.
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFunc(8, size - 1 - i, false);
    if (i < 7) setFunc(size - 1 - i, 8, false);
  }
  setFunc(size - 8, 8, true);

  // Version info for Version >= 7 (18-bit BCH(18, 6), G = 0x1f25).
  if (spec.version >= 7) {
    let rem = spec.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (spec.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      setFunc(a, b, dark);
      setFunc(b, a, dark);
    }
  }

  return { size, modules, isFunc };
}

function drawFormatBits(
  size: number,
  modules: Uint8Array,
  mask: number,
): void {
  // EC Level M = 0b00.
  const data = (0b00 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  for (let i = 0; i <= 5; i++) modules[8 * size + i] = (bits >>> i) & 1;
  modules[8 * size + 7] = (bits >>> 6) & 1;
  modules[8 * size + 8] = (bits >>> 7) & 1;
  modules[7 * size + 8] = (bits >>> 8) & 1;
  for (let i = 9; i < 15; i++) modules[(14 - i) * size + 8] = (bits >>> i) & 1;

  for (let i = 0; i < 8; i++) {
    modules[8 * size + (size - 1 - i)] = (bits >>> i) & 1;
  }
  for (let i = 8; i < 15; i++) {
    modules[(size - 15 + i) * size + 8] = (bits >>> i) & 1;
  }
}

const MASK_FNS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function penaltyScore(size: number, modules: Uint8Array): number {
  let score = 0;

  // N1: 5+ consecutive same-colored modules in row/col.
  for (let r = 0; r < size; r++) {
    let runColor = modules[r * size];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      const v = modules[r * size + c];
      if (v === runColor) runLen++;
      else {
        if (runLen >= 5) score += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) score += 3 + (runLen - 5);
  }
  for (let c = 0; c < size; c++) {
    let runColor = modules[c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      const v = modules[r * size + c];
      if (v === runColor) runLen++;
      else {
        if (runLen >= 5) score += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) score += 3 + (runLen - 5);
  }

  // N2: 2x2 blocks of same color.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r * size + c];
      if (
        v === modules[r * size + c + 1] &&
        v === modules[(r + 1) * size + c] &&
        v === modules[(r + 1) * size + c + 1]
      ) {
        score += 3;
      }
    }
  }

  // N3: 1:1:3:1:1 finder-like patterns.
  const isPattern = (arr: number[]) => {
    const a = arr.join("");
    return a === "10111010000" || a === "00001011101";
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      const slice = Array.from({ length: 11 }, (_, k) => modules[r * size + c + k]);
      if (isPattern(slice)) score += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      const slice = Array.from({ length: 11 }, (_, k) => modules[(r + k) * size + c]);
      if (isPattern(slice)) score += 40;
    }
  }

  // N4: dark module balance around 50%.
  let dark = 0;
  for (let i = 0; i < modules.length; i++) dark += modules[i];
  const pct = (dark * 100) / modules.length;
  const k = Math.floor(Math.abs(pct - 50) / 5);
  score += k * 10;

  return score;
}

export type QrMatrix = {
  size: number;
  modules: Uint8Array;
};

export function encodeQr(text: string): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  const spec = pickSpec(bytes.length);
  const codewords = encodeCodewords(bytes, spec);
  const { size, modules: base, isFunc } = buildMatrix(spec);

  // Place codeword bits in zigzag columns right-to-left.
  let bitIdx = 0;
  const totalBits = codewords.length * 8 + spec.remainderBits;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (isFunc[r * size + c]) continue;
        let dark = false;
        if (bitIdx < codewords.length * 8) {
          const cw = codewords[bitIdx >>> 3];
          dark = ((cw >>> (7 - (bitIdx & 7))) & 1) === 1;
        }
        if (bitIdx < totalBits) base[r * size + c] = dark ? 1 : 0;
        bitIdx++;
      }
    }
  }

  // Try all 8 masks and keep the lowest-penalty matrix.
  let bestMask = 0;
  let bestScore = Infinity;
  let bestModules = base;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = new Uint8Array(base);
    const fn = MASK_FNS[mask];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunc[r * size + c] && fn(r, c)) {
          candidate[r * size + c] ^= 1;
        }
      }
    }
    drawFormatBits(size, candidate, mask);
    const s = penaltyScore(size, candidate);
    if (s < bestScore) {
      bestScore = s;
      bestMask = mask;
      bestModules = candidate;
    }
  }

  void bestMask;
  return { size, modules: bestModules };
}

/** Builds a single compact SVG path string for all dark modules (with optional quiet-zone offset). */
export function qrSvgPath(text: string, margin = 2): { viewBoxSize: number; path: string } {
  const { size, modules } = encodeQr(text);
  const parts: string[] = [];
  for (let r = 0; r < size; r++) {
    let runStart = -1;
    for (let c = 0; c <= size; c++) {
      const dark = c < size && modules[r * size + c] === 1;
      if (dark && runStart === -1) {
        runStart = c;
      } else if (!dark && runStart !== -1) {
        parts.push(`M${runStart + margin} ${r + margin}h${c - runStart}v1h-${c - runStart}z`);
        runStart = -1;
      }
    }
  }
  return { viewBoxSize: size + margin * 2, path: parts.join("") };
}
