// matrices.mjs · Las matrices de Julia
//
// Una matriz guarda sus casillas por columnas, como Julia (x.a[(j - 1) * f + (i - 1)] es A[i, j]).
// vec y reshape comparten esas casillas con la matriz de la que salen, como en Julia; A' y
// transpose(A) son vistas: no copian nada y leen de la matriz original.

import { ErrorJulia, NoSoportado, I, F, B, tipo, repr, errorMetodo } from "./valores.mjs";
import * as V from "./valores.mjs";

export const esMatriz = x => x.T === "Matrix";
export const esVista = x => x.T === "Matrix" && !!x.vista;
// una matriz nueva; a son las casillas por columnas (se pueden compartir)
export const mat = (el, f, c, a, bit = false) => ({ T: "Matrix", el, f, c, a, bit });
export const vistaDe = (que, p) => ({ T: "Matrix", vista: que, p, el: V.eltipo(p) });

export function dims(x) {
  if (x.T === "Matrix") {
    if (!x.vista) return [x.f, x.c];
    if (x.p.T === "Matrix") return [x.p.c, x.p.f];
    return [1, V.largo(x.p)];
  }
  if (V.esVector(x)) return [V.largo(x)];
  return [];
}
export function get(x, i, j) {
  if (!x.vista) return x.a[(j - 1) * x.f + (i - 1)];
  if (x.p.T === "Matrix") return get(x.p, j, i);
  return V.elemento(x.p, j);
}
export function set(x, i, j, v) {
  if (!x.vista) { x.a[(j - 1) * x.f + (i - 1)] = v; return; }
  if (x.p.T === "Matrix") { set(x.p, j, i, v); return; }
  x.p.a[j - 1] = v;
}
// las casillas por columnas
export function lineal(x) {
  if (!x.vista) return x.a;
  const [f, c] = dims(x), r = [];
  for (let j = 1; j <= c; j++) for (let i = 1; i <= f; i++) r.push(get(x, i, j));
  return r;
}
export const eltipoM = x => x.vista ? V.eltipo(x.p) : x.el;
export function tipoM(x) {
  if (!x.vista) return x.bit ? "BitMatrix" : "Matrix{" + x.el + "}";
  const el = eltipoM(x);
  // con using LinearAlgebra, Julia escribe Adjoint sin el nombre del módulo
  return (V.GANCHOS.laVisible && V.GANCHOS.laVisible() ? "" : "LinearAlgebra.") + (x.vista === "adjoint" ? "Adjoint" : "Transpose") + "{" + el + ", " + tipo(x.p) + "}";
}
export const forma = x => { const d = dims(x); return d.length === 1 ? d[0] + "-element" : d.join("×"); };

// ── Escribir una matriz ───────────────────────────────────────────────────
// repr: [1 2; 3 4], [1.5; 2.5;;] (una columna), Bool[1 0]
export function reprM(x) {
  if (x.vista && x.p.T !== "Matrix") return x.vista + "(" + repr(x.p) + ")";
  const [f, c] = dims(x), el = eltipoM(x);
  const bools = el === "Bool";
  const pref = bools ? "Bool" : ["Any", "Rational{Int64}", "SubString{String}", "AbstractString"].includes(el) ? el : "";
  const e = v => bools ? (v.v ? "1" : "0") : el === "Rational{Int64}" && v.T === "Rational" ? V.racTI(v) : repr(v, true);
  if (!f || !c) return el + "[]";
  const filas = [];
  for (let i = 1; i <= f; i++) { const fila = []; for (let j = 1; j <= c; j++) fila.push(e(get(x, i, j))); filas.push(fila.join(" ")); }
  return pref + "[" + filas.join("; ") + (c === 1 ? ";;" : "") + "]";
}
// alignment de Julia (base/show.jl): los números se parten por el punto decimal; el resto se alinea a la izquierda
function alinea(s, e) {
  if (e.T === "Int64" || e.T === "Bool") return [[...s].length, 0];
  if (e.T === "Float64") { const m = /^(.*?)((?:[\.eEfF].*)?)$/.exec(s); return [[...m[1]].length, [...m[2]].length]; }
  if (e.T === "Rational") { const k = s.indexOf("//"); return k < 0 ? [s.length, 0] : [k + 1, s.length - k - 1]; }
  return [0, [...s].length];
}
// display: la cabecera y las filas alineadas por columnas. Es print_matrix de Julia (base/arrayshow.jl)
// paso a paso; con limita, como lo escribe Julia en una pantalla de 24×80: las esquinas y unos puntos
// suspensivos (⋮, …, ⋱) en lugar de lo que no cabe.
export function muestraM(x, limita = false) {
  const [f, c] = dims(x), el = eltipoM(x);
  const cab = x.vista ? f + "×" + c + " " + x.vista + "(::" + tipo(x.p) + ") with eltype " + el : f + "×" + c + " " + tipoM(x);
  if (!f || !c) return cab;
  const compacto = c > 1;
  const texto = e => e.T === "Bool" ? (e.v ? "1" : "0") : e.T === "Float64" ? V.decimal(e.v, compacto) : e.T === "Char" && !compacto ? V.muestra(e) : el === "Rational{Int64}" && e.T === "Rational" ? V.racTI(e) : repr(e, true);
  const memo = new Map();
  const celda = (i, j) => { const k = (j - 1) * f + i; if (!memo.has(k)) { const e = get(x, i, j), s = texto(e); memo.set(k, [s, alinea(s, e)]); } return memo.get(k); };
  const alto = limita ? 24 - 4 : Infinity, ancho = (limita ? 80 : Infinity) - 1;     // pre = " ", post = ""
  const SEP = "  ", HD = "  …  ", VD = "⋮", DD = "  ⋱  ";
  const suma = a => a.reduce((t, [l, r]) => t + l + r, 0);
  const alineacion = (filas, cols, siCompleto, siNo) => {
    const a = [];
    for (const j of cols) {
      let l = 0, r = 0;
      for (const i of filas) { const [, [p, q]] = celda(i, j); l = Math.max(l, p); r = Math.max(r, q); }
      a.push([l, r]);
      if (a.length > 1 && suma(a) + SEP.length * a.length >= siCompleto) { a.pop(); break; }
    }
    if (1 < a.length && a.length < c) while (suma(a) + SEP.length * a.length >= siNo) a.pop();
    return a;
  };
  const fila = (A, i, cols) => {
    let t = "";
    for (let k = 0; k < cols.length && k < A.length; k++) {
      const j = cols[k], [s, [p, q]] = celda(i, j);
      t += " ".repeat(A[k][0] - p) + s + (j === c ? "" : " ".repeat(A[k][1] - q));
      if (k < A.length - 1) t += SEP;
    }
    return t;
  };
  const puntos = (A, M, m, rellena) => {
    let t = "";
    for (let k = 1; k <= A.length; k++) {
      const w = A[k - 1][0] + A[k - 1][1];
      if (k % M === m) { const l = " ".repeat(Math.max(0, A[k - 1][0] - 1)); t += l + VD + (k === A.length && !rellena ? "" : " ".repeat(Math.max(0, w - 1 - l.length))); }
      else if (k !== A.length || rellena) t += " ".repeat(w);
      if (k < A.length) t += SEP;
    }
    return t;
  };
  const rango = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, k) => a + k);
  const media = Math.floor(alto / 2);
  const filas = f > alto ? [...rango(1, media), ...rango(f - Math.floor((alto - 1) / 2) + 1, f)] : rango(1, f);
  const maxCols = Math.floor(ancho / (1 + SEP.length));
  const cols = c > maxCols ? [...rango(1, maxCols), ...rango(c - maxCols + 1, c)] : rango(1, c);
  const A = alineacion(filas, cols, ancho, ancho);
  const lineas = [];
  let Ra, La, desplaza;
  if (c > A.length) {
    const cc = Math.floor((ancho - HD.length + 1) / 2) + 1;
    Ra = alineacion(filas, [...cols].reverse(), cc, cc).reverse();
    const c2 = ancho - suma(Ra) - (Ra.length - 1) * SEP.length - HD.length;
    La = alineacion(filas, cols, c2, c2);
    desplaza = cols.map(j => j + c - Ra.length);
  }
  const unaFila = i => c <= A.length ? fila(A, i, cols) : fila(La, i, cols.slice(0, La.length)) + ((i - filas[0]) % 5 === 0 ? HD : " ".repeat(HD.length)) + fila(Ra, i, desplaza);
  for (const i of filas) {
    lineas.push(" " + unaFila(i));
    if (f > alto && i === filas[media - 1]) {
      if (c <= A.length) lineas.push(" " + puntos(A, 5, 1, false));
      else lineas.push(" " + puntos(La, 5, 1, true) + DD + puntos(Ra, 5, ((Ra.length - c + 1) % 5 + 5) % 5, false));
    }
  }
  return cab + ":\n" + lineas.join("\n");
}

V.GANCHOS.tipoM = tipoM; V.GANCHOS.reprM = reprM; V.GANCHOS.muestraM = muestraM; V.GANCHOS.dims = dims; V.GANCHOS.eltipoM = eltipoM;

// ── El producto de matrices de decimales ─────────────────────────────────
// Julia multiplica matrices de Float64 con OpenBLAS, que suma en el orden que le conviene (y que
// cambia de un procesador a otro). El laboratorio solo da el resultado cuando es el mismo en
// cualquier orden: cuando todos los productos y todas las sumas parciales son exactos.
const bits = x => { const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x); return dv.getBigUint64(0); };
export function exacto(x) {                     // x = m · 2^e, con m entero
  if (x === 0) return [0n, 0];
  const b = bits(x), neg = b >> 63n, ex = Number((b >> 52n) & 0x7ffn), fr = b & ((1n << 52n) - 1n);
  let m = ex === 0 ? fr : fr | (1n << 52n), e = (ex === 0 ? 1 : ex) - 1075;
  while (m && !(m & 1n)) { m >>= 1n; e++; }
  return [neg ? -m : m, e];
}
const largoBits = m => (m < 0n ? -m : m).toString(2).length;
// la suma de productos Σ a[k]·b[k], si es exacta en cualquier orden; si no, null
export function sumaExacta(pares) {
  const ps = [];
  for (const [x, y] of pares) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const [m1, e1] = exacto(x), [m2, e2] = exacto(y), m = m1 * m2;
    if (m === 0n) continue;
    if (largoBits(m) > 53) return null;          // el producto ya se redondea
    ps.push([m, e1 + e2]);
  }
  if (!ps.length) return 0;
  const L = Math.min(...ps.map(p => p[1]));
  let s = 0n, sabs = 0n;
  for (const [m, e] of ps) { const t = m << BigInt(e - L); s += t; sabs += t < 0n ? -t : t; }
  if (largoBits(sabs) > 53) return null;          // alguna suma parcial podría redondearse
  return Number(s) * 2 ** L;
}

export function operacionesDeMatrices(P, fn, prog) {
  const NUM = V.esNumero;
  const arreglo = x => esMatriz(x) || V.esVector(x);
  const forma2 = x => esMatriz(x) ? dims(x) : V.esVector(x) ? [V.largo(x), 1] : [1, 1];
  const elem2 = (x, i, j) => esMatriz(x) ? get(x, i, j) : V.esVector(x) ? V.elemento(x, i) : x;
  const recogeM = (res, f, c, conBits = false) => {
    if (!res.length) throw new NoSoportado("una matriz vacía");
    const v = P.recoge(res, conBits);
    return v.T === "BitVector" ? mat("Bool", f, c, v.a, true) : mat(v.el, f, c, v.a);
  };
  const tam = x => "(" + dims(x).join(", ") + (dims(x).length === 1 ? "," : "") + ")";
  P.esMatriz = esMatriz;

  // el punto con matrices: las formas se combinan dimensión a dimensión (las de tamaño 1 se estiran)
  P.difunde2 = (aplica, args) => {
    const acc = [1, 1];
    for (const a of args) {
      const s = forma2(a);
      for (let d = 0; d < 2; d++) {
        if (s[d] === 1) continue;
        if (acc[d] === 1) acc[d] = s[d];
        else if (acc[d] !== s[d]) throw new ErrorJulia("DimensionMismatch: arrays could not be broadcast to a common size: a has axes Base.OneTo(" + acc[d] + ") and b has axes Base.OneTo(" + s[d] + ")");
      }
    }
    const [f, c] = acc, res = [];
    for (let j = 1; j <= c; j++) for (let i = 1; i <= f; i++) res.push(aplica(args.map(a => { const s = forma2(a); return elem2(a, s[0] === 1 ? 1 : i, s[1] === 1 ? 1 : j); })));
    return recogeM(res, f, c, true);
  };
  P.difundeAsignacionM = (destino, v) => {
    const [f, c] = dims(destino), s = forma2(v);
    if ((s[0] !== 1 && s[0] !== f) || (s[1] !== 1 && s[1] !== c)) throw new ErrorJulia("DimensionMismatch: array could not be broadcast to match destination");
    for (let j = 1; j <= c; j++) for (let i = 1; i <= f; i++) set(destino, i, j, V.convierte(elem2(v, s[0] === 1 ? 1 : i, s[1] === 1 ? 1 : j), eltipoM(destino)));
  };

  // +, -, * y / con matrices
  const producto = (a, b) => {
    const da = forma2(a), db = forma2(b);
    if (da[1] !== db[0]) throw new ErrorJulia("DimensionMismatch: incompatible dimensions for matrix multiplication: tried to multiply a matrix of size (" + da.join(", ") + ") with a matrix of size (" + db.join(", ") + "). The second dimension of the first matrix: " + da[1] + ", does not match the first dimension of the second matrix: " + db[0] + ".");
    const [f, n] = da, c = db[1], res = [];
    const decimales = [a, b].some(x => V.eltipo(x) === "Float64");
    for (let j = 1; j <= c; j++) for (let i = 1; i <= f; i++) {
      if (decimales) {
        const pares = [];
        for (let k = 1; k <= n; k++) { const x = elem2(a, i, k), y = elem2(b, k, j); if (!NUM(x) || !NUM(y) || x.T === "Rational" || y.T === "Rational") throw new NoSoportado("este producto de matrices"); pares.push([V.aNum(x), V.aNum(y)]); }
        const s = sumaExacta(pares);
        if (s === null) throw new NoSoportado("este producto de matrices de decimales: Julia lo calcula con OpenBLAS, que suma en un orden que cambia de un ordenador a otro, y la última cifra del resultado depende de ese orden");
        res.push(F(s));
      } else {
        let s = P.binaria("*", elem2(a, i, 1), elem2(b, 1, j));
        for (let k = 2; k <= n; k++) s = P.binaria("+", s, P.binaria("*", elem2(a, i, k), elem2(b, k, j)));
        res.push(s);
      }
    }
    return { res, f, c };
  };
  P.aritmeticaMatrices = (op, a, b) => {
    if ((op === "+" || op === "-") && arreglo(a) && arreglo(b)) {
      if (!esMatriz(a) || !esMatriz(b)) throw new NoSoportado("sumar un vector y una matriz");
      const da = dims(a), db = dims(b);
      const d = da.findIndex((x, k) => x !== db[k]);
      if (d >= 0) throw new ErrorJulia("DimensionMismatch: a has size " + tam(a) + ", b has size " + tam(b) + ", mismatch at dim " + (d + 1));
      const [f, c] = da, res = [];
      for (let j = 1; j <= c; j++) for (let i = 1; i <= f; i++) res.push(P.binaria(op, get(a, i, j), get(b, i, j)));
      return recogeM(res, f, c);
    }
    if ((op === "*" && (NUM(a) || NUM(b))) || (op === "/" && NUM(b))) {
      const m = NUM(a) ? b : a, [f, c] = dims(m), res = [];
      for (let j = 1; j <= c; j++) for (let i = 1; i <= f; i++) res.push(NUM(a) ? P.binaria(op, a, get(m, i, j)) : P.binaria(op, get(m, i, j), b));
      return recogeM(res, f, c);
    }
    if (op === "*" && arreglo(a) && arreglo(b)) {
      // v' * w es un número; M * v es un vector; lo demás, una matriz
      if (esVista(a) && a.p.T !== "Matrix" && V.esVector(b)) { const { res } = producto(a, b); return res[0]; }
      const { res, f, c } = producto(a, b);
      if (V.esVector(b)) return P.recoge(res);
      return recogeM(res, f, c);
    }
    if (op === "^" && esMatriz(a)) throw new NoSoportado("la potencia de una matriz");
    if (op === "/" && esMatriz(b)) throw new NoSoportado("dividir entre una matriz (resolver un sistema)");
    throw errorMetodo(op, [a, b]);
  };
  P.igualesM = (a, b) => {
    if (!esMatriz(a) || !esMatriz(b)) return false;
    const da = dims(a), db = dims(b);
    if (da[0] !== db[0] || da[1] !== db[1]) return false;
    const la = lineal(a), lb = lineal(b);
    return la.every((x, k) => P.iguales(x, lb[k]));
  };

  // ── Índices ────────────────────────────────────────────────────────────
  const tipoIdx = x => esMatriz(x) && !x.vista ? tipoM(x) : tipo(x);
  const fueraM = (x, txt) => new ErrorJulia("BoundsError: attempt to access " + dims(x).join("×") + " " + tipoIdx(x) + " at index [" + txt + "]");
  // un índice → la lista de posiciones, si es un número suelto, y cómo lo escribe Julia en un BoundsError
  function lista(ind, n) {
    if (ind.T === "Int64") return { ks: [Number(ind.v)], uno: true, txt: repr(ind) };
    if (ind.T === "Colon") return { ks: Array.from({ length: n }, (_, k) => k + 1), uno: false, txt: "1:" + n };
    if (V.esRango(ind) && ind.T !== "FloatRange") return { ks: V.elementos(ind).map(e => Number(e.v)), uno: false, txt: repr(ind) };
    if (V.esVector(ind) && V.eltipo(ind) === "Bool") { const els = V.elementos(ind); return { ks: els.map((e, k) => e.v ? k + 1 : 0).filter(Boolean), uno: false, txt: repr(ind), mascara: els.length }; }
    if (V.esVector(ind) && V.elementos(ind).every(e => e.T === "Int64")) return { ks: V.elementos(ind).map(e => Number(e.v)), uno: false, txt: repr(ind) };
    throw new ErrorJulia("ArgumentError: invalid index: " + repr(ind) + " of type " + tipo(ind));
  }
  const vectorDe = (x, els) => esMatriz(x) && x.bit ? V.bitvec(els) : V.vec(eltipoM(x), els);
  P.indexaLineal = (x, ind) => {
    const l = lineal(x), n = l.length;
    if (ind.T === "Colon") return vectorDe(x, [...l]);
    if (esMatriz(ind) && eltipoM(ind) === "Bool") {
      const m = lineal(ind); if (m.length !== n) throw fueraM(x, forma(ind) + " " + tipo(ind));
      return vectorDe(x, l.filter((_, k) => m[k].v));
    }
    const { ks, uno, txt } = lista(ind, n);
    if (ks.some(k => k < 1 || k > n)) throw fueraM(x, txt);
    return uno ? l[ks[0] - 1] : vectorDe(x, ks.map(k => l[k - 1]));
  };
  P.indexa2 = (x, i, j) => {
    if (!esMatriz(x)) throw new NoSoportado("dos índices en un " + tipo(x));
    const [f, c] = dims(x), li = lista(i, f), lj = lista(j, c);
    if ((li.mascara && li.mascara !== f) || (lj.mascara && lj.mascara !== c) || li.ks.some(k => k < 1 || k > f) || lj.ks.some(k => k < 1 || k > c)) throw fueraM(x, li.txt + ", " + lj.txt);
    if (li.uno && lj.uno) return get(x, li.ks[0], lj.ks[0]);
    if (li.uno) return vectorDe(x, lj.ks.map(k => get(x, li.ks[0], k)));
    if (lj.uno) return vectorDe(x, li.ks.map(k => get(x, k, lj.ks[0])));
    const res = [];
    for (const b of lj.ks) for (const a of li.ks) res.push(get(x, a, b));
    return x.bit ? mat("Bool", li.ks.length, lj.ks.length, res, true) : mat(eltipoM(x), li.ks.length, lj.ks.length, res);
  };
  const MUCHOS = "ArgumentError: indexed assignment with a single value to possibly many locations is not supported; perhaps use broadcasting `.=` instead?";
  const aEl = (x, v) => x.bit ? (v.T === "Bool" ? v : V.convierte(v, "Bool")) : V.convierte(v, eltipoM(x));
  // poner valores en las casillas (i, j) de las listas; v es un número o un arreglo con tantos valores
  function pon(x, celdas, v, punto, destino) {
    if (celdas.length === 1 && !punto && !arreglo(v)) { const [a, b] = celdas[0]; set(x, a, b, aEl(x, v)); return; }
    if (!arreglo(v)) { if (!punto) throw new ErrorJulia(MUCHOS); for (const [a, b] of celdas) set(x, a, b, aEl(x, v)); return; }
    const vs = esMatriz(v) ? lineal(v) : V.elementos(v);
    if (vs.length === 1 && punto) { for (const [a, b] of celdas) set(x, a, b, aEl(x, vs[0])); return; }
    if (vs.length !== celdas.length) throw new ErrorJulia("DimensionMismatch: tried to assign " + (esMatriz(v) ? dims(v).join("×") + " array" : vs.length + "-element array") + " to " + destino + " destination");
    celdas.forEach(([a, b], k) => set(x, a, b, aEl(x, vs[k])));
  }
  P.ponIndice2 = (x, i, j, v, punto = false) => {
    if (!esMatriz(x)) throw new NoSoportado("dos índices en un " + tipo(x));
    const [f, c] = dims(x), li = lista(i, f), lj = lista(j, c);
    if (li.ks.some(k => k < 1 || k > f) || lj.ks.some(k => k < 1 || k > c)) throw fueraM(x, li.txt + ", " + lj.txt);
    const celdas = [];
    for (const b of lj.ks) for (const a of li.ks) celdas.push([a, b]);
    pon(x, celdas, v, punto, li.ks.length + "×" + lj.ks.length);
  };
  P.ponLineal = (x, ind, v, punto = false) => {
    const [f] = dims(x), n = dims(x)[0] * dims(x)[1];
    let ks, txt;
    if (esMatriz(ind) && eltipoM(ind) === "Bool") {          // A[A .> 0] .= 3: la máscara, por columnas
      const m = lineal(ind); if (m.length !== n) throw fueraM(x, forma(ind) + " " + tipo(ind));
      ks = m.map((e, k) => e.v ? k + 1 : 0).filter(Boolean); txt = "";
    } else ({ ks, txt } = lista(ind, n));
    if (ks.some(k => k < 1 || k > n)) throw fueraM(x, txt);
    pon(x, ks.map(k => [((k - 1) % f) + 1, Math.floor((k - 1) / f) + 1]), v, punto, ks.length + "-element");
  };

  // ── Construir y transformar ─────────────────────────────────────────────
  // [a b; c d], [1; 2; 3], [v w], [A; B]: filas de elementos (números o arreglos)
  P.matrizLiteral = filas => {
    const todosEscalares = filas.every(fila => fila.every(x => !arreglo(x)));
    if (todosEscalares) {
      if (filas.every(f => f.length === 1)) return P.vectorLiteral(filas.map(f => f[0]));
      const c = filas[0].length;
      if (filas.some(f => f.length !== c)) throw new ErrorJulia("ArgumentError: argument count does not match specified shape (expected " + filas.length * c + ", got " + filas.reduce((s, f) => s + f.length, 0) + ")");
      const v = P.vectorLiteral(filas.flat());          // la promoción de tipos, como en un vector
      const r = [];
      for (let j = 0; j < c; j++) for (let i = 0; i < filas.length; i++) r.push(v.a[i * c + j]);
      return mat(v.el, filas.length, c, r);
    }
    const bloques = filas.map(f => f.length === 1 ? f[0] : fn.hcat(f));
    return bloques.length === 1 ? bloques[0] : fn.vcat(bloques);
  };
  const comoMatriz = x => esMatriz(x) ? x : V.esVector(x) ? mat(V.eltipo(x), V.largo(x), 1, V.elementos(x)) : mat(x.T === "Rational" ? "Rational{Int64}" : x.T, 1, 1, [x]);
  const unir = (xs, porFilas) => {
    const ms = xs.map(comoMatriz);
    const k = porFilas ? 1 : 0;                       // vcat junta filas: las columnas deben coincidir
    const otra = dims(ms[0])[k];
    if (ms.some(m => dims(m)[k] !== otra)) throw new ErrorJulia(porFilas ? "DimensionMismatch: number of columns of each array must match (got (" + ms.map(m => dims(m)[1]).join(", ") + "))" : "DimensionMismatch: number of rows of each array must match (got (" + ms.map(m => dims(m)[0]).join(", ") + "))");
    const els = ms.flatMap(lineal), el = V.promueve(els.map(e => e.T === "Rational" ? "Rational{Int64}" : e.T));
    if (porFilas) {
      const c = otra, f = ms.reduce((s, m) => s + dims(m)[0], 0), r = [];
      for (let j = 1; j <= c; j++) for (const m of ms) for (let i = 1; i <= dims(m)[0]; i++) r.push(V.convierte(get(m, i, j), el));
      return mat(el, f, c, r);
    }
    const f = otra, r = [];
    for (const m of ms) r.push(...lineal(m).map(e => V.convierte(e, el)));
    return mat(el, f, r.length / f, r);
  };
  fn.hcat = args => unir(args, false);
  fn.vcat = args => {
    if (args.every(x => !esMatriz(x))) {             // vcat de vectores y números: un vector
      const els = args.flatMap(x => V.esVector(x) ? V.elementos(x) : [x]);
      return P.vectorLiteral(els);
    }
    return unir(args, true);
  };
  const enteros = xs => xs.map(x => { if (x.T !== "Int64") throw errorMetodo("zeros", xs); return Number(x.v); });
  P.rellenaM = (el, valor, f, c) => mat(el, f, c, Array.from({ length: f * c }, () => valor));
  fn.size = args => {
    const [x, d] = args;
    const ds = esMatriz(x) ? dims(x) : V.esVector(x) ? [V.largo(x)] : null;
    if (!ds) throw errorMetodo("size", args);
    if (d) { const k = Number(d.v); if (k < 1) throw new ErrorJulia("ArgumentError: dimension out of range"); return I(ds[k - 1] ?? 1); }
    return { T: "Tuple", a: ds.map(n => I(n)) };
  };
  fn.ndims = ([x]) => I(esMatriz(x) ? 2 : V.esVector(x) ? 1 : 0);
  fn.vec = ([x]) => {
    if (V.esVector(x)) return x;
    if (!esMatriz(x)) throw errorMetodo("vec", [x]);
    if (x.vista) throw new NoSoportado("vec de una vista (A')");
    return x.bit ? V.bitvec(x.a) : V.vec(x.el, x.a);          // comparte las casillas con la matriz
  };
  fn.reshape = args => {
    let [x, ...ds] = args;
    if (ds.length === 1 && ds[0].T === "Tuple") ds = ds[0].a;
    if (ds.length !== 2) throw new NoSoportado("reshape a " + ds.length + " dimensiones");
    const [f, c] = enteros(ds);
    if (V.esRango(x)) throw new NoSoportado("reshape de un rango (Julia da un ReshapedArray): usa reshape(collect(…), …)");
    if (esMatriz(x) && x.vista) throw new NoSoportado("reshape de una vista (A')");
    if (!V.esVector(x) && !esMatriz(x)) throw errorMetodo("reshape", args);
    const n = esMatriz(x) ? x.a.length : x.a.length;
    if (f * c !== n) throw new ErrorJulia("DimensionMismatch: new dimensions (" + f + ", " + c + ") must be consistent with array length " + n);
    return x.T === "BitVector" || x.bit ? mat("Bool", f, c, x.a, true) : mat(esMatriz(x) ? x.el : x.el, f, c, x.a);
  };
  fn.permutedims = ([x]) => {
    if (V.esVector(x)) return mat(V.eltipo(x), 1, V.largo(x), [...V.elementos(x)]);
    if (!esMatriz(x)) throw errorMetodo("permutedims", [x]);
    const [f, c] = dims(x), r = [];
    for (let i = 1; i <= f; i++) for (let j = 1; j <= c; j++) r.push(get(x, i, j));
    return x.bit ? mat("Bool", c, f, r, true) : mat(eltipoM(x), c, f, r);
  };
  P.vista = (que, x) => {
    if (NUM(x)) return x;
    if (esMatriz(x) && x.vista === que) return x.p;                  // (A')' es A
    if (esMatriz(x) && x.vista) throw new NoSoportado("la vista de una vista");
    if (esMatriz(x) || (V.esVector(x) && !V.esRango(x))) return vistaDe(que, x);
    if (V.esRango(x)) throw new NoSoportado("la traspuesta de un rango");
    throw errorMetodo(que, [x]);
  };
  fn.transpose = ([x]) => P.vista("transpose", x);
  fn.adjoint = ([x]) => P.vista("adjoint", x);
  // sum(A; dims = 1): una fila con lo de cada columna; dims = 2: una columna con lo de cada fila
  P.reduceDims = (nombre, x, d, base) => {
    const [f, c] = dims(x), k = Number(d.v);
    if (k === 1) return recogeM(Array.from({ length: c }, (_, j) => base([V.vec(eltipoM(x), Array.from({ length: f }, (_, i) => get(x, i + 1, j + 1)))])), 1, c);
    if (k === 2) return recogeM(Array.from({ length: f }, (_, i) => base([V.vec(eltipoM(x), Array.from({ length: c }, (_, j) => get(x, i + 1, j + 1)))])), f, 1);
    throw new NoSoportado(nombre + " con dims = " + k);
  };
}
