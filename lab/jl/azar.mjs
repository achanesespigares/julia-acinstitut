// azar.mjs · Los números al azar de Julia 1.13, para el capítulo «Probabilidad y simulación»
// (Mirar y ver · Julia · cómo piensa tu código · AC Institut)
//
// Julia genera los números al azar con Xoshiro256++, un generador con cuatro números de 64 bits de estado.
// Random.seed!(n) calcula ese estado con SHA-256 a partir de n, así que con la misma semilla salen los
// mismos números en cualquier ordenador. trazar.jl empieza cada programa con Random.seed!(1), y el
// laboratorio también. Aquí se copian los algoritmos de Julia paso a paso:
//   · rand() toma los 53 bits altos de un UInt64;
//   · rand(a:b) usa el método «casi sin divisiones» de Lemire (SamplerRangeNDL);
//   · rand(n) con n ≥ 8 rellena el vector con 8 generadores intercalados (XoshiroSimd), sembrados desde el
//     principal, y los últimos con el principal;
//   · randn() usa el zigurat de Marsaglia con las tablas de Julia. En el raro caso de la cola (o de la
//     zona triangular), Julia usa log1p y exp, cuya última cifra puede depender del procesador: el
//     laboratorio la calcula de las dos formas posibles y, si no coinciden, lo dice (NoSoportado).
import { NoSoportado, ErrorJulia } from "./valores.mjs";
import * as V from "./valores.mjs";
import * as MX from "./matrices.mjs";
import { KI, WI, FI, ZIG_R, ZIG_INV_R, T_LOG } from "./tablas-azar.mjs";

const M64 = (1n << 64n) - 1n;
const rotl = (x, k) => ((x << BigInt(k)) | (x >> BigInt(64 - k))) & M64;

// ── SHA-256 (para Random.seed!) ──────────────────────────────────────────
const K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
export function sha256(bytes) {
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const L = bytes.length, total = Math.ceil((L + 9) / 64) * 64, m = new Uint8Array(total);
  m.set(bytes); m[L] = 0x80;
  const bits = BigInt(L) * 8n;
  for (let i = 0; i < 8; i++) m[total - 1 - i] = Number((bits >> BigInt(8 * i)) & 0xffn);
  const W = new Uint32Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = r(W[i - 15], 7) ^ r(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = r(W[i - 2], 17) ^ r(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + W[i]) >>> 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  const out = new Uint8Array(32);
  H.forEach((x, i) => { out[4 * i] = x >>> 24; out[4 * i + 1] = (x >>> 16) & 255; out[4 * i + 2] = (x >>> 8) & 255; out[4 * i + 3] = x & 255; });
  return out;
}
// Random.hash_seed(::Integer): palabras de 32 bits, de la menos significativa a la más, y un 0x01 si es negativo
function bytesSemilla(n) {
  const neg = n < 0n;
  if (neg) n = ~n;
  const b = [];
  do { const w = n & 0xffffffffn; n >>= 32n; for (let i = 0; i < 4; i++) b.push(Number((w >> BigInt(8 * i)) & 0xffn)); } while (n !== 0n);
  if (neg) b.push(1);
  return b;
}
export function estadoDeSemilla(n) {
  const d = sha256(bytesSemilla(n));
  const s = [];
  for (let k = 0; k < 4; k++) { let x = 0n; for (let i = 7; i >= 0; i--) x = (x << 8n) | BigInt(d[8 * k + i]); s.push(x); }
  return s;
}

// ── Xoshiro256++ ─────────────────────────────────────────────────────────
export class Xoshiro {
  constructor(s) { this.s = s.slice(); }
  siguiente() {            // rand(rng, UInt64)
    let [s0, s1, s2, s3] = this.s;
    const res = (rotl((s0 + s3) & M64, 23) + s0) & M64;
    const t = (s1 << 17n) & M64;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = rotl(s3, 45);
    this.s = [s0, s1, s2, s3];
    return res;
  }
}
const aDecimal = u => Number(u >> 11n) * 2 ** -53;       // _uint2float(u, Float64)
// XoshiroSimd.xoshiro_bulk: n valores de 64 bits para rellenar un vector (Float64 o UInt64)
const FORK = [0x02011ce34bce797fn, 0x5a94851fb48a6e05n, 0x3688cf5d48899fa7n, 0x867b4bb4c42e5661n];
export function enBloque(g, n) {
  const out = [];
  if (8 * n >= 64) {             // simdThreshold: 64 bytes
    const N = 8, lanes = FORK.map(c => Array.from({ length: N }, () => (c * g.siguiente()) & M64));
    const v = Array.from({ length: N }, (_, j) => new Xoshiro([lanes[0][j], lanes[1][j], lanes[2][j], lanes[3][j]]));
    while (out.length + N <= n) for (let j = 0; j < N; j++) out.push(v[j].siguiente());
  }
  while (out.length < n) out.push(g.siguiente());
  return out;
}
// Bool en bloque: cada byte es 0 o 1 (los bits 0, 8, 16… de cada número, desplazados de 0 a 7)
export function boolsEnBloque(g, n) {
  const out = [], MASK = 0x0101010101010101n;
  const bytes = (x, k) => { for (let i = 0; i < 8 && out.length < k; i++) out.push(Number((x >> BigInt(8 * i)) & 1n) === 1); };
  if (n >= 640) {
    const N = 8, lanes = FORK.map(c => Array.from({ length: N }, () => (c * g.siguiente()) & M64));
    const v = Array.from({ length: N }, (_, j) => new Xoshiro([lanes[0][j], lanes[1][j], lanes[2][j], lanes[3][j]]));
    while (out.length + 64 * N <= n) {
      const res = v.map(x => x.siguiente());
      for (let k = 0; k < 8; k++) for (let j = 0; j < N; j++) bytes((res[j] >> BigInt(k)) & MASK, out.length + 8);
    }
  }
  while (out.length + 8 <= n) {
    const res = g.siguiente();
    for (let sh = 0; sh < 8 && out.length + 8 <= n; sh++) bytes((res >> BigInt(sh)) & MASK, out.length + 8);
  }
  if (out.length < n) bytes(g.siguiente() & MASK, n);
  return out;
}

// rand(a:b) con enteros: SamplerRangeNDL (Lemire, «nearly divisionless»)
export function entero(g, a, b) {
  const s = ((b - a) & M64) + 1n & M64;
  let x = g.siguiente(), m = x * s;
  let r;
  if ((m & M64) < s) {
    const t = ((M64 + 1n - s) % s);
    while ((m & M64) < t) { x = g.siguiente(); m = x * s; }
    r = m >> 64n;
  } else r = s === 0n ? x : m >> 64n;
  return BigInt.asIntN(64, r + a);
}

// ── log1p de Julia (base/special/log.jl), con fma exacto ─────────────────
function fma(a, b, c) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return a * b + c;
  const [m1, e1] = MX.exacto(a), [m2, e2] = MX.exacto(b), [m3, e3] = MX.exacto(c);
  const ep = e1 + e2, E = Math.min(ep, e3);
  const S = ((m1 * m2) << BigInt(ep - E)) + (m3 << BigInt(e3 - E));
  return redondea(S, E);
}
function redondea(S, E) {
  if (S === 0n) return 0;
  const neg = S < 0n; let A = neg ? -S : S;
  const L = A.toString(2).length;
  if (L > 53) {
    const sh = BigInt(L - 53); let q = A >> sh; const rem = A & ((1n << sh) - 1n), half = 1n << (sh - 1n);
    if (rem > half || (rem === half && (q & 1n))) q += 1n;
    A = q; E += L - 53;
  }
  const v = Number(A) * 2 ** E;
  return neg ? -v : v;
}
// muladd: Julia puede juntarlo en un fma o no, según el procesador. fusionado = true o false
const muladd = (x, y, z, fusionado) => fusionado ? fma(x, y, z) : x * y + z;
const horner = (v, cs, fus) => { let r = cs[cs.length - 1]; for (let i = cs.length - 2; i >= 0; i--) r = muladd(v, r, cs[i], fus); return r; };
const F64 = new Float64Array(1), U64 = new BigUint64Array(F64.buffer);
const bits = x => { F64[0] = x; return U64[0]; };
const deBits = u => { U64[0] = u; return F64[0]; };
function log1pJulia(x, fus) {
  if (!(x > -1)) throw new NoSoportado("log1p fuera de su dominio");
  if (-1.1102230246251565e-16 < x && x < 1.1102230246251565e-16) return x;
  if (-0.06058693718652422 < x && x < 0.06449445891785943) {           // log_proc2
    const g = 1.0 / (2.0 + x), u = 2.0 * x * g, v = u * u;
    const q = u * v * horner(v, [0.08333333333333179, 0.012500000003771751, 0.0022321399879194482, 0.0004348877777076146], fus);
    return fma(1.0, u, fma(0.0, u, 1.0 * fma(fma(-u, x, 2 * (x - u)), g, q)));
  }
  const z = 1.0 + x, zu = bits(z);
  const s = deBits(0x7fe0000000000000n - (zu & 0xfff0000000000000n));
  const m = Number((zu >> 52n) & 0x7ffn) - 1023;
  const c = m > 0 ? 1.0 - (z - x) : x - (z - 1.0);
  const y = deBits((zu & 0x000fffffffffffffn) | 0x3ff0000000000000n);
  const mf = m, F = (y + 3.5184372088832e13) - 3.5184372088832e13, f = (y - F) + c * s;
  const jp = Math.trunc(128.0 * F) - 127;                                 // log_proc1
  const [hi, lo] = T_LOG[jp - 1];
  const l_hi = mf * 0.6931471805601177 + hi, l_lo = mf * -1.7239444525614835e-13 + lo;
  const u = (2.0 * f) / (y + F), v = u * u, q = u * v * horner(v, [0.08333333333303913, 0.012500053168098584], fus);
  return fma(1.0, l_hi, fma(1.0, (u + (q + l_lo)), 0.0 * l_hi));
}
function log1pSeguro(x) {
  const a = log1pJulia(x, true), b = log1pJulia(x, false);
  if (a !== b) throw new NoSoportado("este randn: en un caso raro (uno de cada mil, más o menos), Julia calcula un logaritmo cuya última cifra depende del procesador");
  return a;
}

// ── randn: el zigurat de Julia (Random/src/normal.jl) ────────────────────
export function normalDe(g, r) {          // _randn(rng, r) con los 52 bits de r
  r &= 0x000fffffffffffffn;
  const rabs = r >> 1n, idx = Number(rabs & 0xffn);
  const x = Number((r & 1n) ? -rabs : rabs) * WI[idx];
  if (rabs < KI[idx]) return x;
  return normalRara(g, idx, rabs, x);
}
function normalRara(g, idx, rabs, x) {
  if (idx === 0) {
    for (;;) {
      const xx = -ZIG_INV_R * log1pSeguro(-aDecimal(g.siguiente()));
      const yy = -log1pSeguro(-aDecimal(g.siguiente()));
      const a = yy + yy, b = xx * xx;
      if (a === b) throw new NoSoportado("este randn (un empate en el caso raro de la cola)");
      if (a > b) return ((rabs >> 8n) & 1n) ? -ZIG_R - xx : ZIG_R + xx;
    }
  }
  const izq = (FI[idx - 1] - FI[idx]) * aDecimal(g.siguiente()) + FI[idx], der = Math.exp(-0.5 * x * x);
  if (Math.abs(izq - der) <= 1e-13 * der) throw new NoSoportado("este randn: en un caso raro, Julia compara con una exponencial cuya última cifra depende del procesador");
  if (izq < der) return x;
  return normal(g);
}
export const normal = g => normalDe(g, g.siguiente() >> 12n);
export const decimal = g => aDecimal(g.siguiente());
export { aDecimal, fma, muladd, horner, bits, deBits };

// ── Las funciones del laboratorio: rand, randn, Random.seed! ─────────────
const RNG = { T: "RNG" };
export function funcionesDeAzar(P, fn, prog) {
  prog.rng = new Xoshiro(estadoDeSemilla(1n));          // trazar.jl empieza cada programa con Random.seed!(1)
  const g = () => prog.rng;
  const I = n => ({ T: "Int64", v: BigInt.asIntN(64, BigInt(n)) }), F = x => ({ T: "Float64", v: x }), B = b => ({ T: "Bool", v: b });
  const esTipo = (x, n) => x && x.T === "Tipo" && x.nombre === n;
  const tamano = (dims, nombre) => {
    if (!dims.every(d => d.T === "Int64")) throw new NoSoportado(nombre + " con estos argumentos");
    if (dims.length > 2) throw new NoSoportado(nombre + " con más de dos dimensiones");
    const ns = dims.map(d => Number(d.v));
    if (ns.some(n => n < 0)) throw new ErrorJulia("ArgumentError: invalid Array dimensions");
    return ns;
  };
  const arreglo = (el, ns, vals) => ns.length === 1 ? V.vec(el, vals) : MX.mat(el, ns[0], ns[1], vals);
  // el «muestreador» de una colección: rand(1:6), rand(v), rand(1:2:9)
  function muestreador(x) {
    if (x.T === "UnitRange") {
      const a = BigInt(x.start), b = BigInt(x.stop);
      if (b < a) throw new ErrorJulia("ArgumentError: collection must be non-empty");
      return () => I(entero(g(), a, b));
    }
    if (V.esVector(x) || MX.esMatriz(x) || x.T === "Tuple") {
      const els = MX.esMatriz(x) ? MX.lineal(x) : x.T === "Tuple" ? x.a : null;
      const n = els ? els.length : V.largo(x);
      if (!n) throw new ErrorJulia("ArgumentError: collection must be non-empty");
      return () => { const i = Number(entero(g(), 1n, BigInt(n))); return els ? els[i - 1] : V.elemento(x, i); };
    }
    throw new NoSoportado("rand de un " + V.tipo(x));
  }
  fn.rand = (args, kw) => {
    if (kw && kw.size) throw new NoSoportado("rand con opciones");
    if (args.length && args[0].T === "RNG") throw new NoSoportado("rand con un generador propio");
    if (!args.length) return F(decimal(g()));
    const [x, ...resto] = args;
    if (x.T === "Int64") { const ns = tamano(args, "rand"), n = ns.reduce((a, b) => a * b, 1); return arreglo("Float64", ns, enBloque(g(), n).map(u => F(aDecimal(u)))); }
    if (esTipo(x, "Float64")) { if (!resto.length) return F(decimal(g())); const ns = tamano(resto, "rand"), n = ns.reduce((a, b) => a * b, 1); return arreglo("Float64", ns, enBloque(g(), n).map(u => F(aDecimal(u)))); }
    if (esTipo(x, "Bool")) { if (!resto.length) return B(((g().siguiente() >> 56n) & 1n) === 1n); const ns = tamano(resto, "rand"), n = ns.reduce((a, b) => a * b, 1); return arreglo("Bool", ns, boolsEnBloque(g(), n).map(B)); }
    if (esTipo(x, "Int64")) { if (resto.length) throw new NoSoportado("rand(Int, n)"); return I(BigInt.asIntN(64, g().siguiente())); }
    if (x.T === "Tipo") throw new NoSoportado("rand(" + x.nombre + ")");
    const m = muestreador(x);
    if (!resto.length) return m();
    const ns = tamano(resto, "rand"), n = ns.reduce((a, b) => a * b, 1), vals = Array.from({ length: n }, m);
    return arreglo(x.T === "Tuple" ? (vals.length ? V.tipo(vals[0]) : "Any") : V.eltipo(x), ns, vals);
  };
  fn.randn = (args, kw) => {
    if (kw && kw.size) throw new NoSoportado("randn con opciones");
    let dims = args;
    if (args.length && esTipo(args[0], "Float64")) dims = args.slice(1);
    if (!dims.length) return F(normal(g()));
    const ns = tamano(dims, "randn"), n = ns.reduce((a, b) => a * b, 1);
    let vals;
    if (n < 7) vals = Array.from({ length: n }, () => normal(g()));
    else { const us = enBloque(g(), n); vals = us.map(u => normalDe(g(), u >> 12n)); }
    return arreglo("Float64", ns, vals.map(F));
  };
  const semilla = (args) => {
    if (args.length !== 1) throw new NoSoportado(args.length ? "Random.seed! con un generador" : "Random.seed!() sin semilla: da números distintos cada vez");
    const [s] = args;
    if (s.T !== "Int64") throw new NoSoportado("Random.seed! con un " + V.tipo(s));
    prog.rng = new Xoshiro(estadoDeSemilla(s.v));
    return RNG;
  };
  const no = n => () => { throw new NoSoportado(n + " de Random: el laboratorio aún no lo tiene"); };
  P.modulos = P.modulos || {};
  P.modulos.Random = { "seed!": semilla, rand: fn.rand, randn: fn.randn, shuffle: no("shuffle"), "shuffle!": no("shuffle!"), randperm: no("randperm"), Xoshiro: no("Xoshiro"), MersenneTwister: no("MersenneTwister") };
  for (const n of ["shuffle", "shuffle!", "randperm", "randcycle", "randsubseq", "randstring", "bitrand", "rand!", "randn!", "randexp", "Xoshiro", "MersenneTwister"]) fn[n] = no(n);
  P.paquetes.Random = {};            // using Random: sus nombres ya están (trazar.jl lo carga en cada programa)
}
