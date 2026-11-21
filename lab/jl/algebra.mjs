// Álgebra lineal (capítulo 11): A \ b, det, inv, dot, norm, I y las fracciones exactas.
//
// Julia resuelve un sistema de decimales con LAPACK (OpenBLAS): factoriza A = P·L·U con pivote parcial y
// despeja. Como en el producto de matrices, el orden de las sumas cambia de un ordenador a otro, así que
// la última cifra puede cambiar. El laboratorio solo da el resultado de decimales cuando todas las
// operaciones son exactas en cualquier orden: cada suma de productos cumple el criterio de sumaExacta,
// y cada pivote (el número entre el que se divide) es una potencia de dos, así que dividir y multiplicar
// por su inverso dan lo mismo. Con fracciones (Rational) no hay redondeo: el laboratorio repite el
// algoritmo de Julia (generic_lufact!, el pivote más grande, el primero si hay empate) y comprueba que
// los números no crecen tanto como para que Julia pudiera dar un OverflowError.
import * as V from "./valores.mjs";
import { ErrorJulia, NoSoportado, F, I, B, errorMetodo } from "./valores.mjs";
import * as MX from "./matrices.mjs";

const SINGULAR = k => new ErrorJulia("SingularException: matrix is singular; factorization failed. Zero pivot found at index " + k);
const NO_DECIMALES = que => new NoSoportado(que + " con decimales: Julia lo calcula con LAPACK, que suma en un orden que cambia de un ordenador a otro, y la última cifra del resultado depende de ese orden. " +
  "El laboratorio solo lo da cuando todas las cuentas son exactas. Prueba a escribir la matriz con fracciones (por ejemplo, [2//1 1; 4 3]): así el resultado es exacto y el laboratorio lo calcula igual que Julia");
const GRANDES = () => new NoSoportado("estas fracciones: sus numeradores y denominadores crecen tanto que Julia podría dar un OverflowError, y el laboratorio no lo comprueba");

// ── Decimales: sumas exactas con el signo del cero ─────────────────────────
// x = base − Σ a·b. Si el resultado es exacto en cualquier orden, lo da; si no, null. Un cero exacto
// que sale de restar números distintos de cero es +0.0. Si todos los términos son cero, el signo del
// cero depende de cómo se sume (la BLAS de referencia se salta los productos por cero): solo se da
// cuando cualquier forma de sumar da el mismo.
const neg0 = x => x === 0 && Object.is(x, -0);
function resta(base, pares) {
  const s = MX.sumaExacta([[base, 1], ...pares.map(([a, b]) => [-a, b])]);
  if (s === null) return null;
  if (s !== 0) return s;
  if (base !== 0 || pares.some(([a, b]) => a * b !== 0)) return 0;
  if (!neg0(base)) return 0;                                    // +0 más ceros es +0
  return pares.every(([a, b]) => !neg0(a * b)) ? -0 : null;    // −0 − (+0)… es −0; con un −0 en medio, depende
}
function suma(pares) {                            // Σ a·b (el producto de una matriz triangular por un vector)
  const s = MX.sumaExacta(pares);
  if (s === null) return null;
  if (s !== 0 || pares.some(([a, b]) => a * b !== 0)) return s;
  return pares.every(([a, b]) => !neg0(a) && !neg0(b) && !neg0(a * b)) ? 0 : null;
}
const pot2 = x => { if (!Number.isFinite(x) || x === 0) return false; const [m] = MX.exacto(x); return m === 1n || m === -1n; };
const divide = (x, p) => { const q = x / p; return q * p === x || x === 0 ? q : null; };

// L·U = P·A con pivote parcial. Si dos filas empatan, prueba las dos (LAPACK elige la primera, pero así no
// depende de ello). Devuelve la lista de factorizaciones (todas exactas) o null.
function luDecimal(A, n) {
  const res = [];
  const paso = (k, perm, L, U) => {
    if (res.length > 64) throw new NoSoportado("esta factorización (demasiados empates entre filas)");
    if (k === n) { res.push({ perm, L, U, info: 0 }); return true; }
    const c = [];
    for (let i = k; i < n; i++) {
      const s = resta(A[perm[i]][k], Array.from({ length: k }, (_, t) => [L[i][t], U[t][k]]));
      if (s === null) return false;
      c[i] = s;
    }
    let m = 0;
    for (let i = k; i < n; i++) m = Math.max(m, Math.abs(c[i]));
    if (m === 0) { res.push({ perm, L, U, info: k + 1 }); return true; }
    for (let q = k; q < n; q++) {
      if (Math.abs(c[q]) !== m) continue;
      const p2 = perm.slice(), L2 = L.map(r => r.slice()), U2 = U.map(r => r.slice()), c2 = c.slice();
      [p2[k], p2[q]] = [p2[q], p2[k]]; [L2[k], L2[q]] = [L2[q], L2[k]]; [c2[k], c2[q]] = [c2[q], c2[k]];
      const piv = c2[k];
      if (!pot2(piv)) return false;
      U2[k][k] = piv;
      for (let i = k + 1; i < n; i++) { const l = divide(c2[i], piv); if (l === null) return false; L2[i][k] = l; }
      for (let j = k + 1; j < n; j++) {
        const s = resta(A[p2[k]][j], Array.from({ length: k }, (_, t) => [L2[k][t], U2[t][j]]));
        if (s === null) return false;
        U2[k][j] = s;
      }
      if (!paso(k + 1, p2, L2, U2)) return false;
    }
    return true;
  };
  const vacia = () => Array.from({ length: n }, () => new Array(n).fill(0));
  return paso(0, Array.from({ length: n }, (_, i) => i), vacia(), vacia()) ? res : null;
}
// despejar con L (diagonal de unos) y U, o con una matriz triangular
function adelante(L, b, n, unos) {
  const y = [];
  for (let i = 0; i < n; i++) {
    let s = resta(b[i], Array.from({ length: i }, (_, t) => [L[i][t], y[t]]));
    if (s === null) return null;
    if (!unos) { if (!pot2(L[i][i])) return null; s = divide(s, L[i][i]); if (s === null) return null; }
    y.push(s);
  }
  return y;
}
function atras(U, y, n) {
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    const pares = [];
    for (let j = i + 1; j < n; j++) pares.push([U[i][j], x[j]]);
    const s = resta(y[i], pares);
    if (s === null || !pot2(U[i][i])) return null;
    const q = divide(s, U[i][i]);
    if (q === null) return null;
    x[i] = q;
  }
  return x;
}
const iguales = (r, s) => r.length === s.length && r.every((x, i) => Object.is(x, s[i]));

// ── Fracciones: cuentas exactas que no se salen de Int64 ───────────────────
// Julia comprueba el desbordamiento en cada operación con fracciones. Si todos los numeradores y
// denominadores que aparecen (en cualquier orden de suma) caben en 31 bits, sus productos caben en 63:
// Julia no puede desbordarse y el resultado es el exacto.
const LIM = 1n << 31n;
const abs = x => x < 0n ? -x : x;
const mcd = (a, b) => { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; };
const mcm = (a, b) => a / mcd(a, b) * b;
const R = (n, d = 1n) => V.rac(n, d);
const cabe = x => abs(x.n) <= LIM && x.d <= LIM;
const mulR = (x, y) => { if (!cabe(x) || !cabe(y)) throw GRANDES(); return R(x.n * y.n, x.d * y.d); };
const divR = (x, y) => { if (!cabe(x) || !cabe(y)) throw GRANDES(); return R(x.n * y.d, x.d * y.n); };
// base − Σ a·b, con la cota para cualquier orden de suma
function restaR(base, pares) {
  const ts = [base, ...pares.map(([a, b]) => mulR(a, b))];
  if (!cabe(base)) throw GRANDES();
  let D = 1n;
  for (const t of ts) D = mcm(D, t.d);
  let S = 0n, s = 0n;
  ts.forEach((t, k) => { const v = t.n * (D / t.d); S += abs(v); s += k ? -v : v; });
  if (D > LIM || S > LIM) throw GRANDES();
  return R(s, D);
}
const ceroR = x => x.n === 0n;
// generic_lufact! de Julia con pivote parcial (el primer máximo)
function luFraccion(A, n) {
  const perm = Array.from({ length: n }, (_, i) => i);
  const L = Array.from({ length: n }, () => new Array(n).fill(R(0n)));
  const U = Array.from({ length: n }, () => new Array(n).fill(R(0n)));
  for (let k = 0; k < n; k++) {
    const c = [];
    for (let i = k; i < n; i++) c[i] = restaR(A[perm[i]][k], Array.from({ length: k }, (_, t) => [L[i][t], U[t][k]]));
    let q = k;
    for (let i = k + 1; i < n; i++) if (abs(c[i].n) * c[q].d > abs(c[q].n) * c[i].d) q = i;
    if (ceroR(c[q])) return { perm, L, U, info: k + 1 };
    [perm[k], perm[q]] = [perm[q], perm[k]]; [L[k], L[q]] = [L[q], L[k]]; [c[k], c[q]] = [c[q], c[k]];
    U[k][k] = c[k];
    const inv = divR(R(1n), c[k]);
    for (let i = k + 1; i < n; i++) L[i][k] = mulR(c[i], inv);
    for (let j = k + 1; j < n; j++) U[k][j] = restaR(A[perm[k]][j], Array.from({ length: k }, (_, t) => [L[k][t], U[t][j]]));
  }
  return { perm, L, U, info: 0 };
}
function adelanteR(L, b, n, unos) {
  const y = [];
  for (let i = 0; i < n; i++) {
    let s = restaR(b[i], Array.from({ length: i }, (_, t) => [L[i][t], y[t]]));
    if (!unos) s = divR(s, L[i][i]);
    y.push(s);
  }
  return y;
}
function atrasR(U, y, n) {
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    const pares = [];
    for (let j = i + 1; j < n; j++) pares.push([U[i][j], x[j]]);
    x[i] = divR(restaR(y[i], pares), U[i][i]);
  }
  return x;
}

export function algebraLineal(P, fn) {
  const NUM = V.esNumero;
  const esU = x => x && x.T === "Uniforme";
  const fracc = el => el === "Rational{Int64}";
  // una matriz cuadrada (sin vistas) como tabla de números, por filas: A[i][j]
  const cuadrada = (A, que) => {
    if (!MX.esMatriz(A)) return null;
    if (A.vista) throw new NoSoportado(que + " con una matriz traspuesta (A')");
    const [f, c] = MX.dims(A);
    if (f !== c) return null;
    return f;
  };
  const tabla = (A, n, conv) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => conv(MX.get(A, i + 1, j + 1))));
  const aDecimal = x => {
    if (x.T === "Float64") return x.v;
    if (x.T === "Int64") { if (x.v > 2n ** 53n || x.v < -(2n ** 53n)) throw new NoSoportado("enteros tan grandes en un sistema"); return Number(x.v); }
    if (x.T === "Bool") return x.v ? 1 : 0;
    if (x.T === "Rational") { if (abs(x.n) > 2n ** 53n || x.d > 2n ** 53n) throw new NoSoportado("fracciones tan grandes"); return Number(x.n) / Number(x.d); }
    throw new NoSoportado("un sistema con " + V.tipo(x));
  };
  const aFraccion = x => {
    if (x.T === "Rational") return x;
    if (x.T === "Int64") return R(x.v);
    if (x.T === "Bool") return R(x.v ? 1n : 0n);
    throw new NoSoportado("mezclar fracciones con " + V.tipo(x) + " en un sistema");
  };
  const tipoNum = el => ["Int64", "Float64", "Bool", "Rational{Int64}"].includes(el);
  const triangular = (A, n) => {
    let sup = true, inf = true;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i > j && !esCero(A[i][j])) sup = false;
      if (i < j && !esCero(A[i][j])) inf = false;
    }
    return { sup, inf };
  };
  const esCero = x => typeof x === "number" ? x === 0 : x.n === 0n;

  // ── A \ b ──────────────────────────────────────────────────────────────
  P.barra = (A, b) => {
    if (NUM(A) && NUM(b)) return P.binaria("/", b, A);
    if (NUM(A) && (V.esVector(b) || MX.esMatriz(b))) return P.difunde("\\", [A, b]);
    if (V.esVector(A)) throw new NoSoportado("dividir entre un vector (la pseudoinversa)");
    if (!MX.esMatriz(A)) throw errorMetodo("\\", [A, b]);
    const n = cuadrada(A, "resolver un sistema");
    if (n === null) throw new NoSoportado("un sistema con más ecuaciones que incógnitas (o menos): Julia lo resuelve por mínimos cuadrados, con la factorización QR");
    if (!(V.esVector(b) || MX.esMatriz(b))) throw errorMetodo("\\", [A, b]);
    if (MX.esMatriz(b) && b.vista) throw new NoSoportado("resolver con una matriz traspuesta");
    const elA = MX.eltipoM(A), elb = V.eltipo(b);
    if (!tipoNum(elA) || !tipoNum(elb)) throw new NoSoportado("un sistema con " + MX.tipoM(A));
    const [fb, cb] = V.esVector(b) ? [V.largo(b), 1] : MX.dims(b);
    const columna = j => V.esVector(b) ? V.elementos(b) : Array.from({ length: fb }, (_, i) => MX.get(b, i + 1, j + 1));
    const fraccion = fracc(elA);
    if (fraccion && elb === "Float64") throw new NoSoportado("un sistema de fracciones con decimales en b");
    const T = tabla(A, n, fraccion ? aFraccion : aDecimal);
    const { sup, inf } = triangular(T, n);
    if (fb !== n) {
      if (sup && inf) throw new ErrorJulia("DimensionMismatch: arrays could not be broadcast to a common size: a has axes Base.OneTo(" + n + ") and b has axes Base.OneTo(" + fb + ")");
      if (sup || inf) throw new ErrorJulia("DimensionMismatch: B has first dimension " + fb + " but needs " + n);
      throw new ErrorJulia("DimensionMismatch: arguments must have the same number of rows");
    }
    const sols = [];
    for (let j = 0; j < cb; j++) {
      const bj = columna(j).map(fraccion ? aFraccion : aDecimal);
      sols.push(fraccion ? resuelveFraccion(T, bj, n, sup, inf) : resuelveDecimal(T, bj, n, sup, inf));
    }
    const els = sols.flat().map(x => fraccion ? x : F(x));
    const el = fraccion ? "Rational{Int64}" : "Float64";
    return V.esVector(b) ? V.vec(el, els) : MX.mat(el, n, cb, els);
  };
  function resuelveDecimal(A, b, n, sup, inf) {
    if (sup && inf) {                       // Diagonal(A) \ b: una división en cada casilla
      for (let i = 0; i < n; i++) if (A[i][i] === 0) throw SINGULAR(i + 1);
      return b.map((x, i) => x / A[i][i]);
    }
    if (sup || inf) {
      for (let i = 0; i < n; i++) if (A[i][i] === 0) throw SINGULAR(i + 1);
      const x = inf ? adelante(A, b, n, false) : atras(A, b, n);
      if (x === null) throw NO_DECIMALES("resolver este sistema");
      return x;
    }
    const fs = luDecimal(A, n);
    if (fs === null) throw NO_DECIMALES("resolver este sistema");
    if (fs[0].info) throw SINGULAR(fs[0].info);
    let r = null;
    for (const { perm, L, U } of fs) {
      const y = adelante(L, perm.map(i => b[i]), n, true), x = y && atras(U, y, n);
      if (x === null || (r && !iguales(r, x))) throw NO_DECIMALES("resolver este sistema");
      r = x;
    }
    return r;
  }
  function resuelveFraccion(A, b, n, sup, inf) {
    if (sup || inf) {
      for (let i = 0; i < n; i++) if (ceroR(A[i][i])) throw SINGULAR(i + 1);
      if (sup && inf) return b.map((x, i) => divR(x, A[i][i]));
      return inf ? adelanteR(A, b, n, false) : atrasR(A, b, n);
    }
    const { perm, L, U, info } = luFraccion(A, n);
    if (info) throw SINGULAR(info);
    return atrasR(U, adelanteR(L, perm.map(i => b[i]), n, true), n);
  }

  // ── det ────────────────────────────────────────────────────────────────
  const det = ([A]) => {
    if (NUM(A)) return A;
    const n = cuadrada(A, "det");
    if (!MX.esMatriz(A)) throw errorMetodo("det", [A]);
    if (n === null) throw new ErrorJulia("DimensionMismatch: matrix is not square: dimensions are (" + MX.dims(A).join(", ") + ")");
    const elA = MX.eltipoM(A);
    if (!tipoNum(elA)) throw new NoSoportado("det de una " + MX.tipoM(A));
    if (fracc(elA)) {
      const T = tabla(A, n, aFraccion), { sup, inf } = triangular(T, n);
      let p = R(1n);
      if (sup || inf) { for (let i = 0; i < n; i++) p = mulR(p, T[i][i]); return p; }
      const { U, perm, info } = luFraccion(T, n);
      if (info) return R(0n);
      for (let i = 0; i < n; i++) p = mulR(p, U[i][i]);
      return mulR(p, R(intercambios(perm) % 2 ? -1n : 1n));
    }
    const T = tabla(A, n, aDecimal), { sup, inf } = triangular(T, n);
    if (sup || inf) { let p = 1; for (let i = 0; i < n; i++) p *= T[i][i]; return F(p); }
    const fs = luDecimal(T, n);
    if (fs === null) throw NO_DECIMALES("el determinante");
    if (fs[0].info) return F(0);
    let r = null;
    for (const f of fs) {
      let p = 1;
      for (let i = 0; i < n; i++) p *= f.U[i][i];
      const d = p * (intercambios(f.perm) % 2 ? -1 : 1);
      if (r !== null && !Object.is(r, d)) throw NO_DECIMALES("el determinante");
      r = d;
    }
    return F(r);
  };
  // LAPACK guarda en ipiv[k] la fila que sube a la posición k; det cuenta los k con ipiv[k] ≠ k. Con la
  // permutación final se reconstruyen esos intercambios uno a uno.
  function intercambios(perm) {
    const n = perm.length, cur = Array.from({ length: n }, (_, i) => i);
    let c = 0;
    for (let k = 0; k < n; k++) {
      const q = cur.indexOf(perm[k]);
      if (q !== k) { [cur[k], cur[q]] = [cur[q], cur[k]]; c++; }
    }
    return c;
  }

  // ── inv ────────────────────────────────────────────────────────────────
  // inv de decimales: LAPACK getri, como en la LAPACK de referencia (trti2 y el bucle de getri), con cada
  // operación exacta en cualquier orden; si no, NoSoportado
  function invDecimal(A, n) {
    const { sup, inf } = triangular(A, n);
    if (sup && inf) {                       // inv de una Diagonal: un cero en la diagonal es SingularException
      for (let i = 0; i < n; i++) if (A[i][i] === 0) throw SINGULAR(i + 1);
      return A.map((r, i) => r.map((x, j) => i === j ? 1 / x : 0));
    }
    if (inf) throw NO_DECIMALES("la inversa de esta matriz");
    let fs;
    if (sup) fs = [{ perm: Array.from({ length: n }, (_, i) => i), U: A, L: null, info: 0 }];
    else {
      fs = luDecimal(A, n);
      if (fs === null) throw NO_DECIMALES("la inversa de esta matriz");
      if (fs[0].info) throw SINGULAR(fs[0].info);
    }
    let r = null;
    for (const { perm, L, U } of fs) {
      const X = trtri(U, n);
      if (X === null) throw NO_DECIMALES("la inversa de esta matriz");
      if (L) {
        // getri: de la última columna a la primera, X(:,j) -= X(:,j+1:n) · L(j+1:n, j)
        for (let j = n - 1; j >= 0; j--) {
          const w = [];
          for (let i = j + 1; i < n; i++) { w[i] = L[i][j]; X[i][j] = 0; }
          for (let i = 0; i < n; i++) {
            const pares = [];
            for (let k = j + 1; k < n; k++) pares.push([X[i][k], w[k]]);
            const s = pares.length ? resta(X[i][j], pares) : X[i][j];
            if (s === null) throw NO_DECIMALES("la inversa de esta matriz");
            X[i][j] = s;
          }
        }
        // los intercambios de columnas, del último al primero
        const ipiv = pivotes(perm);
        for (let j = n - 2; j >= 0; j--) if (ipiv[j] !== j) for (let i = 0; i < n; i++) [X[i][j], X[i][ipiv[j]]] = [X[i][ipiv[j]], X[i][j]];
      }
      if (!L) for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) X[i][j] = 0;      // triu!: debajo de la diagonal, +0.0
      const plano = X.flat();
      if (r && !iguales(r, plano)) throw NO_DECIMALES("la inversa de esta matriz");
      r = plano;
    }
    return Array.from({ length: n }, (_, i) => r.slice(i * n, i * n + n));
  }
  function pivotes(perm) {           // el ipiv de LAPACK a partir de la permutación final
    const n = perm.length, cur = Array.from({ length: n }, (_, i) => i), ip = [];
    for (let k = 0; k < n; k++) { const q = cur.indexOf(perm[k]); ip.push(q); [cur[k], cur[q]] = [cur[q], cur[k]]; }
    return ip;
  }
  // la inversa de U (trti2): columna a columna, x = T·U(1:j-1, j) y después x·(−1/U(j,j))
  function trtri(U, n) {
    const X = U.map(r => r.slice());
    for (let j = 0; j < n; j++) {
      if (!pot2(X[j][j])) return null;
      X[j][j] = 1 / X[j][j];
      const ajj = -X[j][j], col = [];
      for (let i = 0; i < j; i++) {
        const pares = [];
        for (let k = i; k < j; k++) pares.push([X[i][k], U[k][j]]);
        const s = suma(pares);
        if (s === null) return null;
        col[i] = s * ajj;
      }
      for (let i = 0; i < j; i++) X[i][j] = col[i];
    }
    return X;
  }
  function invFraccion(A, n) {
    const { sup, inf } = triangular(A, n);
    const ident = Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, i) => R(i === j ? 1n : 0n)));
    let cols;
    if (sup && inf) {
      for (let i = 0; i < n; i++) if (ceroR(A[i][i])) throw SINGULAR(i + 1);
      return A.map((r, i) => r.map((x, j) => i === j ? divR(R(1n), x) : R(0n)));
    }
    if (sup || inf) {
      for (let i = 0; i < n; i++) if (ceroR(A[i][i])) throw SINGULAR(i + 1);
      cols = ident.map(e => inf ? adelanteR(A, e, n, false) : atrasR(A, e, n));
    } else {
      const { perm, L, U, info } = luFraccion(A, n);
      if (info) throw SINGULAR(info);
      cols = ident.map(e => atrasR(U, adelanteR(L, perm.map(i => e[i]), n, true), n));
    }
    return Array.from({ length: n }, (_, i) => cols.map(c => c[i]));
  }
  const inv = ([A]) => {
    if (esU(A)) return { T: "Uniforme", l: P.funcion("inv").f([A.l], new Map()) };
    if (NUM(A)) return viejoInv ? viejoInv([A], new Map()) : P.binaria("/", I(1), A);
    if (!MX.esMatriz(A)) throw errorMetodo("inv", [A]);
    const n = cuadrada(A, "inv");
    if (n === null) throw new ErrorJulia("DimensionMismatch: matrix is not square: dimensions are (" + MX.dims(A).join(", ") + ")");
    const elA = MX.eltipoM(A);
    if (!tipoNum(elA)) throw new NoSoportado("inv de una " + MX.tipoM(A));
    if (fracc(elA)) { const X = invFraccion(tabla(A, n, aFraccion), n); return MX.mat("Rational{Int64}", n, n, X[0].map((_, j) => X.map(r => r[j])).flat()); }
    const X = invDecimal(tabla(A, n, aDecimal), n);
    return MX.mat("Float64", n, n, X[0].map((_, j) => X.map(r => F(r[j]))).flat());
  };
  const viejoInv = fn.inv;
  fn.inv = inv;

  // ── dot, norm, cross, normalize, tr ────────────────────────────────────
  const elems = (x, que) => {
    if (V.esVector(x)) return V.elementos(x);
    if (MX.esMatriz(x)) return MX.lineal(x);
    throw errorMetodo(que, [x]);
  };
  const dot = ([x, y]) => {
    if (NUM(x) && NUM(y)) return P.binaria("*", x, y);
    const a = elems(x, "dot"), b = elems(y, "dot");
    if (a.length !== b.length) throw new ErrorJulia("DimensionMismatch: first array has length " + a.length + " which does not match the length of the second, " + b.length + ".");
    if (!a.every(NUM) || !b.every(NUM)) throw new NoSoportado("dot con " + V.tipo(x));
    // dos vectores de Float64: BLAS.dot, que suma en el orden que le conviene
    if (x.T === "Vector" && y.T === "Vector" && x.el === "Float64" && y.el === "Float64") {
      const s = MX.sumaExacta(a.map((e, i) => [e.v, b[i].v]));
      if (s === null) throw new NoSoportado("este producto escalar de decimales: Julia lo calcula con BLAS, que suma en un orden que cambia de un ordenador a otro, y la última cifra depende de ese orden");
      return F(s);
    }
    if (!a.length) { const ts = [V.eltipo(x), V.eltipo(y)]; return ts.includes("Float64") ? F(0) : ts.includes("Rational{Int64}") ? R(0n) : I(0); }
    let s = P.binaria("*", P.binaria("*", a[0], b[0]), I(0));       // zero(dot(x1, y1))
    for (let i = 0; i < a.length; i++) s = P.binaria("+", s, P.binaria("*", a[i], b[i]));
    return s;
  };
  // norm: generic_norm2 de Julia (para menos de 32 decimales; con más, BLAS.nrm2)
  const norm = ([x, p]) => {
    if (NUM(x)) return F(Math.abs(aDecimal(x)));
    const a = elems(x, "norm");
    if (!a.every(e => NUM(e))) throw new NoSoportado("norm con " + V.tipo(x));
    const aF = e => aDecimal(e);
    const q = p ? (p.T === "Float64" && p.v === Infinity ? Infinity : V.aNum(p)) : 2;
    if (!a.length) return F(0);
    const maxabs = Math.max(...a.map(e => Math.abs(aF(e))));
    if (q === Infinity) return F(maxabs);
    if (q === 1) { let s = Math.abs(aF(a[0])); for (let i = 1; i < a.length; i++) s += Math.abs(aF(a[i])); return F(s); }
    if (q !== 2) throw new NoSoportado("norm con p = " + V.repr(p));
    if (maxabs === 0 || !Number.isFinite(maxabs)) return F(maxabs);
    if (a.every(e => e.T === "Float64") && a.length >= 32) throw new NoSoportado("la norma de 32 decimales o más: Julia la calcula con BLAS.nrm2");
    if (!(Number.isFinite(a.length * maxabs * maxabs) && maxabs * maxabs !== 0)) throw new NoSoportado("la norma de números tan grandes o tan pequeños");
    const cuadrado = e => e.T === "Float64" ? e.v * e.v : aDecimal(P.binaria("*", e, e));
    let s = cuadrado(a[0]);
    for (let i = 1; i < a.length; i++) s += cuadrado(a[i]);
    return F(Math.sqrt(s));
  };
  const cross = ([a, b]) => {
    const x = elems(a, "cross"), y = elems(b, "cross");
    if (x.length !== 3 || y.length !== 3) throw new ErrorJulia("DimensionMismatch: cross product is only defined for vectors of length 3");
    const m = (i, j) => P.binaria("-", P.binaria("*", x[i], y[j]), P.binaria("*", x[j], y[i]));
    return P.recoge([m(1, 2), m(2, 0), m(0, 1)]);
  };
  const normalize = ([v]) => {
    if (!V.esVector(v)) throw new NoSoportado("normalize de " + V.tipo(v));
    const nr = norm([v]).v, d = 1 / nr;
    return V.vec("Float64", V.elementos(v).map(e => F(aDecimal(e) * d)));
  };
  const tr = ([A]) => {
    if (!MX.esMatriz(A)) throw errorMetodo("tr", [A]);
    const [f, c] = MX.dims(A);
    if (f !== c) throw new ErrorJulia("DimensionMismatch: matrix is not square: dimensions are (" + f + ", " + c + ")");
    if (f >= 16 && MX.eltipoM(A) === "Float64") throw new NoSoportado("la traza de una matriz de 16 decimales o más");
    let s = MX.get(A, 1, 1);
    for (let i = 2; i <= f; i++) s = P.binaria("+", s, MX.get(A, i, i));
    return s;
  };
  const diag = ([A]) => {
    if (!MX.esMatriz(A)) throw errorMetodo("diag", [A]);
    const [f, c] = MX.dims(A);
    return V.vec(MX.eltipoM(A), Array.from({ length: Math.min(f, c) }, (_, i) => MX.get(A, i + 1, i + 1)));
  };
  const noSe = nombre => () => { throw new NoSoportado("la función " + nombre + "() de LinearAlgebra"); };
  const LA = { det, dot, norm, cross, normalize, tr, diag, I: { T: "Uniforme", l: B(true) } };
  for (const n of ["rank", "lu", "qr", "eigen", "eigvals", "eigvecs", "svd", "pinv", "nullspace", "cholesky", "kron", "opnorm", "Diagonal", "UpperTriangular", "LowerTriangular", "Symmetric", "logdet", "issymmetric", "isdiag", "istriu", "istril"]) LA[n] = noSe(n);
  P.paquetes.LinearAlgebra = LA;
  V.GANCHOS.laVisible = () => P.cargado("LinearAlgebra");

  // ── I, la identidad de cualquier tamaño (UniformScaling) ─────────────────
  const conI = (A, l, op) => {          // A + λI, A − λI, λI − A
    const [f, c] = MX.dims(A);
    if (f !== c) throw new ErrorJulia("DimensionMismatch: matrix is not square: dimensions are (" + f + ", " + c + ")");
    const els = [];
    for (let j = 1; j <= c; j++) for (let i = 1; i <= f; i++) {
      const x = MX.get(A, i, j);
      const base = op === "I-A" ? P.unaria("-", x) : x;
      els.push(i === j ? P.binaria(op === "A-I" ? "-" : "+", base, l) : P.binaria("+", base, P.binaria("*", l, I(0))));
    }
    const r = P.recoge(els);
    return MX.mat(r.el, f, c, r.a);
  };
  const vieja = P.binaria;
  P.binaria = (op, a, b) => {
    if (op === "\\") return P.barra(a, b);
    if (!esU(a) && !esU(b)) return vieja(op, a, b);
    if (op === "==" || op === "!=") {
      let r;
      if (esU(a) && esU(b)) r = P.iguales(a.l, b.l);
      else {
        const [A, J] = esU(a) ? [b, a] : [a, b];
        if (!MX.esMatriz(A)) r = false;
        else {
          const [f, c] = MX.dims(A);
          r = f === c;
          for (let j = 1; r && j <= c; j++) for (let i = 1; r && i <= f; i++) r = P.iguales(MX.get(A, i, j), i === j ? J.l : I(0));
        }
      }
      return B(op === "==" ? r : !r);
    }
    if (op === "*") {
      if (esU(a) && esU(b)) return { T: "Uniforme", l: vieja("*", a.l, b.l) };
      if (NUM(a)) return { T: "Uniforme", l: vieja("*", a, b.l) };
      if (NUM(b)) return { T: "Uniforme", l: vieja("*", a.l, b) };
      if (MX.esMatriz(a) || V.esVector(a)) return vieja("*", a, b.l);
      if (MX.esMatriz(b) || V.esVector(b)) return vieja("*", a.l, b);
    }
    if (op === "+" || op === "-") {
      if (esU(a) && esU(b)) return { T: "Uniforme", l: vieja(op, a.l, b.l) };
      if (MX.esMatriz(a) && esU(b)) return conI(a, b.l, op === "+" ? "A+I" : "A-I");
      if (esU(a) && MX.esMatriz(b)) return op === "+" ? conI(b, a.l, "A+I") : conI(b, a.l, "I-A");
    }
    if (op === "/" && esU(a) && NUM(b)) return { T: "Uniforme", l: vieja("/", a.l, b) };
    throw new NoSoportado("esta operación con I");
  };
  const viejaU = P.unaria;
  P.unaria = (op, x) => esU(x) && op === "-" ? { T: "Uniforme", l: viejaU("-", x.l) } : viejaU(op, x);
  const viejoIgual = P.iguales;
  P.iguales = (a, b) => (esU(a) || esU(b)) ? P.binaria("==", a, b).v : viejoIgual(a, b);

  // Rational(x): un decimal se convierte en la fracción exacta que guarda
  const viejaC = P.construye;
  P.construye = (nombre, args, kw) => {
    if (nombre !== "Rational") return viejaC(nombre, args, kw);
    if (args.length === 2) return P.binaria("//", args[0], args[1]);
    if (args.length !== 1) throw new NoSoportado("Rational() con " + args.length + " argumentos");
    const [x] = args;
    if (x.T === "Rational") return x;
    if (x.T === "Int64") return R(x.v);
    if (x.T === "Bool") return R(x.v ? 1n : 0n);
    if (x.T === "Float64") {
      if (!Number.isFinite(x.v)) throw new ErrorJulia("InexactError: Rational(" + V.repr(x) + ")");
      const [m, e] = MX.exacto(x.v);
      const r = e >= 0 ? R(m << BigInt(e)) : R(m, 1n << BigInt(-e));
      if (abs(r.n) >= 1n << 63n || r.d >= 1n << 63n) throw new ErrorJulia("InexactError: Rational(" + V.repr(x) + ")");
      return r;
    }
    throw errorMetodo("Rational", [x]);
  };
}
