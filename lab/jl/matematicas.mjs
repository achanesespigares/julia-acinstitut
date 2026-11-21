// matematicas.mjs · exp, log, log2, log10, sin, cos y tan de Julia 1.13, copiadas línea a línea
// (Entendiendo Julia, desde dentro · AC Institut)
//
// Math.exp, Math.log… de JavaScript no siempre dan el mismo último dígito que Julia (comparado con 60 000
// valores: exp difería en el 10 %, log en el 5 %, sin y cos en el 1 %). Aquí están los algoritmos de Julia
// (base/special/exp.jl, log.jl, trig.jl, rem_pio2.jl y pow.jl). Julia escribe algunas cuentas con muladd,
// que el procesador hace en un solo paso (fma) si sabe: lo saben todos los de los últimos diez años (x86 desde
// 2013, todos los ARM de 64 bits, Apple M). Se calcula como en ellos, con fma exacto. null = fuera de lo copiado.
import { fma, muladd, horner, bits, deBits } from "./azar.mjs";
import { T_LOG, J_TABLE } from "./tablas-azar.mjs";

const dos = f => (...a) => f(true, ...a);

// ── exp (exp_impl con base ℯ) ──────────────────────────────────────────────
const MAGIC = 6.755399441055744e15;
function expJ(fus, x) {
  if (Number.isNaN(x)) return x;
  let Nf = muladd(x, 369.3299304675746, MAGIC, fus);
  const N = Number(BigInt.asIntN(32, bits(Nf)));
  Nf -= MAGIC;
  let r = muladd(Nf, -0.002707606173999011, x, fus);
  r = muladd(Nf, -6.327543041662719e-14, r, fus);
  const k = N >> 8;
  const j = J_TABLE[N & 255];
  const jU = deBits(0x3FF0000000000000n | (j & (0xFFFFFFFFFFFFFFFFn >> 12n)));
  const jL = deBits(0x3C00000000000000n | (j >> 8n));
  const kern = r * horner(r, [0.9999999999999912, 0.4999999999999997, 0.1666666857598779, 0.04166666857598777], fus);
  const small = muladd(jU, kern, jL, fus) + jU;
  if (!(Math.abs(x) <= 708.3964185322641)) {
    if (x >= 709.7827128933841) return Infinity;
    if (x <= -745.1332191019412) return 0;
    if (k <= -53) return deBits(BigInt.asUintN(64, (BigInt(k) + 53n) << 52n) + bits(small)) * 2 ** -53;
  }
  return deBits(BigInt.asUintN(64, (BigInt(k) << 52n) + bits(small)));
}
export const exp = dos(expJ);

// ── log, log2, log10 (_log con log_proc1 y log_proc2) ───────────────────────
const BASES = { e: [1.0, 0.0], 2: [1.4426950408889634, 2.0355273740931033e-17], 10: [0.4342944819032518, 1.098319650216765e-17] };
function logJ(fus, base, x) {
  const [mh, ml] = BASES[base];
  if (!(x > 0)) return x === 0 ? -Infinity : NaN;                // los negativos los rechaza antes primitivas
  if (x === Infinity) return x;
  if (0.9394130628134757 < x && x < 1.0644944589178595) {        // log_proc2
    const f = x - 1.0, g = 1.0 / (2.0 + f), u = 2.0 * f * g, v = u * u;
    const q = u * v * horner(v, [0.08333333333333179, 0.012500000003771751, 0.0022321399879194482, 0.0004348877777076146], fus);
    return fma(mh, u, fma(ml, u, mh * fma(fma(-u, f, 2 * (f - u)), g, q)));
  }
  let xu = bits(x), m = Number((xu >> 52n) & 0x7ffn);
  if (m === 0) { x *= 1.8014398509481984e16; xu = bits(x); m = Number((xu >> 52n) & 0x7ffn) - 54; }
  m -= 1023;
  const y = deBits((xu & 0x000fffffffffffffn) | 0x3ff0000000000000n);
  const mf = m, F = (y + 3.5184372088832e13) - 3.5184372088832e13, f = y - F;
  const jp = Math.trunc(128.0 * F) - 127;                         // log_proc1
  const [hi, lo] = T_LOG[jp - 1];
  const l_hi = mf * 0.6931471805601177 + hi, l_lo = mf * -1.7239444525614835e-13 + lo;
  const u = (2.0 * f) / (y + F), v = u * u, q = u * v * horner(v, [0.08333333333303913, 0.012500053168098584], fus);
  return fma(mh, l_hi, fma(mh, (u + (q + l_lo)), ml * l_hi));
}
export const log = dos((fus, x) => logJ(fus, "e", x));
export const log2 = dos((fus, x) => logJ(fus, 2, x));
export const log10 = dos((fus, x) => logJ(fus, 10, x));

// ── sin, cos y tan (kernels de openlibm y la reducción de Cody–Waite) ──────
const DS = [-1.66666666666666324348e-01, 8.33333333332248946124e-03, -1.98412698298579493134e-04, 2.75573137070700676789e-06, -2.50507602534068634195e-08, 1.58969099521155010221e-10];
const DC = [4.16666666666666019037e-02, -1.38888888888741095749e-03, 2.48015872894767294178e-05, -2.75573143513906633035e-07, 2.08757232129817482790e-09, -1.13596475577881948265e-11];
function senK(fus, hi, lo) {                 // sin_kernel de un DoubleFloat64 (o de un Float64 si lo es undefined)
  const y2 = hi * hi, y4 = y2 * y2;
  const r = horner(y2, [DS[1], DS[2], DS[3]], fus) + y2 * y4 * horner(y2, [DS[4], DS[5]], fus);
  const y3 = y2 * hi;
  if (lo === undefined) return hi + y3 * (DS[0] + y2 * r);
  return hi - ((y2 * (0.5 * lo - y3 * r) - lo) - y3 * DS[0]);
}
function cosK(fus, hi, lo) {
  const y2 = hi * hi, y4 = y2 * y2;
  const r = y2 * horner(y2, [DC[0], DC[1], DC[2]], fus) + y4 * y4 * horner(y2, [DC[3], DC[4], DC[5]], fus);
  const h = 0.5 * y2, w = 1.0 - h;
  return w + (((1.0 - w) - h) + (lo === undefined ? y2 * r : (y2 * r - hi * lo)));
}
const altaPos = x => Number((bits(x) >> 32n) & 0x7fffffffn);
const alta = x => Number(bits(x) >> 32n);
function cw2(fus, x, fn, n) {
  const p1 = 1.57079632673412561417e+00, p1t = 6.07710050650619224932e-11;
  const z = muladd(-fn, p1, x, fus), y1 = muladd(-fn, p1t, z, fus), y2 = muladd(-fn, p1t, (z - y1), fus);
  return [n, y1, y2];
}
function cwExt(fus, x, xhp) {
  const p1 = 1.57079632673412561417e+00, p1t = 6.07710050650619224932e-11, p2 = 6.07710050630396597660e-11,
    p2t = 2.02226624879595063154e-21, p3 = 2.02226624871116645580e-21, p3t = 8.47842766036889956997e-32;
  const fn = redondeaPar(x * (2 / Math.PI));
  let r = muladd(-fn, p1, x, fus), w = fn * p1t;
  const j = xhp >> 20;
  let y1 = r - w;
  let i = j - ((alta(y1) >> 20) & 0x7ff);
  if (i > 16) {
    let t = r; w = fn * p2; r = t - w; w = muladd(fn, p2t, -((t - r) - w), fus); y1 = r - w;
    i = j - ((alta(y1) >> 20) & 0x7ff);
    if (i > 49) { t = r; w = fn * p3; r = t - w; w = muladd(fn, p3t, -((t - r) - w), fus); y1 = r - w; }
  }
  const y2 = (r - y1) - w;
  return [Math.trunc(fn), y1, y2];
}
function redondeaPar(v) { const f = Math.floor(v), d = v - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); }
function remPio2(fus, x) {
  const xhp = altaPos(x);
  if (xhp <= 0x400f6a7a) {
    if ((xhp & 0xfffff) === 0x921fb) return cwExt(fus, x, xhp);
    if (xhp <= 0x4002d97c) return x > 0 ? cw2(fus, x, 1.0, 1) : cw2(fus, x, -1.0, -1);
    return x > 0 ? cw2(fus, x, 2.0, 2) : cw2(fus, x, -2.0, -2);
  }
  if (xhp <= 0x401c463b) {
    if (xhp <= 0x4015fdbc) {
      if (xhp === 0x4012d97c) return cwExt(fus, x, xhp);
      return x > 0 ? cw2(fus, x, 3.0, 3) : cw2(fus, x, -3.0, -3);
    }
    if (xhp === 0x401921fb) return cwExt(fus, x, xhp);
    return x > 0 ? cw2(fus, x, 4.0, 4) : cw2(fus, x, -4.0, -4);
  }
  if (xhp < 0x413921fb) return cwExt(fus, x, xhp);
  return null;                                  // Payne–Hanek: no copiado
}
const PI4 = Math.PI / 4;
function trigJ(fus, cual, x) {
  if (!Number.isFinite(x)) return NaN;          // el DomainError de ±Inf lo da primitivas
  const ax = Math.abs(x);
  if (ax < PI4) {
    if (cual === "sin") return ax < 1.4901161193847656e-8 ? x : senK(fus, x);
    if (cual === "cos") return ax < 1.0536712127723509e-8 ? 1.0 : cosK(fus, x);
    return null;
  }
  const rp = remPio2(fus, x);
  if (rp === null) return null;
  const [n0, hi, lo] = rp, n = ((n0 % 4) + 4) % 4;
  if (cual === "sin") return [senK(fus, hi, lo), cosK(fus, hi, lo), -senK(fus, hi, lo), -cosK(fus, hi, lo)][n];
  if (cual === "cos") return [cosK(fus, hi, lo), -senK(fus, hi, lo), -cosK(fus, hi, lo), senK(fus, hi, lo)][n];
  return null;
}
export const sin = dos((fus, x) => trigJ(fus, "sin", x));
export const cos = dos((fus, x) => trigJ(fus, "cos", x));

// ── x^y (pow.jl): con exponente entero, potencias por cuadrados compensadas; con decimal, _log_ext + exp ──
import { T_LOG_COMPACTA } from "./tablas-azar.mjs";
const hexf = (m, e) => { const [a, b = ""] = m.split("."); return (parseInt(a + b, 16) / 16 ** b.length) * 2 ** e; };
const LP = [-hexf("1.555555555556", -1), hexf("1.0000000000006", -1), -hexf("1.999999959554e", -2), hexf("1.555555529a47a", -2), -hexf("1.2495b9b4845e9", -2), hexf("1.0002b8b263fc3", -2)];
const dosProd = (x, y) => { const h = x * y; return [h, fma(x, y, -h)]; };
function logExt(fus, xu) {
  const tmp = BigInt.asIntN(64, xu - 0x3fe6955500000000n);
  const z = deBits(BigInt.asUintN(64, xu - (BigInt.asUintN(64, tmp) & 0xfff0000000000000n)));
  const k = Number(tmp >> 52n);
  const idx = Number((tmp >> 45n) & 127n);
  const [t, logctail] = T_LOG_COMPACTA[idx];
  const invc = deBits((t & 0xffn | 0x1ff00n) << 45n), logc = deBits(t & ~0xffn & 0xFFFFFFFFFFFFFFFFn);
  const r = fma(z, invc, -1.0);
  const t1 = muladd(k, 0.6931471805598903, logc, fus), t2 = t1 + r;
  const lo1 = muladd(k, 5.497923018708371e-14, logctail, fus), lo2 = t1 - t2 + r;
  const ar = -0.5 * r, [ar2, lo3] = dosProd(r, ar);
  const hi = t2 + ar2, lo4 = t2 - hi + ar2;
  const p = horner(r, LP, fus);
  const lo = lo1 + lo2 + lo3 + muladd(r * ar2, p, lo4, fus);
  return [hi, lo];
}
function expImpl2(fus, x, xlo) {             // exp_impl(x, xlo, Val(:ℯ))
  let Nf = muladd(x, 369.3299304675746, MAGIC, fus);
  const N = Number(BigInt.asIntN(32, bits(Nf)));
  Nf -= MAGIC;
  let r = muladd(Nf, -0.002707606173999011, x, fus);
  r = muladd(Nf, -6.327543041662719e-14, r, fus);
  const k = N >> 8, j = J_TABLE[N & 255];
  const jU = deBits(0x3FF0000000000000n | (j & (0xFFFFFFFFFFFFFFFFn >> 12n)));
  const jL = deBits(0x3C00000000000000n | (j >> 8n));
  const kern = r * horner(r, [0.9999999999999912, 0.4999999999999997, 0.1666666857598779, 0.04166666857598777], fus);
  const very = muladd(kern, jU * xlo, jL, fus);
  const hi = 1.0 + kern, lo = (1.0 - hi) + kern;   // canonicalize2(1.0, kern)
  const small = fma(jU, hi, muladd(jU, (lo + xlo), very, fus));
  if (!(Math.abs(x) <= 708.3964185322641)) {
    if (Number.isNaN(x)) return x;
    if (x >= 709.7827128933841) return Infinity;
    if (x <= -745.1332191019412) return 0;
    if (k <= -53) return deBits(BigInt.asUintN(64, (BigInt(k) + 53n) << 52n) + bits(small)) * 2 ** -53;
    if (k === 1024) return (small * 2.0) * 2 ** 1023;
  }
  return deBits(BigInt.asUintN(64, (BigInt(k) << 52n) + bits(small)));
}
function powFloat(fus, x, y) {               // pow_body(x::Float64, y::Float64), x > 0 finito
  let xu = bits(x);
  if (xu < (1n << 52n)) { xu = bits(x * 2 ** 52); xu &= 0x7FFFFFFFFFFFFFFFn; xu -= 52n << 52n; }
  const [lh, ll] = logExt(fus, xu);
  let [xyhi, xylo] = dosProd(lh, y);
  xylo = muladd(ll, y, xylo, fus);
  const hi = xyhi + xylo;
  return expImpl2(fus, hi, xylo - (hi - xyhi));
}
function powEntero(fus, x, n) {               // pow_body(x::Float64, n::Integer)
  let y = 1.0, xnlo = -0.0, ynlo = 0.0;
  if (n === 3) return x * x * x;
  if (n < 0) {
    const rx = 1 / x;
    if (n === -2) return rx * rx;
    if (Number.isFinite(x)) xnlo = -fma(x, rx, -1.0) * rx;
    x = rx; n = -n;
  }
  while (n > 1) {
    if (n & 1) { const err = muladd(y, xnlo, x * ynlo, fus); [y, ynlo] = dosProd(x, y); ynlo += err; }
    const err = x * 2 * xnlo;
    [x, xnlo] = dosProd(x, x); xnlo += err;
    n = Math.floor(n / 2);
  }
  const err = muladd(y, xnlo, x * ynlo, fus);
  // el muladd final no se funde: LLVM comparte el x*y con la otra rama del ifelse (visto en code_llvm)
  return Number.isFinite(x) && Number.isFinite(err) && err !== 0 ? x * y + err : x * y;
}
// x^n con n entero (Int64): ^(x::Float64, n::Integer)
export function potenciaEntera(x, n) {
  if (n === 0) return 1.0;
  if (n < -4096 || n > 3 * 8192) return null;
  return powEntero(true, x, n);
}
// x^y con los dos decimales: ^(x::Float64, y::Float64), sin el caso de x < 0 con y no entero (DomainError)
export function potencia(x, y) {
  if (x === 1) return 1.0;
  if (Number.isNaN(y)) return y;
  if (!(Math.abs(y) < 6.917529027641082e18)) return null;
  if (Number.isInteger(y)) {
    if (y === 0) return 1.0;
    if (y >= -4096 && y <= 3 * 8192) return potenciaEntera(x, y);
  }
  if (x === 0) return null;
  if (x < 0 || !Number.isFinite(x)) return null;
  return dos((fus, a, b) => powFloat(fus, a, b))(x, y);
}
