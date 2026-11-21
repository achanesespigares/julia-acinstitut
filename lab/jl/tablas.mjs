// tablas.mjs · Una parte de DataFrames.jl (1.8) y de Statistics, para el capítulo «Tablas de datos»
// (Entendiendo Julia, desde dentro · AC Institut)
//
// Una tabla es { T: "DataFrame", nombres: [...], cols: [vectores] }: cada columna es un vector de verdad,
// el mismo que da clase.nota. Una fila, { T: "FilaDF", df, i }, es una vista de la fila i. Lo que se
// escribe en la consola sigue el display de DataFrames (PrettyTables): columnas de números a la derecha
// y alineadas por el punto decimal, textos a la izquierda, tipos abreviados y las líneas │ ┼ ─.
import * as V from "./valores.mjs";
import { ErrorJulia, NoSoportado, I, F, B, S, errorMetodo, tipo, repr } from "./valores.mjs";

const esDF = x => x && x.T === "DataFrame";
const nrow = df => df.cols.length ? V.largo(df.cols[0]) : 0;
const ancho = s => [...s].length;
// el error de una columna que no existe, con los nombres parecidos que sugiere DataFrames (fuzzymatch)
function levenshtein(s1, s2) {
  const a = [...s1], b = [...s2], d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0));
  return d[a.length][b.length];
}
function noCol(df, c) {
  if (!df.nombres.length) return new ErrorJulia("ArgumentError: column name \"" + c + "\" not found in the data frame since it has no columns");
  const dist = df.nombres.map(x => [levenshtein(x.toUpperCase(), c.toUpperCase()), x]).sort((p, q) => p[0] - q[0] || (p[1] < q[1] ? -1 : p[1] > q[1] ? 1 : 0));
  const cuenta = [0, 1, 2].map(i => dist.filter(x => x[0] <= i).length);
  const maxd = Math.max(0, cuenta.filter(n => n <= 8).length - 1);
  const cand = dist.filter(x => x[0] <= maxd).map(x => x[1]);
  if (!cand.length) return new ErrorJulia("ArgumentError: column name :" + c + " not found in the data frame");
  const lista = cand.map(x => '"' + x + '"'), y = lista.length > 1 ? lista.slice(0, -1).join(", ") + " and " + lista[lista.length - 1] : lista[0];
  return new ErrorJulia("ArgumentError: column name \"" + c + "\" not found in the data frame; existing most similar names are: " + y);
}

// el tipo de una columna, abreviado como DataFrames.compacttype
function compacto(sT, nombre) {
  let mw = Math.max(8, Math.max(9, ancho(nombre)));
  if (ancho(sT) <= mw) return sT;
  mw -= 1;
  const corto = sT.split("{")[0];
  if (ancho(corto) <= mw + 1 && sT.endsWith(corto)) return corto;
  return [...corto].slice(0, mw).join("") + "…";
}
// cómo se escribe una casilla: print compacto, sin comillas, escapando lo invisible, cortado a 32 caracteres
function casilla(x) {
  let s;
  if (x.T === "String") s = x.v;
  else if (x.T === "Char") s = x.v;
  else if (x.T === "Float64") s = V.decimal(x.v, true);
  else if (x.T === "Missing") throw new NoSoportado("missing en una tabla");
  else s = repr(x, true);
  s = s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r");
  const cs = [...s];
  return cs.length > 32 ? cs.slice(0, 32).join("") + "…" : s;
}
const esReal = el => ["Int64", "Float64", "Bool", "Rational{Int64}"].includes(el);

export function muestraTabla(df, titulo, filas, etiquetas) {
  if (!df.cols.length) return titulo;
  const tipos = df.cols.map((c, k) => compacto(V.eltipo(c), df.nombres[k]));
  const columnas = df.cols.map((c, k) => {
    let cs = filas.map(i => casilla(V.elemento(c, i)));
    if (esReal(V.eltipo(c))) {          // alineadas por el punto (o por la derecha si no lo hay)
      const anc = cs.map(s => { const p = s.indexOf("."); return p < 0 ? ancho(s) : ancho(s.slice(0, p)); });
      const m = Math.max(0, ...anc);
      cs = cs.map((s, j) => " ".repeat(m - anc[j]) + s);
      const L = Math.max(0, ...cs.map(ancho));
      cs = cs.map(s => s + " ".repeat(L - ancho(s)));
    }
    const w = Math.max(ancho(df.nombres[k]), ancho(tipos[k]), ...cs.map(ancho));
    return { cs, w, der: esReal(V.eltipo(c)) };
  });
  const rw = Math.max(3, ...etiquetas.map(e => String(e).length));
  const pad = (s, w, der) => der ? " ".repeat(w - ancho(s)) + s : s + " ".repeat(w - ancho(s));
  const lin = (izq, celdas) => (" " + izq + " │ " + celdas.join("  ")).replace(/\s+$/, "");
  const r = [titulo,
    lin("Row".padStart(rw), df.nombres.map((n, k) => pad(n, columnas[k].w, false))),
    lin(" ".repeat(rw), tipos.map((t, k) => pad(t, columnas[k].w, false))),
    "─".repeat(rw + 2) + (filas.length ? "┼" : "┴") + "─".repeat(columnas.reduce((s, c) => s + c.w + 2, 0))];
  filas.forEach((i, j) => r.push(lin(String(etiquetas[j]).padStart(rw), columnas.map(c => pad(c.cs[j], c.w, c.der)))));
  return r.join("\n");
}
export function muestraDF(x) {
  if (x.T === "DataFrame") { const n = nrow(x); return muestraTabla(x, n + "×" + x.cols.length + " DataFrame", Array.from({ length: n }, (_, k) => k + 1), Array.from({ length: n }, (_, k) => k + 1)); }
  if (x.T === "FilaDF") return muestraTabla(x.df, "DataFrameRow", [x.i], [x.i]);
  throw new NoSoportado("escribir un " + tipo(x));
}

export function funcionesDeTablas(P, fn, prog) {
  V.GANCHOS.muestraDF = muestraDF;
  const col = (df, c) => { const k = df.nombres.indexOf(c); if (k < 0) throw noCol(df, c); return df.cols[k]; };
  const simbolo = (x, que) => { if (x.T === "Symbol") return x.v; if (x.T === "String") return x.v; throw new NoSoportado(que + " con " + tipo(x)); };
  const copia = v => v.T === "BitVector" ? V.bitvec([...v.a]) : V.vec(V.eltipo(v), [...V.elementos(v)]);
  const sub = (v, filas) => v.T === "BitVector" ? V.bitvec(filas.map(i => v.a[i - 1])) : V.vec(V.eltipo(v), filas.map(i => V.elemento(v, i)));
  const nueva = (nombres, cols) => ({ T: "DataFrame", nombres: [...nombres], cols });
  const tomaFilas = (df, filas) => nueva(df.nombres, df.cols.map(c => sub(c, filas)));
  P.esDF = esDF;

  const DF = {};        // lo que trae `using DataFrames`
  DF.DataFrame = (args, kw) => {
    if (args.length) throw new NoSoportado("DataFrame con argumentos sin nombre");
    const nombres = [...kw.keys()], vals = [...kw.values()];
    const vecs = vals.map((v, k) => V.esVector(v) ? k : -1).filter(k => k >= 0);
    let n = vecs.length ? V.largo(vals[vecs[0]]) : 1;
    for (const k of vecs) if (V.largo(vals[k]) !== n) throw new ErrorJulia("DimensionMismatch: column :" + nombres[vecs[0]] + " has length " + n + " and column :" + nombres[k] + " has length " + V.largo(vals[k]));
    const cols = vals.map(v => {
      if (V.esRango(v)) return V.vec(V.eltipo(v), V.elementos(v));
      if (V.esVector(v)) return copia(v);
      if (v.T === "Matrix" || v.T === "Dict" || v.T === "Tuple") throw new NoSoportado("una columna con un " + tipo(v));
      return V.vec(v.T === "Rational" ? "Rational{Int64}" : tipo(v), Array.from({ length: n }, () => v));
    });
    return nueva(nombres, cols);
  };
  DF.nrow = ([df]) => { if (!esDF(df)) throw errorMetodo("nrow", [df]); return I(nrow(df)); };
  DF.ncol = ([df]) => { if (!esDF(df)) throw errorMetodo("ncol", [df]); return I(df.cols.length); };
  DF.groupby = ([df, c], kw) => {
    if (!esDF(df)) throw errorMetodo("groupby", [df, c]);
    if (kw && kw.size) throw new NoSoportado("groupby con opciones");
    if (V.esVector(c)) throw new NoSoportado("agrupar por varias columnas");
    const nom = simbolo(c, "groupby"), v = col(df, nom), els = V.elementos(v), n = els.length;
    // Como DataFrames sin sort: con enteros de un rango pequeño (2 × filas), los grupos salen ordenados;
    // si no, en el orden en que aparece cada valor
    const enteros = n > 0 && els.every(e => e.T === "Int64" || e.T === "Bool" || (e.T === "Float64" && Number.isInteger(e.v) && !Object.is(e.v, -0)));
    let ordenados = false;
    if (enteros) { const ns = els.map(V.aNum), lo = Math.min(...ns), hi = Math.max(...ns); ordenados = hi - lo + 2 <= 2 * n; }
    const claves = [], grupos = [];
    els.forEach((e, i) => { let k = claves.findIndex(c2 => P.identicos(c2, e) || P.iguales(c2, e)); if (k < 0) { claves.push(e); grupos.push([]); k = claves.length - 1; } grupos[k].push(i + 1); });
    if (ordenados) { const orden = claves.map((_, k) => k).sort((a, b) => V.aNum(claves[a]) - V.aNum(claves[b])); return { T: "GrupoDF", df, clave: nom, claves: orden.map(k => claves[k]), grupos: orden.map(k => grupos[k]) }; }
    return { T: "GrupoDF", df, clave: nom, claves, grupos };
  };
  const nombreF = f => f.T === "Primitiva" ? f.nombre : f.T === "Funcion" && !f.anonima ? f.nombre : "function";
  DF.combine = ([g, ...specs], kw) => {
    if (kw && kw.size) throw new NoSoportado("combine con opciones");
    const grupos = g.T === "GrupoDF" ? g.grupos : esDF(g) ? [Array.from({ length: nrow(g) }, (_, k) => k + 1)] : null;
    if (!grupos) throw errorMetodo("combine", [g, ...specs]);
    const df = g.T === "GrupoDF" ? g.df : g;
    const nombres = [], cols = [];
    if (g.T === "GrupoDF") { nombres.push(g.clave); cols.push(P.recoge(g.claves)); }
    for (const sp of specs) {
      let nombre, vals;
      if ((sp.T === "Primitiva" && sp.nombre === "nrow") || (sp.T === "Pair" && sp.a.T === "Primitiva" && sp.a.nombre === "nrow")) {
        nombre = sp.T === "Pair" ? simbolo(sp.b, "combine") : "nrow";
        vals = grupos.map(gr => I(gr.length));
      } else if (sp.T === "Pair" && (sp.a.T === "Symbol" || sp.a.T === "String")) {
        const c = simbolo(sp.a, "combine"), v = col(df, c);
        let f = sp.b;
        if (f.T === "Pair") { nombre = simbolo(f.b, "combine"); f = f.a; } else nombre = c + "_" + nombreF(f);
        if (f.T !== "Primitiva" && f.T !== "Funcion") throw new NoSoportado("combine con " + tipo(f));
        // con groupby, la función recibe una vista de las filas del grupo (un SubArray); sin él, la columna misma
        const vista = gr => { const s = sub(v, gr); s.tipoTxt = "SubArray{" + V.eltipo(v) + ", 1, " + tipo(v) + ", Tuple{SubArray{Int64, 1, Vector{Int64}, Tuple{UnitRange{Int64}}, true}}, false}";
          s.vistaDe = { p: v, pos: gr.map(i => i - 1), i: "[" + gr.join(", ") + "]", clave: "vista|grupo|" + v.oid + "|" + gr.join(",") };
          s.a = new Proxy(s.a, { set() { throw new NoSoportado("cambiar las casillas de un grupo desde la función de combine"); } }); return s; };
        vals = grupos.map(gr => prog.aplica(f, [g.T === "GrupoDF" ? vista(gr) : v], new Map()));
      } else throw new NoSoportado("esta forma de resumir en combine");
      if (vals.some(x => V.esVector(x) || x.T === "Tuple" || esDF(x))) throw new NoSoportado("combine con una función que no da un solo valor");
      nombres.push(nombre); cols.push(P.recoge(vals));
    }
    return nueva(nombres, cols);
  };
  DF.eachrow = ([df]) => { if (!esDF(df)) throw errorMetodo("eachrow", [df]); return { T: "Iter", nombre: "eachrow", a: Array.from({ length: nrow(df) }, (_, k) => ({ T: "FilaDF", df, i: k + 1 })) }; };
  DF.select = DF.transform = DF.subset = DF.describe = DF.innerjoin = DF.leftjoin = () => { throw new NoSoportado("esta función de DataFrames"); };

  const ST = {};        // lo que trae `using Statistics`
  const nums = (nombre, x) => { if (!V.esVector(x)) throw errorMetodo(nombre, [x]); const els = V.elementos(x); if (!els.length) throw new NoSoportado(nombre + " de un vector vacío"); if (!els.every(V.esNumero)) throw errorMetodo("+", [els[0], els.find(e => !V.esNumero(e)) || els[0]]); return els; };
  ST.mean = ([x]) => { nums("mean", x); return P.binaria("/", fn.sum([x], new Map()), I(V.largo(x))); };
  ST.median = ([x]) => {
    const els = nums("median", x), o = fn.sort([V.vec(V.eltipo(x), els)], new Map()).a, n = o.length;
    if (n % 2) return V.convierte(o[(n - 1) / 2], "Float64");
    return P.binaria("+", P.binaria("/", o[n / 2 - 1], I(2)), P.binaria("/", o[n / 2], I(2)));       // Statistics.middle: x/2 + y/2
  };
  // var y std: Σ (x − media)² / (n − 1), la suma con las mismas reglas que sum (Statistics.varm)
  ST.var = ([x, ...resto], kw) => {
    if (resto.length || (kw && kw.size)) throw new NoSoportado("var con más argumentos");
    const els = nums("var", x), m = ST.mean([x]);
    const t = els.map(e => { const d = P.binaria("-", e, m); return P.binaria("*", d, d); });
    return P.binaria("/", fn.sum([V.vec("Float64", t)], new Map()), I(els.length - 1));
  };
  ST.std = ([x, ...resto], kw) => {
    if (resto.length || (kw && kw.size)) throw new NoSoportado("std con más argumentos");
    return fn.sqrt([ST.var([x], new Map())], new Map());
  };
  P.paquetes = { DataFrames: DF, Statistics: ST };

  // ── Las funciones de Base que también sirven para tablas ─────────────────
  const envuelve = (nombre, f) => { const viejo = fn[nombre]; fn[nombre] = (args, kw) => f(args, kw, viejo); };
  envuelve("size", (args, kw, viejo) => { const [x, d] = args; if (!esDF(x)) return viejo(args, kw); const t = [I(nrow(x)), I(x.cols.length)]; return d ? t[Number(d.v) - 1] : { T: "Tuple", a: t }; });
  envuelve("names", (args, kw, viejo) => { const [x] = args; if (esDF(x)) return V.vec("String", x.nombres.map(S)); if (x && x.T === "FilaDF") return V.vec("String", x.df.nombres.map(S)); if (viejo) return viejo(args, kw); throw new NoSoportado("names"); });
  envuelve("first", (args, kw, viejo) => { const [x, n] = args; if (!esDF(x)) return viejo(args, kw); if (!n) { if (!nrow(x)) throw new ErrorJulia("BoundsError: attempt to access 0×" + x.cols.length + " DataFrame at index [1, :]"); return { T: "FilaDF", df: x, i: 1 }; } const k = Math.min(Number(n.v), nrow(x)); return tomaFilas(x, Array.from({ length: k }, (_, j) => j + 1)); });
  envuelve("last", (args, kw, viejo) => { const [x, n] = args; if (!esDF(x)) return viejo(args, kw); const N = nrow(x); if (!n) return { T: "FilaDF", df: x, i: N }; const k = Math.min(Number(n.v), N); return tomaFilas(x, Array.from({ length: k }, (_, j) => N - k + j + 1)); });
  envuelve("sort", (args, kw, viejo) => {
    const [x, c] = args; if (!esDF(x)) return viejo(args, kw);
    if ([...kw.keys()].some(k => k !== "rev")) throw new NoSoportado("sort de una tabla con esas opciones");
    const rev = kw.has("rev") && kw.get("rev").v === true;
    if (kw.has("rev") && kw.get("rev").T !== "Bool") throw new NoSoportado("rev con varios valores");
    const cs = !c ? x.nombres : V.esVector(c) ? V.elementos(c).map(e => simbolo(e, "sort")) : [simbolo(c, "sort")];
    const vs = cs.map(n => V.elementos(col(x, n)));
    const cmp = (i, j) => { for (const v of vs) { if (P.compara("<", v[i], v[j]).v) return -1; if (P.compara("<", v[j], v[i]).v) return 1; } return 0; };
    const orden = Array.from({ length: nrow(x) }, (_, k) => k).sort((i, j) => (rev ? -cmp(i, j) : cmp(i, j)) || i - j);      // estable, como DataFrames
    return tomaFilas(x, orden.map(k => k + 1));
  });
  envuelve("filter", (args, kw, viejo) => {
    const [f, x] = args; if (!esDF(x)) return viejo(args, kw);
    const pasa = r => { if (r.T !== "Bool") throw new ErrorJulia("TypeError: non-boolean (" + tipo(r) + ") used in boolean context"); return r.v; };
    let filas;
    if (f.T === "Pair") { const v = V.elementos(col(x, simbolo(f.a, "filter"))); filas = v.map((e, k) => pasa(prog.aplica(f.b, [e], new Map())) ? k + 1 : 0).filter(Boolean); }
    else filas = Array.from({ length: nrow(x) }, (_, k) => k + 1).filter(i => pasa(prog.aplica(f, [{ T: "FilaDF", df: x, i }], new Map())));
    return tomaFilas(x, filas);
  });
  envuelve("copy", (args, kw, viejo) => { const [x] = args; if (!esDF(x)) return viejo(args, kw); return nueva(x.nombres, x.cols.map(copia)); });

  // ── Columnas, filas y casillas ───────────────────────────────────────────
  P.leeColumna = (x, c) => x.T === "FilaDF" ? V.elemento(col(x.df, c), x.i) : col(x, c);
  P.ponColumna = (x, c, v) => {
    if (x.T === "FilaDF") { P.ponCasilla(x.df, x.i, c, v); return; }
    if (!V.esVector(v)) throw new ErrorJulia("ArgumentError: It is only allowed to pass a vector as a column of a DataFrame. Instead use `df[!, col_ind] .= v` if you want to use broadcasting.");
    if (x.cols.length && V.largo(v) !== nrow(x)) throw new ErrorJulia("ArgumentError: New columns must have the same length as old columns");
    const nv = V.esRango(v) ? V.vec(V.eltipo(v), V.elementos(v)) : v;      // df.col = v guarda ese mismo vector, sin copiarlo
    const k = x.nombres.indexOf(c);
    if (k < 0) { x.nombres.push(c); x.cols.push(nv); } else x.cols[k] = nv;
  };
  P.ponCasilla = (df, i, c, v) => {
    const vec = col(df, c);
    if (i < 1 || i > nrow(df)) throw new ErrorJulia("BoundsError: attempt to access " + nrow(df) + "×" + df.cols.length + " DataFrame at index [" + i + ", :" + c + "]");
    P.ponIndice(vec, I(i), v);
  };
  const filasDe = (df, r, txt) => {
    const n = nrow(df);
    if (r.T === "Colon") return Array.from({ length: n }, (_, k) => k + 1);
    if (r.T === "Int64") return null;
    if (V.esVector(r) && V.eltipo(r) === "Bool") { const els = V.elementos(r); if (els.length !== n) throw new ErrorJulia("BoundsError: attempt to access " + n + "×" + df.cols.length + " DataFrame at index [" + repr(r) + ", " + txt + "]"); return els.map((e, k) => e.v ? k + 1 : 0).filter(Boolean); }
    if (V.esVector(r) && V.elementos(r).every(e => e.T === "Int64")) { const ks = V.elementos(r).map(e => Number(e.v)); if (ks.some(k => k < 1 || k > n)) throw new ErrorJulia("BoundsError: attempt to access " + n + "×" + df.cols.length + " DataFrame at index [" + repr(r) + ", " + txt + "]"); return ks; }
    throw new NoSoportado("este índice de filas en una tabla");
  };
  const txtCol = c => c.T === "Colon" ? ":" : c.T === "Symbol" ? ":" + c.v : repr(c);
  P.indexaDF = (df, r, c) => {
    if (r.T === "Bang") { if (c.T === "Colon" || V.esVector(c)) throw new NoSoportado("df[!, varias columnas]"); return col(df, simbolo(c, "df[!, …]")); }
    const n = nrow(df);
    if (r.T === "Int64") {
      const i = Number(r.v);
      if (i < 1 || i > n) throw new ErrorJulia("BoundsError: attempt to access " + n + "×" + df.cols.length + " DataFrame at index [" + i + ", " + txtCol(c) + "]");
      if (c.T === "Colon") return { T: "FilaDF", df, i };
      if (V.esVector(c)) throw new NoSoportado("df[i, varias columnas]");
      return V.elemento(col(df, simbolo(c, "df[i, …]")), i);
    }
    const filas = filasDe(df, r, txtCol(c));
    if (c.T === "Colon") return tomaFilas(df, filas);
    if (V.esVector(c)) { const ns = V.elementos(c).map(e => simbolo(e, "df[…, columnas]")); return nueva(ns, ns.map(m => sub(col(df, m), filas))); }
    return sub(col(df, simbolo(c, "df[…, columna]")), filas);       // df[:, :nota] es una copia de la columna
  };
  P.ponDF = (df, r, c, v, punto) => {
    if (c.T === "Colon" || V.esVector(c)) throw new NoSoportado("asignar a varias columnas de una tabla");
    const nom = simbolo(c, "df[…, columna] = …");
    if (r.T === "Bang") { if (punto) throw new NoSoportado("df[!, col] .= v"); P.ponColumna(df, nom, v); return; }
    if (r.T === "Int64" && !punto) { P.ponCasilla(df, Number(r.v), nom, v); return; }
    const filas = r.T === "Int64" ? [Number(r.v)] : filasDe(df, r, ":" + nom);
    P.ponIndice(col(df, nom), V.vec("Int64", filas.map(I)), v, punto);
  };
}
