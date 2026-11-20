// primitivas.mjs · La aritmética de Julia y las funciones de Base que usa el libro
// (Entendiendo Julia, desde dentro · AC Institut)
//
// Cada función reproduce lo que hace Julia, también sus errores, con el mismo texto. Lo que no está aquí
// no se improvisa: si es una función conocida de Julia, el laboratorio dice que aún no la sabe usar.
import * as V from "./valores.mjs";
import * as TX from "./textos.mjs";
import { ErrorJulia, NoSoportado, I, F, B, S, Ch, NADA, FALTA, errorMetodo, aNum, tipo, repr } from "./valores.mjs";

const T = nombre => ({ T: "Tipo", nombre });
export const TIPOS = {
  Int: T("Int64"), Int64: T("Int64"), Float64: T("Float64"), String: T("String"), Bool: T("Bool"), Char: T("Char"),
  Any: T("Any"), Number: T("Number"), Real: T("Real"), Integer: T("Integer"), AbstractFloat: T("AbstractFloat"),
  Rational: T("Rational"), Nothing: T("Nothing"), Missing: T("Missing"),
};
// Nombres de Julia que existen pero que el laboratorio aún no sabe ejecutar
export const CONOCIDAS = new Set(("big BigInt BigFloat Float32 Int32 Int8 UInt8 UInt Complex complex im rand randn seed! Random mean median std var " +
  "Dict Set keys values haskey get get! merge delete! pairs lpad rpad " +
  "chomp reduce foldl foldr mapreduce accumulate cumsum cumprod diff unique sortperm argmax argmin extrema " +
  "Matrix Array transpose reshape hcat vcat size ndims axes vec dot cross norm inv det LinearAlgebra Statistics plot println_ " +
  "struct mutable abstract typeof_ isa eltype convert promote sizeof summarysize objectid ismutable deepcopy view @view @views similar " +
  "ifelse iterate Iterators sum! maximum! push !== === try catch error throw rethrow DomainError ArgumentError " +
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

export function crearPrimitivas(prog) {
  const P = {};
  // ── Aritmética ───────────────────────────────────────────────────────
  P.unaria = (op, x) => {
    if (x.T === "Missing" && op !== "!") return FALTA;
    if (op === "-" || op === "+") {
      if (op === "+" && x.T !== "Bool" && NUM(x)) return x;
      if (x.T === "Int64") return I(-x.v);
      if (x.T === "Bool") return I(op === "-" ? (x.v ? -1 : 0) : (x.v ? 1 : 0));
      if (x.T === "Float64" || x.T === "Irrational") return F(-aNum(x));
      if (x.T === "Rational") return V.rac(-x.n, x.d);
      if (x.T === "Vector" && op === "-" && x.a.every(NUM)) return P.recoge(x.a.map(e => P.unaria("-", e)));
      throw errorMetodo(op, [x]);
    }
    if (op === "!") { if (x.T === "Bool") return B(!x.v); if (x.T === "Missing") return FALTA; throw errorMetodo("!", [x]); }
    if (op === "√") return P.funcion("sqrt").f([x], new Map());
    throw new NoSoportado("el operador " + op);
  };
  P.binaria = (op, a, b) => {
    if (op === "≠") op = "!=";
    if (op === "≤") op = "<=";
    if (op === "≥") op = ">=";
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
          return F(Math.pow(x, y));
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
    if (V.esVector(a) && V.esVector(b)) {
      const n = V.largo(a); if (n !== V.largo(b)) return false;
      for (let i = 1; i <= n; i++) if (!P.iguales(V.elemento(a, i), V.elemento(b, i))) return false;
      return true;
    }
    if (a.T === "Tuple" && b.T === "Tuple") return a.a.length === b.a.length && a.a.every((x, i) => P.iguales(x, b.a[i]));
    if (a.T !== b.T) return false;
    if (a.T === "String" || a.T === "Char" || a.T === "Symbol") return a.v === b.v;
    if (a.T === "Nothing") return true;
    if (a.T === "Tipo") return a.nombre === b.nombre;
    return a === b;
  };
  P.identicos = (a, b) => {
    if (a.T === "Vector" || a.T === "BitVector") return a === b;
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
    if (!V.esVector(col) && col.T !== "Tuple") throw new NoSoportado("∈ con " + tipo(col));
    let falta = false;
    for (const e of P.itera(col)) { const r = P.binaria("==", x, e); if (r.T === "Missing") falta = true; else if (r.v) return B(true); }
    return falta ? FALTA : B(false);
  };

  // ── El punto (broadcasting) ──────────────────────────────────────────
  P.difunde = (f, args, kw = new Map()) => {
    const aplica = xs => typeof f === "string" ? P.binaria(f, xs[0], xs[1]) : prog.aplica(f, xs, kw);
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
    if (destino.T !== "Vector") throw new NoSoportado(".= sobre " + tipo(destino));
    const n = destino.a.length;
    for (let i = 0; i < n; i++) destino.a[i] = V.convierte(V.esVector(v) ? V.elemento(v, V.largo(v) === 1 ? 1 : i + 1) : v, destino.el);
  };
  // Un vector con los resultados: el tipo de sus casillas sale de los valores (Bool con el punto → BitVector)
  P.recoge = (res, bits = false) => {
    if (!res.length) throw new NoSoportado("un vector vacío sin tipo");
    const tipos = [...new Set(res.map(r => r.T === "Rational" ? "Rational{Int64}" : r.T === "Vector" || r.T === "String" ? tipo(r) : r.T))];
    if (tipos.length > 1 && tipos.every(t => t === "String" || t === "SubString{String}")) return V.vec("AbstractString", res);
    if (tipos.length === 1) {
      if (tipos[0] === "Bool" && bits) return V.bitvec(res);
      if (tipos[0] === "Irrational" || tipos[0].startsWith("Vector") || tipos[0] === "Tuple") throw new NoSoportado("un vector de " + tipos[0]);
      return V.vec(tipos[0], res);
    }
    throw new NoSoportado("un vector con valores de tipos distintos (" + tipos.join(", ") + ")");
  };

  // ── Vectores, rangos e índices ───────────────────────────────────────
  P.vectorLiteral = vals => {
    if (!vals.length) return V.vec("Any", []);
    if (vals.some(v => V.esVector(v) || v.T === "Tuple")) throw new NoSoportado("vectores de vectores (o concatenar con [a, b])");
    if (vals.some(v => v.T === "Pair")) throw new NoSoportado("vectores de parejas (Pair)");
    const tipos = vals.map(v => v.T === "Rational" ? "Rational{Int64}" : v.T === "String" ? tipo(v) : v.T);
    if (tipos.some(t => t === "Nothing" || t === "Missing") && new Set(tipos).size > 1) throw new NoSoportado("vectores con nothing o missing mezclados (Union)");
    const el = V.promueve(tipos);
    return V.vec(el, vals.map(v => V.convierte(v, el)));
  };
  P.vectorTipado = (el, vals) => {
    if (!["Int64", "Float64", "String", "Bool", "Char", "Any", "SubString{String}", "AbstractString"].includes(el)) throw new NoSoportado("vectores de " + el);
    return V.vec(el, vals.map(v => V.convierte(v, el)));
  };
  P.rango = (a, s, b) => {
    const todos = [a, s, b].filter(Boolean);
    if (todos.every(x => x.T === "Int64")) return V.rangoEnteros(a.v, s ? s.v : null, b.v);
    if (todos.every(NUM) && todos.some(x => x.T === "Float64")) return V.rangoDecimales(aNum(a), s ? aNum(s) : 1, aNum(b));
    throw new NoSoportado("un rango de " + todos.map(tipo).join(" y "));
  };
  P.itera = x => {
    if (V.esVector(x) || x.T === "Tuple") return V.elementos(x);
    if (x.T === "Iter") return x.a;
    if (x.T === "String") return [...x.v].map(Ch);
    if (NUM(x)) return [x];
    throw errorMetodo("iterate", [x]);
  };
  P.ultimoIndice = s => TX.ultimoIndice(s.v);
  const fueraDeLimites = (x, ind) => new ErrorJulia("BoundsError: attempt to access " + (x.T === "Tuple" ? tipo(x) : x.T === "String" ? TX.ncodeunits(x.v) + "-codeunit " + tipo(x) : V.largo(x) + "-element " + tipo(x)) + " at index [" + ind + "]");
  P.indexa = (x, i) => {
    if (x.T === "String") return TX.indexa(x, i);
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
      case "AbstractFloat": case "Float64": return v.T === "Float64";
      case "Int64": case "Bool": case "Char": return v.T === tt;
      case "String": case "AbstractString": return v.T === "String";
      case "AbstractVector": return V.esVector(v);
      case "Vector": return v.T === "Vector";
    }
    if (/^Vector\{(\w+)\}$/.test(tt)) return v.T === "Vector" && v.el === tt.slice(7, -1);
    throw new NoSoportado("el tipo " + t + " en un argumento");
  };
  // Int(x), Float64(x)…
  P.construye = (nombre, args) => {
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
      return x.nombre;
    }
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
  const escribe = (args, salto) => { prog.salida += args.map(V.texto).join("") + (salto ? "\n" : ""); return NADA; };
  fn.println = args => escribe(args, true);
  fn.print = args => escribe(args, false);
  fn.typeof = ([x]) => T(tipo(x));
  fn.sqrt = unNum("sqrt", x => { const v = aNum(x); if (v < 0) throw DOM_SQRT(v); return F(Math.sqrt(v)); });
  fn.cbrt = unNum("cbrt", x => F(Math.cbrt(aNum(x))));
  fn.exp = unNum("exp", x => F(Math.exp(aNum(x))));
  fn.log = (args) => {
    if (args.length === 2) { const [b, x] = args.map(aNum); if (x < 0) throw DOM_LOG("log", x); if (b < 0) throw DOM_LOG("log", b); return F(Math.log(x) / Math.log(b)); }
    return unNum("log", x => { const v = aNum(x); if (v < 0) throw DOM_LOG("log", v); return F(Math.log(v)); })(args);
  };
  fn.log10 = unNum("log10", x => { const v = aNum(x); if (v < 0) throw DOM_LOG("log10", v); return F(Math.log10(v)); });
  fn.log2 = unNum("log2", x => { const v = aNum(x); if (v < 0) throw DOM_LOG("log2", v); return F(Math.log2(v)); });
  for (const t of ["sin", "cos", "tan", "atan", "sinh", "cosh", "tanh"]) fn[t] = unNum(t, x => F(Math[t](aNum(x))));
  fn.abs = unNum("abs", x => x.T === "Int64" ? I(x.v < 0n ? -x.v : x.v) : x.T === "Bool" ? x : x.T === "Rational" ? V.rac(x.n < 0n ? -x.n : x.n, x.d) : F(Math.abs(aNum(x))));
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
  fn.max = args => { if (args.length < 2) throw errorMetodo("max", args); return args.reduce((a, b) => P.compara("<", a, b).v ? b : a); };
  fn.min = args => { if (args.length < 2) throw errorMetodo("min", args); return args.reduce((a, b) => P.compara("<", b, a).v ? b : a); };
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
  fn.length = args => { if (args.length !== 1) throw errorMetodo("length", args); const [x] = args; if (NUM(x)) return I(1); if (!V.esVector(x) && x.T !== "String" && x.T !== "Tuple") throw errorMetodo("length", args); return I(V.largo(x)); };
  fn.isempty = ([x]) => B(V.largo(x) === 0);
  const coleccion = (nombre, x) => { if (!V.esVector(x) && x.T !== "Tuple") { if (NUM(x)) return [x]; throw errorMetodo(nombre, [x]); } return P.itera(x); };
  const VACIO = "ArgumentError: reducing over an empty collection is not allowed; consider supplying `init` to the reducer";
  fn.sum = (args, kw) => {
    if (args.length === 2) return fn.sum([P.difundeF(args[0], args[1])], kw);
    const [x] = args; const els = coleccion("sum", x);
    if (!els.length) { const el = V.eltipo(x); if (el === "Float64") return F(0); if (el === "Int64" || el === "Bool") return I(0); throw new ErrorJulia(VACIO); }
    if (els.every(e => e.T === "Bool")) return I(els.filter(e => e.v).length);
    if (els.every(e => e.T === "Float64")) return F(sumaPareada(els.map(e => e.v)));
    return els.slice(1).reduce((a, b) => P.binaria("+", a, b), els[0].T === "Bool" ? I(els[0].v ? 1 : 0) : els[0]);
  };
  fn.prod = ([x]) => { const els = coleccion("prod", x); if (!els.length) { const el = V.eltipo(x); if (el === "Float64") return F(1); if (el === "Int64") return I(1); throw new ErrorJulia(VACIO); } return els.slice(1).reduce((a, b) => P.binaria("*", a, b), els[0]); };
  const extremo = (nombre, mayor) => (args) => {
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
  fn.minimum = extremo("minimum", false);
  fn.count = (args) => {
    const els = args.length === 2 ? P.itera(args[1]).map(e => prog.aplica(args[0], [e], new Map())) : P.itera(args[0]);
    if (!els.every(e => e.T === "Bool")) throw new ErrorJulia("TypeError: non-boolean (" + tipo(els.find(e => e.T !== "Bool")) + ") used in boolean context");
    return I(els.filter(e => e.v).length);
  };
  fn.findall = (args) => {
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
    if (xs[0].T === "String") { const r = [...xs[0].v].map(c => prog.aplica(f, [Ch(c)], new Map())); if (!r.every(e => e.T === "Char")) throw new NoSoportado("map sobre un texto con una función que no devuelve caracteres"); return S(r.map(e => e.v).join("")); } const res = P.itera(xs[0]).map(e => prog.aplica(f, [e], new Map())); if (!res.length) throw new NoSoportado("map sobre una colección vacía"); return P.recoge(res, false); };
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
    if (x.T === "String") return V.vec("Char", [...x.v].map(Ch));
    if (x.T === "Iter" && x.a.every(e => e.T === "Int64")) return V.vec("Int64", [...x.a]);
    if (!V.esVector(x)) throw new NoSoportado("collect de " + tipo(x));
    return x.T === "BitVector" ? V.bitvec([...x.a]) : V.vec(V.eltipo(x), V.elementos(x));
  };
  fn.copy = ([x]) => { if (x.T === "Vector") return V.vec(x.el, [...x.a]); if (x.T === "BitVector") return V.bitvec([...x.a]); if (V.esEscalar(x) || V.esRango(x)) return x; throw new NoSoportado("copy de " + tipo(x)); };
  const ordena = (els, kw) => {
    const rev = kw.get("rev"); if ([...kw.keys()].some(k => k !== "rev")) throw new NoSoportado("sort con esas opciones");
    const nan = e => e.T === "Float64" && Number.isNaN(e.v);
    const r = [...els].sort((a, b) => nan(a) ? (nan(b) ? 0 : 1) : nan(b) ? -1 : P.compara("<", a, b).v ? -1 : P.compara("<", b, a).v ? 1 : 0);
    return rev && rev.v ? r.reverse() : r;
  };
  fn.sort = ([x], kw) => { if (x.T !== "Vector") throw new NoSoportado("sort de " + tipo(x)); return V.vec(x.el, ordena(x.a, kw)); };
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
    if (args.length > (args[0].T === "Tipo" ? 2 : 1)) throw new NoSoportado(nombre + " con varias dimensiones (matrices)");
    if (n.T !== "Int64") throw errorMetodo(nombre, args);
    return V.vec(el, Array.from({ length: Number(n.v) }, () => V.convierte(I(valor), el)));
  };
  fn.zeros = relleno("zeros", 0);
  fn.ones = relleno("ones", 1);
  fn.fill = ([x, n, ...resto]) => { if (resto.length) throw new NoSoportado("fill con varias dimensiones (matrices)"); const el = x.T === "Rational" ? "Rational{Int64}" : x.T; if (V.esVector(x)) throw new NoSoportado("fill con un vector"); return V.vec(el, Array.from({ length: Number(n.v) }, () => x)); };
  fn.range = (args, kw) => {
    const [a, b] = args;
    if (args.length === 2 && kw.has("length") && kw.size === 1) {
      const n = Number(kw.get("length").v);
      if ([a, b].every(esEnteroLike) && (Number(bigDe(b)) - Number(bigDe(a))) % (n - 1 || 1) === 0 && false) return null;
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
  const tabla = new Map(Object.entries(fn).map(([k, f]) => [k, { T: "Primitiva", nombre: k, f }]));
  const constantes = { π: V.PI, pi: V.PI, ℯ: V.E, Inf: F(Infinity), NaN: F(NaN), nothing: NADA, missing: FALTA, true: B(true), false: B(false) };
  P.tiene = n => tabla.has(n) || n in constantes;
  P.funcion = n => n in constantes ? constantes[n] : tabla.get(n);
  return P;
}

// Julia suma los decimales por parejas (suma por bloques), no de uno en uno: el último dígito puede cambiar
function sumaPareada(xs) {
  const rec = (i, n) => {
    if (n <= 1024) { let s = xs[i]; for (let k = 1; k < n; k++) s += xs[i + k]; return s; }
    const m = n >> 1; return rec(i, m) + rec(i + m, n - m);
  };
  return xs.length ? rec(0, xs.length) : 0;
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
