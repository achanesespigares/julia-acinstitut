// valores.mjs · Los valores de Julia en JavaScript, y cómo los escribe Julia
// Parte del intérprete del laboratorio (Entendiendo Julia, desde dentro · AC Institut).
//
// Cada valor es un objeto con su tipo en T. Los enteros son Int64 de verdad: BigInt recortado a 64 bits,
// para que den la vuelta como en Julia. Los decimales son números de JavaScript, el mismo estándar
// IEEE 754 de doble precisión que usa Julia. Lo que aquí se escribe se compara, programa a programa, con
// lo que escribe Julia (herramientas/conformidad.mjs).

export class ErrorJulia extends Error {
  constructor(texto) { super(texto); this.texto = texto; }
}
// Algo que el laboratorio aún no sabe hacer: no se inventa nada, se dice
export class NoSoportado extends Error {
  constructor(que) { super(que); this.que = que; }
}

// ── Constructores ──────────────────────────────────────────────────────────
const M64 = 64;
export const I = n => ({ T: "Int64", v: BigInt.asIntN(M64, BigInt(n)) });
export const F = x => ({ T: "Float64", v: x });
export const B = b => ({ T: "Bool", v: !!b });
export const S = s => ({ T: "String", v: s });
export const Ch = c => ({ T: "Char", v: c });
export const NADA = { T: "Nothing" };
export const FALTA = { T: "Missing" };
export const PI = { T: "Irrational", nombre: "π", v: Math.PI };
export const E = { T: "Irrational", nombre: "ℯ", v: Math.E };
let nobj = 0;      // cada objeto mutable (vector) lleva un número propio, como su dirección en memoria
export const vec = (el, a) => ({ T: "Vector", el, a, oid: ++nobj });
export const bitvec = a => ({ T: "BitVector", el: "Bool", a, oid: ++nobj });
export function rac(n, d) {
  n = BigInt(n); d = BigInt(d);
  if (d === 0n && n === 0n) throw new ErrorJulia("ArgumentError: invalid rational: zero(Int64)//zero(Int64)");
  if (d < 0n) { n = -n; d = -d; }
  const g = mcd(n < 0n ? -n : n, d) || 1n;
  return { T: "Rational", n: n / g, d: d / g };
}
function mcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }

// ── Tipos ──────────────────────────────────────────────────────────────────
export const LARGO_FLOAT = "StepRangeLen{Float64, Base.TwicePrecision{Float64}, Base.TwicePrecision{Float64}, Int64}";
export function tipo(x) {
  switch (x.T) {
    case "Vector": return x.el === "Bool" && x.bit ? "BitVector" : "Vector{" + x.el + "}";
    case "BitVector": return "BitVector";
    case "Rational": return "Rational{Int64}";
    case "Irrational": return "Irrational{:" + x.nombre + "}";
    case "UnitRange": return x.oneTo ? "Base.OneTo{Int64}" : "UnitRange{Int64}";
    case "StepRange": return "StepRange{Int64, Int64}";
    case "FloatRange": return LARGO_FLOAT;
    case "Tuple": return "Tuple{" + x.a.map(tipo).join(", ") + "}";
    case "Funcion": case "Primitiva": return "typeof(" + x.nombre + ")";
    case "Tipo": return "DataType";
    default: return x.T;
  }
}
export const esNumero = x => ["Int64", "Float64", "Bool", "Rational", "Irrational"].includes(x.T);
export const esEscalar = x => esNumero(x) || ["String", "Char", "Nothing", "Missing", "Symbol"].includes(x.T);
export const esRango = x => ["UnitRange", "StepRange", "FloatRange"].includes(x.T);
export const esVector = x => x.T === "Vector" || x.T === "BitVector" || esRango(x);
export const esFuncion = x => x.T === "Funcion" || x.T === "Primitiva";
export const eltipo = x => x.T === "Vector" ? x.el : x.T === "BitVector" ? "Bool" : x.T === "FloatRange" ? "Float64" : esRango(x) ? "Int64" : "Any";

// ── Rangos ─────────────────────────────────────────────────────────────────
export function rangoEnteros(a, s, b) {        // a:b o a:s:b con enteros (BigInt)
  if (s === null) return { T: "UnitRange", start: a, stop: b < a ? a - 1n : b };
  if (s === 0n) throw new ErrorJulia("ArgumentError: step cannot be zero");
  let n = (b - a) / s;                          // división entera hacia cero
  if ((b - a) % s !== 0n && (b - a < 0n) !== (s < 0n)) n -= 1n;
  const len = n < 0n ? 0n : n + 1n;
  return { T: "StepRange", start: a, step: s, stop: len === 0n ? a - s : a + (len - 1n) * s, len };
}
// Un decimal como fracción n/10^k, si lo es exactamente
function comoDecimal(x) {
  for (let k = 0; k <= 15; k++) {
    const d = 10 ** k, n = Math.round(x * d);
    if (Number.isSafeInteger(n) && n / d === x) return [BigInt(n), BigInt(d)];
  }
  return null;
}
// a:s:b con decimales. Julia calcula los elementos con precisión doble-doble, de modo que 0:0.1:1 da
// exactamente 0.3; aquí se consigue lo mismo pasando por fracciones exactas cuando los datos son decimales.
export function rangoDecimales(a, s, b) {
  if (s === 0) throw new ErrorJulia("ArgumentError: range step cannot be zero");
  const A = comoDecimal(a), Sx = comoDecimal(s), Bx = comoDecimal(b);
  if (!A || !Sx || !Bx) throw new NoSoportado("un rango con decimales que no son exactos");
  const d = [A[1], Sx[1], Bx[1]].reduce((p, q) => p > q ? p : q);
  const an = A[0] * (d / A[1]), sn = Sx[0] * (d / Sx[1]), bn = Bx[0] * (d / Bx[1]);
  let n = (bn - an) / sn;
  if ((bn - an) % sn !== 0n && (bn - an < 0n) !== (sn < 0n)) n -= 1n;
  const len = n < 0n ? 0 : Number(n) + 1;
  const els = Array.from({ length: len }, (_, i) => Number(an + BigInt(i) * sn) / Number(d));
  return { T: "FloatRange", els, start: a, step: s };
}
export function rangoLongitud(a, b, len) {     // range(a, b, length = n)
  if (len === 1) return { T: "FloatRange", els: [a], start: a, step: 0 };
  const A = comoDecimal(a), Bx = comoDecimal(b);
  if (!A || !Bx) throw new NoSoportado("un rango con decimales que no son exactos");
  const d = A[1] > Bx[1] ? A[1] : Bx[1], an = A[0] * (d / A[1]), bn = Bx[0] * (d / Bx[1]);
  const m = BigInt(len - 1);
  const els = Array.from({ length: len }, (_, i) => { const num = an * (m - BigInt(i)) + bn * BigInt(i); return Number(num) / Number(d * m); });
  return { T: "FloatRange", els, start: a, step: len > 1 ? Number(bn - an) / Number(d * m) : 0 };
}
export function largo(x) {
  if (x.T === "Vector" || x.T === "BitVector" || x.T === "Tuple") return x.a.length;
  if (x.T === "UnitRange") return Number(x.stop - x.start + 1n < 0n ? 0n : x.stop - x.start + 1n);
  if (x.T === "StepRange") return Number(x.len);
  if (x.T === "FloatRange") return x.els.length;
  if (x.T === "String") return [...x.v].length;
  throw new NoSoportado("length de " + tipo(x));
}
export function elemento(x, i) {               // i desde 1, ya comprobado
  if (x.T === "Vector" || x.T === "BitVector" || x.T === "Tuple") return x.a[i - 1];
  if (x.T === "UnitRange") return I(x.start + BigInt(i - 1));
  if (x.T === "StepRange") return I(x.start + BigInt(i - 1) * x.step);
  if (x.T === "FloatRange") return F(x.els[i - 1]);
  throw new NoSoportado("indexar " + tipo(x));
}
export const elementos = x => Array.from({ length: largo(x) }, (_, i) => elemento(x, i + 1));

// ── Cómo escribe Julia un número decimal ───────────────────────────────────
// Los dígitos son los mínimos que permiten recuperar el número (lo mismo que hace JavaScript); el formato
// es fijo si el exponente está entre −4 y 5 y científico (1.0e6) si no.
export function decimal(x) {
  if (Number.isNaN(x)) return "NaN";
  if (x === Infinity) return "Inf";
  if (x === -Infinity) return "-Inf";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const sg = x < 0 ? "-" : "";
  const [m, ex] = Math.abs(x).toExponential().split("e");
  const dig = m.replace(".", ""), e = parseInt(ex, 10);
  if (e >= -4 && e <= 5) {
    if (e >= 0) {
      const ent = dig.slice(0, e + 1).padEnd(e + 1, "0"), fr = dig.slice(e + 1);
      return sg + ent + "." + (fr || "0");
    }
    return sg + "0." + "0".repeat(-e - 1) + dig;
  }
  return sg + dig[0] + "." + (dig.slice(1) || "0") + "e" + e;
}
function cadena(s) {
  let r = "";
  for (const c of s) {
    if (c === '"') r += '\\"'; else if (c === "\\") r += "\\\\"; else if (c === "$") r += "\\$";
    else if (c === "\n") r += "\\n"; else if (c === "\t") r += "\\t"; else if (c === "\r") r += "\\r";
    else r += c;
  }
  return '"' + r + '"';
}
function caracter(c) {
  const esc = { "\n": "\\n", "\t": "\\t", "'": "\\'", "\\": "\\\\", "\r": "\\r" };
  return "'" + (esc[c] || c) + "'";
}
const decimalesRango = x => x.els.length ? decimal(x.start) + ":" + decimal(x.step) + ":" + decimal(x.els[x.els.length - 1]) : decimal(x.start) + ":" + decimal(x.step) + ":" + decimal(x.start - x.step);

// repr(x): lo que escribe Julia dentro de una expresión, de una tabla o de print
export function repr(x, dentro = false) {
  switch (x.T) {
    case "Int64": return x.v.toString();
    case "Float64": return decimal(x.v);
    case "Bool": return x.v ? "true" : "false";
    case "String": return cadena(x.v);
    case "Char": return caracter(x.v);
    case "Nothing": return "nothing";
    case "Missing": return "missing";
    case "Rational": return x.n + "//" + x.d;
    case "Irrational": return x.nombre;
    case "Symbol": return ":" + x.v;
    case "UnitRange": return x.oneTo ? "Base.OneTo(" + x.stop + ")" : x.start + ":" + x.stop;
    case "StepRange": return x.start + ":" + x.step + ":" + x.stop;
    case "FloatRange": return decimalesRango(x);
    case "Vector": case "BitVector": {
      const bools = x.T === "BitVector" || x.el === "Bool";
      const pref = bools ? "Bool" : x.el === "Any" || !x.a.length ? x.el : "";
      return pref + "[" + x.a.map(e => bools ? (e.v ? "1" : "0") : repr(e, true)).join(", ") + "]";
    }
    case "Tuple": return "(" + x.a.map(e => repr(e, true)).join(", ") + (x.a.length === 1 ? "," : "") + ")";
    case "Funcion": case "Primitiva": return x.nombre;
    case "Tipo": return x.nombre;
  }
  throw new NoSoportado("escribir un " + tipo(x));
}

// print(x): como repr, pero los textos y los caracteres van tal cual
export const texto = x => x.T === "String" || x.T === "Char" ? x.v : repr(x);

// display(x): lo que escribe el REPL al mostrar un valor (show con MIME"text/plain")
export function muestra(x) {
  if (x.T === "Char") return caracterLargo(x.v);
  if (x.T === "Vector" || x.T === "BitVector") {
    const n = x.a.length, t = tipo(x);
    if (!n) return x.el + "[]";
    const bools = x.T === "BitVector" || x.el === "Bool";
    const trozos = x.a.map(e => bools ? [e.v ? "1" : "0", ""] : alinea(e, x.el));
    const izq = Math.max(...trozos.map(t => t[0].length));
    return n + "-element " + t + ":\n" + trozos.map(([a, b]) => " " + a.padStart(izq) + b).join("\n");
  }
  if (x.T === "Tuple") return repr(x);
  return repr(x);
}
// Julia alinea las columnas de números por la coma decimal: la parte entera a la derecha y el resto detrás
function alinea(e, el) {
  const s = el === "Any" ? repr(e, true) : repr(e, true);
  if (e.T === "Float64") {
    const k = s.search(/[.e]/);
    if (k > 0 && /[0-9]/.test(s[k - 1])) return [s.slice(0, k), s.slice(k)];
    return [s, ""];
  }
  if (e.T === "Int64" || e.T === "Bool") return [s, ""];
  if (e.T === "Rational") { const k = s.indexOf("//"); return [s.slice(0, k), s.slice(k)]; }
  return ["", s];
}
function caracterLargo(c) {
  const cp = c.codePointAt(0), hex = cp.toString(16).toUpperCase().padStart(4, "0");
  let cat = null;
  if (/[a-z]/.test(c)) cat = "Ll: Letter, lowercase"; else if (/[A-Z]/.test(c)) cat = "Lu: Letter, uppercase";
  else if (/[0-9]/.test(c)) cat = "Nd: Number, decimal digit";
  if (!cat || cp > 127) throw new NoSoportado("mostrar el carácter " + c);
  return caracter(c) + ": ASCII/Unicode U+" + hex + " (category " + cat + ")";
}

// ── Promoción de tipos (los vectores y la aritmética) ──────────────────────
const RANGO_NUM = { Bool: 0, Int64: 1, Rational: 2, Irrational: 3, Float64: 3 };
export function promueve(tipos) {
  const u = [...new Set(tipos)];
  if (u.length === 1) return u[0] === "Irrational" ? "Float64" : u[0];
  if (u.every(t => t in RANGO_NUM)) {
    if (u.includes("Float64") || u.includes("Irrational")) return "Float64";
    if (u.includes("Rational")) return "Rational{Int64}";
    return "Int64";
  }
  return "Any";
}
const nombreTipo = t => t === "Rational" ? "Rational{Int64}" : t;
// convierte un valor al tipo de las casillas de un vector (convert(T, x))
export function convierte(x, el) {
  if (el === "Any") return x;
  const t = nombreTipo(x.T);
  if (t === el) return x;
  if (el === "Float64" && esNumero(x)) return F(aNum(x));
  if (el === "Int64" && esNumero(x)) {
    if (x.T === "Bool") return I(x.v ? 1 : 0);
    const v = aNum(x);
    if (Number.isInteger(v) && Math.abs(v) < 2 ** 63) return I(BigInt(v));
    throw new ErrorJulia("InexactError: Int64(" + repr(x) + ")");
  }
  if (el === "Rational{Int64}" && (x.T === "Int64" || x.T === "Bool")) return rac(x.T === "Bool" ? (x.v ? 1 : 0) : x.v, 1);
  throw errorMetodo("convert", null, "Cannot `convert` an object of type " + tipo(x) + " to an object of type " + el);
}
export const aNum = x => x.T === "Int64" ? Number(x.v) : x.T === "Bool" ? (x.v ? 1 : 0) : x.T === "Rational" ? Number(x.n) / Number(x.d) : x.v;

// MethodError como lo escribe Julia (sin la lista de candidatos, igual que trazar.jl)
const PISTAS = {
  "+": ["addition", ".+"], "-": ["subtraction", ".-"],
};
export function errorMetodo(f, args, cabecera) {
  let t = "MethodError: " + (cabecera || "no method matching " + f + "(" + args.map(a => "::" + tipo(a)).join(", ") + ")");
  if (args && PISTAS[f] && args.length === 2 && (esVector(args[0]) !== esVector(args[1]))) {
    const [nom, op] = PISTAS[f];
    t += "\nFor element-wise " + nom + ", use broadcasting with dot syntax: " + (esVector(args[0]) ? "array " + op + " scalar" : "scalar " + op + " array");
  }
  const esTipo = ["Int64", "Float64", "String", "Bool", "Char"].includes(f);
  return new ErrorJulia(t + (esTipo ? "\nThe type `" + f + "` exists, but no method is defined for this combination of argument types when trying to construct it."
    : "\nThe function `" + f + "` exists, but no method is defined for this combination of argument types."));
}
