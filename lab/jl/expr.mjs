// expr.mjs · El código como dato (capítulo 20): las expresiones de Julia (Expr), cómo las escribe Julia
// y cómo se leen del árbol de tree-sitter. Parte del intérprete del laboratorio
// (Entendiendo Julia, desde dentro · AC Institut).
//
// Una expresión es { T: "Expr", head, args }, con args un Vector{Any} de verdad (ex.args[1] = :* lo cambia).
// Las hojas son símbolos ({ T: "Symbol", v }), números, textos…; además QuoteNode (el :y de :(x + :y)),
// GlobalRef (el Main.println que deja la higiene de una macro) y LineNumberNode (la línea que Julia apunta
// en el cuerpo de f(x) = …).
//
// Escribir una expresión es una copia de base/show.jl (show_unquoted, show_list, show_call…) para las cabezas
// que el libro usa. Las que no, dicen NoSoportado: nunca se escribe algo distinto de lo que escribe Julia.
import * as V from "./valores.mjs";
import { NoSoportado } from "./valores.mjs";

export const sym = s => ({ T: "Symbol", v: s });
export const nuevaExpr = (head, args) => ({ T: "Expr", head, args: V.vec("Any", args) });
export const esExpr = (x, h) => x && x.T === "Expr" && (h === undefined || x.head === h);
const HOJAS = new Set(["Symbol", "Expr", "QuoteNode", "GlobalRef", "LineNumberNode", "Int64", "Float64", "Bool", "String", "Char", "Nothing", "Rational"]);
export const cabeEnExpr = x => HOJAS.has(x.T);

// ── Operadores (Base.operator_precedence, comprobado en Julia 1.13) ─────────────────────────
const PREC = new Map();
const pon = (p, ops) => { for (const o of ops) PREC.set(o, p); };
pon(1, ["=", "+=", "-=", "*=", "/=", "//=", "\\=", "^=", "÷=", "%=", "<<=", ">>=", ">>>=", "|=", "&=", "⊻=", ":=", "$=", "~", ".=", "≔", "⩴", "≕"]);
pon(2, ["=>"]);
pon(3, ["?"]);
pon(4, ["-->", "→", "←", "↔", "⟶", "⟵"]);
pon(5, ["||"]);
pon(6, ["&&"]);
pon(7, ["<", ">", "<=", ">=", "==", "!=", "===", "!==", "≤", "≥", "≠", "≡", "≢", "∈", "∉", "∋", "∌", "⊆", "⊈", "⊂", "⊄", "⊊", "⊇", "⊃", "≈", "≉", "in", "isa", "<:", ">:"]);
pon(8, ["<|"]);
pon(9, ["|>"]);
pon(10, [":", ".."]);
pon(11, ["+", "-", "|", "⊻", "++", "±", "∓", "∪", "∨", "$"]);
pon(12, ["*", "/", "÷", "%", "&", "\\", "∘", "×", "⋅", "∩", "∧"]);
pon(13, ["//"]);
pon(14, ["<<", ">>", ">>>"]);
pon(15, ["^", "↑", "↓"]);
pon(16, ["::"]);
pon(17, ["."]);
const PREC_CERO = new Set(["!", "¬", "√", "∛", "∜", "->", "..."]);        // operadores con precedencia 0
export function precOp(s) {
  if (PREC.has(s)) return PREC.get(s);
  if (s.length > 1 && s[0] === "." && PREC.has(s.slice(1)) && s !== "..") return PREC.get(s.slice(1));     // .+, .==
  return 0;
}
const NO_OPERADOR = new Set(["in", "isa"]);        // tienen precedencia, pero Base.isoperator dice false
export const esOperador = s => (precOp(s) > 0 && !NO_OPERADOR.has(s)) || PREC_CERO.has(s) || (s[0] === "." && PREC_CERO.has(s.slice(1)));
const UNI = new Set(["+", "-", "!", "¬", "~", "<:", ">:", "√", "∛", "∜", "∓", "±"]);
const QUOTED_SYMS = new Set([":", "::", ":=", "=", "==", "===", "=>"]);
const WIDE = new Set(["=", "+=", "-=", "*=", "/=", "\\=", "^=", "&=", "|=", "÷=", "%=", ">>>=", ">>=", "<<=",
  ".=", ".+=", ".-=", ".*=", "./=", ".\\=", ".^=", ".&=", ".|=", ".÷=", ".%=", ".>>>=", ".>>=", ".<<=",
  "&&", "||", "<:", "$=", "⊻=", ">:", "-->", ":=", "≔", "⩴", "≕"]);
const INFIX_ANY = new Set([...WIDE, ":", "->", "::"]);
const PALABRAS = new Set(["end", "begin", "while", "if", "for", "try", "return", "break", "continue", "function", "macro", "quote", "let", "local", "global", "const", "do", "struct", "module", "baremodule", "using", "import", "export", "else", "elseif", "catch", "finally", "true", "false", "abstract", "primitive", "mutable", "outer", "type"]);
export const esIdentificador = s => /^[\p{L}\p{Nl}\p{Sc}\p{So}_][\p{L}\p{N}\p{Mn}\p{Mc}\p{Pc}\p{Sk}\p{So}_!′″‴]*$/u.test(s) && !PALABRAS.has(s);
const validoId = s => esIdentificador(s) || (esOperador(s) && !["'", "::", "?"].includes(s) && !["=", ":=", "&&", "||", "->", "-->", "...", "."].includes(s) && !(WIDE.has(s) && s.endsWith("=")));
// las cabezas que Julia sabe escribir y este módulo aún no: se dicen, no se inventan
const CABEZAS_JULIA = new Set(["block", "quote", "inert", "if", "elseif", "while", "for", "function", "macro", "let", "try", "return", "macrocall",
  "string", "$", "...", "generator", "flatten", "comprehension", "typed_comprehension", "filter", "typed_vcat", "typed_hcat", "typed_ncat",
  "vcat", "hcat", "ncat", "row", "nrow", "braces", "bracescat", "kw", "parameters", "where", "do", "module", "baremodule", "struct",
  "abstract", "primitive", "const", "local", "global", "toplevel", "line", "meta", "new", "splatnew", "'", "calldecl", "curly",
  "break", "continue", "import", "using", "export", "public", "->", "::", ":", "<:", ">:", "macroname", "var", "doc", "outerref", "boundscheck", "isdefined"]);

const esQuoted = x => x.T === "QuoteNode" || ((esExpr(x, "quote") || esExpr(x, "inert")) && x.args.a.length === 1);
const unquoted = x => x.T === "QuoteNode" ? x.v : x.args.a[0];
const negativo = x => (x.T === "Int64" && x.v < 0n) || (x.T === "Float64" && x.v < 0) || (x.T === "Rational" && x.n < 0n);
const esReal = x => ["Int64", "Float64", "Bool", "Rational"].includes(x.T);

// show_sym: un nombre tal cual si es un identificador o un operador válidos; si no, var"…"
const showSym = s => validoId(s) ? s : 'var"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
function showGlobalRef(g) {
  const quoted = !esIdentificador(g.name) && !g.name.startsWith("@");
  const parens = quoted && (!esOperador(g.name) || QUOTED_SYMS.has(g.name));
  return g.mod + "." + (quoted ? ":" : "") + (parens ? "(" : "") + showSym(g.name) + (parens ? ")" : "");
}
// un símbolo escrito como dato: :x, :+, :(=), Symbol("a b")
export function reprSimbolo(s) {
  if (QUOTED_SYMS.has(s)) return ":(" + s + ")";
  if (esIdentificador(s) || s === "end" || (esOperador(s) && s !== "'")) return ":" + s;
  return 'Symbol("' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '")';
}

// codigo = true: se escribe para volver a leerlo (eval): sin escape, GlobalRef por su nombre, sin líneas
function lista(items, sep, ind, prec = 0, encl = false, cod = false) {
  let r = "", first = true;
  for (const it of items) {
    if (!first) r += sep;
    const parens = (!esQuoted(it) && (first && prec >= 15 &&
      ((esExpr(it, "call") && it.args.a[0] && it.args.a[0].T === "Symbol" && UNI.has(it.args.a[0].v)) || (esReal(it) && negativo(it))))) ||
      (encl && it.T === "Symbol" && esOperador(it.v) && validoId(it.v));
    r += (parens ? "(" : "") + unq(it, ind, parens ? 0 : prec, cod) + (parens ? ")" : "");
    first = false;
  }
  return r;
}
const LLAMADAS = { call: ["(", ")"], ref: ["[", "]"], curly: ["{", "}"], ".": ["(", ")"] };
function llamada(head, func, args, ind, cod) {
  const [op, cl] = LLAMADAS[head];
  let r;
  if ((func.T === "Symbol" && func.v !== ":" && !(head === "." && esOperador(func.v))) || (func.T === "Symbol" && !validoId(func.v)) ||
      (esExpr(func) && [".", "curly", "macroname"].includes(func.head)) || func.T === "GlobalRef") r = unq(func, ind, 0, cod);
  else r = "(" + unq(func, ind, 0, cod) + ")";
  if (head === ".") r += ".";
  if (args.length && esExpr(args[0], "parameters")) throw new NoSoportado("escribir una llamada con argumentos con nombre");
  return r + op + lista(args, ", ", ind, 0, false, cod) + cl;
}
// show(io, x) de una hoja dentro de una expresión
function hoja(x) {
  if (x.T === "Expr") return quoteTop(x);
  return V.repr(x);
}
function unq(x, ind, prec, cod) {
  switch (x.T) {
    case "Symbol": return showSym(x.v);
    case "QuoteNode":
      if (x.v.T === "Symbol") return reprSimbolo(x.v.v);
      throw new NoSoportado("escribir un QuoteNode que no guarda un símbolo");
    case "GlobalRef": return cod ? showSym(x.name) : showGlobalRef(x);
    case "LineNumberNode": throw new NoSoportado("escribir la línea que Julia apunta dentro de un bloque");
    case "Expr": return unqExpr(x, ind, prec, cod);
  }
  return V.repr(x);
}
function unqExpr(ex, ind, prec, cod) {
  const h = ex.head, a = ex.args.a, n = a.length;
  if (cod && h === "escape" && n === 1) return unq(a[0], ind, prec, cod);
  if (cod && h === "block") {          // el cuerpo de f(x) = …: para leerlo de vuelta basta su expresión
    const xs = a.filter(e => e.T !== "LineNumberNode");
    if (xs.length === 1) return unq(xs[0], ind, prec, cod);
    return "begin " + xs.map(e => unq(e, ind, -1, cod)).join("; ") + " end";
  }
  if (h === "." && (n !== 2 || !esExpr(a[1], "tuple"))) {
    if (n === 2 && esQuoted(a[1])) {
      const item = a[0], field = unquoted(a[1]);
      const p1 = !esQuoted(item) && !(item.T === "Symbol" && esIdentificador(item.v)) && !esExpr(item, ".");
      let r = (p1 ? "(" : "") + unq(item, ind, 0, cod) + (p1 ? ")" : "") + ".";
      let p2, q;
      if (field.T === "Symbol") { p2 = QUOTED_SYMS.has(field.v); q = p2 || esOperador(field.v); } else p2 = q = true;
      return r + (q ? ":" : "") + (p2 ? "(" : "") + unq(field, ind, 0, cod) + (p2 ? ")" : "");
    }
    throw new NoSoportado("escribir esta expresión con un punto");
  }
  if (INFIX_ANY.has(h) && n === 2) {
    const fp = precOp(h), sep = WIDE.has(h) ? " " + h + " " : h;
    if (h === "=" && esExpr(a[1], "block") && !cod) throw new NoSoportado("escribir una función de una línea guardada como expresión: Julia la escribe con su bloque begin … end y la línea en que se leyó");
    return fp <= prec ? "(" + lista(a, sep, ind, fp, true, cod) + ")" : lista(a, sep, ind, fp, true, cod);
  }
  if (h === "tuple") {
    if (n && esExpr(a[0], "parameters")) throw new NoSoportado("escribir una tupla con nombre como expresión");
    return "(" + lista(a, ", ", ind, 0, false, cod) + (n === 1 ? "," : "") + ")";
  }
  if (h === "vect") return "[" + lista(a, ", ", ind, 0, false, cod) + "]";
  if (h === "call" && n >= 1) {
    let func = a[0];
    const fname = func.T === "GlobalRef" ? func.name : func.T === "Symbol" ? func.v : null;
    const fp = fname !== null ? precOp(fname) : 0;
    if (fname !== null && (fp > 0 || UNI.has(fname))) func = sym(fname);
    const fa = a.slice(1);
    if (fa.some(x => esExpr(x, "kw")) || (fa.length && esExpr(fa[0], "parameters"))) throw new NoSoportado("escribir una llamada con argumentos con nombre");
    if (func.T === "Symbol" && func.v === "*" && fa.length === 2 && ["Int64", "Float64"].includes(fa[0].T) && fa[1].T === "Symbol" &&
        !["e", "E", "f", ...(fa[0].T === "Int64" && fa[0].v === 0n ? ["b", "o", "x"] : [])].includes(fa[1].v[0]))
      return fp <= prec ? "(" + lista(fa, "", ind, fp, false, cod) + ")" : lista(fa, "", ind, fp, false, cod);       // 100x
    if (func.T === "Symbol" && fa.length === 1 && UNI.has(func.v)) {
      const a1 = fa[0];
      if (a1.T === "Expr" || (a1.T === "Symbol" && esOperador(a1.v) && validoId(a1.v))) return showSym(func.v) + "(" + lista(fa, ", ", ind, fp, false, cod) + ")";
      return showSym(func.v) + unq(a1, ind, fp, cod);
    }
    if (fp > 0) {
      const na = fa.length;
      if ((na === 2 || (na > 2 && ["+", "++", "*"].includes(fname)) || (na === 3 && fname === ":")) && fa.every(x => !esExpr(x, "..."))) {
        const sep = fname === ":" ? ":" : " " + fname + " ";
        return fp <= prec ? "(" + lista(fa, sep, ind, fp, true, cod) + ")" : lista(fa, sep, ind, fp, true, cod);
      }
      if (na === 1) return "(" + unq(func, ind, 0, cod) + ")(" + lista(fa, ", ", ind, 0, false, cod) + ")";
      return llamada("call", func, fa, ind, cod);
    }
    return llamada("call", func, fa, ind, cod);
  }
  if (h === "ref" && n >= 1) return llamada("ref", a[0], a.slice(1), ind, cod);
  if (h === "comparison" && n >= 3 && n % 2 === 1) {
    const cp = Math.min(...a.filter((_, i) => i % 2 === 1).map(o => o.T === "Symbol" ? precOp(o.v) : 0));
    return cp <= prec ? "(" + lista(a, " ", ind, cp, false, cod) + ")" : lista(a, " ", ind, cp, false, cod);
  }
  if (CABEZAS_JULIA.has(h) || h === "escape" && cod) throw new NoSoportado("escribir una expresión con cabeza :" + h);
  // una cabeza que Julia no sabe escribir (como :escape): $(Expr(:escape, :x))
  return "$(Expr(" + reprSimbolo(h) + a.map(e => ", " + hoja(e)).join("") + "))";
}
// show(io, ex): :(a + b * 2)
export function quoteTop(x) {
  if (x.T === "Symbol") return reprSimbolo(x.v);
  if (esExpr(x, "block")) throw new NoSoportado("escribir un bloque quote … end");
  return ":(" + unq(x, 2, -1, false) + ")";
}
// print(io, ex) y string(ex): a + b * 2
export const textoExpr = x => unq(x, 0, -1, false);
// el texto que, leído y ejecutado, hace lo mismo que la expresión (para eval)
export const codigoExpr = x => unq(x, 0, -1, true);
// repr de QuoteNode, GlobalRef y LineNumberNode como valores sueltos
export function reprRaro(x) {
  if (x.T === "QuoteNode" || x.T === "GlobalRef") return ":(" + unq(x, 2, -1, false) + ")";
  if (x.T === "LineNumberNode") return ":(" + "#= " + x.file + ":" + x.line + " =#" + ")";
  return null;
}

// ── dump(x) ──────────────────────────────────────────────────────────────
export function dump(x, ind = "") {
  const sub = ind + "  ";
  switch (x.T) {
    case "Expr":
      return "Expr\n" + sub + "head: Symbol " + x.head + "\n" + sub + "args: Array{Any}((" + x.args.a.length + ",))" +
        x.args.a.map((e, i) => "\n" + sub + "  " + (i + 1) + ": " + dump(e, sub + "  ")).join("");
    case "Symbol": return "Symbol " + x.v;
    case "QuoteNode": return "QuoteNode\n" + sub + "value: " + dump(x.v, sub);
    case "LineNumberNode": return "LineNumberNode\n" + sub + "line: Int64 " + x.line + "\n" + sub + "file: Symbol " + x.file;
    case "Int64": case "Float64": case "Bool": return x.T + " " + V.repr(x);
    case "String": return "String " + V.repr(x);
    case "Nothing": return "Nothing nothing";
  }
  throw new NoSoportado("dump de un " + V.tipo(x));
}
