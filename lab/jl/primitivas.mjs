// primitivas.mjs · La aritmética de Julia y las funciones de Base que usa el libro
// (Entendiendo Julia, desde dentro · AC Institut)
//
// Cada función reproduce lo que hace Julia, también sus errores, con el mismo texto. Lo que no está aquí
// no se improvisa: si es una función conocida de Julia, el laboratorio dice que aún no la sabe usar.
import * as V from "./valores.mjs";
import * as TX from "./textos.mjs";
import * as DC from "./dict.mjs";
import * as MX from "./matrices.mjs";
import * as TP from "./tipos.mjs";
import * as TB from "./tablas.mjs";
import * as AL from "./algebra.mjs";
import * as GR from "./graficos.mjs";
import * as AZ from "./azar.mjs";
import * as MT from "./matematicas.mjs";
import * as EX from "./expr.mjs";
import * as ER from "./errores.mjs";
import { ErrorJulia, NoSoportado, I, F, B, S, Ch, NADA, FALTA, errorMetodo, aNum, tipo, repr } from "./valores.mjs";

const T = nombre => ({ T: "Tipo", nombre });
export const TIPOS = {
  Int: T("Int64"), Int64: T("Int64"), Float64: T("Float64"), String: T("String"), Bool: T("Bool"), Char: T("Char"),
  Any: T("Any"), Number: T("Number"), Real: T("Real"), Integer: T("Integer"), AbstractFloat: T("AbstractFloat"),
  Rational: T("Rational"), Nothing: T("Nothing"), Missing: T("Missing"),
  Signed: T("Signed"), AbstractString: T("AbstractString"), AbstractChar: T("AbstractChar"), DataType: T("DataType"),
  Symbol: T("Symbol"), Expr: T("Expr"), QuoteNode: T("QuoteNode"), GlobalRef: T("GlobalRef"), LineNumberNode: T("LineNumberNode"),
  Exception: T("Exception"), IO: T("IO"),
};
// los tipos de error de Julia (capítulo 22)
for (const n of ER.NOMBRES) TIPOS[n] = T(n);
// Nombres de Julia que existen pero que el laboratorio aún no sabe ejecutar
export const CONOCIDAS = new Set(("big BigInt BigFloat Float32 Int32 Int8 UInt8 UInt Complex complex im mean median " +
  "Set lpad rpad " +
  "chomp reduce foldl foldr mapreduce accumulate cumsum cumprod diff unique sortperm extrema " +
  "Matrix Array axes LinearAlgebra Statistics println_ " +
  "struct mutable abstract typeof_ isa eltype convert promote sizeof summarysize objectid similar " +
  "ifelse iterate Iterators sum! maximum! push !== === " +
  "time @time @elapsed @btime sleep open read write readline readlines eachline isfile").split(" "));

const NUM = x => V.esNumero(x);
const esEnteroLike = x => x.T === "Int64" || x.T === "Bool";
const bigDe = x => x.T === "Bool" ? (x.v ? 1n : 0n) : x.v;
const tieneDecimal = (a, b) => a.T === "Float64" || b.T === "Float64" || a.T === "Irrational" || b.T === "Irrational";

// x^n con enteros de 64 bits, dando la vuelta como Julia (sin calcular números gigantes)
function potencia(base, exp) {
  let r = 1n, b = BigInt.asIntN(64, base), e = exp;
  while (e > 0n) { if (e & 1n) r = BigInt.asIntN(64, r * b); b = BigInt.asIntN(64, b * b); e >>= 1n; }
  return r;
}
// redondeo al par más cercano, como RoundNearest de Julia
function redondea(x) {
  if (!Number.isFinite(x)) return x;
  const f = Math.floor(x), d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}
const errInexacto = (t, x) => new ErrorJulia("InexactError: " + t + "(" + repr(x) + ")");
const DOM_SQRT = x => new ErrorJulia("DomainError with " + V.decimal(x) + ":\nsqrt was called with a negative real argument but will only return a complex result if called with a complex argument. Try sqrt(Complex(x)).");
const DOM_LOG = (f, x) => new ErrorJulia("DomainError with " + V.decimal(x) + ":\n" + f + " was called with a negative real argument but will only return a complex result if called with a complex argument. Try " + f + "(Complex(x)).");

// el resultado de una función de matematicas.mjs, o NoSoportado si queda fuera de lo copiado de Julia
const julia = (nombre, x, v) => { if (v === null) throw new NoSoportado(nombre + "(" + V.decimal(x) + "): el laboratorio aún no lo calcula con el último dígito de Julia"); return v; };
export function crearPrimitivas(prog) {
  const P = {};
  // ── Aritmética ───────────────────────────────────────────────────────
  P.unaria = (op, x) => {
    { const r = prog.operaUsuario && prog.operaUsuario(op, [x]); if (r) return r; }
    if (x.T === "Missing" && op !== "!") return FALTA;
    if (op === "-" || op === "+") {
      if (op === "+" && x.T !== "Bool" && NUM(x)) return x;
      if (x.T === "Int64") return I(-x.v);
      if (x.T === "Bool") return I(op === "-" ? (x.v ? -1 : 0) : (x.v ? 1 : 0));
      if (x.T === "Float64" || x.T === "Irrational") return F(-aNum(x));
      if (x.T === "Rational") return V.rac(-x.n, x.d);
      if (x.T === "Vector" && op === "-" && x.a.every(NUM)) return P.recoge(x.a.map(e => P.unaria("-", e)));
      if (MX.esMatriz(x) && op === "-") { const [f, c] = MX.dims(x), r = P.recoge(MX.lineal(x).map(e => P.unaria("-", e))); return MX.mat(r.el, f, c, r.a); }
      throw errorMetodo(op, [x]);
    }
    if (op === "!") { if (x.T === "Bool") return B(!x.v); if (x.T === "Missing") return FALTA; throw errorMetodo("!", [x]); }
    if (op === "√") return P.funcion("sqrt").f([x], new Map());
    throw new NoSoportado("el operador " + op);
  };
  P.binaria = (op, a, b) => {
    { const r = prog.operaUsuario && prog.operaUsuario(op, [a, b]); if (r) return r; }
    if (op === "≠") op = "!=";
    if (op === "≤") op = "<=";
    if (op === "≥") op = ">=";
    if (op === "isa") { if (b.T !== "Tipo") throw new ErrorJulia("TypeError: in isa, expected Type, got a value of type " + tipo(b)); return B(P.esDelTipo(a, b.nombre)); }
    if (op === "<:" && a.T === "Tipo" && b.T === "Tipo") {
      if (a.unionall || b.unionall || !P.conocido(a.nombre) || !P.conocido(b.nombre)) throw new NoSoportado("<: entre " + a.nombre + " y " + b.nombre);
      return B(P.esSubtipo(a.nombre, b.nombre));
    }
    if (op === "===") return B(P.identicos(a, b));
    if (op === "!==") return B(!P.identicos(a, b));
    if (op === "∈" || op === "in") return P.pertenece(a, b);
    if (op === "∉") { const r = P.pertenece(a, b); return r.T === "Bool" ? B(!r.v) : r; }
    if (a.T === "Missing" || b.T === "Missing") {
      if (["+", "-", "*", "/", "÷", "%", "^", "==", "!=", "<", ">", "<=", ">=", "//"].includes(op)) return FALTA;
    }
    if (op === "≈") return B(P.aprox(a, b));
    if (op === "==") return B(P.iguales(a, b));
    if (op === "!=") return B(!P.iguales(a, b));
    if (["<", ">", "<=", ">="].includes(op)) return P.compara(op, a, b);
    if (op === "=>") return { T: "Pair", a, b };
    if ((a.T === "Char" || b.T === "Char") && (op === "+" || op === "-")) { const r = TX.aritmeticaLetra(op, a, b); if (r) return r; throw errorMetodo(op, [a, b]); }
    if (NUM(a) && NUM(b)) return P.aritmetica(op, a, b);
    if (op === "*" && (a.T === "String" || a.T === "Char") && (b.T === "String" || b.T === "Char")) return S(a.v + b.v);
    if (op === "^" && (a.T === "String" || a.T === "Char") && b.T === "Int64") {
      if (b.v < 0n) throw new ErrorJulia("ArgumentError: can't repeat a string " + b.v + " times");
      return S(a.v.repeat(Number(b.v)));
    }
    if (MX.esMatriz(a) || MX.esMatriz(b)) return P.aritmeticaMatrices(op, a, b);
    if (V.esVector(a) || V.esVector(b)) return P.aritmeticaVectores(op, a, b);
    if (op === "&" && a.T === "Bool" && b.T === "Bool") return B(a.v && b.v);
    if (op === "|" && a.T === "Bool" && b.T === "Bool") return B(a.v || b.v);
    throw errorMetodo(op, [a, b]);
  };
  P.aritmetica = (op, a, b) => {
    if (op === "//") {
      if (tieneDecimal(a, b)) throw errorMetodo("//", [a, b]);
      const [an, ad] = a.T === "Rational" ? [a.n, a.d] : [bigDe(a), 1n], [bn, bd] = b.T === "Rational" ? [b.n, b.d] : [bigDe(b), 1n];
      return V.rac(an * bd, ad * bn);
    }
    if (op === "&" || op === "|") {
      if (a.T === "Bool" && b.T === "Bool") return B(op === "&" ? a.v && b.v : a.v || b.v);
      if (esEnteroLike(a) && esEnteroLike(b)) return I(op === "&" ? bigDe(a) & bigDe(b) : bigDe(a) | bigDe(b));
      throw errorMetodo(op, [a, b]);
    }
    if (tieneDecimal(a, b)) {
      const x = aNum(a), y = aNum(b);
      switch (op) {
        case "+": return F(x + y);
        case "-": return F(x - y);
        case "*": return F(x * y);
        case "/": return F(x / y);
        case "÷": return F(Math.trunc(x / y));
        case "%": return F(x % y);
        case "^": {
          if (b.T === "Int64" || b.T === "Bool") {
            const n = Number(bigDe(b));
            if (n === 0) return F(1);
            if (n === 1) return F(x);
            if (n === 2) return F(x * x);
            if (n === 3) return F(x * x * x);
            if (n === -1) return F(1 / x);
            if (n === -2) { const i = 1 / x; return F(i * i); }
          }
          if (x < 0 && !Number.isInteger(y)) throw new ErrorJulia("DomainError with " + V.decimal(x) + ":\nExponentiation yielding a complex result requires a complex argument.\nReplace x^y with (x+0im)^y, Complex(x)^y, or similar.");
          if (x === 0 || !Number.isFinite(x) || Number.isNaN(y)) return F(Math.pow(x, y));      // los casos especiales de IEEE, iguales en Julia
          // como Julia (pow.jl): con exponente entero, potencias por cuadrados compensadas; si no, log y exp
          const r = (b.T === "Int64" || b.T === "Bool") ? MT.potenciaEntera(x, y) : MT.potencia(x, y);
          if (r === null) throw new NoSoportado(V.decimal(x) + "^" + V.decimal(y) + ": el laboratorio aún no lo calcula con el último dígito de Julia");
          return F(r);
        }
      }
    }
    if (a.T === "Rational" || b.T === "Rational") {
      const [an, ad] = a.T === "Rational" ? [a.n, a.d] : [bigDe(a), 1n], [bn, bd] = b.T === "Rational" ? [b.n, b.d] : [bigDe(b), 1n];
      switch (op) {
        case "+": return V.rac(an * bd + bn * ad, ad * bd);
        case "-": return V.rac(an * bd - bn * ad, ad * bd);
        case "*": return V.rac(an * bn, ad * bd);
        case "/": return V.rac(an * bd, ad * bn);
        case "^": if (esEnteroLike(b)) { const n = bigDe(b); return n >= 0n ? V.rac(an ** n, ad ** n) : V.rac(ad ** -n, an ** -n); } break;
      }
      throw new NoSoportado("la operación " + op + " con fracciones");
    }
    const x = bigDe(a), y = bigDe(b);
    switch (op) {
      case "+": return I(x + y);
      case "-": return I(x - y);
      case "*": return I(x * y);
      case "/": return F(Number(x) / Number(y));
      case "÷": if (y === 0n) throw new ErrorJulia("DivideError: integer division error"); return I(x / y);
      case "%": if (y === 0n) throw new ErrorJulia("DivideError: integer division error"); return I(x % y);
      case "^":
        if (y < 0n) { const k = -y; throw new ErrorJulia("DomainError with " + y + ":\nCannot raise an integer x to a negative power " + y + ".\nMake x or " + y + " a float by adding a zero decimal (e.g., 2.0^" + y + " or 2^" + y + ".0 instead of 2^" + y + ") or write 1/x^" + k + ", float(x)^" + y + ", x^float(" + y + ") or (x//1)^" + y + "."); }
        return I(potencia(x, y));
    }
    throw errorMetodo(op, [a, b]);
  };
  P.aritmeticaVectores = (op, a, b) => {
    const va = V.esVector(a), vb = V.esVector(b);
    if ((op === "+" || op === "-") && va && vb) {
      if (V.esRango(a) || V.esRango(b)) throw new NoSoportado("sumar rangos");
      const n = V.largo(a), m = V.largo(b);
      if (n !== m) throw new ErrorJulia("DimensionMismatch: a has size (" + n + ",), b has size (" + m + ",), mismatch at dim 1");
      return P.recoge(V.elementos(a).map((x, i) => P.binaria(op, x, V.elemento(b, i + 1))));
    }
    if ((op === "*" && ((va && NUM(b)) || (vb && NUM(a)))) || (op === "/" && va && NUM(b))) {
      const v = va ? a : b;
      if (V.esRango(v)) throw new NoSoportado("multiplicar un rango por un número");
      return P.recoge(V.elementos(v).map(x => va ? P.binaria(op, x, b) : P.binaria(op, a, x)));
    }
    throw errorMetodo(op, [a, b]);
  };
  P.iguales = (a, b) => {
    if (NUM(a) && NUM(b)) {
      if (esEnteroLike(a) && esEnteroLike(b)) return bigDe(a) === bigDe(b);
      if (a.T === "Rational" || b.T === "Rational") {
        if (tieneDecimal(a, b)) return aNum(a) === aNum(b);
        const [an, ad] = a.T === "Rational" ? [a.n, a.d] : [bigDe(a), 1n], [bn, bd] = b.T === "Rational" ? [b.n, b.d] : [bigDe(b), 1n];
        return an * bd === bn * ad;
      }
      if (a.T === "Irrational" && b.T === "Irrational") return a.nombre === b.nombre;
      return aNum(a) === aNum(b);
    }
    if (MX.esMatriz(a) || MX.esMatriz(b)) return P.igualesM(a, b);
    if (a.T === "Struct" || b.T === "Struct") return P.identicosStruct(a, b);      // == de un tipo propio es ===
    if (V.esVector(a) && V.esVector(b)) {
      const n = V.largo(a); if (n !== V.largo(b)) return false;
      for (let i = 1; i <= n; i++) if (!P.iguales(V.elemento(a, i), V.elemento(b, i))) return false;
      return true;
    }
    if (a.T === "Tuple" && b.T === "Tuple") return a.a.length === b.a.length && a.a.every((x, i) => P.iguales(x, b.a[i]));
    if (a.T === "Pair" && b.T === "Pair") return P.iguales(a.a, b.a) && P.iguales(a.b, b.b);
    if (a.T === "NamedTuple" && b.T === "NamedTuple") return a.nombres.join() === b.nombres.join() && a.a.every((x, i) => P.iguales(x, b.a[i]));
    if (a.T === "Dict" && b.T === "Dict") { if (a.t.count !== b.t.count) return false; for (const [k, v] of a.t.entradas()) { const i = b.t.indice(k); if (i < 0 || !P.iguales(v, b.t.vals[i - 1])) return false; } return true; }
    if (a.T !== b.T) return false;
    if (a.T === "String" || a.T === "Char" || a.T === "Symbol") return a.v === b.v;
    if (a.T === "Nothing") return true;
    if (a.T === "Tipo") return a.nombre === b.nombre;
    return a === b;
  };
  P.identicos = (a, b) => {
    if (a.vistaDe || b.vistaDe) return !!(a.vistaDe && b.vistaDe) && a.vistaDe.clave === b.vistaDe.clave && tipo(a) === tipo(b);       // dos vistas de lo mismo son ===
    if (a.T === "Struct" || b.T === "Struct") return P.identicosStruct(a, b);
    if (MX.esVista(a) && MX.esVista(b)) return a.vista === b.vista && a.p === b.p;     // A' === A' (la vista no tiene identidad propia)
    if (a.T === "Vector" || a.T === "BitVector" || a.T === "Matrix") return a === b;
    if (a.T !== b.T) return false;
    if (a.T === "Float64") return Object.is(a.v, b.v);
    return P.iguales(a, b);
  };
  P.compara = (op, a, b) => {
    // a > b es b < a, y Julia lo comprueba con isless
    const [x, y] = op === ">" || op === ">=" ? [b, a] : [a, b];
    const estricto = op === "<" || op === ">";
    let menor, igual;
    if (NUM(x) && NUM(y)) {
      if (esEnteroLike(x) && esEnteroLike(y)) { menor = bigDe(x) < bigDe(y); igual = bigDe(x) === bigDe(y); }
      else if ((x.T === "Rational" || y.T === "Rational") && !tieneDecimal(x, y)) {
        const [an, ad] = x.T === "Rational" ? [x.n, x.d] : [bigDe(x), 1n], [bn, bd] = y.T === "Rational" ? [y.n, y.d] : [bigDe(y), 1n];
        menor = an * bd < bn * ad; igual = an * bd === bn * ad;
      } else { menor = aNum(x) < aNum(y); igual = aNum(x) === aNum(y); }
    } else if ((x.T === "String" && y.T === "String") || (x.T === "Char" && y.T === "Char")) {
      const cx = [...x.v].map(c => c.codePointAt(0)), cy = [...y.v].map(c => c.codePointAt(0));
      let k = 0; while (k < cx.length && k < cy.length && cx[k] === cy[k]) k++;
      menor = k < cx.length && k < cy.length ? cx[k] < cy[k] : cx.length < cy.length; igual = x.v === y.v;
    } else if ((x.T === "Pair" && y.T === "Pair") || (x.T === "Tuple" && y.T === "Tuple")) {   // orden lexicográfico
      const xs = x.T === "Pair" ? [x.a, x.b] : x.a, ys = y.T === "Pair" ? [y.a, y.b] : y.a;
      menor = false; igual = true;
      for (let k = 0; k < Math.min(xs.length, ys.length); k++) {
        if (P.compara("<", xs[k], ys[k]).v) { menor = true; igual = false; break; }
        if (P.compara("<", ys[k], xs[k]).v) { igual = false; break; }
      }
      if (igual && xs.length !== ys.length) { igual = false; menor = xs.length < ys.length; }
    } else throw errorMetodo("isless", [x, y]);
    return B(estricto ? menor : menor || igual);
  };
  P.aprox = (a, b) => {
    if (NUM(a) && NUM(b)) {
      if (P.iguales(a, b)) return true;
      if (!tieneDecimal(a, b)) return false;
      const x = aNum(a), y = aNum(b);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      return Math.abs(x - y) <= Math.sqrt(2.220446049250313e-16) * Math.max(Math.abs(x), Math.abs(y));
    }
    if (V.esVector(a) && V.esVector(b)) {
      const xs = V.elementos(a).map(aNum), ys = V.elementos(b).map(aNum);
      if (xs.length !== ys.length) throw new ErrorJulia("DimensionMismatch: dimensions must match: a has dims (Base.OneTo(" + xs.length + "),), b has dims (Base.OneTo(" + ys.length + "),), mismatch at 1");
      const norma = v => Math.sqrt(v.reduce((s, t) => s + t * t, 0));
      return norma(xs.map((t, i) => t - ys[i])) <= Math.sqrt(2.220446049250313e-16) * Math.max(norma(xs), norma(ys));
    }
    throw errorMetodo("isapprox", [a, b]);
  };
  P.pertenece = (x, col) => {
    if (col.T === "String") return B(x.T === "Char" && [...col.v].includes(x.v));
    if (col.T === "Dict") {
      if (x.T !== "Pair") throw new ErrorJulia("ArgumentError: AbstractDict collections only contain Pairs;\nEither look for e.g. A=>B instead, or use the `keys` or `haskey` function to test for keys");
      const i = col.t.indice(x.a); if (i < 0) return B(false);
      return P.binaria("==", col.t.vals[i - 1], x.b);
    }
    if (col.T === "Claves" && col.que === "keys") return B(col.d.t.indice(x) > 0);
    if (col.T === "Claves" || col.T === "NamedTuple") { for (const e of P.itera(col)) if (P.binaria("==", x, e).v === true) return B(true); return B(false); }
    if (!V.esVector(col) && col.T !== "Tuple" && !MX.esMatriz(col)) throw new NoSoportado("∈ con " + tipo(col));
    let falta = false;
    for (const e of P.itera(col)) { const r = P.binaria("==", x, e); if (r.T === "Missing") falta = true; else if (r.v) return B(true); }
    return falta ? FALTA : B(false);
  };

  // ── El punto (broadcasting) ──────────────────────────────────────────
  P.difunde = (f, args, kw = new Map()) => {
    const aplica = xs => typeof f === "string" ? P.binaria(f, xs[0], xs[1]) : prog.aplica(f, xs, kw);
    if (args.some(MX.esMatriz)) return P.difunde2(aplica, args);
    const vecs = args.filter(a => V.esVector(a));
    if (!vecs.length) return aplica(args);
    const lens = args.map(a => V.esVector(a) ? V.largo(a) : null);
    const n = Math.max(...lens.filter(x => x !== null));
    const malos = lens.filter(x => x !== null && x !== n && x !== 1);
    if (malos.length) {
      const [p, q] = lens.filter(x => x !== null);
      throw new ErrorJulia("DimensionMismatch: arrays could not be broadcast to a common size: a has axes Base.OneTo(" + p + ") and b has axes Base.OneTo(" + q + ")");
    }
    // Julia devuelve un rango al sumar, restar o multiplicar un rango de enteros por un entero
    if (typeof f === "string" && ["+", "-", "*", "/"].includes(f) && args.length === 2 && args.some(a => V.esRango(a))) {
      const [a, b] = args;
      const r = V.esRango(a) ? a : b, k = V.esRango(a) ? b : a;
      if (r.T !== "FloatRange" && (k.T === "Int64") && (f === "+" || (f === "-"))) {
        const signo = f === "-" && !V.esRango(a) ? -1n : 1n, s = f === "-" && V.esRango(a) ? -k.v : k.v;
        if (signo === 1n) return r.T === "UnitRange" ? { T: "UnitRange", start: r.start + s, stop: r.stop + s, oneTo: false } : { ...r, start: r.start + s, stop: r.stop + s };
      }
      throw new NoSoportado("operar con el punto entre un rango y un número");
    }
    const res = [];
    for (let i = 0; i < n; i++) res.push(aplica(args.map((a, j) => lens[j] === null ? a : V.elemento(a, lens[j] === 1 ? 1 : i + 1))));
    if (!res.length) throw new NoSoportado("operar con el punto sobre un vector vacío");
    return P.recoge(res, true);
  };
  P.difundeAsignacion = (destino, v) => {
    if (MX.esMatriz(destino)) { P.difundeAsignacionM(destino, v); return; }
    if (destino.T !== "Vector") throw new NoSoportado(".= sobre " + tipo(destino));
    const n = destino.a.length;
    for (let i = 0; i < n; i++) destino.a[i] = V.convierte(V.esVector(v) ? V.elemento(v, V.largo(v) === 1 ? 1 : i + 1) : v, destino.el);
  };
  // Un vector con los resultados: el tipo de sus casillas sale de los valores (Bool con el punto → BitVector)
  P.recoge = (res, bits = false) => {
    if (!res.length) throw new NoSoportado("un vector vacío sin tipo");
    if (res.some(MX.esMatriz)) throw new NoSoportado("un vector de matrices");
    const tipos = [...new Set(res.map(r => r.T === "Rational" ? "Rational{Int64}" : r.T === "Vector" || r.T === "String" || r.T === "Pair" || r.T === "Struct" ? tipo(r) : r.T))];
    if (res.some(r => r.T === "Struct")) return V.vec(V.promueve(tipos), res);
    if (tipos.length > 1 && tipos.every(t => t === "String" || t === "SubString{String}")) return V.vec("AbstractString", res);
    if (tipos.length === 1) {
      if (tipos[0] === "Bool" && bits) return V.bitvec(res);
      if (tipos[0] === "Irrational" || tipos[0].startsWith("Vector") || tipos[0] === "Tuple" || ["Dict", "Claves", "NamedTuple"].includes(tipos[0])) throw new NoSoportado("un vector de " + tipos[0]);
      return V.vec(tipos[0], res);
    }
    throw new NoSoportado("un vector con valores de tipos distintos (" + tipos.join(", ") + ")");
  };

  // ── Vectores, rangos e índices ───────────────────────────────────────
  P.vectorLiteral = vals => {
    if (!vals.length) return V.vec("Any", []);
    if (vals.some(v => MX.esMatriz(v))) throw new NoSoportado("un vector de matrices");
    if (vals.some(v => V.esVector(v) || v.T === "Tuple")) throw new NoSoportado("vectores de vectores (o concatenar con [a, b])");
    const tipos = vals.map(v => v.T === "Rational" ? "Rational{Int64}" : v.T === "String" || v.T === "Pair" || v.T === "Struct" ? tipo(v) : v.T);
    if (tipos.some(t => t === "Nothing" || t === "Missing") && new Set(tipos).size > 1) throw new NoSoportado("vectores con nothing o missing mezclados (Union)");
    const el = V.promueve(tipos);
    return V.vec(el, vals.map(v => V.convierte(v, el)));
  };
  P.vectorTipado = (el, vals) => {
    if (["Real", "Number", "Integer", "Signed", "AbstractFloat"].includes(el)) {         // Real[1, 2.5]: cada uno con su tipo
      for (const v of vals) if (!P.esDelTipo(v, el)) throw V.errorMetodo("convert", null, "Cannot `convert` an object of type " + tipo(v) + " to an object of type " + el);
      if (vals.some(v => !["Int64", "Float64", "Bool", "Rational"].includes(v.T))) throw new NoSoportado("un vector de " + el + " con estos valores");
      return V.vec(el, [...vals]);
    }
    if (!["Int64", "Float64", "String", "Bool", "Char", "Any", "SubString{String}", "AbstractString"].includes(el) && !P.esTipoPropio(el)) throw new NoSoportado("vectores de " + el);
    return V.vec(el, vals.map(v => V.convierte(v, el)));
  };
  P.rango = (a, s, b) => {
    const todos = [a, s, b].filter(Boolean);
    if (todos.every(x => x.T === "Int64")) return V.rangoEnteros(a.v, s ? s.v : null, b.v);
    if (todos.every(NUM) && todos.some(x => x.T === "Float64")) return V.rangoDecimales(aNum(a), s ? aNum(s) : 1, aNum(b));
    // 1:"diez": Julia no sabe hacer un rango con un texto (ni con un tipo propio)
    if (!s && [a, b].some(x => x.T === "String" || x.T === "Struct") && [a, b].every(x => NUM(x) || x.T === "String" || x.T === "Struct"))
      throw new ErrorJulia("MethodError: no method matching (::Colon)(::" + tipo(a) + ", ::" + tipo(b) + ")\nThe function `Colon()` exists, but no method is defined for this combination of argument types.");
    throw new NoSoportado("un rango de " + todos.map(tipo).join(" y "));
  };
  P.itera = x => {
    if (V.esVector(x) || x.T === "Tuple") return V.elementos(x);
    if (MX.esMatriz(x)) return [...MX.lineal(x)];          // por columnas, como Julia
    if (x.T === "Iter") return x.a;
    if (x.T === "Dict") return x.t.entradas().map(([k, v]) => ({ T: "Pair", a: k, b: v }));
    if (x.T === "Claves") return x.d.t.entradas().map(([k, v]) => x.que === "keys" ? k : v);
    if (x.T === "NamedTuple") return [...x.a];
    if (x.T === "Pair") return [x.a, x.b];
    if (x.T === "String") return [...x.v].map(Ch);
    if (NUM(x)) return [x];
    throw errorMetodo("iterate", [x]);
  };
  P.ultimoIndice = s => TX.ultimoIndice(s.v);
  const fueraDeLimites = (x, ind) => new ErrorJulia("BoundsError: attempt to access " + (x.T === "Tuple" ? tipo(x) : x.T === "String" ? TX.ncodeunits(x.v) + "-codeunit " + tipo(x) : V.largo(x) + "-element " + tipo(x)) + " at index [" + ind + "]");
  P.indexa = (x, i) => {
    if (i.T === "Indices2" && x.T === "DataFrame") return P.indexaDF(x, ...i.a);
    if (x.T === "DataFrame") throw new NoSoportado("una tabla con un solo índice: escribe df[!, :columna] o df[fila, :columna]");
    if (i.T === "Indices2") return P.indexa2(x, ...i.a);
    if (i.T === "Colon" && V.esVector(x) && !V.esRango(x)) return x.T === "BitVector" ? V.bitvec([...x.a]) : V.vec(x.el, [...x.a]);
    if (x.T === "String") return TX.indexa(x, i);
    if (x.T === "Dict") return P.indexaDict(x, i);
    if (MX.esMatriz(x)) return P.indexaLineal(x, i);
    if (x.T === "NamedTuple") { if (i.T !== "Int64") throw new NoSoportado("este índice en una tupla con nombre"); const k = Number(i.v); if (k < 1 || k > x.a.length) throw new ErrorJulia("BoundsError: attempt to access " + tipo(x) + " at index [" + k + "]"); return x.a[k - 1]; }
    if (!V.esVector(x) && x.T !== "Tuple") throw errorMetodo("getindex", [x, i]);
    const n = V.largo(x);
    if (i.T === "Int64") {
      const k = Number(i.v);
      if (k < 1 || k > n) throw fueraDeLimites(x, repr(i));
      return V.elemento(x, k);
    }
    if (i.T === "Float64" || i.T === "Bool") throw new ErrorJulia("ArgumentError: invalid index: " + repr(i) + " of type " + tipo(i));
    if (V.esVector(i)) {
      if (V.esRango(x)) throw new NoSoportado("indexar un rango con varios índices");
      if (x.T === "Tuple") throw new NoSoportado("indexar una tupla con varios índices");
      const els = V.elementos(i);
      let res;
      if (V.eltipo(i) === "Bool") {
        if (els.length !== n) throw fueraDeLimites(x, els.length + "-element " + tipo(i));
        res = x.a.filter((_, k) => els[k].v);
      } else {
        if (!els.every(e => e.T === "Int64")) throw new ErrorJulia("ArgumentError: invalid index: " + repr(i) + " of type " + tipo(i));
        if (els.some(e => e.v < 1n || e.v > BigInt(n))) throw fueraDeLimites(x, repr(i));
        res = els.map(e => x.a[Number(e.v) - 1]);
      }
      return x.T === "BitVector" ? V.bitvec(res) : V.vec(x.el, res);
    }
    throw new ErrorJulia("ArgumentError: invalid index: " + repr(i) + " of type " + tipo(i));
  };
  P.ponIndice = (x, i, v, punto = false) => {
    if (i.T === "Indices2" && x.T === "DataFrame") { P.ponDF(x, ...i.a, v, punto); return; }
    if (i.T === "Indices2") { P.ponIndice2(x, ...i.a, v, punto); return; }
    if (i.T === "Colon" && (x.T === "Vector" || x.T === "BitVector")) i = V.rangoEnteros(1n, null, BigInt(x.a.length));
    if (x.T === "Dict") { if (punto) throw new NoSoportado("d[k] .= v en un Dict"); P.ponDict(x, i, v); return; }
    if (MX.esMatriz(x)) { P.ponLineal(x, i, v, punto); return; }
    if (x.T === "Tuple" || x.T === "NamedTuple") throw errorMetodo("setindex!", [x, v, i]);
    if (x.T === "String") throw errorMetodo("setindex!", [x, v, i]);
    if (V.esRango(x)) throw new ErrorJulia("CanonicalIndexError: setindex! not defined for " + tipo(x));
    if (x.T !== "Vector" && x.T !== "BitVector") throw errorMetodo("setindex!", [x, v, i]);
    if (V.esVector(i)) {
      // v[2:3] = [20, 30], v[filtro] .= 5: las casillas elegidas, en su orden
      const els = V.elementos(i), n = x.a.length;
      let pos;
      if (V.eltipo(i) === "Bool") { if (els.length !== n) throw fueraDeLimites(x, els.length + "-element " + tipo(i)); pos = els.map((e, k) => e.v ? k : -1).filter(k => k >= 0); }
      else {
        if (!els.every(e => e.T === "Int64")) throw new ErrorJulia("ArgumentError: invalid index: " + repr(i) + " of type " + tipo(i));
        if (els.some(e => e.v < 1n || e.v > BigInt(n))) throw fueraDeLimites(x, repr(i));
        pos = els.map(e => Number(e.v) - 1);
      }
      const esVec = V.esVector(v);
      if (!punto && !esVec) throw new ErrorJulia("ArgumentError: indexed assignment with a single value to possibly many locations is not supported; perhaps use broadcasting `.=` instead?");
      const lv = esVec ? V.largo(v) : 1;
      if (esVec && lv !== pos.length && !(punto && lv === 1)) throw new ErrorJulia(punto ? "DimensionMismatch: array could not be broadcast to match destination" : "DimensionMismatch: tried to assign " + lv + " elements to " + pos.length + " destinations");
      const nuevos = pos.map((_, k) => esVec ? V.elemento(v, lv === 1 ? 1 : k + 1) : v);
      const conv = nuevos.map(e => x.T === "BitVector" ? (e.T === "Bool" ? e : (() => { throw errInexacto("Bool", e); })()) : V.convierte(e, x.el));
      pos.forEach((p, k) => { x.a[p] = conv[k]; });
      return;
    }
    if (i.T !== "Int64") throw new ErrorJulia("ArgumentError: invalid index: " + repr(i) + " of type " + tipo(i));
    if (punto) { P.ponIndice(x, V.vec("Int64", [i]), v, true); return; }
    const k = Number(i.v);
    if (k < 1 || k > x.a.length) throw fueraDeLimites(x, repr(i));
    if (x.T === "BitVector") {
      if (v.T === "Bool") { x.a[k - 1] = v; return; }
      if (v.T === "Int64" && (v.v === 0n || v.v === 1n)) { x.a[k - 1] = B(v.v === 1n); return; }
      throw errInexacto("Bool", v);
    }
    x.a[k - 1] = V.convierte(v, x.el);
  };
  P.esDelTipo = (v, t) => {
    const tt = { Int: "Int64" }[t] || t;
    switch (tt) {
      case "Any": return true;
      case "Number": return NUM(v);
      case "Real": return NUM(v);
      case "Integer": return esEnteroLike(v);
      case "Signed": return v.T === "Int64";
      case "AbstractChar": return v.T === "Char";
      case "Nothing": case "Missing": return v.T === tt;
      case "AbstractFloat": case "Float64": return v.T === "Float64";
      case "Int64": case "Bool": case "Char": return v.T === tt;
      case "String": case "AbstractString": return v.T === "String";
      case "AbstractVector": return V.esVector(v);
      case "Vector": return v.T === "Vector";
      case "AbstractMatrix": return MX.esMatriz(v);
      case "Matrix": return MX.esMatriz(v) && !v.vista && !v.bit;
      case "AbstractArray": return MX.esMatriz(v) || V.esVector(v);
      case "IO": return v.T === "IO";
    }
    if (tt === "Exception" || ER.NOMBRES.includes(tt)) return (v.T === "Excepcion" || v.T === "Struct") && P.esSubtipo(v.tipo, tt);
    if (/^Matrix\{(\w+)\}$/.test(tt)) return MX.esMatriz(v) && !v.vista && !v.bit && v.el === tt.slice(7, -1);
    if (/^Vector\{(\w+)\}$/.test(tt)) return v.T === "Vector" && v.el === tt.slice(7, -1);
    if (/^Vector\{<:(\w+)\}$/.test(tt)) return v.T === "Vector" && P.esSubtipo(v.el, tt.slice(9, -1));
    if (P.esTipoPropio(tt)) return v.T === "Struct" && P.esSubtipo(v.tipo, tt);
    if (/^\w+\{/.test(tt) && P.esTipoPropio(/^(\w+)/.exec(tt)[1])) return v.T === "Struct" && tipo(v) === tt;
    throw new NoSoportado("el tipo " + t + " en un argumento");
  };
  // Int(x), Float64(x)…
  P.construye = (nombre, args, kw) => {
    if (P.esTipoPropio(nombre)) return P.creaStruct(nombre, args, kw);
    if (nombre === "Expr" || nombre === "QuoteNode" || nombre === "Symbol") return fn[nombre](args, kw);
    const [x] = args;
    if (args.length !== 1) throw new NoSoportado(nombre + "() con " + args.length + " argumentos");
    if (nombre === "Int64") {
      if (x.T === "Int64") return x;
      if (x.T === "Bool") return I(x.v ? 1 : 0);
      if (NUM(x)) { const v = aNum(x); if (Number.isInteger(v) && Math.abs(v) < 2 ** 63) return I(BigInt(v)); throw errInexacto("Int64", x); }
      if (x.T === "Char") return I(x.v.codePointAt(0));
      throw errorMetodo("Int64", [x]);
    }
    if (nombre === "Float64") { if (NUM(x)) return F(aNum(x)); throw errorMetodo("Float64", [x]); }
    if (nombre === "Bool") {
      if (x.T === "Bool") return x;
      if (NUM(x)) { const v = aNum(x); if (v === 0 || v === 1) return B(v === 1); throw errInexacto("Bool", x); }
      throw errorMetodo("Bool", [x]);
    }
    if (nombre === "Char" && x.T === "Int64") return Ch(String.fromCodePoint(Number(x.v)));
    if (nombre === "String" && x.T === "String") return x;
    throw new NoSoportado(nombre + "(…)");
  };

  // ── Lo que escribe el REPL ───────────────────────────────────────────
  P.muestra = x => {
    if (x.T === "Funcion") { const m = x.nmetodos(); return x.nombre + " (generic function with " + m + " method" + (m === 1 ? "" : "s") + ")"; }
    if (x.T === "Primitiva") throw new NoSoportado("mostrar la función " + x.nombre);
    if (x.T === "Tipo") {
      const m = /^Vector\{(.+)\}$/.exec(x.nombre);
      if (m) return x.nombre + " (alias for Array{" + m[1] + ", 1})";
      if (x.nombre === "BitVector") return "BitVector (alias for BitArray{1})";
      const mm = /^Matrix\{(.+)\}$/.exec(x.nombre);
      if (mm) return x.nombre + " (alias for Array{" + mm[1] + ", 2})";
      if (x.nombre === "BitMatrix") return "BitMatrix (alias for BitArray{2})";
      return x.nombre;
    }
    if (x.T === "VistaRara") throw new NoSoportado("escribir esta vista (view)");
    if (x.T === "TestOK") return "Test Passed" + (x.lanzado ? "\n      Thrown: " + x.lanzado : "");
    if (x.vistaDe && !x.a.length) return x.el + "[]";
    if (x.vistaTxt) { const t = V.muestra(x), k = t.indexOf(":\n"); return (MX.esMatriz(x) ? MX.forma(x) : V.largo(x) + "-element") + " " + x.vistaTxt + " with eltype " + V.eltipo(x) + t.slice(k); }
    return V.muestra(x);
  };

  // ── Las funciones ────────────────────────────────────────────────────
  const fn = {};
  const unNum = (nombre, f) => (args) => {
    if (args.length !== 1) throw errorMetodo(nombre, args);
    const [x] = args;
    if (x.T === "Missing") return FALTA;
    if (!NUM(x)) throw errorMetodo(nombre, args);
    return f(x);
  };
  // print(io, …) dentro de un Base.showerror (capítulo 22): escribe en el texto del error
  const escribe = (args, salto) => {
    if (args[0] && args[0].T === "IO") { args[0].buf += args.slice(1).map(V.texto).join("") + (salto ? "\n" : ""); return NADA; }
    prog.salida += args.map(V.texto).join("") + (salto ? "\n" : ""); return NADA;
  };
  fn.println = args => escribe(args, true);
  fn.print = args => escribe(args, false);
  fn.typeof = ([x]) => T(tipo(x));
  // ── Copias y vistas (capítulo 21) ───────────────────────────────────
  // Una vista (SubArray) es un vector cuyas casillas son casillas de otro: sus elementos se leen y se escriben
  // en el padre, a través de un Proxy. Solo vistas de una dimensión: de un vector, o una fila o columna (o un
  // trozo) de una matriz.
  const claves = new WeakMap(); let nclave = 0;
  const claveDe = o => { if (!claves.has(o)) claves.set(o, ++nclave); return claves.get(o); };
  const SLICE = "Base.Slice{Base.OneTo{Int64}}";
  P.subvista = (x, i) => {
    if (x.vistaDe) throw new NoSoportado("una vista de otra vista");
    let pos, itxt, ttxt, rapido = true;
    if (x.T === "Vector") {
      if (i.T === "Indices2") throw new NoSoportado("dos índices en un vector");
      const n = x.a.length, malo = t => { throw new ErrorJulia("BoundsError: attempt to access " + n + "-element " + tipo(x) + " at index [" + t + "]"); };
      if (i.T === "Colon") { pos = x.a.map((_, k) => k); itxt = ":"; ttxt = SLICE; }
      else if ((i.T === "UnitRange" && !i.oneTo) || i.T === "StepRange") {
        const ks = V.elementos(i).map(e => Number(e.v));
        if (ks.some(k => k < 1 || k > n)) malo(V.repr(i));
        pos = ks.map(k => k - 1); itxt = V.repr(i); ttxt = i.T === "UnitRange" ? "UnitRange{Int64}" : "StepRange{Int64, Int64}";
      } else if (i.T === "Vector" && i.el === "Int64") {
        const ks = i.a.map(e => Number(e.v));
        if (ks.some(k => k < 1 || k > n)) malo(V.repr(i));
        pos = ks.map(k => k - 1); itxt = V.repr(i); ttxt = "Vector{Int64}"; rapido = false;
      } else if (i.T === "BitVector" || (i.T === "Vector" && i.el === "Bool")) {
        if (i.a.length !== n) malo(V.repr(i));
        pos = i.a.map((e, k) => e.v ? k : -1).filter(k => k >= 0);
        itxt = "[" + pos.map(k => k + 1).join(", ") + "]"; ttxt = "Vector{Int64}"; rapido = false;
      } else if (i.T === "Int64") throw new NoSoportado("una vista de una sola casilla (de dimensión 0)");
      else throw new NoSoportado("una vista con este índice (" + tipo(i) + ")");
    } else if (MX.esMatriz(x) && !x.vista && !x.bit) {
      if (i.T !== "Indices2") throw new NoSoportado("una vista de una matriz con un solo índice");
      const [r, c] = i.a, [f, nc] = MX.dims(x);
      const lista = (ind, n) => ind.T === "Colon" ? { ks: Array.from({ length: n }, (_, k) => k + 1), txt: "1:" + n, it: ":", tt: SLICE }
        : ind.T === "Int64" ? { ks: [Number(ind.v)], txt: V.repr(ind), it: V.repr(ind), tt: "Int64", uno: true }
        : ind.T === "UnitRange" && !ind.oneTo ? { ks: V.elementos(ind).map(e => Number(e.v)), txt: V.repr(ind), it: V.repr(ind), tt: "UnitRange{Int64}" } : null;
      const lr = lista(r, f), lc = lista(c, nc);
      if (!lr || !lc || (!lr.uno && !lc.uno) || (lr.uno && lc.uno)) throw new NoSoportado("esta vista de una matriz: el laboratorio solo hace vistas de una fila o de una columna (o de un trozo suyo)");
      if (lr.ks.some(k => k < 1 || k > f) || lc.ks.some(k => k < 1 || k > nc)) throw new ErrorJulia("BoundsError: attempt to access " + f + "×" + nc + " " + MX.tipoM(x) + " at index [" + lr.txt + ", " + lc.txt + "]");
      pos = [];
      for (const cc of lc.ks) for (const rr of lr.ks) pos.push((cc - 1) * f + (rr - 1));
      itxt = lr.it + ", " + lc.it; ttxt = lr.tt + ", " + lc.tt;
    } else throw new NoSoportado("una vista de un " + tipo(x));
    const p = x, n = pos.length;
    const a = new Proxy(new Array(n).fill(null), {
      get(t, k, r) { if (typeof k === "string" && /^\d+$/.test(k)) { const j = +k; return j < n ? p.a[pos[j]] : undefined; } if (k === "length") return n; return Reflect.get(t, k, r); },
      set(t, k, v) {
        if (typeof k === "string" && /^\d+$/.test(k) && +k < n) { p.a[pos[+k]] = v; return true; }
        if (k === "length" && v === n) return true;
        throw new NoSoportado("cambiar el tamaño de una vista: Julia no deja (da un MethodError de resize!)");
      },
    });
    const el = x.el, tpadre = MX.esMatriz(x) ? MX.tipoM(x) : tipo(x);
    return Object.assign(V.vec(el, a), {
      tipoTxt: "SubArray{" + el + ", 1, " + tpadre + ", Tuple{" + ttxt + "}, " + rapido + "}",
      vistaTxt: "view(::" + tpadre + ", " + itxt + ")",
      vistaDe: { p, pos, i: itxt, clave: "vista|" + claveDe(p) + "|" + itxt },
    });
  };
  fn.view = args => {
    if (args.length < 2) throw errorMetodo("view", args);
    return P.subvista(args[0], args.length === 2 ? args[1] : { T: "Indices2", a: args.slice(1) });
  };
  fn.parent = ([x]) => {
    if (x.vistaDe) return x.vistaDe.p;
    if (MX.esVista && MX.esVista(x)) throw new NoSoportado("parent de una vista traspuesta");
    if (x.T === "Vector" || x.T === "BitVector" || MX.esMatriz(x)) return x;
    throw new NoSoportado("parent de un " + tipo(x));
  };
  // ismutable: comprobado en Julia 1.13 (un texto y un símbolo dicen true; una vista, false)
  fn.ismutable = ([x]) => {
    if (x.vistaDe || (MX.esVista && MX.esVista(x))) return B(false);
    if (["Vector", "BitVector", "Matrix", "Dict", "String", "Symbol", "Tipo", "Plot", "DataFrame"].includes(x.T)) return B(true);
    if (x.T === "Struct") return B(!!x.mut);
    if (V.esNumero(x) || ["Char", "Nothing", "Missing", "Tuple", "NamedTuple", "Pair", "Funcion", "Primitiva"].includes(x.T) || V.esRango(x)) return B(false);
    throw new NoSoportado("ismutable de un " + tipo(x));
  };
  // deepcopy: copia todo lo que cuelga del valor, recordando lo ya copiado (si una ficha sale dos veces, la copia
  // también sale dos veces, la misma), como Base.deepcopy
  fn.deepcopy = ([x]) => {
    const hechos = new Map();
    const dc = y => {
      if (hechos.has(y)) return hechos.get(y);
      if (V.esEscalar(y) || V.esRango(y) || y.T === "Funcion" || y.T === "Primitiva" || y.T === "Tipo") return y;
      if (y.vistaDe || (MX.esVista && MX.esVista(y))) throw new NoSoportado("deepcopy de una vista");
      let r;
      if (y.T === "Vector") { r = V.vec(y.el, []); hechos.set(y, r); r.a.push(...y.a.map(dc)); if (y.tipoTxt) r.tipoTxt = y.tipoTxt; return r; }
      if (y.T === "BitVector") { r = V.bitvec([...y.a]); hechos.set(y, r); return r; }
      if (MX.esMatriz(y)) { r = MX.mat(y.el, y.f, y.c, [], y.bit); hechos.set(y, r); r.a.push(...y.a.map(dc)); return r; }
      if (y.T === "Struct") { r = { ...y, a: [] }; hechos.set(y, r); r.a.push(...y.a.map(dc)); return r; }
      if (y.T === "Tuple") return { T: "Tuple", a: y.a.map(dc) };
      if (y.T === "NamedTuple") return { ...y, a: y.a.map(dc) };
      if (y.T === "Pair") return { ...y, a: dc(y.a), b: dc(y.b) };
      throw new NoSoportado("deepcopy de un " + tipo(y));
    };
    return dc(x);
  };
  // ── El código como dato (capítulo 20) ───────────────────────────────
  fn.Expr = args => {
    if (!args.length) throw errorMetodo("Expr", args);
    if (args[0].T !== "Symbol") throw new ErrorJulia("TypeError: in Expr, expected Symbol, got a value of type " + tipo(args[0]));
    for (const a of args.slice(1)) if (!EX.cabeEnExpr(a)) throw new NoSoportado("meter un " + tipo(a) + " dentro de una expresión");
    return EX.nuevaExpr(args[0].v, args.slice(1));
  };
  fn.esc = args => { if (args.length !== 1) throw errorMetodo("esc", args); return EX.nuevaExpr("escape", [args[0]]); };
  fn.eval = args => { if (args.length !== 1) throw new NoSoportado("eval con un módulo"); return prog.evalua(args[0]); };
  fn.QuoteNode = args => { if (args.length !== 1) throw errorMetodo("QuoteNode", args); return { T: "QuoteNode", v: args[0] }; };
  fn.Symbol = args => { if (!args.length) throw errorMetodo("Symbol", args); return EX.sym(args.map(V.texto).join("")); };
  fn.dump = args => { if (args.length !== 1) throw new NoSoportado("dump con opciones"); prog.salida += EX.dump(args[0]) + "\n"; return NADA; };
  P.modulos = P.modulos || {};
  P.modulos.Meta = {
    parse: (args, kw) => {
      if (args.length !== 1 || args[0].T !== "String" || (kw && kw.size)) throw new NoSoportado("Meta.parse con más de un argumento");
      const t = args[0].v;
      if (!t.trim()) return NADA;
      prog.leyendo = "none";
      try { return prog.aExpr(prog.leeCodigo(t), null, false); } finally { prog.leyendo = null; }
    },
  };
  fn.eltype = ([x]) => {
    if (x.T === "Tipo") { const m = /^Vector\{(.+)\}$/.exec(x.nombre); if (m) return T(m[1]); throw new NoSoportado("eltype de " + x.nombre); }
    if (V.esVector(x) || MX.esMatriz(x)) return T(V.eltipo(x));
    if (x.T === "String") return T("Char");
    if (x.T === "Dict") return T("Pair{" + x.K + ", " + x.V + "}");
    if (x.T === "Tuple" && x.a.length && x.a.every(e => tipo(e) === tipo(x.a[0]))) return T(tipo(x.a[0]));
    throw new NoSoportado("eltype de un " + tipo(x));
  };
  // promote y promote_type con Bool, Int64, Rational{Int64} y Float64 (las reglas de promote_rule de Julia)
  const RANGO_PROMO = { Bool: 0, Int64: 1, "Rational{Int64}": 2, Float64: 3 };
  const promoTipo = ts => {
    if (!ts.every(t => t in RANGO_PROMO)) throw new NoSoportado("promocionar " + ts.join(", "));
    const m = Math.max(...ts.map(t => RANGO_PROMO[t]));
    return Object.keys(RANGO_PROMO).find(k => RANGO_PROMO[k] === m);
  };
  fn.promote_type = (args) => { if (!args.length || !args.every(a => a.T === "Tipo")) throw new NoSoportado("promote_type con estos argumentos"); return T(promoTipo(args.map(a => a.nombre))); };
  fn.promote = (args) => {
    if (!args.length) return { T: "Tuple", a: [] };
    const t = promoTipo(args.map(tipo));
    return { T: "Tuple", a: args.map(x => V.convierte(x, t)) };
  };
  fn.sqrt = unNum("sqrt", x => { const v = aNum(x); if (v < 0) throw DOM_SQRT(v); return F(Math.sqrt(v)); });
  fn.cbrt = unNum("cbrt", x => F(Math.cbrt(aNum(x))));
  // exp, log, sin y cos con los algoritmos de Julia (matematicas.mjs): Math.exp y compañía no siempre dan su último dígito
  fn.exp = unNum("exp", x => { const v = aNum(x); return F(julia("exp", v, MT.exp(v))); });
  const lg = (nombre, f) => x => { const v = aNum(x); if (v < 0) throw DOM_LOG(nombre, v); return julia(nombre, v, f(v)); };
  fn.log = (args) => {
    if (args.length === 2) { const [b, x] = args; if (!NUM(b) || !NUM(x)) throw errorMetodo("log", args); return F(lg("log", MT.log)(x) / lg("log", MT.log)(b)); }
    return unNum("log", x => F(lg("log", MT.log)(x)))(args);
  };
  fn.log10 = unNum("log10", x => F(lg("log10", MT.log10)(x)));
  fn.log2 = unNum("log2", x => F(lg("log2", MT.log2)(x)));
  const DOM_TRIG = (f, v) => new ErrorJulia("DomainError with " + V.decimal(v) + ":\n" + f + "(x) is only defined for finite x.");
  for (const t of ["sin", "cos"]) fn[t] = unNum(t, x => { const v = aNum(x); if (v === Infinity || v === -Infinity) throw DOM_TRIG(t, v); return F(julia(t, v, MT[t](v))); });
  fn.atan = unNum("atan", x => F(Math.atan(aNum(x))));          // comprobado: igual que Julia en 60 000 valores
  for (const t of ["tan", "sinh", "cosh", "tanh", "asin", "acos", "expm1", "log1p"]) fn[t] = unNum(t, x => { throw new NoSoportado(t + ": el laboratorio aún no lo calcula con el último dígito de Julia (pruébalo en la nube)"); });
  fn.abs = unNum("abs", x => x.T === "Int64" ? I(x.v < 0n ? -x.v : x.v) : x.T === "Bool" ? x : x.T === "Rational" ? V.rac(x.n < 0n ? -x.n : x.n, x.d) : F(Math.abs(aNum(x))));
  fn.abs2 = unNum("abs2", x => x.T === "Bool" ? x : P.binaria("*", x, x));
  fn.sign = unNum("sign", x => x.T === "Int64" ? I(x.v > 0n ? 1 : x.v < 0n ? -1 : 0) : F(Math.sign(aNum(x))));
  fn.iszero = unNum("iszero", x => B(aNum(x) === 0));
  fn.iseven = unNum("iseven", x => { if (!esEnteroLike(x)) throw errorMetodo("iseven", [x]); return B(bigDe(x) % 2n === 0n); });
  fn.isodd = unNum("isodd", x => { if (!esEnteroLike(x)) throw errorMetodo("isodd", [x]); return B(bigDe(x) % 2n !== 0n); });
  fn.isinteger = unNum("isinteger", x => B(Number.isInteger(aNum(x))));
  fn.isnan = unNum("isnan", x => B(Number.isNaN(aNum(x))));
  fn.isfinite = unNum("isfinite", x => B(Number.isFinite(aNum(x))));
  fn.ismissing = ([x]) => B(x.T === "Missing");
  fn.isnothing = ([x]) => B(x.T === "Nothing");
  const aEntero = (t, v, x) => { if (!Number.isFinite(v) || Math.abs(v) >= 2 ** 63) throw errInexacto(t + "(Int64", x); return I(BigInt(v)); };
  const redondeos = { round: redondea, floor: Math.floor, ceil: Math.ceil, trunc: Math.trunc };
  for (const [nombre, r] of Object.entries(redondeos)) {
    fn[nombre] = (args, kw) => {
      if (args.length === 2 && args[0].T === "Tipo") {
        const [t, x] = args;
        if (t.nombre !== "Int64") throw new NoSoportado(nombre + "(" + t.nombre + ", x)");
        if (esEnteroLike(x)) return I(bigDe(x));
        const v = r(aNum(x));
        if (!Number.isFinite(v) || Math.abs(v) >= 2 ** 63) throw new ErrorJulia("InexactError: " + nombre + "(Int64, " + repr(x) + ")");
        return I(BigInt(v));
      }
      if (args.length !== 1) throw new NoSoportado(nombre + " con estos argumentos");
      const [x] = args;
      if (!NUM(x)) throw errorMetodo(nombre, args);
      if (esEnteroLike(x) && !kw.size) return x.T === "Bool" ? x : x;
      const dig = kw.get("digits");
      if (kw.has("sigdigits") || [...kw.keys()].some(k => k !== "digits")) throw new NoSoportado(nombre + " con esas opciones");
      if (dig) {
        if (esEnteroLike(x)) return x;
        const d = Number(dig.v), p = Math.pow(10, Math.abs(d)), v = aNum(x);
        return F(d >= 0 ? r(v * p) / p : r(v / p) * p);
      }
      return F(r(aNum(x)));
    };
  }
  const dosEnteros = (nombre, f) => args => {
    if (args.length !== 2) throw errorMetodo(nombre, args);
    const [a, b] = args;
    if (esEnteroLike(a) && esEnteroLike(b)) return f(bigDe(a), bigDe(b), true);
    if (NUM(a) && NUM(b)) return f(aNum(a), aNum(b), false);
    throw errorMetodo(nombre, args);
  };
  fn.div = dosEnteros("div", (x, y, ent) => { if (ent) { if (y === 0n) throw new ErrorJulia("DivideError: integer division error"); return I(x / y); } return F(Math.trunc(x / y)); });
  fn.rem = dosEnteros("rem", (x, y, ent) => { if (ent) { if (y === 0n) throw new ErrorJulia("DivideError: integer division error"); return I(x % y); } return F(x % y); });
  fn.mod = dosEnteros("mod", (x, y, ent) => {
    if (ent) { if (y === 0n) throw new ErrorJulia("DivideError: integer division error"); const r = x % y; return I(r !== 0n && (r < 0n) !== (y < 0n) ? r + y : r); }
    const r = x % y; return F(r !== 0 && (r < 0) !== (y < 0) ? r + y : r);
  });
  fn.gcd = dosEnteros("gcd", (x, y, ent) => { if (!ent) throw new NoSoportado("gcd con decimales"); let a = x < 0n ? -x : x, b = y < 0n ? -y : y; while (b) [a, b] = [b, a % b]; return I(a); });
  // max(x::Real, y::Real) = max(promote(x, y)...): con un decimal, el resultado es decimal; con un NaN, NaN
  const extremo2 = (nombre, mayor) => args => {
    if (args.length === 1 && NUM(args[0]) && args[0].T !== "Irrational") return args[0];
    if (args.length < 2) throw errorMetodo(nombre, args);
    let xs = args;
    if (xs.every(NUM) && new Set(xs.map(x => x.T)).size > 1) {
      if (xs.some(x => x.T === "Irrational" || x.T === "Bool")) throw new NoSoportado(nombre + " de estos números");
      const el = V.promueve(xs.map(x => x.T === "Rational" ? "Rational{Int64}" : x.T));
      xs = xs.map(x => V.convierte(x, el));
    }
    if (xs.some(x => x.T === "Float64" && Number.isNaN(x.v))) return xs.find(x => x.T === "Float64" && Number.isNaN(x.v));
    return xs.reduce((a, b) => {
      if (a.T === "Float64" && b.T === "Float64" && a.v === 0 && b.v === 0) return mayor ? (Object.is(a.v, -0) ? b : a) : (Object.is(a.v, -0) ? a : b);     // max(-0.0, 0.0) == 0.0
      return (mayor ? P.compara("<", a, b) : P.compara("<", b, a)).v ? b : a;
    });
  };
  fn.max = extremo2("max", true);
  fn.min = extremo2("min", false);
  fn.factorial = unNum("factorial", x => {
    if (!esEnteroLike(x)) throw new NoSoportado("factorial de un decimal");
    const n = bigDe(x);
    if (n < 0n) throw new ErrorJulia("DomainError with " + n + ":\n`n` must not be negative.");
    if (n > 20n) throw new ErrorJulia("OverflowError: " + n + " is too large to look up in the table; consider using `factorial(big(" + n + "))` instead");
    let r = 1n; for (let k = 2n; k <= n; k++) r *= k; return I(r);
  });
  fn.typemax = ([t]) => { if (t.T === "Tipo" && t.nombre === "Int64") return I(9223372036854775807n); if (t.T === "Tipo" && t.nombre === "Float64") return F(Infinity); throw new NoSoportado("typemax"); };
  fn.typemin = ([t]) => { if (t.T === "Tipo" && t.nombre === "Int64") return I(-9223372036854775808n); if (t.T === "Tipo" && t.nombre === "Float64") return F(-Infinity); throw new NoSoportado("typemin"); };
  fn.eps = args => { if (!args.length) return F(2.220446049250313e-16); throw new NoSoportado("eps(x)"); };
  fn.isapprox = ([a, b], kw) => { if (kw.size) throw new NoSoportado("isapprox con tolerancias"); return B(P.aprox(a, b)); };
  fn.string = args => S(args.map(V.texto).join(""));
  fn.repeat = ([s, n]) => P.binaria("^", s, n);
  fn.length = args => { if (args.length !== 1) throw errorMetodo("length", args); const [x] = args; if (NUM(x)) return I(1); if (!V.esVector(x) && !["String", "Tuple", "Dict", "Claves", "NamedTuple", "Matrix"].includes(x.T)) throw errorMetodo("length", args); return I(V.largo(x)); };
  fn.isempty = ([x]) => B(V.largo(x) === 0);
  const coleccion = (nombre, x) => { if (MX.esMatriz(x)) return [...MX.lineal(x)]; if (x.T === "Claves" || x.T === "NamedTuple" || x.T === "Iter") return P.itera(x); if (!V.esVector(x) && x.T !== "Tuple") { if (NUM(x)) return [x]; throw errorMetodo(nombre, [x]); } return P.itera(x); };
  const VACIO = "ArgumentError: reducing over an empty collection is not allowed; consider supplying `init` to the reducer";
  const conDims = (nombre, args, kw, base) => {
    if (!kw || !kw.has("dims")) return null;
    if (kw.size !== 1 || args.length !== 1) throw new NoSoportado(nombre + " con estas opciones");
    const [x] = args, d = kw.get("dims");
    if (d.T !== "Int64") throw new NoSoportado(nombre + " con dims = " + repr(d));
    if (!MX.esMatriz(x)) { if (V.esVector(x) && d.v === 1n) return V.vec(V.eltipo(x) === "Bool" ? "Int64" : V.eltipo(x), [base([x])]); throw new NoSoportado(nombre + "(…; dims) de un " + tipo(x)); }
    return P.reduceDims(nombre, x, d, base);
  };
  fn.sum = (args, kw) => {
    { const r = conDims("sum", args, kw, a => fn.sum(a, new Map())); if (r) return r; }
    if (args.length === 2) return fn.sum([P.difundeF(args[0], args[1])], kw);
    const [x] = args; const els = coleccion("sum", x);
    if (!els.length) { const el = V.eltipo(x); if (el === "Float64") return F(0); if (el === "Int64" || el === "Bool") return I(0); throw new ErrorJulia(VACIO); }
    if (els.every(e => e.T === "Bool")) return I(els.filter(e => e.v).length);
    if (els.every(e => e.T === "Float64")) return F(sumaPareada(els.map(e => e.v)));
    return els.slice(1).reduce((a, b) => P.binaria("+", a, b), els[0].T === "Bool" ? I(els[0].v ? 1 : 0) : els[0]);
  };
  fn.prod = (args, kw) => { { const r = conDims("prod", args, kw, a => fn.prod(a, new Map())); if (r) return r; } const [x] = args; const els = coleccion("prod", x); if (!els.length) { const el = V.eltipo(x); if (el === "Float64") return F(1); if (el === "Int64") return I(1); throw new ErrorJulia(VACIO); } return els.slice(1).reduce((a, b) => P.binaria("*", a, b), els[0]); };
  const extremo = (nombre, mayor) => (args, kw) => {
    { const r = conDims(nombre, args, kw, a => fn[nombre](a, new Map())); if (r) return r; }
    if (args.length === 2) return fn[nombre]([P.difundeF(args[0], args[1])], new Map());
    const els = coleccion(nombre, args[0]);
    if (!els.length) throw new ErrorJulia(VACIO);
    let r = els[0];
    for (const e of els.slice(1)) {
      if (e.T === "Float64" && Number.isNaN(e.v)) return e;
      if (r.T === "Float64" && Number.isNaN(r.v)) return r;
      if (P.compara("<", mayor ? r : e, mayor ? e : r).v) r = e;
    }
    return r;
  };
  fn.maximum = extremo("maximum", true);
  // findmax(v) da (el mayor, su posición) y argmax(v) solo la posición; con empate, la primera
  const busca = (nombre, mayor, que) => (args, kw) => {
    if (kw && kw.size) throw new NoSoportado(nombre + " con opciones");
    if (args.length !== 1) throw new NoSoportado(nombre + " con " + args.length + " argumentos");
    const [x] = args;
    if (MX.esMatriz(x)) throw new NoSoportado(nombre + " de una matriz (Julia da un CartesianIndex)");
    if (!V.esVector(x)) throw errorMetodo(nombre, args);
    const els = V.elementos(x);
    if (!els.length) throw new ErrorJulia("ArgumentError: collection must be non-empty");
    if (els.some(e => e.T === "Float64" && Number.isNaN(e.v))) throw new NoSoportado(nombre + " con NaN");
    let k = 0;
    for (let i = 1; i < els.length; i++) if (P.compara(mayor ? ">" : "<", els[i], els[k]).v) k = i;
    return que === "par" ? { T: "Tuple", a: [els[k], I(k + 1)] } : I(k + 1);
  };
  // searchsortedfirst y searchsortedlast: la búsqueda binaria de base/sort.jl, paso a paso (así da lo mismo que
  // Julia también con un vector desordenado). Solo con vectores de números de una misma clase, comparados con isless
  const menorQue = (a, b) => {
    const ent = x => x.T === "Int64" || x.T === "Bool", big = x => x.T === "Bool" ? (x.v ? 1n : 0n) : x.v;
    if (ent(a) && ent(b)) return big(a) < big(b);
    const rac = x => ent(x) ? [big(x), 1n] : x.T === "Rational" ? [x.n, x.d] : null;
    if (rac(a) && rac(b)) { const [p, q] = rac(a), [r, t] = rac(b); return p * t < r * q; }
    if (a.T === "Float64" && b.T === "Float64") {
      if (Number.isNaN(a.v)) return false;
      if (Number.isNaN(b.v)) return true;
      if (a.v === 0 && b.v === 0) return Object.is(a.v, -0) && !Object.is(b.v, -0);
      return a.v < b.v;
    }
    throw new NoSoportado("comparar un " + tipo(a) + " con un " + tipo(b) + " en una búsqueda binaria");
  };
  const ordenada = (nombre, args) => {
    const [v, x] = args;
    if (args.length !== 2) throw new NoSoportado(nombre + " con " + args.length + " argumentos");
    if (!v || v.T !== "Vector") throw new NoSoportado(nombre + " de un " + (v ? tipo(v) : "nada") + (v && V.esRango(v) ? " (con un rango, Julia hace la cuenta directamente)" : ""));
    return [V.elementos(v), x];
  };
  fn.searchsortedfirst = args => {
    const [els, x] = ordenada("searchsortedfirst", args);
    let lo = 1, len = els.length;
    while (len !== 0) { const half = len >>> 1, m = lo + half; if (menorQue(els[m - 1], x)) { lo = m + 1; len -= half + 1; } else len = half; }
    return I(BigInt(lo));
  };
  fn.searchsortedlast = args => {
    const [els, x] = ordenada("searchsortedlast", args);
    let lo = 0, hi = els.length + 1;
    while (lo !== hi - 1) { const m = lo + ((hi - lo) >>> 1); if (menorQue(x, els[m - 1])) hi = m; else lo = m; }
    return I(BigInt(lo));
  };
  fn.findmax = busca("findmax", true, "par"); fn.findmin = busca("findmin", false, "par");
  fn.argmax = busca("argmax", true, "indice"); fn.argmin = busca("argmin", false, "indice");
  // error("…"): un ErrorException con ese texto
  fn.minimum = extremo("minimum", false);
  fn.count = (args) => {
    const els = args.length === 2 ? P.itera(args[1]).map(e => prog.aplica(args[0], [e], new Map())) : P.itera(args[0]);
    if (!els.every(e => e.T === "Bool")) throw new ErrorJulia("TypeError: non-boolean (" + tipo(els.find(e => e.T !== "Bool")) + ") used in boolean context");
    return I(els.filter(e => e.v).length);
  };
  fn.findall = (args) => {
    if (MX.esMatriz(args[args.length - 1])) throw new NoSoportado("findall en una matriz (Julia da CartesianIndex)");
    const els = args.length === 2 ? P.itera(args[1]).map(e => prog.aplica(args[0], [e], new Map())) : P.itera(args[0]);
    if (!els.every(e => e.T === "Bool")) throw new NoSoportado("findall con valores que no son true o false");
    return V.vec("Int64", els.map((e, i) => e.v ? I(i + 1) : null).filter(Boolean));
  };
  fn.filter = ([f, x]) => {
    if (x.T === "String") return S([...x.v].filter(c => { const r = prog.aplica(f, [Ch(c)], new Map()); if (r.T !== "Bool") throw new ErrorJulia("TypeError: non-boolean (" + tipo(r) + ") used in boolean context"); return r.v; }).join(""));
    if (x.T !== "Vector" && !V.esRango(x)) throw new NoSoportado("filter sobre " + tipo(x));
    const els = V.elementos(x).filter(e => { const r = prog.aplica(f, [e], new Map()); if (r.T !== "Bool") throw new ErrorJulia("TypeError: non-boolean (" + tipo(r) + ") used in boolean context"); return r.v; });
    return V.vec(V.eltipo(x), els);
  };
  fn.map = ([f, ...xs]) => { if (xs.length !== 1) throw new NoSoportado("map con varias colecciones");
    if (xs[0].T === "String") { const r = [...xs[0].v].map(c => prog.aplica(f, [Ch(c)], new Map())); if (!r.every(e => e.T === "Char")) throw new NoSoportado("map sobre un texto con una función que no devuelve caracteres"); return S(r.map(e => e.v).join("")); } const res = P.itera(xs[0]).map(e => prog.aplica(f, [e], new Map())); if (!res.length) throw new NoSoportado("map sobre una colección vacía"); const r = P.recoge(res, false); if (MX.esMatriz(xs[0])) { const [nf, nc] = MX.dims(xs[0]); return MX.mat(r.el, nf, nc, r.a); } return r; };
  fn.any = ([x]) => B(P.itera(x).some(e => e.v === true));
  fn.all = ([x]) => B(P.itera(x).every(e => e.v === true));
  P.difundeF = (f, x) => V.vec("Any", P.itera(x).map(e => prog.aplica(f, [e], new Map())));
  const mutable = (nombre, x) => { if (x.T !== "Vector" && x.T !== "BitVector") throw errorMetodo(nombre, [x]); };
  fn["push!"] = ([v, ...xs]) => { mutable("push!", v); for (const x of xs) v.a.push(v.T === "BitVector" ? (x.T === "Bool" ? x : (() => { throw errInexacto("Bool", x); })()) : V.convierte(x, v.el)); return v; };
  fn["pushfirst!"] = ([v, ...xs]) => { mutable("pushfirst!", v); v.a.unshift(...xs.map(x => V.convierte(x, v.el))); return v; };
  fn["append!"] = ([v, w]) => { mutable("append!", v); v.a.push(...P.itera(w).map(x => V.convierte(x, v.el))); return v; };
  fn["pop!"] = ([v]) => { mutable("pop!", v); if (!v.a.length) throw new ErrorJulia("ArgumentError: array must be non-empty"); return v.a.pop(); };
  fn["popfirst!"] = ([v]) => { mutable("popfirst!", v); if (!v.a.length) throw new ErrorJulia("ArgumentError: array must be non-empty"); return v.a.shift(); };
  fn.collect = ([x]) => {
    if (MX.esMatriz(x)) { const [nf, nc] = MX.dims(x); return MX.mat(x.bit || (x.vista && x.p.T === "BitVector") ? "Bool" : MX.eltipoM(x), nf, nc, [...MX.lineal(x)], !!x.bit); }
    if (x.T === "String") return V.vec("Char", [...x.v].map(Ch));
    if (x.T === "Iter" && x.a.every(e => e.T === "Int64")) return V.vec("Int64", [...x.a]);
    if (x.T === "Dict") return V.vec("Pair{" + x.K + ", " + x.V + "}", P.itera(x));
    if (x.T === "Claves") return V.vec(x.que === "keys" ? x.d.K : x.d.V, P.itera(x));
    if (!V.esVector(x)) throw new NoSoportado("collect de " + tipo(x));
    return x.T === "BitVector" ? V.bitvec([...x.a]) : V.vec(V.eltipo(x), V.elementos(x));
  };
  fn.copy = ([x]) => { if (MX.esMatriz(x)) { if (x.vista) throw new NoSoportado("copy de una vista (A')"); return MX.mat(x.el, x.f, x.c, [...x.a], x.bit); } if (x.T === "Dict") return { T: "Dict", K: x.K, V: x.V, t: x.t.copia() }; if (x.T === "Vector") return V.vec(x.el, [...x.a]); if (x.T === "BitVector") return V.bitvec([...x.a]); if (V.esEscalar(x) || V.esRango(x)) return x; throw new NoSoportado("copy de " + tipo(x)); };
  const ordena = (els, kw) => {
    const rev = kw.get("rev"); if ([...kw.keys()].some(k => k !== "rev")) throw new NoSoportado("sort con esas opciones");
    const nan = e => e.T === "Float64" && Number.isNaN(e.v);
    const r = [...els].sort((a, b) => nan(a) ? (nan(b) ? 0 : 1) : nan(b) ? -1 : P.compara("<", a, b).v ? -1 : P.compara("<", b, a).v ? 1 : 0);
    return rev && rev.v ? r.reverse() : r;
  };
  fn.sort = ([x], kw) => { if (x.T === "Claves") return V.vec(x.que === "keys" ? x.d.K : x.d.V, ordena(P.itera(x), kw)); if (x.T !== "Vector") throw new NoSoportado("sort de " + tipo(x)); return V.vec(x.el, ordena(x.a, kw)); };
  fn["sort!"] = ([x], kw) => { mutable("sort!", x); const r = ordena(x.a, kw); x.a.splice(0, x.a.length, ...r); return x; };
  fn.reverse = ([x]) => { if (x.T === "Vector") return V.vec(x.el, [...x.a].reverse()); if (x.T === "String") return S([...x.v].reverse().join("")); throw new NoSoportado("reverse de " + tipo(x)); };
  fn["reverse!"] = ([x]) => { mutable("reverse!", x); x.a.reverse(); return x; };
  const extremoCol = (nombre, primero) => ([x, n]) => {
    if (n && x.T === "String") { const cs = [...x.v], k = Number(n.v); return S((primero ? cs.slice(0, k) : cs.slice(Math.max(0, cs.length - k))).join("")); }
    if (n) { if (x.T !== "Vector") throw new NoSoportado(nombre + "(x, n) de " + tipo(x)); const k = Number(n.v); return V.vec(x.el, primero ? x.a.slice(0, k) : x.a.slice(Math.max(0, x.a.length - k))); }
    if (x.T === "String") { if (!x.v.length) throw new ErrorJulia("ArgumentError: string must be non-empty"); return Ch(primero ? [...x.v][0] : [...x.v].slice(-1)[0]); }
    const els = P.itera(x);
    if (!els.length) throw new ErrorJulia("BoundsError: attempt to access 0-element " + tipo(x) + " at index [" + (primero ? 1 : 0) + "]");
    return primero ? els[0] : els[els.length - 1];
  };
  fn.first = extremoCol("first", true);
  fn.last = extremoCol("last", false);
  const relleno = (nombre, valor) => (args) => {
    let el = "Float64", n = args[0];
    if (args[0].T === "Tipo") { el = args[0].nombre; n = args[1]; }
    const resto = args.slice(args[0].T === "Tipo" ? 2 : 1);
    if (resto.length > 1) throw new NoSoportado(nombre + " con más de dos dimensiones");
    if (n.T !== "Int64" || (resto.length && resto[0].T !== "Int64")) throw errorMetodo(nombre, args);
    if (resto.length) return P.rellenaM(el, V.convierte(I(valor), el), Number(n.v), Number(resto[0].v));
    return V.vec(el, Array.from({ length: Number(n.v) }, () => V.convierte(I(valor), el)));
  };
  fn.zeros = relleno("zeros", 0);
  fn.ones = relleno("ones", 1);
  fn.fill = ([x, n, ...resto]) => { if (resto.length > 1) throw new NoSoportado("fill con más de dos dimensiones"); if (resto.length) { if (V.esVector(x) || MX.esMatriz(x)) throw new NoSoportado("fill con un arreglo"); return P.rellenaM(x.T === "Rational" ? "Rational{Int64}" : x.T, x, Number(n.v), Number(resto[0].v)); } const el = x.T === "Rational" ? "Rational{Int64}" : x.T; if (V.esVector(x)) throw new NoSoportado("fill con un vector"); return V.vec(el, Array.from({ length: Number(n.v) }, () => x)); };
  fn.range = (args, kw) => {
    const [a, b] = args;
    if (args.length === 2 && kw.has("length") && kw.size === 1) {
      const n = Number(kw.get("length").v);
      if ([a, b].every(esEnteroLike) && (Number(bigDe(b)) - Number(bigDe(a))) % (n - 1 || 1) === 0 && false) return null;
      if (n === 1 && aNum(a) !== aNum(b)) throw new ErrorJulia("ArgumentError: range(" + V.decimal(aNum(a)) + ", stop=" + V.decimal(aNum(b)) + ", length=1): endpoints differ");
      if (n < 2) throw new NoSoportado("range con length = " + n);
      return V.rangoLongitud(aNum(a), aNum(b), n);
    }
    if (args.length === 2 && kw.has("step") && kw.size === 1) return P.rango(a, kw.get("step"), b);
    throw new NoSoportado("range con estos argumentos");
  };
  // zip y enumerate dan tuplas para recorrer con un for: for (i, x) in enumerate(v)
  fn.zip = args => {
    if (!args.length) throw new NoSoportado("zip sin argumentos");
    const ls = args.map(P.itera), n = Math.min(...ls.map(l => l.length));
    return { T: "Iter", nombre: "zip", a: Array.from({ length: n }, (_, i) => ({ T: "Tuple", a: ls.map(l => l[i]) })) };
  };
  fn.enumerate = ([x]) => ({ T: "Iter", nombre: "enumerate", a: P.itera(x).map((e, i) => ({ T: "Tuple", a: [I(i + 1), e] })) });
  fn.eachindex = ([x]) => { if (x.T === "String") return { T: "Iter", nombre: "eachindex", a: TX.letras(x.v).map(e => I(e.i)) }; const n = V.largo(x); return { T: "UnitRange", start: 1n, stop: BigInt(n), oneTo: true }; };
  fn.parse = ([t, s]) => {
    if (s.T !== "String") throw errorMetodo("parse", [t, s]);
    const r = analiza(t.nombre, s.v);
    if (r.error) throw new ErrorJulia(r.error);
    return r.v;
  };
  fn.tryparse = ([t, s]) => { const r = analiza(t.nombre, s.v); return r.error ? NADA : r.v; };

  TX.funcionesDeTexto(fn, prog);
  DC.funcionesDeDict(fn, P, prog);
  MX.operacionesDeMatrices(P, fn, prog);
  // empty! y fill! de vectores (el empty! de Dict lo pone dict.mjs): cambian las casillas, el vector es el mismo
  const emptyDict = fn["empty!"];
  fn["empty!"] = args => {
    const [v] = args;
    if (v && v.T === "Vector" || v && v.T === "BitVector") { mutable("empty!", v); v.a.length = 0; return v; }
    return emptyDict(args);
  };
  fn["fill!"] = ([x, y]) => {
    if (!(x.T === "Vector" || x.T === "BitVector" || (MX.esMatriz(x) && !x.vista))) throw errorMetodo("fill!", [x, y]);
    const el = x.T === "BitVector" ? "Bool" : MX.esMatriz(x) ? x.el : x.el, w = V.convierte(y, el);
    for (let k = 0; k < x.a.length; k++) x.a[k] = w;
    return x;
  };
  TP.tiposPropios(P, fn);
  TB.funcionesDeTablas(P, fn, prog);
  AL.algebraLineal(P, fn);
  GR.graficos(P, fn, prog);
  AZ.funcionesDeAzar(P, fn, prog);
  ER.operacionesDeErrores(P, fn, prog);
  P.paquetes.Test = {};             // using Test: @test y @test_throws están en julia.mjs (son macros)
  const tabla = new Map(Object.entries(fn).map(([k, f]) => [k, { T: "Primitiva", nombre: k, f }]));
  const constantes = { Random: { T: "Modulo", nombre: "Random" }, Meta: { T: "Modulo", nombre: "Meta" }, π: V.PI, pi: V.PI, ℯ: V.E, Inf: F(Infinity), NaN: F(NaN), nothing: NADA, missing: FALTA, true: B(true), false: B(false) };
  // los paquetes que el programa ha cargado con using (DataFrames, Statistics)
  const cargados = new Map();
  P.carga = nombre => { if (!P.paquetes[nombre]) return false; cargados.set(nombre, new Map(Object.entries(P.paquetes[nombre]).map(([k, f]) => [k, typeof f === "function" ? { T: "Primitiva", nombre: k, f } : f]))); return true; };
  V.GANCHOS.usaRandom = () => cargados.has("Random");
  P.cargado = nombre => cargados.has(nombre);
  const dePaquete = n => { for (const t of cargados.values()) if (t.has(n)) return t.get(n); return null; };
  P.tiene = n => tabla.has(n) || n in constantes || !!dePaquete(n);
  P.funcion = n => n in constantes ? constantes[n] : tabla.get(n) || dePaquete(n);
  return P;
}

// Julia suma los decimales de uno en uno solo en los vectores cortos (menos de 16). En los largos, el
// compilador reparte la suma en varios acumuladores (SIMD), con un orden que depende del procesador, y el
// último dígito puede cambiar de un ordenador a otro (comprobado: con 16 o más decimales al azar, más de la
// mitad de las sumas no coinciden con la suma de uno en uno). El laboratorio solo da la suma de un vector
// largo cuando es exacta en cualquier orden.
function sumaPareada(xs) {
  if (xs.length < 16) { let s = xs[0]; for (let k = 1; k < xs.length; k++) s += xs[k]; return xs.length ? s : 0; }
  if (xs.some(Number.isNaN)) return NaN;
  const pos = xs.includes(Infinity), neg = xs.includes(-Infinity);
  if (pos && neg) return NaN;
  if (pos) return Infinity;
  if (neg) return -Infinity;
  const s = MX.sumaExacta(xs.map(x => [x, 1]));
  if (s === null) throw new NoSoportado("la suma de " + xs.length + " decimales que no es exacta: con 16 o más, Julia los suma en un orden que depende del procesador, y la última cifra puede cambiar de un ordenador a otro. El laboratorio solo da la suma cuando es exacta en cualquier orden (por ejemplo, con notas de medio punto o con enteros)");
  if (s === 0) return xs.every(x => Object.is(x, -0)) ? -0 : 0;
  return s;
}

function analiza(t, s) {
  const limpio = s.trim();
  if (t === "Float64") {
    if (!limpio) return { error: "ArgumentError: input string is empty or only contains whitespace" };
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(limpio)) return { v: F(parseFloat(limpio)) };
    const esp = { Inf: Infinity, "+Inf": Infinity, "-Inf": -Infinity, inf: Infinity, NaN: NaN, nan: NaN };
    if (limpio in esp) return { v: F(esp[limpio]) };
    return { error: 'ArgumentError: cannot parse "' + s + '" as Float64' };
  }
  if (t === "Int64") {
    if (!limpio) return { error: "ArgumentError: input string is empty or only contains whitespace" };
    const m = /^[+-]?\d+$/.test(limpio);
    if (m) { const b = BigInt(limpio); if (b > 9223372036854775807n || b < -9223372036854775808n) return { error: "OverflowError: overflow parsing \"" + s + "\"" }; return { v: I(b) }; }
    const malo = [...limpio.replace(/^[+-]/, "")].find(c => !/\d/.test(c));
    return { error: "ArgumentError: invalid base 10 digit '" + malo + "' in \"" + s + "\"" };
  }
  if (t === "Bool") { if (limpio === "true") return { v: B(true) }; if (limpio === "false") return { v: B(false) }; return { error: "ArgumentError: invalid Bool representation: \"" + s + "\"" }; }
  throw new NoSoportado("parse(" + t + ", …)");
}
