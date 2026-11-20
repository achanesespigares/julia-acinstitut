// textos.mjs · Los textos de Julia: String, SubString y Char
//
// En Julia un String es una fila de bytes en UTF-8, y sus índices cuentan bytes, no letras:
// en "canción", la ó ocupa los bytes 6 y 7, así que s[6] es 'ó', s[7] es un error y s[8] es 'n'.
// Aquí el texto se guarda como un texto de JavaScript (x.v) y las posiciones de byte se calculan
// cuando hacen falta. Un SubString es un String con la marca sub: true (split, strip, chop…).

import { ErrorJulia, NoSoportado, I, B, S, Ch, NADA, tipo, repr, errorMetodo } from "./valores.mjs";
import * as V from "./valores.mjs";

// tras: la letra que sigue al trozo en el texto del que salió (Julia la cita en los StringIndexError)
export const Sub = (s, tras) => tras ? { T: "String", v: s, sub: true, tras } : { T: "String", v: s, sub: true };
// el trozo s.slice(a, b) de un texto, como SubString que recuerda la letra siguiente
const trozo = (s, a, b, trasPadre) => Sub(s.slice(a, b), b < s.length ? String.fromCodePoint(s.codePointAt(b)) : trasPadre);
export const esTexto = x => x.T === "String";
export const esLetra = x => x.T === "Char";

// cuántos bytes ocupa un carácter en UTF-8
export const bytesDe = c => { const cp = c.codePointAt(0); return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4; };
// las letras de un texto con el índice de Julia donde empieza cada una (desde 1)
export function letras(s) { const r = []; let i = 1; for (const c of s) { r.push({ c, i, n: bytesDe(c) }); i += bytesDe(c); } return r; }
export const ncodeunits = s => { let n = 0; for (const c of s) n += bytesDe(c); return n; };
export const ultimoIndice = s => { const l = letras(s); return l.length ? l[l.length - 1].i : 0; };

const nombreT = x => x.sub ? "SubString{String}" : "String";
const fuera = (x, ind) => new ErrorJulia("BoundsError: attempt to access " + (x.v.length ? ncodeunits(x.v) + "-codeunit " + nombreT(x) : "empty " + nombreT(x)) + " at index [" + ind + "]");
function indiceMalo(s, k, tras) {
  const l = letras(s);
  const antes = [...l].reverse().find(e => e.i < k);
  const despues = l.find(e => e.i > k) || (tras ? { i: ncodeunits(s) + 1, c: tras } : null);
  const una = e => "[" + e.i + "]=>" + repr(Ch(e.c));
  return new ErrorJulia("StringIndexError: invalid index [" + k + "], valid nearby " + (despues ? "indices " + una(antes) + ", " + una(despues) : "index " + una(antes)));
}
const letraEn = (s, k) => letras(s).find(e => e.i === k);

// s[i] y s[a:b]
export function indexa(x, i) {
  const s = x.v, n = ncodeunits(s);
  if (i.T === "Int64") {
    const k = Number(i.v);
    if (k < 1 || k > n) throw fuera(x, repr(i));
    const e = letraEn(s, k);
    if (!e) throw indiceMalo(s, k, x.tras);
    return Ch(e.c);
  }
  if (i.T === "UnitRange") {
    const a = Number(i.start), b = Number(i.stop);
    if (b < a) return x.sub ? Sub("") : S("");
    if (a < 1 || b > n) throw fuera(x, repr(i));
    if (!letraEn(s, a)) throw indiceMalo(s, a, x.tras);
    if (!letraEn(s, b)) throw indiceMalo(s, b, x.tras);
    const ls = letras(s), dentro = ls.filter(e => e.i >= a && e.i <= b).map(e => e.c).join("");
    if (!x.sub) return S(dentro);
    const sig = ls.find(e => e.i > b);
    return Sub(dentro, sig ? sig.c : x.tras);
  }
  if (i.T === "Float64" || i.T === "Bool") throw new ErrorJulia("ArgumentError: invalid index: " + repr(i) + " of type " + tipo(i));
  throw new NoSoportado("este índice en un texto");
}

// ── Caracteres ─────────────────────────────────────────────────────────────
// Julia cambia mayúsculas letra a letra (una letra da una letra); toUpperCase de JavaScript puede dar dos
const MAYUS_ESP = { "ß": "ẞ" };
const una = (c, f) => { const r = f(c); return [...r].length === 1 ? r : c; };
export const mayus = c => MAYUS_ESP[c] || una(c, x => x.toUpperCase());
export const minus = c => una(c, x => x.toLowerCase());
const cat = (c, re) => re.test(c);
export const esLetraUni = c => cat(c, /\p{L}/u);
export const esEspacio = c => c === " " || (c >= "\t" && c <= "\r") || c === "\u0085" || (c >= " " && cat(c, /\p{Zs}/u));

// La aritmética con caracteres: 'a' + 1 == 'b', 'c' - 'a' == 2
export function aritmeticaLetra(op, a, b) {
  const cp = x => x.v.codePointAt(0);
  if (op === "+" && esLetra(a) && b.T === "Int64") return Ch(String.fromCodePoint(cp(a) + Number(b.v)));
  if (op === "+" && a.T === "Int64" && esLetra(b)) return Ch(String.fromCodePoint(Number(a.v) + cp(b)));
  if (op === "-" && esLetra(a) && b.T === "Int64") return Ch(String.fromCodePoint(cp(a) - Number(b.v)));
  if (op === "-" && esLetra(a) && esLetra(b)) return I(cp(a) - cp(b));
  return null;
}

// ── Las funciones de textos ───────────────────────────────────────────────
export function funcionesDeTexto(fn, prog) {
  const pideTexto = (nombre, args, k = 0) => { if (!esTexto(args[k])) throw errorMetodo(nombre, args); return args[k].v; };
  const pideTextoOLetra = (nombre, args) => { const x = args[0]; if (!esTexto(x) && !esLetra(x)) throw errorMetodo(nombre, args); return x; };
  const sinOpciones = (nombre, kw) => { if (kw && kw.size) throw new NoSoportado(nombre + " con opciones (" + [...kw.keys()].join(", ") + ")"); };

  fn.ncodeunits = args => I(ncodeunits(pideTexto("ncodeunits", args)));
  fn.firstindex = ([x]) => I(1);
  fn.lastindex = ([x]) => esTexto(x) ? I(ultimoIndice(x.v)) : I(V.largo(x));
  const valido = (s, k) => letraEn(s, k) || k === ncodeunits(s) + 1;
  fn.nextind = args => {
    const s = pideTexto("nextind", args), k = Number(args[1].v), n = ncodeunits(s);
    if (k < 0 || k > n) throw fuera(args[0], k);
    const e = letras(s).find(l => l.i > k);
    return I(e ? e.i : n + 1);
  };
  fn.prevind = args => {
    const s = pideTexto("prevind", args), k = Number(args[1].v), n = ncodeunits(s);
    if (k < 1 || k > n + 1) throw fuera(args[0], k);
    const e = [...letras(s)].reverse().find(l => l.i < k);
    return I(e ? e.i : 0);
  };
  fn.thisind = args => {
    const s = pideTexto("thisind", args), k = Number(args[1].v), n = ncodeunits(s);
    if (k < 0 || k > n + 1) throw fuera(args[0], k);
    if (k === 0 || k === n + 1) return I(k);
    return I([...letras(s)].reverse().find(l => l.i <= k).i);
  };
  fn.isvalid = args => { const s = pideTexto("isvalid", args); return B(!!letraEn(s, Number(args[1].v))); };
  void valido;

  // mayúsculas y minúsculas
  const porLetra = (nombre, f) => (args) => {
    const x = pideTextoOLetra(nombre, args);
    return esLetra(x) ? Ch(f(x.v)) : S([...x.v].map(f).join(""));
  };
  fn.uppercase = porLetra("uppercase", mayus);
  fn.lowercase = porLetra("lowercase", minus);
  fn.titlecase = args => {
    const x = pideTextoOLetra("titlecase", args);
    if (esLetra(x)) return Ch(mayus(x.v));
    let r = "", antes = null;
    for (const c of x.v) { r += antes === null || !esLetraUni(antes) ? mayus(c) : minus(c); antes = c; }
    return S(r);
  };
  const primera = (nombre, f) => args => { const s = pideTexto(nombre, args); const cs = [...s]; return S(cs.length ? f(cs[0]) + cs.slice(1).join("") : ""); };
  fn.uppercasefirst = primera("uppercasefirst", mayus);
  fn.lowercasefirst = primera("lowercasefirst", minus);

  // preguntas sobre un carácter
  const pregunta = (nombre, f) => args => { if (!esLetra(args[0])) throw errorMetodo(nombre, args); return B(f(args[0].v)); };
  fn.isletter = pregunta("isletter", esLetraUni);
  fn.isdigit = pregunta("isdigit", c => c >= "0" && c <= "9");
  fn.isspace = pregunta("isspace", esEspacio);
  fn.isuppercase = pregunta("isuppercase", c => /\p{Uppercase}/u.test(c));
  fn.islowercase = pregunta("islowercase", c => /\p{Lowercase}/u.test(c));
  fn.ispunct = pregunta("ispunct", c => /\p{P}/u.test(c));
  fn.isnumeric = pregunta("isnumeric", c => /\p{N}/u.test(c));
  fn.isascii = args => { const x = pideTextoOLetra("isascii", args); return B([...x.v].every(c => c.codePointAt(0) < 128)); };

  // buscar
  const contiene = (s, aguja) => esLetra(aguja) ? [...s].includes(aguja.v) : s.includes(aguja.v);
  fn.occursin = args => {
    const [aguja, pajar] = args;
    if (!esTexto(pajar) || (!esTexto(aguja) && !esLetra(aguja))) throw errorMetodo("occursin", args);
    return B(contiene(pajar.v, aguja));
  };
  const empiezaAcaba = (nombre, empieza) => args => {
    const s = pideTexto(nombre, args), p = args[1];
    if (!esTexto(p) && !esLetra(p)) throw errorMetodo(nombre, args);
    return B(empieza ? s.startsWith(p.v) : s.endsWith(p.v));
  };
  fn.startswith = empiezaAcaba("startswith", true);
  fn.endswith = empiezaAcaba("endswith", false);

  // findfirst / findlast / findnext en textos (índices de byte) y en vectores
  const buscaEnTexto = (que, s, desde, alReves) => {
    const l = letras(s);
    if (esTexto(que)) {
      if (!que.v.length) throw new NoSoportado("buscar un texto vacío");
      const cs = [...que.v];
      const orden = alReves ? [...l.keys()].reverse() : [...l.keys()];
      for (const k of orden) {
        if (desde != null && (alReves ? l[k].i > desde : l[k].i < desde)) continue;
        if (cs.every((c, j) => l[k + j] && l[k + j].c === c)) return { T: "UnitRange", start: BigInt(l[k].i), stop: BigInt(l[k + cs.length - 1].i) };
      }
      return NADA;
    }
    const cumple = c => esLetra(que) ? c === que.v : (() => { const r = prog.aplica(que, [Ch(c)], new Map()); if (r.T !== "Bool") throw new ErrorJulia("TypeError: non-boolean (" + tipo(r) + ") used in boolean context"); return r.v; })();
    const orden = alReves ? [...l].reverse() : l;
    for (const e of orden) {
      if (desde != null && (alReves ? e.i > desde : e.i < desde)) continue;
      if (cumple(e.c)) return I(e.i);
    }
    return NADA;
  };
  const buscaEnVector = (que, x, alReves) => {
    const els = V.elementos(x);
    const idx = alReves ? [...els.keys()].reverse() : [...els.keys()];
    for (const k of idx) {
      let ok;
      if (que === null) { if (els[k].T !== "Bool") throw new NoSoportado("findfirst con valores que no son true o false"); ok = els[k].v; }
      else { const r = prog.aplica(que, [els[k]], new Map()); if (r.T !== "Bool") throw new ErrorJulia("TypeError: non-boolean (" + tipo(r) + ") used in boolean context"); ok = r.v; }
      if (ok) return I(k + 1);
    }
    return NADA;
  };
  const busca = (nombre, alReves) => args => {
    if (args.length === 1) { if (!V.esVector(args[0])) throw errorMetodo(nombre, args); return buscaEnVector(null, args[0], alReves); }
    const [que, donde] = args;
    if (esTexto(donde)) return buscaEnTexto(que, donde.v, null, alReves);
    if (V.esVector(donde) && (que.T === "Funcion" || que.T === "Primitiva")) return buscaEnVector(que, donde, alReves);
    throw new NoSoportado(nombre + " con estos argumentos");
  };
  fn.findfirst = busca("findfirst", false);
  fn.findlast = busca("findlast", true);
  fn.findnext = args => { const [que, donde, i] = args; if (!esTexto(donde)) throw new NoSoportado("findnext fuera de un texto"); return buscaEnTexto(que, donde.v, Number(i.v), false); };
  fn.findprev = args => { const [que, donde, i] = args; if (!esTexto(donde)) throw new NoSoportado("findprev fuera de un texto"); return buscaEnTexto(que, donde.v, Number(i.v), true); };

  // partir, juntar, limpiar, cambiar
  fn.split = (args, kw) => {
    sinOpciones("split", kw);
    const s = pideTexto("split", args), tp = args[0].tras;
    if (args.length === 1) return V.vec("SubString{String}", trozosPorEspacios(s).map(([a, b]) => trozo(s, a, b, tp)));
    const d = args[1];
    if (!esLetra(d) && !esTexto(d)) throw new NoSoportado("split con este separador");
    if (!d.v.length) throw new NoSoportado("split con un separador vacío");
    const r = []; let a = 0, k;
    while ((k = s.indexOf(d.v, a)) >= 0) { r.push(trozo(s, a, k)); a = k + d.v.length; }
    r.push(trozo(s, a, s.length, tp));
    return V.vec("SubString{String}", r);
  };
  fn.join = args => {
    const [col, sep] = args;
    if (!V.esVector(col) && col.T !== "Tuple" && !esTexto(col)) throw new NoSoportado("join de " + tipo(col));
    const els = esTexto(col) ? [...col.v].map(Ch) : V.elementos(col);
    return S(els.map(V.texto).join(sep ? V.texto(sep) : ""));
  };
  const quita = (nombre, izq, der) => args => {
    const s = pideTexto(nombre, args), q = args[1];
    let fuera;
    if (!q) fuera = esEspacio;
    else if (esLetra(q)) fuera = c => c === q.v;
    else if (V.esVector(q) && V.elementos(q).every(esLetra)) { const cs = V.elementos(q).map(e => e.v); fuera = c => cs.includes(c); }
    else throw new NoSoportado(nombre + " con este argumento");
    let a = 0, b = s.length;
    const letraEnJS = k => String.fromCodePoint(s.codePointAt(k));
    if (izq) while (a < b && fuera(letraEnJS(a))) a += letraEnJS(a).length;
    if (der) while (b > a) { const c = [...s.slice(a, b)].pop(); if (!fuera(c)) break; b -= c.length; }
    return trozo(s, a, b, args[0].tras);
  };
  fn.strip = quita("strip", true, true);
  fn.lstrip = quita("lstrip", true, false);
  fn.rstrip = quita("rstrip", false, true);
  fn.chop = (args, kw) => { sinOpciones("chop", kw); const s = pideTexto("chop", args); const cs = [...s]; return cs.length ? trozo(s, 0, s.length - cs[cs.length - 1].length, args[0].tras) : Sub(""); };
  fn.replace = (args, kw) => {
    sinOpciones("replace", kw);
    const s = pideTexto("replace", args), pares = args.slice(1);
    if (!pares.length || !pares.every(p => p.T === "Pair")) throw new NoSoportado("replace sin parejas viejo => nuevo");
    for (const p of pares) {
      if ((!esTexto(p.a) && !esLetra(p.a)) || (!esTexto(p.b) && !esLetra(p.b))) throw new NoSoportado("replace con " + tipo(p));
      if (!p.a.v.length) throw new NoSoportado("replace de un texto vacío");
    }
    let r = "", k = 0;
    while (k < s.length) {
      const p = pares.find(p => s.startsWith(p.a.v, k));
      if (p) { r += p.b.v; k += p.a.v.length; }
      else { const c = String.fromCodePoint(s.codePointAt(k)); r += c; k += c.length; }
    }
    return S(r);
  };
  fn.String = args => {
    const [x] = args;
    if (esTexto(x)) return S(x.v);
    if (V.esVector(x) && V.elementos(x).every(esLetra)) return S(V.elementos(x).map(e => e.v).join(""));
    throw errorMetodo("String", args);
  };
}

// [inicio, fin) de cada palabra, en posiciones de JavaScript
export const trozosPorEspacios = s => {
  const r = []; let ini = -1, k = 0;
  for (const c of s) { if (esEspacio(c)) { if (ini >= 0) r.push([ini, k]); ini = -1; } else if (ini < 0) ini = k; k += c.length; }
  if (ini >= 0) r.push([ini, k]);
  return r;
};

