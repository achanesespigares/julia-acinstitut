// julia.mjs · Un intérprete de la parte de Julia que enseña el libro, que escribe trazas como trazar.jl
// (Entendiendo Julia, desde dentro · AC Institut)
//
// El análisis sintáctico lo hace tree-sitter-julia; este módulo recorre su árbol y ejecuta el programa
// como lo haría el REPL de Julia: las asignaciones dentro de un bucle del programa principal cambian las
// globales que ya existen (soft scope), cada vuelta tiene sus propias variables locales y cada llamada su
// marco. Mientras ejecuta, fotografía la memoria en los mismos momentos que herramientas/trazar.jl, de modo
// que el visualizador traza-jl.mjs dibuja igual un programa del libro que uno escrito por el alumno.
//
// Lo que no sabe hacer lo dice (NoSoportado): nunca inventa un resultado. Las pruebas de conformidad
// (herramientas/conformidad.mjs) comparan sus trazas con las de Julia de verdad, paso a paso.
import * as V from "./valores.mjs";
import { ErrorJulia, NoSoportado, I, F, B, S, Ch, NADA, FALTA } from "./valores.mjs";
import { crearPrimitivas, TIPOS, CONOCIDAS } from "./primitivas.mjs";
import { NOMBRES_BASE, NOMBRES_PAQUETES } from "./nombres-base.mjs";
import * as MX from "./matrices.mjs";
import * as EX from "./expr.mjs";
import * as ER from "./errores.mjs";
import * as VN from "./versiones.mjs";

V.GANCHOS.reprExpr = EX.quoteTop; V.GANCHOS.reprRaro = EX.reprRaro; V.GANCHOS.textoExpr = EX.textoExpr; V.GANCHOS.reprSimbolo = EX.reprSimbolo;

const LIMITE = 2000;
class Retorno { constructor(v) { this.v = v; } }
class Corte { constructor(que) { this.que = que; } }       // break o continue

// ── Precedencias de Julia (Base.operator_precedence), para escribir expresiones como Julia ─────
const PREC = { "=": 1, "=>": 4, "||": 5, "&&": 6, ":": 10, "+": 11, "-": 11, "|": 11, "*": 12, "/": 12, "÷": 12, "%": 12, "&": 12, "//": 13, "^": 15, "\\": 12 };
const COMPARA = new Set(["<", ">", "<=", ">=", "==", "!=", "≠", "≤", "≥", "≈", "===", "!==", "∈", "in", "isa"]);
// tree-sitter lee 1/(2 + 1) como «1» seguido de la llamada /(2 + 1). Se entiende como 1 / (2 + 1) cuando la
// precedencia del resto de la expresión no cambia el resultado; si no, NoSoportado (nunca un resultado distinto)
const OPS_PEGADOS = new Set(["/", "//", "*", "+", "-", "^", "÷", "%", "\\"]);
function pegado(n) {
  if (n.type !== "juxtaposition_expression") return null;
  const cs = n.namedChildren.filter(c => c.type !== "line_comment" && c.type !== "block_comment");
  if (cs.length !== 2 || !["integer_literal", "float_literal"].includes(cs[0].type) || cs[1].type !== "call_expression") return null;
  const f = cs[1].namedChild(0), lista = cs[1].namedChildren.find(c => c.type === "argument_list");
  if (!f || f.type !== "operator" || !OPS_PEGADOS.has(f.text) || !lista) return null;
  const args = lista.namedChildren.filter(c => c.type !== "line_comment");
  if (args.length !== 1 || args[0].type === "named_argument" || args[0].type === "splat_expression") return null;
  return { a: cs[0], op: f.text, b: args[0] };
}
function pegadoSeguro(n, pg) {
  const p = n.parent;
  if (!p || (p.type !== "binary_expression" && p.type !== "juxtaposition_expression")) return true;
  if (p.type === "juxtaposition_expression") return false;
  const op1 = opDe(p), izquierda = p.namedChild(0).id === n.id;
  if (op1 === pg.op && op1 === "^") return false;
  return izquierda ? prec(op1) <= prec(pg.op) && op1 !== "^" : prec(op1) < prec(pg.op);
}
const prec = op => COMPARA.has(op.replace(/^\./, "")) ? 7 : (PREC[op] ?? PREC[op.replace(/^\./, "")] ?? 12);

const hijos = n => { const r = []; for (let i = 0; i < n.namedChildCount; i++) { const c = n.namedChild(i); if (c.type !== "line_comment" && c.type !== "block_comment" && c.type !== "operator") r.push(c); } return r; };
// los índices de A[i, :]: el : suelto es un nodo «operator», que hijos() deja fuera
const partesIndice = n => n.namedChildren.filter(c => c.type !== "line_comment" && c.type !== "block_comment");
// [1 -2; 3 4]: tree-sitter lee «1 -2» como una resta; Julia, con espacio antes y no después, como dos casillas
function casillasFila(c) {
  if (c.type === "binary_expression") {
    const [a, o, b] = c.namedChildren;
    if (o && (o.text === "-" || o.text === "+") && a.endIndex < o.startIndex && o.endIndex === b.startIndex) return [...casillasFila(a), { signo: o.text, nodo: b }];
  }
  return [{ nodo: c }];
}
const linea = n => n.startPosition.row + 1;
const opDe = n => { for (let i = 0; i < n.childCount; i++) { const c = n.child(i); if (c.type === "operator" || (!c.isNamed && !"()[],;".includes(c.type))) return c.text; } return null; };

export function traza(codigo, config, parser) {
  const arbol = parser.parse(codigo);
  if (arbol.rootNode.hasError) {
    const malo = buscaError(arbol.rootNode);
    throw new ErrorSintaxis(malo ? linea(malo) : 1);
  }
  return new Programa(codigo, config || {}, parser).ejecuta(arbol.rootNode);
}
export class ErrorSintaxis extends Error { constructor(l) { super("sintaxis"); this.linea = l; } }
function buscaError(n) {
  if (n.type === "ERROR" || n.isMissing) return n;
  for (let i = 0; i < n.childCount; i++) { const r = buscaError(n.child(i)); if (r) return r; }
  return null;
}

class Programa {
  constructor(codigo, config, parser) {
    this.codigo = codigo; this.parser = parser;
    // capítulo 23: las variables globales son las del módulo en curso: Main (globMain) o un módulo del programa,
    // mientras se define o mientras corre una de sus funciones. usados: los módulos de using .Notas; importados:
    // los nombres de using .Notas: media
    this.globMain = new Map(); this.modulo = null; this.usados = []; this.importados = new Map();
    this.pasos = []; this.filas = []; this.orden = []; this.pila = [];
    this.nmarcos = 0; this.vueltas = new Map(); this.actual = 0;
    this.locales = new Map();
    this.columnas = config.columnas || []; this.porLinea = config.fila_en === "cada_linea";
    this.ocultar = new Set(config.ocultar || []);
    this.salida = ""; this.firmas = new Map(); this.ids = new Map(); this.ext = new Map();
    this.mudo = 0; this.pendientes = new Set();
    // capítulo 22: los errores que se están atrapando (para rethrow), cómo estaba la pila cuando un error salió de
    // una función, las líneas donde estaba el programa al entrar en cada finally y los Base.showerror del programa
    this.atrapados = []; this.alFallar = null; this.lineasFinally = []; this.showerr = null;
    this.prim = crearPrimitivas(this);
  }

  get glob() { return this.modulo ? this.modulo.glob : this.globMain; }
  // el nombre de una función para su marco y su firma: Notas.media si es de un módulo del programa
  nombreF(f) { return f.modulo ? f.modulo.nombre + "." + f.nombre : f.nombre; }

  // ── Fotografiar ────────────────────────────────────────────────────────
  oculto(n) { return n.startsWith("#") || n.startsWith("__") || this.ocultar.has(n); }
  firma(nombre) { const f = this.firmas.get(nombre); return f && f.length ? f.join("\n") : nombre; }
  unId(x) { if (!this.ids.has(x)) this.ids.set(x, this.ids.size + 1); return this.ids.get(x); }
  describe(x, prof = 0) {
    if (x.T === "Funcion") return { t: "function", r: this.firma(this.nombreF(x)), m: x.nmetodos() };
    if (x.T === "UInt32") return { t: "UInt32", e: true, v: [V.repr(x)] };
    if (x.T === "Modulo" && x.propio) {       // como trazar.jl: sus nombres, en el orden en que se definen, y si los exporta
      const d = { t: "Module", r: V.repr(x) };
      if (prof < 2) {
        const sinExport = this.codigo.replace(/^\s*export .*$/gm, m => " ".repeat(m.length));
        const pos = n => { const m = new RegExp("(?<![A-Za-z0-9_.])" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z0-9_!])").exec(sinExport); return m ? m.index : Infinity; };
        const ns = [...x.glob.keys()].filter(n => !this.oculto(n)).sort((a, b) => pos(a) - pos(b) || (a < b ? -1 : a > b ? 1 : 0));
        d.modulo = ns.map(n => ({ exporta: x.exporta.has(n), nombre: n, v: this.describe(x.glob.get(n), prof + 1) }));
      }
      return d;
    }
    if (x.T === "Primitiva") return { t: "function", r: x.fix ? "Fix" : x.nombre, m: x.fix ? 2 : 1 };     // ==(6) es un Base.Fix2: nameof da :Fix
    if (V.esEscalar(x)) return { t: V.tipo(x), e: true, v: [V.repr(x)] };
    if (x.T === "Expr") {          // como trazar.jl: como la escribe el REPL, su identidad y su árbol (hasta 60 nodos)
      const d = { t: "Expr", r: V.repr(x), id: this.unId(x) };
      let cuenta = 0;
      const arbol = y => {
        if (++cuenta > 60) return null;
        if (y.T !== "Expr") return { t: V.tipo(y), r: V.repr(y) };
        const hs = y.args.a.map(arbol);
        return hs.some(h => h === null) ? null : { h: y.head, r: V.repr(y), a: hs };
      };
      const a = arbol(x);
      if (a) d.expr = a;
      return d;
    }
    if (x.T === "DataFrame") {          // como trazar.jl: la tabla, sus columnas y la identidad de cada una
      const n = x.cols.length ? V.largo(x.cols[0]) : 0;
      if (n > 30 || x.cols.length > 12) throw new NoSoportado("dibujar una tabla de más de 30 filas o 12 columnas");
      const id = this.unId(x);
      return { t: "DataFrame", df: true, id, cols: [...x.nombres], tipos: x.cols.map(c => V.eltipo(c)), cid: x.cols.map(c => this.unId(c)), v: x.cols.map(c => V.elementos(c).map(e => V.repr(e))) };
    }
    if (x.T === "FilaDF") return { t: V.tipo(x), r: this.prim.muestra(x) };
    if (x.T === "Plot") return { t: V.tipo(x), plot: this.prim.describeGrafico(x), id: this.unId(x) };
    if (x.T === "GrupoDF") throw new NoSoportado("guardar un groupby en una variable: úsalo dentro de combine(…)");
    if ((x.vistaTxt && !x.vistaDe) || x.T === "VistaRara") throw new NoSoportado("guardar una vista (view) en una variable");
    if (MX.esMatriz(x) && V.largo(x) > 400) return { t: V.tipo(x), r: MX.muestraM(x, true) };
    if (MX.esMatriz(x) && V.largo(x) <= 400) {
      // A' es la misma vista cada vez que se escribe (objectid): se reconoce por su matriz, sin darle número a esta
      if (!this.padres) this.padres = new Map();
      if (x.vista && !this.padres.has(x.p)) this.padres.set(x.p, this.padres.size + 1);
      const id = x.vista ? this.unId(x.vista + "|" + this.padres.get(x.p)) : this.unId(x);
      return { t: V.tipo(x), d: MX.dims(x), el: MX.eltipoM(x), id, v: MX.lineal(x).map(e => V.repr(e)) };
    }
    if (V.esRango(x) && V.largo(x) <= 30) return { t: V.tipo(x), rango: V.repr(x), v: V.elementos(x).map(e => V.repr(e)) };
    if (V.esVector(x)) {
      const n = V.largo(x), els = V.elementos(x), xs = n > 30 ? els.slice(0, 20) : els;
      const d = { t: V.tipo(x), v: xs.map(e => V.repr(e)), el: V.eltipo(x) };
      if (n > 30) d.nv = n;
      // una vista no tiene identidad propia: dos vistas iguales de lo mismo son === (como en trazar.jl, un IdDict)
      if (V.esRango(x)) d.rango = V.repr(x); else d.id = this.unId(x.vistaDe ? x.vistaDe.clave : x);
      // capítulo 21: la identidad de cada ficha de un vector de objetos mutables, y de qué es vista una vista
      if (n <= 30 && els.some(e => e.T === "Struct" && e.mut)) d.ids = els.map(e => e.T === "Struct" && e.mut ? this.unId(e) : null);
      if (x.vistaDe && n <= 30) d.vista = { padre: this.unId(x.vistaDe.p), i: x.vistaDe.i, pos: x.vistaDe.pos.map(k => k + 1) };
      return d;
    }
    if (x.T === "Tuple" && prof < 4 && x.a.length <= 30) return { t: V.tipo(x), tupla: true, el: x.a.map(e => ({ v: this.describe(e, prof + 1) })) };
    if (x.T === "NamedTuple" && prof < 4 && x.a.length <= 30) return { t: V.tipo(x), tupla: true, el: x.a.map((e, i) => ({ nombre: x.nombres[i], v: this.describe(e, prof + 1) })) };
    if (x.T === "Dict" && x.t.count <= 30) { const es = x.t.entradas(); return { t: V.tipo(x), dict: true, k: es.map(([k]) => V.repr(k)), v: es.map(([, w]) => V.repr(w)), id: this.unId(x) }; }
    if (x.T === "Tipo") return { t: x.unionall ? "UnionAll" : "DataType", r: this.prim.muestra(x) };
    if (x.T === "Struct" && prof < 4) {          // como trazar.jl: una ficha con sus campos; si es mutable, con identidad
      const d = { t: V.tipo(x), tupla: true, struct: true, el: this.prim.tipos.get(x.tipo).campos.map((c, i) => ({ nombre: c.nombre, v: this.describe(x.a[i], prof + 1) })) };
      if (x.mut) { d.mutable = true; d.id = this.unId(x); }
      return d;
    }
    return { t: V.tipo(x), r: this.prim.muestra(x) };
  }
  corto(x) {
    if (x.T === "Funcion") return this.firma(this.nombreF(x));
    if ((x.T === "Vector" || x.T === "BitVector") && x.a.length > 12) return x.a.slice(0, 3).map(e => V.repr(e)).join(", ") + ", … (" + x.a.length + " valores)";
    return V.repr(x);
  }
  foto() {
    const ns = [...this.globMain.keys()].filter(n => !this.oculto(n) && !this.pendientes.has(n)).sort();
    for (const n of ns) if (!this.orden.includes(n)) this.orden.push(n);
    this.orden.push(...this.enOrdenDeLectura([...this.locales.keys()].filter(n => !this.oculto(n) && !this.orden.includes(n))));
    const est = {}, orden = [];
    for (const n of this.orden) {
      if (this.locales.has(n) && !this.oculto(n)) { const d = this.describe(this.locales.get(n)); d.local = true; est[n] = d; orden.push(n); }
      else if (this.globMain.has(n) && !this.oculto(n) && !this.pendientes.has(n)) { est[n] = this.describe(this.globMain.get(n)); orden.push(n); }
    }
    return [est, orden];
  }
  fotoMarcos() {
    return this.pila.map(m => {
      const vars = {};
      for (const [k, v] of m.vars) if (!this.oculto(k)) vars[k] = this.describe(v);
      return { id: m.id, nombre: m.nombre, llamada: m.llamada, desde: m.desde, vars, orden: m.orden.filter(k => m.vars.has(k) && !this.oculto(k)) };
    });
  }
  anota(paso) {
    if (this.pasos.length >= LIMITE) throw new ErrorJulia("el programa da demasiados pasos (más de " + LIMITE + ")");
    const [est, orden] = this.foto();
    paso.estado = est; paso.orden = orden;
    if (this.pila.length) paso.marcos = this.fotoMarcos();
    paso.salida = this.salida; paso.nfilas = this.filas.length;
    if (this.grafico) { paso.grafico = this.grafico; this.grafico = null; }
    this.pasos.push(paso);
  }
  fila(locs) {
    if (!this.columnas.length) return;
    const f = {};
    for (const c of this.columnas) {
      try { f[c] = this.corto(this.evaluaTexto(c, locs)); } catch (e) { if (e instanceof NoSoportado) throw e; f[c] = ""; }
    }
    this.filas.push(f);
  }
  ponLocales(locs) {
    if (!this.pila.length) this.locales = locs;
    else { const m = this.pila[this.pila.length - 1]; m.vars = locs; m.orden.push(...this.enOrdenDeLectura([...locs.keys()].filter(k => !m.orden.includes(k)))); }
  }
  // varias locales nuevas a la vez (for (nombre, nota) in …): en el orden en que aparecen en el programa, como trazar.jl
  enOrdenDeLectura(ns) {
    const pos = n => { const m = new RegExp("(?<![A-Za-z0-9_])" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z0-9_!])").exec(this.codigo); return m ? m.index : Infinity; };
    return ns.sort((a, b) => pos(a) - pos(b) || (a < b ? -1 : a > b ? 1 : 0));
  }

  // ── Los momentos de la traza (los mismos que trazar.jl) ────────────────
  // mudo > 0: el código que corre no lo ha reescrito trazar.jl (el cuerpo de una macro, una función definida con
  // eval): no deja pasos ni marcos. Una función del programa a la que llame sí los deja (llamaPrograma)
  va(l) { if (!this.mudo) this.actual = l; }
  paso(l, sc) { if (this.mudo) return; const locs = this.locs(sc); this.ponLocales(locs); if (this.porLinea) this.fila(locs); this.anota({ linea: l, tipo: "linea" }); }
  cabecera(l, sc) { if (this.mudo) return; this.vueltas.set(l, (this.vueltas.get(l) || 0) + 1); this.ponLocales(this.locs(sc)); this.anota({ linea: l, tipo: "vuelta", vuelta: this.vueltas.get(l) }); }
  finVuelta(l, sc) { if (this.mudo) return; const locs = this.locs(sc); this.ponLocales(locs); if (!this.porLinea) this.fila(locs); }
  finBucle(l, sc) { if (this.mudo) return; this.ponLocales(this.locs(sc)); this.anota({ linea: l, tipo: "fin", vuelta: this.vueltas.get(l) || 0 }); this.vueltas.delete(l); }
  cond(l, nodo, v, sc) {
    if (this.mudo) return;
    const locs = this.locs(sc); this.ponLocales(locs);
    const valor = v.T === "Bool" ? (v.v ? "true" : "false") : V.repr(v);
    this.anota({ linea: l, tipo: "condicion", cond: { texto: this.escribe(nodo), valores: this.escribe(nodo, sc), valor } });
  }
  entra(f, met, l, sc, args) {
    this.nmarcos++;
    const locs = this.locs(sc);
    const llamada = this.nombreF(f) + "(" + args.filter(a => locs.has(a)).map(a => a + " = " + this.corto(locs.get(a))).join(", ") + ")";
    this.pila.push({ id: this.nmarcos, nombre: this.nombreF(f), vars: locs, orden: [...args], desde: this.actual, llamada });
    this.anota({ linea: l, tipo: "llamada", funcion: this.nombreF(f) });
  }
  sale(v) {
    if (this.mudo) return v;
    const m = this.pila[this.pila.length - 1];
    this.anota({ linea: this.actual, tipo: "devuelve", funcion: m.nombre, desde: m.desde, valor: this.corto(v) });
    this.pila.pop(); this.actual = m.desde;
    return v;
  }

  // ── Ámbitos ────────────────────────────────────────────────────────────
  // sc es el ámbito local en curso (null en el programa principal): { vars, padre, funcion }
  locs(sc) {      // Base.@locals(): todas las variables locales visibles, hasta el marco de la función
    const r = new Map(), cadena = [];
    for (let s = sc; s; s = s.padre) { cadena.push(s); if (s.funcion) break; }
    for (const s of cadena.reverse()) for (const [k, v] of s.vars) r.set(k, v);
    return r;
  }
  busca(nombre, sc) {
    for (let s = sc; s; s = s.padre) { if (s.vars.has(nombre)) return s.vars.get(nombre); if (s.funcion && s.globales?.has(nombre)) break; }
    if (this.glob.has(nombre)) return this.glob.get(nombre);
    if (!this.modulo) { const r = this.deUsados(nombre); if (r) return r; }
    if (nombre in TIPOS) return TIPOS[nombre];
    if (this.prim.tiene(nombre)) return this.prim.funcion(nombre);
    // un nombre de un paquete que el programa no ha cargado: Julia da una pista (los paquetes están cargados en trazar.jl)
    for (const [p, t] of Object.entries(this.prim.paquetes)) if (nombre in t) {
      const base = "UndefVarError: `" + nombre + "` not defined in `Main`\nSuggestion: check for spelling errors or missing imports.\n";
      // Plots no está cargado en trazar.jl hasta que un programa lo usa: sin using Plots, Julia no da pista
      if (p === "Plots") throw new ErrorJulia(base.replace(/\n$/, ""));
      throw new ErrorJulia(base + "Hint: a global variable of this name also exists in " + p + ".");
    }
    if (CONOCIDAS.has(nombre) || NOMBRES_BASE.has(nombre)) throw new NoSoportado("la función " + nombre + "()");
    for (const [p, ns] of Object.entries(NOMBRES_PAQUETES)) if (ns.has(nombre)) throw new NoSoportado(nombre + ", de " + p);
    throw new ErrorJulia("UndefVarError: `" + nombre + "` not defined in `" + (this.modulo ? V.repr(this.modulo) : "Main") + "`\nSuggestion: check for spelling errors or missing imports.");
  }
  // un nombre que no es de Main, en los módulos del programa: el que se importó con using .Notas: media, o el que
  // exporta un módulo de using .Notas. Si lo exportan dos módulos con valores distintos, Julia no elige
  deUsados(nombre) {
    if (this.importados.has(nombre)) { const m = this.importados.get(nombre); return m.glob.get(nombre); }
    const ms = this.usados.filter(m => m.exporta.has(nombre) && m.glob.has(nombre));
    if (!ms.length) return null;
    if ((nombre in TIPOS) || this.prim.tiene(nombre)) throw new NoSoportado("un nombre que exporta tu módulo y que también es de Julia (" + nombre + ")");
    const vs = new Set(ms.map(m => m.glob.get(nombre)));
    if (vs.size > 1) throw new ErrorJulia("UndefVarError: `" + nombre + "` not defined in `Main`\nHint: It looks like two or more modules export different bindings with this name, resulting in ambiguity. Try explicitly importing it from a particular module, or qualifying the name with the module it should come from.");
    return ms[0].glob.get(nombre);
  }
  asigna(nombre, v, sc) {
    if (!sc) { this.glob.set(nombre, v); return; }
    let enFuncion = false;
    for (let s = sc; s; s = s.padre) {
      if (s.vars.has(nombre)) { s.vars.set(nombre, v); return; }
      if (s.funcion) { enFuncion = true; if (s.globales.has(nombre)) { this.glob.set(nombre, v); return; } break; }
    }
    if (!enFuncion && this.glob.has(nombre)) { this.glob.set(nombre, v); return; }   // soft scope, como el REPL
    sc.vars.set(nombre, v);
  }
  nuevoAmbito(padre) { return { vars: new Map(), padre, funcion: false }; }

  // ── Ejecutar ───────────────────────────────────────────────────────────
  ejecuta(raiz) {
    this.pasos.push({ linea: null, tipo: "inicio", estado: {}, orden: [], salida: "", nfilas: 0 });
    try {
      for (const st of hijos(raiz)) { this.pendientes.clear(); this.sentencia(st, 0, null); }
    } catch (e) {
      if (e instanceof NoSoportado || e instanceof ErrorSintaxis) throw e;
      let texto;
      if (e instanceof ErrorJulia) texto = e.texto;
      else if (e instanceof Corte) texto = "syntax: break or continue outside loop";
      else if (e instanceof Retorno) texto = null;
      else throw e;
      if (texto !== null) {
        const [est, orden] = this.foto();
        const p = { linea: this.actual, tipo: "error", error: texto, estado: est, orden, salida: this.salida, nfilas: this.filas.length };
        // si el error salió de funciones del programa, sus marcos se cerraron al salir: se enseñan como estaban al fallar
        const marcos = this.alFallar && this.alFallar.e === e ? this.alFallar.marcos : this.pila.length ? this.fotoMarcos() : null;
        if (marcos && marcos.length) p.marcos = marcos;
        this.pasos.push(p);
      }
    }
    return { codigo: this.codigo, pasos: this.pasos, filas: this.filas };
  }

  // Una sentencia, con sus fotos. nivel 0 = programa principal; final = última línea de una función
  sentencia(n, nivel, sc, final = false) {
    const l = linea(n);
    switch (n.type) {
      case "function_definition": return this.defineFuncion(n, nivel, sc);
      case "assignment":
        if (this.esDefCorta(n)) return this.defineFuncion(n, nivel, sc);
        break;
      case "for_statement": return this.bucleFor(n, nivel, sc);
      case "while_statement": return this.bucleWhile(n, nivel, sc);
      case "if_statement": this.va(l); return this.siEntonces(n, nivel, sc);
      case "try_statement": if (nivel > 0 && !final) { this.va(l); return this.intento(n, sc); } break;
      case "ternary_expression": {      // como sentencia, un ternario es un if para Julia: c ? a : b
        this.va(l);
        const [c, a, b] = hijos(n), v = this.valor(c, sc);
        this.cond(l, c, v, sc);
        return this.bloque([this.booleano(v) ? a : b], nivel + 1, sc);
      }
      case "break_statement": case "continue_statement":
        this.va(l); this.paso(l, sc); throw new Corte(n.type === "break_statement" ? "break" : "continue");
      case "return_statement": {
        if (!this.pila.length && nivel === 0) throw new NoSoportado("return fuera de una función");
        this.va(l);
        const e = hijos(n)[0];
        const v = e ? this.valor(e, sc) : NADA;
        this.sale(v);
        throw new Retorno(v);
      }
      case "using_statement": {       // using DataFrames, Statistics, LinearAlgebra: los paquetes que el laboratorio conoce
        if (nivel !== 0) throw new NoSoportado("using dentro de un bloque");
        const ps = hijos(n);
        if (ps.some(p => p.type !== "identifier")) return this.usa(n, nivel, sc, false);
        for (const p of ps) if (p.type !== "identifier" || !this.prim.paquetes[p.text]) throw new NoSoportado("cargar el paquete " + p.text + ": el laboratorio solo conoce DataFrames, Statistics, LinearAlgebra, Random, Plots y Test");
        this.va(l);
        for (const p of ps) this.prim.carga(p.text);
        this.paso(l, sc);
        return NADA;
      }
      case "import_statement": return this.usa(n, nivel, sc, true);
      case "struct_definition": case "abstract_definition": {
        if (nivel !== 0) throw new NoSoportado("definir un tipo dentro de un bloque");
        this.va(l);
        const nombre = this.defineTipo(n);
        this.asigna(nombre, this.prim.tipos.get(nombre).params ? { T: "Tipo", nombre, unionall: true } : { T: "Tipo", nombre }, sc);
        this.paso(l, sc);
        return NADA;
      }
      case "macro_definition": {
        if (nivel !== 0) throw new NoSoportado("definir una macro dentro de un bloque");
        this.va(l);
        this.defineMacro(n);
        this.paso(l, sc);
        return NADA;
      }
      case "module_definition": return this.defineModulo(n, nivel, sc);
      case "const_statement": {        // const MAXIMO = 10: como una asignación (el REPL no escribe su valor)
        if (nivel !== 0) throw new NoSoportado("const dentro de un bloque");
        const [a] = hijos(n);
        if (!a || a.type !== "assignment" || hijos(a)[0].type !== "identifier") throw new NoSoportado("esta forma de const");
        this.va(l); this.valor(a, sc); this.paso(l, sc);
        return NADA;
      }
      case "export_statement": throw new NoSoportado("export fuera de un módulo");
    }
    if (final) { const v = this.valor(n, sc); return n.type === "local_statement" || n.type === "global_statement" ? NADA : v; }
    this.va(l);
    if (nivel === 0) {
      const v = this.valor(n, sc);
      // como es_asignacion de trazar.jl: x ÷= 2 o A .+= 1 no cuentan como asignaciones y el REPL escribe su valor
      const asignacion = ["assignment", "local_statement", "global_statement"].includes(n.type) || (n.type === "binary_expression" && opDe(n) === ".=") ||
        (n.type === "compound_assignment_expression" && ["+=", "-=", "*=", "/=", "^=", ".="].includes(opDe(n)));
      // un gráfico no se escribe en la consola: se dibuja (como en el REPL, que lo abre en su ventana)
      if (!asignacion && v.T === "Plot") this.grafico = this.prim.describeGrafico(v);
      else if (!asignacion && v.T !== "Nothing") this.salida += this.prim.muestra(v) + "\n";
      this.paso(l, sc);
      return NADA;
    }
    const v = this.valor(n, sc);
    this.paso(l, sc);
    return v;
  }
  bloque(nodos, nivel, sc) { let v = NADA; for (const st of nodos) v = this.sentencia(st, nivel, sc); return v; }

  bucleFor(n, nivel, sc) {
    const l = linea(n);
    const enlaces = hijos(n).filter(c => c.type === "for_binding");
    const cuerpo = hijos(n).filter(c => c.type !== "for_binding");
    this.va(l);
    const recorre = (k, ambito) => {
      const b = enlaces[k], partes = hijos(b);
      const destino = partes[0], fuente = this.valor(partes[partes.length - 1], ambito);
      for (const x of this.prim.itera(fuente)) {
        const it = this.nuevoAmbito(ambito);
        this.liga(destino, x, it);
        if (k < enlaces.length - 1) { recorre(k + 1, it); continue; }
        this.cabecera(l, it);
        try { this.bloque(cuerpo, nivel + 1, it); }
        catch (e) { if (e instanceof Corte) { if (e.que === "break") return "break"; } else throw e; }
        this.finVuelta(l, it);
      }
    };
    recorre(0, sc);
    this.finBucle(l, sc);
    return NADA;
  }
  liga(destino, x, sc) {
    if (destino.type === "identifier") { sc.vars.set(destino.text, x); return; }
    if (destino.type === "tuple_expression") {
      const ns = hijos(destino), vs = this.prim.itera(x);
      ns.forEach((d, i) => this.liga(d, vs[i], sc));
      return;
    }
    throw new NoSoportado("este tipo de variable de bucle");
  }
  bucleWhile(n, nivel, sc) {
    const l = linea(n);
    const { c, fuera } = this.condicion(n), c0 = n.childForFieldName("condition");
    const cuerpo = hijos(n).filter(x => x.id !== c0.id && !fuera.has(x.id));
    this.va(l);
    while (true) {
      const v = this.valor(c, sc);
      this.cond(l, c, v, sc);
      if (!this.booleano(v)) break;
      const it = this.nuevoAmbito(sc);
      try { this.bloque(cuerpo, nivel + 1, it); }
      catch (e) { if (e instanceof Corte) { if (e.que === "break") break; } else throw e; }
      this.finVuelta(l, it);
    }
    this.finBucle(l, sc);
    return NADA;
  }
  booleano(v) {
    if (v.T === "Bool") return v.v;
    throw new ErrorJulia("TypeError: non-boolean (" + V.tipo(v) + ") used in boolean context");
  }
  // tree-sitter lee «while b - a > tol» como la condición «b» seguida de la sentencia «-a > tol» (por el
  // espacio antes del signo y no después… aunque aquí hay espacio a los dos lados). Julia lee la línea
  // entera como condición: se vuelve a leer el texto de la condición solo, entre paréntesis.
  condicion(n) {
    const c = n.childForFieldName("condition"), fila = c.startPosition.row;
    const sobran = hijos(n).filter(x => x.id !== c.id && x.startPosition.row === fila && x.type !== "elseif_clause" && x.type !== "else_clause");
    if (!sobran.length) return { c, fuera: new Set() };
    const lin = this.codigo.split("\n")[fila];
    const m = lin.match(/^\s*(?:while|if|elseif)\s+(.*?)\s*$/);
    if (!m || /["'#]/.test(m[1])) throw new NoSoportado("leer la condición de la línea " + (fila + 1) + ": escríbela entre paréntesis");
    const arbol = this.parser.parse("(" + m[1] + ")\n");
    const raiz = hijos(arbol.rootNode);
    if (arbol.rootNode.hasError || raiz.length !== 1) throw new NoSoportado("leer la condición de la línea " + (fila + 1) + ": escríbela entre paréntesis");
    this.arboles = this.arboles || []; this.arboles.push(arbol);
    let nc = raiz[0]; while (nc.type === "parenthesized_expression" && hijos(nc).length === 1) nc = hijos(nc)[0];
    return { c: nc, fuera: new Set(sobran.map(x => x.id)), fila: fila + 1 };
  }
  siEntonces(n, nivel, sc) {
    const { c, fuera } = this.condicion(n);
    const ramas = hijos(n).filter(x => x.type === "elseif_clause" || x.type === "else_clause");
    const cuerpo = hijos(n).filter(x => x.id !== n.childForFieldName("condition").id && !fuera.has(x.id) && x.type !== "elseif_clause" && x.type !== "else_clause");
    const v = this.valor(c, sc);
    this.cond(n.type === "elseif_clause" ? linea(n) : linea(n), c, v, sc);
    if (this.booleano(v)) return this.bloque(cuerpo, nivel + 1, sc);
    for (const r of ramas) {
      if (r.type === "elseif_clause") {
        const { c: rc, fuera: rf } = this.condicion(r), rc0 = r.childForFieldName("condition");
        const rv = this.valor(rc, sc);
        this.cond(linea(r), rc, rv, sc);
        if (this.booleano(rv)) return this.bloque(hijos(r).filter(x => x.id !== rc0.id && !rf.has(x.id)), nivel + 1, sc);
      } else return this.bloque(hijos(r), nivel + 1, sc);
    }
    return NADA;
  }

  // ── Tipos propios ──────────────────────────────────────────────────────
  // struct Alumna … end, mutable struct Ficha … end, abstract type Figura end, struct Circulo <: Figura … end
  defineTipo(n) {
    const [cab, ...campos] = hijos(n);
    if (cab.type !== "type_head") throw new NoSoportado("esta definición de tipo");
    let [nom] = hijos(cab), padre = "Any";
    if (nom.type === "binary_expression" && opDe(nom) === "<:") { const [a, b] = hijos(nom); nom = a; padre = b.text; }
    // struct Punto{T<:Real}: los parámetros, cada uno con su cota (Any si no la tiene)
    let params = null;
    if (nom.type === "parametrized_type_expression") {
      const [id, ll] = hijos(nom);
      params = hijos(ll).map(q => {
        if (q.type === "identifier") return { nombre: q.text, cota: "Any" };
        if (q.type === "binary_expression" && opDe(q) === "<:") { const [x, c] = hijos(q); if (x.type === "identifier") return { nombre: x.text, cota: this.nombreTipo(c) }; }
        throw new NoSoportado("este parámetro de tipo (" + q.text + ")");
      });
      nom = id;
    }
    if (nom.type !== "identifier") throw new NoSoportado("esta definición de tipo (" + nom.text + ")");
    const abstracto = n.type === "abstract_definition";
    if (params && abstracto) throw new NoSoportado("tipos abstractos con parámetros");
    const def = { nombre: nom.text, padre, abstracto, mutable: !abstracto && /^mutable\b/.test(n.text), campos: [] };
    if (params) def.params = params;
    const esParam = t => params && t.type === "identifier" && params.some(q => q.nombre === t.text);
    for (const c of campos) {
      if (c.type === "identifier") def.campos.push({ nombre: c.text, tipo: null });
      else if (c.type === "typed_expression") { const [a, t] = hijos(c); def.campos.push({ nombre: a.text, tipo: esParam(t) ? t.text : this.nombreTipo(t) }); }
      else throw new NoSoportado("esto dentro de un struct (" + c.type.replace(/_/g, " ") + ")");
    }
    this.prim.defineTipo(def);
    return def.nombre;
  }
  // ── Despacho múltiple ──────────────────────────────────────────────────
  // ¿Es el tipo a (de una anotación) un subtipo de b? Solo con los tipos que el laboratorio conoce; si no,
  // NoSoportado: mejor no elegir que elegir mal
  subTipo(a, b) {
    if (a === b || b === "Any") return true;
    if (a === "Any") return false;
    const ARR = { Vector: "AbstractVector", AbstractVector: "AbstractArray", Matrix: "AbstractMatrix", AbstractMatrix: "AbstractArray", AbstractArray: "Any" };
    const vec = t => { const m = /^Vector\{(<:)?(.+)\}$/.exec(t); return m ? { cov: !!m[1], el: m[2] } : t === "Vector" ? { cov: true, el: "Any" } : null; };
    const va = vec(a), vb = vec(b);
    if (va && vb) return vb.cov ? this.subTipo(va.el, vb.el) : !va.cov && va.el === vb.el;
    if (va) return b === "AbstractVector" || b === "AbstractArray";
    if (a in ARR) { for (let x = a; x && x !== "Any"; x = ARR[x]) if (x === b) return true; if (vb || b in ARR || this.prim.conocido(b)) return false; }
    else if (vb || b in ARR) { if (this.prim.conocido(a)) return false; }
    else if (this.prim.conocido(a) && this.prim.conocido(b)) return this.prim.esSubtipo(a, b);
    throw new NoSoportado("comparar los tipos " + a + " y " + b + " al elegir método");
  }
  // si el método encaja con estos argumentos, lo que valen sus parámetros de where (un Map, vacío si no tiene)
  encaja(m, args) {
    const n = args.length, obl = m.params.filter(p => !p.defecto).length;
    if (n < obl || n > m.params.length) return null;
    const vars = m.vars || [], vals = new Map();
    for (let i = 0; i < n; i++) {
      const t = m.params[i].tipo;
      if (!t) continue;
      const q = vars.find(v => v.nombre === t), w = /^Vector\{(\w+)\}$/.exec(t), qv = w && vars.find(v => v.nombre === w[1]);
      if (!q && !qv) { if (!this.prim.esDelTipo(args[i], t)) return null; continue; }
      let ti;
      if (q) ti = V.tipo(args[i]);
      else { if (args[i].T !== "Vector") return null; ti = V.eltipo(args[i]); }
      const v = q || qv;
      if (vals.has(v.nombre) && vals.get(v.nombre) !== ti) return null;
      if (v.cota !== "Any" && !this.subTipo(ti, v.cota)) return null;
      vals.set(v.nombre, ti);
    }
    return vals;
  }
  // los tipos de los n primeros argumentos, con cada parámetro de where cambiado por su cota
  firmaDe(m, n) {
    const vars = m.vars || [];
    return m.params.slice(0, n).map(p => {
      const t = p.tipo || "Any", q = vars.find(v => v.nombre === t);
      if (q) return q.cota;
      const w = /^Vector\{(\w+)\}$/.exec(t), qv = w && vars.find(v => v.nombre === w[1]);
      return qv ? "Vector{<:" + qv.cota + "}" : t;
    });
  }
  // las posiciones de cada parámetro de where que aparece solo, en dos o más argumentos (x::T, y::T)
  diagonales(m, n) {
    const r = [];
    for (const v of m.vars || []) { const pos = m.params.slice(0, n).map((p, i) => p.tipo === v.nombre ? i : -1).filter(i => i >= 0); if (pos.length >= 2) r.push(pos); }
    return r;
  }
  // ¿es a más específico que b? Para los tipos del laboratorio, como Base.morespecific de Julia 1.13 (comprobado
  // con 20 000 parejas de firmas al azar, y con where en 28 000; los casos dudosos dan NoSoportado)
  masEspecifico(a, b, n) {
    const sa = this.firmaDe(a, n), sb = this.firmaDe(b, n);
    const ab = sa.every((t, i) => this.subTipo(t, sb[i])), ba = sb.every((t, i) => this.subTipo(t, sa[i]));
    const da = this.diagonales(a, n), db = this.diagonales(b, n);
    const duda = () => new NoSoportado("decidir entre " + a.firma + " y " + b.firma);
    if (ab && !ba) {
      for (const pos of db) {
        const ts = pos.map(i => { const t = a.params[i].tipo || "Any"; return (a.vars || []).some(v => v.nombre === t) ? "#" + t : t; });
        if (ts.some(t => t !== ts[0])) throw duda();
      }
      return true;
    }
    if (ab && ba) {
      if (da.length && !db.length) return true;
      if (db.length && !da.length) return false;
      if (da.length && db.length && JSON.stringify(da) !== JSON.stringify(db)) throw duda();
    }
    return false;
  }
  // el método de f que toca con estos argumentos: el más específico de los que encajan. Si ninguno es más
  // específico que todos los demás, Julia no elige: es una ambigüedad. Devuelve { m, vals }, o null
  eligeMetodo(f, args) {
    const n = args.length;
    let cands = [];
    for (const m of f.metodos) { const vals = this.encaja(m, args); if (vals) cands.push({ m, vals }); }
    if (cands.length <= 1) return cands[0] || null;
    // f(x, y = 1) y f(x) dan la misma firma con un argumento: vale la última definida, como en Julia
    const clave = c => JSON.stringify([this.firmaDe(c.m, n), c.m.vars || []]);
    cands = cands.filter((c, i) => !cands.slice(i + 1).some(o => clave(o) === clave(c)));
    const min = cands.filter(c => !cands.some(o => o !== c && this.masEspecifico(o.m, c.m, n)));
    if (min.length === 1) return min[0];
    throw this.ambiguo(f, args, min.map(c => c.m));
  }
  // el MethodError de Julia 1.13 para una ambigüedad: los candidatos, del último definido al primero, y el
  // método que la resolvería (el tipo más bajo de cada argumento)
  ambiguo(f, args, ms) {
    if (ms.some(m => (m.vars || []).length || !m.deJulia)) throw new NoSoportado("explicar una ambigüedad entre métodos con where o con argumentos opcionales");
    const n = args.length, nom = f.op || f.nombre;
    const orden = [...ms].sort((x, y) => f.metodos.indexOf(y) - f.metodos.indexOf(x));
    const arreglo = [];
    for (let i = 0; i < n; i++) {
      const ts = ms.map(m => this.firmaDe(m, n)[i]);
      const bajo = ts.find(t => ts.every(u => this.subTipo(t, u)));
      if (!bajo) throw new NoSoportado("explicar esta ambigüedad");
      arreglo.push("::" + bajo);
    }
    return new ErrorJulia("MethodError: " + nom + "(" + args.map(a => "::" + V.tipo(a)).join(", ") + ") is ambiguous.\n\nCandidates:\n" +
      orden.map(m => "  " + m.deJulia).join("\n") + "\n\nPossible fix, define\n  " + nom + "(" + arreglo.join(", ") + ")");
  }
  // un método nuevo; si ya había uno con la misma firma, el nuevo lo sustituye (y pasa a ser el último)
  agregaMetodo(f, met) {
    const clave = m => JSON.stringify([m.params.map(p => [p.tipo || "Any", !!p.defecto]), m.vars || []]);
    const k = f.metodos.findIndex(m => clave(m) === clave(met));
    if (k >= 0) f.metodos.splice(k, 1);
    f.metodos.push(met);
  }
  // a + b con un tipo propio: los métodos que el programa ha añadido a + (Base.:+(a::Punto, b::Punto) = …)
  operaUsuario(op, args) {
    const f = this.ext.get(op), propio = args.some(a => a && a.T === "Struct");
    const e = f ? this.eligeMetodo(f, args) : null;
    if (e) return this.llamaPrograma(f, args, new Map(), e);
    if (propio && ["+", "-", "*", "/", "÷", "^", "%", "//"].includes(op)) throw V.errorMetodo(op, args);
    return null;
  }

  // ── Funciones del programa ─────────────────────────────────────────────
  esDefCorta(n) { const izq = hijos(n)[0]; return izq && (izq.type === "call_expression" || (izq.type === "where_expression")); }
  defineFuncion(n, nivel, sc, mudo = false) {
    const l = linea(n);
    let llamada, cuerpo;
    if (n.type === "function_definition") {
      const sig = hijos(n).find(c => c.type === "signature");
      llamada = hijos(sig)[0];
      cuerpo = hijos(n).filter(c => c.type !== "signature");
    } else { llamada = hijos(n)[0]; cuerpo = [hijos(n)[1]]; }
    // f(x::T, y::T) where {T<:Real}: los parámetros de where, cada uno con su cota
    let vars = null, donde = "";
    if (llamada.type === "where_expression") {
      const [c, w] = hijos(llamada);
      if (!w || c.type !== "call_expression") throw new NoSoportado("esta forma de where");
      const lista = w.type === "curly_expression" ? hijos(w) : [w];
      vars = lista.map(q => {
        if (q.type === "identifier") return { nombre: q.text, cota: "Any" };
        if (q.type === "binary_expression" && opDe(q) === "<:") { const [x, t] = hijos(q); if (x.type === "identifier") return { nombre: x.text, cota: this.nombreTipo(t) }; }
        throw new NoSoportado("este parámetro de where (" + q.text + ")");
      });
      const uno = v => v.cota === "Any" ? v.nombre : v.nombre + " <: " + v.cota;
      donde = " where " + (vars.length === 1 ? uno(vars[0]) : "{" + vars.map(uno).join(", ") + "}");
      llamada = c;
    }
    if (llamada.type !== "call_expression") throw new NoSoportado("esta forma de definir funciones");
    // Base.:+(a::Punto, b::Punto) = …: un método nuevo para un operador de Julia
    const cal = hijos(llamada)[0];
    let nombre = cal.text, op = null;
    if (cal.type === "field_expression") {
      const [mod, q] = hijos(cal);
      let o = q && q.type === "quote_expression" ? q.namedChild(0) : null;
      if (o && o.type === "parenthesized_expression" && o.namedChildCount === 1) o = o.namedChild(0);      // Base.:(==)
      if (mod.text === "Base" && q && q.type === "identifier" && q.text === "showerror") op = "showerror";      // capítulo 22
      else if (mod.text !== "Base" || !o || o.type !== "operator") throw new NoSoportado("añadir métodos a " + cal.text);
      else { op = o.text; nombre = "Base." + q.text; }
    } else if (cal.type !== "identifier") throw new NoSoportado("esta forma de definir funciones");
    const esVar = t => vars && vars.some(v => v.nombre === t);
    const tipoDe = t => {
      if (esVar(t.text)) return t.text;
      if (t.type === "parametrized_type_expression" && /^Vector\{(\w+)\}$/.test(t.text) && esVar(t.text.slice(7, -1))) return t.text;
      if (vars && vars.some(v => new RegExp("\\b" + v.nombre + "\\b").test(t.text))) throw new NoSoportado("el tipo " + t.text + " con un parámetro de where");
      try { return this.nombreTipo(t); } catch (e) { if (e instanceof NoSoportado) return t.text; throw e; }
    };
    const params = [], kw = [];
    let tras = false;
    const lista = llamada.namedChildren.find(c => c.type === "argument_list");
    for (let i = 0; i < lista.childCount; i++) {
      const c = lista.child(i);
      if (c.type === ";") { tras = true; continue; }
      if (!c.isNamed) continue;
      if (c.type === "identifier") params.push({ nombre: c.text });
      else if (c.type === "typed_expression") params.push({ nombre: hijos(c)[0].text, tipo: tipoDe(hijos(c)[1]) });
      else if (c.type === "unary_typed_expression") params.push({ nombre: null, tipo: tipoDe(hijos(c)[0]) });     // gana(::Piedra, ::Tijera)
      else if (c.type === "named_argument") { const [a, d] = hijos(c); (tras ? kw : params).push({ nombre: a.type === "typed_expression" ? hijos(a)[0].text : a.text, defecto: d, tipo: a.type === "typed_expression" ? tipoDe(hijos(a)[1]) : null }); }
      else throw new NoSoportado("este tipo de argumento");
    }
    if (vars) for (const v of vars) if (!params.some(p => p.tipo === v.nombre || p.tipo === "Vector{" + v.nombre + "}")) throw new NoSoportado("un parámetro de where que no está en los argumentos");
    if (vars && vars.some(v => params.some(p => p.tipo === v.nombre) && params.some(p => p.tipo === "Vector{" + v.nombre + "}"))) throw new NoSoportado("el mismo parámetro de where solo y dentro de un Vector");
    const firma = this.escribe(llamada) + donde;
    // como escribe Julia el método (en un «is ambiguous»): sin ::Any, con los tipos por su nombre completo
    const deJulia = !kw.length && !params.some(p => p.defecto) ? (op || nombre) + "(" + params.map(p => (p.nombre || "") + (p.tipo && p.tipo !== "Any" ? "::" + p.tipo : "")).join(", ") + ")" + donde : null;
    const met = { params, kw, cuerpo, linea: l, firma, deJulia };
    if (vars) met.vars = vars;
    if (mudo) {          // definida con eval: trazar.jl no la reescribe y no apunta su firma
      if (op || vars) throw new NoSoportado("definir con eval un método con where o para un operador");
      met.mudo = true;
      let f = this.glob.get(nombre);
      if (f && f.T === "Tipo") throw new NoSoportado("definir con eval un constructor");
      if (!f || f.T !== "Funcion") f = nuevaFuncion(nombre);
      this.agregaMetodo(f, met);
      this.glob.set(nombre, f);
      return f;
    }
    // Base.showerror(io::IO, e::NotaFuera) = print(io, …): cómo se escribe un error propio. Julia lo llama al
    // escribir el error, sin pasos (trazar.jl no lo reescribe)
    if (op === "showerror") {
      if (nivel > 0) throw new NoSoportado("añadir un método a showerror dentro de otro bloque");
      if (params.length !== 2 || params[0].tipo !== "IO" || !params[1].tipo || !this.prim.esTipoPropio(params[1].tipo) || kw.length || vars) throw new NoSoportado("esta forma de Base.showerror: el laboratorio sabe Base.showerror(io::IO, e::MiError) = …");
      met.mudo = true;
      if (!this.showerr) this.showerr = nuevaFuncion("showerror");
      this.agregaMetodo(this.showerr, met);
      this.va(l); this.paso(l, sc);
      return NADA;
    }
    if (op) {
      if (nivel > 0) throw new NoSoportado("añadir un método a " + op + " dentro de otro bloque");
      const propio = t => t && this.prim.esTipoPropio((/^(\w+)/.exec(t) || [])[1]);
      if (!params.some(p => propio(p.tipo))) throw new NoSoportado("añadir a " + op + " un método que no lleva ningún tipo tuyo");
      let f = this.ext.get(op);
      if (!f) { f = nuevaFuncion(nombre); f.op = op; this.ext.set(op, f); }
      this.agregaMetodo(f, met);
      this.va(l); this.paso(l, sc);
      return NADA;
    }
    const clave = this.modulo ? this.modulo.nombre + "." + nombre : nombre;      // Notas.media (capítulo 23)
    if (!this.firmas.has(clave)) this.firmas.set(clave, []);
    this.firmas.get(clave).push(firma);
    let f = (sc ? this.locs(sc).get(nombre) : null) || this.glob.get(nombre);
    if (f && f.T === "Tipo" && this.prim.esTipoPropio(f.nombre)) {      // Alumna(nombre) = …: un constructor más para el tipo
      const def = this.prim.tipos.get(f.nombre);
      if (!def.fn) def.fn = nuevaFuncion(nombre);
      this.agregaMetodo(def.fn, met);
      if (nivel === 0) { this.va(l); this.paso(l, sc); }
      return NADA;
    }
    if (!f || f.T !== "Funcion") { f = nuevaFuncion(nombre); if (this.modulo) f.modulo = this.modulo; }
    this.agregaMetodo(f, met);
    if (nivel === 0) { this.va(l); this.asigna(nombre, f, sc); this.paso(l, sc); return NADA; }
    this.asigna(nombre, f, sc);
    return f;
  }
  llamaPrograma(f, args, kwargs, elegido) {
    // una función de un módulo corre en su módulo: ve sus variables globales, no las de Main (capítulo 23)
    const modAntes = this.modulo;
    this.modulo = f.modulo || null;
    try { return this.llamaEnModulo(f, args, kwargs, elegido); } finally { this.modulo = modAntes; }
  }
  llamaEnModulo(f, args, kwargs, elegido) {
    const n = args.length;
    const e = elegido || this.eligeMetodo(f, args);
    if (!e) throw V.errorMetodo(f.nombre, args);
    const met = e.m;
    const amb = { vars: new Map(), padre: null, funcion: true, globales: new Set() };
    for (const [k, t] of e.vals || []) amb.vars.set(k, { T: "Tipo", nombre: t });      // los parámetros de where, que son locales
    met.params.forEach((p, i) => { if (p.nombre) amb.vars.set(p.nombre, i < n ? args[i] : this.valor(p.defecto, amb)); });
    for (const p of met.kw) amb.vars.set(p.nombre, kwargs.has(p.nombre) ? kwargs.get(p.nombre) : this.valor(p.defecto, amb));
    for (const k of kwargs.keys()) if (!met.kw.some(p => p.nombre === k)) throw new ErrorJulia("MethodError: no method matching " + f.nombre + "(" + args.map(a => "::" + V.tipo(a)).join(", ") + "; " + k + "::" + V.tipo(kwargs.get(k)) + ")");
    // Julia pone primero los argumentos con nombre (así queda la función por dentro)
    const nombres = met.kw.map(p => p.nombre).concat(met.params.map(p => p.nombre).filter(Boolean));
    if (met.mudo) return this.ejecutaMudo(met.cuerpo, amb);
    const mudo = this.mudo; this.mudo = 0;
    try { return this.llamaTrazada(f, met, amb, nombres); } finally { this.mudo = mudo; }
  }
  llamaTrazada(f, met, amb, nombres) {
    this.entra(f, met, met.linea, amb, nombres);
    const cuerpo = met.cuerpo;
    try {
      if (!cuerpo.length) return this.sale(NADA);
      for (let k = 0; k < cuerpo.length - 1; k++) this.sentencia(cuerpo[k], 1, amb);
      const ult = cuerpo[cuerpo.length - 1];
      this.va(linea(ult));
      if (ult.type === "return_statement") { this.sentencia(ult, 1, amb); }
      const v = this.sentencia(ult, 1, amb, true);
      return this.sale(v);
    } catch (e) {
      if (e instanceof Retorno) return e.v;
      if (e instanceof ErrorJulia) this.abandona(e);
      throw e;
    }
  }
  // Un error sale de una función del programa: la primera vez (en la más interna) se guarda cómo estaba la pila,
  // para el paso del error si nadie lo atrapa; después se cierra el marco (como trazar.jl)
  abandona(e) {
    if (!this.alFallar || this.alFallar.e !== e) this.alFallar = { e, marcos: this.fotoMarcos() };
    if (this.pila.length) this.pila.pop();
  }

  // ── Módulos (capítulo 23) ────────────────────────────────────────────────
  // module Notas … end: un solo paso, como en trazar.jl. Dentro, las definiciones corren sin pasos, con las
  // variables globales del módulo; sus funciones sí dejan pasos cuando se llaman, con el nombre Notas.media
  defineModulo(n, nivel, sc) {
    if (nivel !== 0 || this.modulo) throw new NoSoportado("un módulo dentro de otro bloque");
    const l = linea(n), [nom, ...cuerpo] = hijos(n);
    if (!nom || nom.type !== "identifier") throw new NoSoportado("esta forma de module");
    if (this.globMain.has(nom.text)) throw new NoSoportado("redefinir el módulo " + nom.text);
    this.va(l);
    const m = { T: "Modulo", nombre: nom.text, propio: true, glob: new Map(), exporta: new Set() };
    this.globMain.set(nom.text, m);
    this.modulo = m; this.mudo++;
    try {
      for (const st of cuerpo) {
        if (st.type === "export_statement") { for (const c of hijos(st)) { if (c.type !== "identifier") throw new NoSoportado("export de " + c.text); m.exporta.add(c.text); } continue; }
        if (st.type === "function_definition" || (st.type === "assignment" && this.esDefCorta(st))) { this.defineFuncion(st, 0, null); continue; }
        if (st.type === "const_statement" || st.type === "assignment") { this.sentencia(st, 0, null); continue; }
        throw new NoSoportado("esto dentro de un módulo (" + st.type.replace(/_/g, " ") + ")");
      }
    } finally { this.modulo = null; this.mudo--; }
    this.paso(l, sc);
    return NADA;
  }
  // using .Notas, using .Notas: media, import .Notas: media (import sin dos puntos solo trae el nombre del módulo)
  usa(n, nivel, sc, esImport) {
    if (nivel !== 0) throw new NoSoportado((esImport ? "import" : "using") + " dentro de un bloque");
    const l = linea(n), partes = hijos(n);
    const modulo = p => {
      if (p.type !== "import_path" || !/^\.\w+$/.test(p.text)) throw new NoSoportado((esImport ? "import " : "using ") + p.text + ": el laboratorio sabe using .MiModulo, con un módulo de tu programa");
      const m = this.globMain.get(p.text.slice(1));
      if (!m || m.T !== "Modulo" || !m.propio) throw new NoSoportado((esImport ? "import " : "using ") + p.text + " sin ese módulo en el programa");
      return m;
    };
    const tareas = partes.map(p => {
      if (p.type === "selected_import") {
        const [ruta, ...ns] = hijos(p), m = modulo(ruta);
        for (const c of ns) if (c.type !== "identifier" || !m.glob.has(c.text)) throw new NoSoportado("importar " + c.text + " de " + m.nombre);
        return () => { for (const c of ns) this.importados.set(c.text, m); };
      }
      const m = modulo(p);
      return () => { if (!esImport && !this.usados.includes(m)) this.usados.push(m); };
    });
    this.va(l);
    for (const t of tareas) t();
    this.paso(l, sc);
    return NADA;
  }

  // ── try / catch / finally (capítulo 22) ─────────────────────────────────
  intento(n, sc) {
    const prof = this.pila.length, partes = hijos(n);
    const cc = partes.find(c => c.type === "catch_clause"), fc = partes.find(c => c.type === "finally_clause"), ec = partes.find(c => c.type === "else_clause");
    const cuerpo = partes.filter(c => c !== cc && c !== fc && c !== ec);
    const ambT = this.nuevoAmbito(sc);
    let v = NADA, pendiente = null, bien = false;
    try {
      try {
        v = this.bloque(cuerpo, 1, ambT);
        bien = true;
      } catch (e) {
        if (!(e instanceof ErrorJulia) || !cc) throw e;
        // catch e: el nombre va en la misma línea que catch; lo de debajo es el bloque
        const hs = hijos(cc);
        let nombre = null, cuerpoC = hs;
        if (hs.length && hs[0].type === "identifier" && hs[0].startPosition.row === cc.startPosition.row) { nombre = hs[0].text; cuerpoC = hs.slice(1); }
        const ambC = this.nuevoAmbito(sc);
        if (nombre) ambC.vars.set(nombre, ER.valorDe(e));
        if (!this.mudo) {
          const desde = this.actual;
          while (this.pila.length > prof) this.pila.pop();
          this.ponLocales(this.locs(ambC));
          this.anota({ linea: linea(cc), tipo: "captura", desde, error: e.texto });
        } else while (this.pila.length > prof) this.pila.pop();
        this.atrapados.push(e);
        try { v = this.bloque(cuerpoC, 1, ambC); } finally { this.atrapados.pop(); }
      }
      // else: solo si el try ha ido bien; sus errores no los atrapa el catch, y no ve las locales del try
      if (bien && ec) v = this.bloque(hijos(ec), 1, this.nuevoAmbito(sc));
    } catch (e) { pendiente = e; }
    if (fc) {
      if (pendiente instanceof Retorno || pendiente instanceof Corte) throw new NoSoportado("return, break o continue dentro de un try con finally");
      if (pendiente && !(pendiente instanceof ErrorJulia)) throw pendiente;
      const ambF = this.nuevoAmbito(sc);
      if (!this.mudo) {
        this.lineasFinally.push(this.actual);
        while (this.pila.length > prof) this.pila.pop();
        this.ponLocales(this.locs(ambF));
        this.anota({ linea: linea(fc), tipo: "finally" });
      }
      this.bloque(hijos(fc), 1, ambF);
      if (!this.mudo) this.actual = this.lineasFinally.pop();
    }
    if (pendiente) throw pendiente;
    return v;
  }
  // El texto de un error del programa con su Base.showerror(io::IO, e::MiError), si lo tiene
  escribeError(x, io) {
    const f = this.showerr, e = f ? this.eligeMetodo(f, [io, x]) : null;
    if (!e) return false;
    this.llamaPrograma(f, [io, x], new Map(), e);
    return true;
  }

  // ── Expresiones ────────────────────────────────────────────────────────
  valor(n, sc) {
    switch (n.type) {
      case "integer_literal": {
        const t = n.text.replace(/_/g, "");
        if (/^0[xob]/.test(t)) throw new NoSoportado("los enteros sin signo (0x…)");
        const b = BigInt(t);
        if (b > 9223372036854775807n) throw new NoSoportado("enteros de más de 64 bits");
        return I(b);
      }
      case "float_literal": {
        const t = n.text.replace(/_/g, "");
        if (/f/.test(t) || /^0x/.test(t)) throw new NoSoportado("este tipo de decimal");
        return F(parseFloat(t));
      }
      case "boolean_literal": return B(n.text === "true");
      case "string_literal": return S(this.cadena(n, sc));
      case "prefixed_string_literal": {        // v"1.8.3": un número de versión (capítulo 23)
        const [p] = hijos(n), cs = hijos(n).filter(c => c.type === "content");
        if (p.text !== "v" || hijos(n).some(c => c.type !== "identifier" && c.type !== "content")) throw new NoSoportado("los textos " + p.text + "\"…\"");
        return VN.lee(cs.map(c => c.text).join(""));
      }
      case "character_literal": return Ch(this.caracter(n.text));
      case "identifier": {
        if (n.text === "end") { if (this.fin === undefined) throw new NoSoportado("end fuera de unos corchetes"); return I(this.fin); }
        return this.busca(n.text, sc);
      }
      case "parenthesized_expression": return this.valor(hijos(n)[0], sc);
      case "quote_expression": {        // :nota, :*, :(a + b * 2)
        const c = n.namedChild(0);
        if (c && (c.type === "identifier" || c.type === "operator")) return { T: "Symbol", v: c.text };
        if (c && c.type === "parenthesized_expression") return this.aExpr(c, sc, true);
        throw new NoSoportado("esta expresión con :");
      }
      case "assignment": return this.asignacion(n, sc);
      case "compound_assignment_expression": {
        if (opDe(n) === ".=") {         // x .= v, v[filtro] .= 5: se cambian las casillas, el vector es el mismo
          const [izq, der] = hijos(n), v = this.valor(der, sc);
          if (izq.type === "index_expression") { const [obj, ind] = hijos(izq); const x = this.valor(obj, sc); this.prim.ponIndice(x, this.indices(x, ind, sc), v, true); }
          else this.prim.difundeAsignacion(this.valor(izq, sc), v);
          return v;
        }
        const [izq, der] = hijos(n), op = opDe(n).slice(0, -1);
        if (op.length > 1 && op.startsWith(".")) {      // A .+= 1 es A .= A .+ 1: las mismas casillas
          const v = this.prim.difunde(op.slice(1), [this.valor(izq, sc), this.valor(der, sc)]);
          if (izq.type === "index_expression") {
            const [obj, ind] = hijos(izq); const x = this.valor(obj, sc), idx = this.indices(x, ind, sc);
            this.prim.ponIndice(x, idx, v, true);
            // el valor es una vista de las casillas cambiadas: view(::Matrix{Int64}, :, 3)
            const r = this.prim.indexa(x, idx), is = idx.T === "Indices2" ? idx.a : [idx];
            if (V.esEscalar(r) || !is.every(i => i.T === "Colon" || i.T === "Int64" || i.T === "UnitRange")) return { T: "VistaRara", r };
            return { ...r, vistaTxt: "view(::" + V.tipo(x) + ", " + is.map(i => i.T === "Colon" ? ":" : V.repr(i)).join(", ") + ")" };
          }
          const destino = this.valor(izq, sc);
          this.prim.difundeAsignacion(destino, v);
          return destino.vistaDe ? destino : v;          // fila .+= 100 escribe la vista, no un vector nuevo
        }
        if (izq.type !== "identifier") {
          const v = this.prim.binaria(op, this.valor(izq, sc), this.valor(der, sc));
          this.asignaA(izq, v, sc); return v;
        }
        const v = this.prim.binaria(op, this.busca(izq.text, sc), this.valor(der, sc));
        this.asigna(izq.text, v, sc); return v;
      }
      case "binary_expression": return this.binaria(n, sc);
      case "unary_expression": {
        const op = opDe(n), x = hijos(n)[0];
        if (op === "-" && (x.type === "integer_literal" || x.type === "float_literal")) return this.prim.unaria("-", this.valor(x, sc));
        if (op.length > 1 && op.startsWith(".")) {
          const v = this.valor(x, sc);
          return this.prim.difunde({ T: "Primitiva", nombre: op.slice(1), f: ([e]) => this.prim.unaria(op.slice(1), e) }, [v]);
        }
        return this.prim.unaria(op, this.valor(x, sc));
      }
      case "juxtaposition_expression": {
        const pg = pegado(n);
        if (pg) {
          if (!pegadoSeguro(n, pg)) throw new NoSoportado("leer " + n.text + " junto al resto de la expresión: escribe espacios alrededor del operador (por ejemplo, 1 / (2 + 1))");
          return this.prim.binaria(pg.op, this.valor(pg.a, sc), this.valor(pg.b, sc));
        }
        const [a, b] = hijos(n); return this.prim.binaria("*", this.valor(a, sc), this.valor(b, sc));
      }
      case "call_expression": return this.llamada(n, sc, false);
      case "broadcast_call_expression": return this.llamada(n, sc, true);
      case "vector_expression": return this.prim.vectorLiteral(hijos(n).map(c => this.valor(c, sc)));
      case "matrix_expression": {
        const filas = hijos(n).map(fila => {
          if (fila.type !== "matrix_row") throw new NoSoportado("esta forma de escribir una matriz");
          return hijos(fila).flatMap(casillasFila).map(({ signo, nodo }) => { const v = this.valor(nodo, sc); return signo ? this.prim.unaria(signo, v) : v; });
        });
        return this.prim.matrizLiteral(filas);
      }
      case "adjoint_expression": return this.prim.vista("adjoint", this.valor(hijos(n)[0], sc));
      case "tuple_expression": case "open_tuple": {
        const cs = hijos(n);
        if (cs.length && cs.every(c => c.type === "named_field")) {      // (nombre = "Ana", nota = 9.0): una tupla con nombre
          const nombres = cs.map(c => hijos(c)[0].text);
          if (new Set(nombres).size !== nombres.length) throw new ErrorJulia("syntax: field name \"" + nombres.find((x, i) => nombres.indexOf(x) !== i) + "\" repeated in named tuple");
          return { T: "NamedTuple", nombres, a: cs.map(c => this.valor(hijos(c)[1], sc)) };
        }
        if (cs.some(c => c.type === "named_field")) throw new NoSoportado("una tupla con unos campos con nombre y otros sin él");
        return { T: "Tuple", a: cs.map(c => this.valor(c, sc)) };
      }
      case "field_expression": {
        const [obj, campo] = hijos(n), x = this.valor(obj, sc), c = campo.text;
        if (x.T === "Struct") return this.prim.leeCampo(x, c);
        if (x.T === "Excepcion") return this.prim.leeCampoExc(x, c);
        if (x.T === "Modulo" && x.propio) {          // Notas.media, Notas.MINIMO: un nombre de un módulo del programa
          if (!x.glob.has(c)) throw new ErrorJulia("UndefVarError: `" + c + "` not defined in `" + V.repr(x) + "`\nSuggestion: check for spelling errors or missing imports.");
          return x.glob.get(c);
        }
        if (x.T === "VersionNumber") return VN.campo(x, c);
        if (x.T === "Modulo") {          // Random.seed!(42): una función de un módulo
          const f = (this.prim.modulos[x.nombre] || {})[c];
          if (!f) throw new NoSoportado(x.nombre + "." + c);
          return { T: "Primitiva", nombre: c, f };
        }
        if (x.T === "DataFrame" || x.T === "FilaDF") return this.prim.leeColumna(x, c);
        if (x.T === "NamedTuple") {
          const i = x.nombres.indexOf(c);
          if (i < 0) throw new ErrorJulia("FieldError: type NamedTuple has no field `" + c + "`, available fields: " + x.nombres.map(m => "`" + m + "`").join(", "));
          return x.a[i];
        }
        if (x.T === "Expr") {
          if (c === "head") return EX.sym(x.head);
          if (c === "args") return x.args;
          throw new ErrorJulia("FieldError: type Expr has no field `" + c + "`, available fields: `head`, `args`");
        }
        if (x.T === "QuoteNode" && c === "value") return x.v;
        if (x.T === "Pair") { if (c === "first") return x.a; if (c === "second") return x.b; throw new ErrorJulia("FieldError: type Pair has no field `" + c + "`, available fields: `first`, `second`"); }
        throw new NoSoportado("el campo ." + c + " de un " + V.tipo(x));
      }
      case "range_expression": return this.rango(n, sc);
      case "index_expression": {
        const [obj, ind] = hijos(n);
        if (obj.type === "identifier" && (obj.text in TIPOS || this.prim.esTipoPropio(obj.text)) && ind.type === "vector_expression") {
          if (this.prim.esTipoPropio(obj.text)) return this.prim.vectorTipado(obj.text, hijos(ind).map(c => this.valor(c, sc)));
          return this.prim.vectorTipado(TIPOS[obj.text].nombre, hijos(ind).map(c => this.valor(c, sc)));
        }
        const x = this.valor(obj, sc);
        return this.prim.indexa(x, this.indices(x, ind, sc));
      }
      case "parametrized_type_expression": return { T: "Tipo", nombre: this.nombreTipo(n) };     // Punto{Int64}, Rational{Int64}
      case "macrocall_expression": return this.macro(n, sc);
      case "try_statement": return this.intento(n, sc);
      case "arrow_function_expression": return this.anonima(n, sc);
      case "comprehension_expression": return this.comprension(n, sc);
      case "local_statement": case "global_statement": return this.declaracion(n, sc);
      case "if_statement": case "for_statement": case "while_statement":
        return this.sentencia(n, 1, sc);
      case "ternary_expression": {
        const [c, a, b] = hijos(n);
        return this.booleano(this.valor(c, sc)) ? this.valor(a, sc) : this.valor(b, sc);
      }
    }
    throw new NoSoportado("la construcción «" + n.type.replace(/_/g, " ") + "»");
  }
  cadena(n, sc) {
    let r = "";
    for (let i = 0; i < n.childCount; i++) {
      const c = n.child(i);
      if (c.type === "content") r += c.text;
      else if (c.type === "escape_sequence") r += this.escape(c.text);
      else if (c.type === "string_interpolation") {
        const e = hijos(c)[0];
        // "«$t»": tree-sitter lee t» como un nombre, pero para Julia el nombre acaba en t y » es texto
        const m = e.type === "identifier" && /^[\p{L}_][\p{L}\p{N}\p{Mn}\p{Mc}\p{Pc}\p{Sk}_!′″‴]*/u.exec(e.text);
        if (m && m[0] !== e.text) { r += V.texto(this.valor({ type: "identifier", text: m[0], namedChildren: [], childCount: 0, startPosition: e.startPosition }, sc)) + e.text.slice(m[0].length); continue; }
        r += V.texto(this.valor(e, sc));
      }
    }
    if (n.text.startsWith('"""')) throw new NoSoportado("las cadenas de tres comillas");
    return r;
  }
  escape(t) { const m = { "\\n": "\n", "\\t": "\t", "\\\"": '"', "\\\\": "\\", "\\$": "$", "\\'": "'", "\\r": "\r", "\\0": "\0" }; if (t in m) return m[t]; throw new NoSoportado("la secuencia " + t); }
  caracter(t) { const c = t.slice(1, -1); return c.startsWith("\\") ? this.escape(c) : c; }
  asignacion(n, sc) {
    const [izq, der] = hijos(n);
    const v = this.valor(der, sc);
    this.asignaA(izq, v, sc);
    return v;
  }
  asignaA(izq, v, sc) {
    if (izq.type === "identifier") { this.asigna(izq.text, v, sc); return; }
    if (izq.type === "index_expression") {
      const [obj, ind] = hijos(izq);
      const x = this.valor(obj, sc);
      this.prim.ponIndice(x, this.indices(x, ind, sc), v);
      return;
    }
    if (izq.type === "field_expression") {      // f.faltas = 2: solo en un mutable struct
      const [obj, campo] = hijos(izq), x = this.valor(obj, sc);
      if (x.T === "DataFrame" || x.T === "FilaDF") { this.prim.ponColumna(x, campo.text, v); return; }
      if (x.T === "Expr" && campo.text === "head" && v.T === "Symbol") { x.head = v.v; return; }
      if (x.T === "Expr") throw new NoSoportado("cambiar el campo " + campo.text + " de una expresión");
      if (x.T !== "Struct") throw new NoSoportado("cambiar el campo de un " + V.tipo(x));
      this.prim.ponCampo(x, campo.text, v);
      return;
    }
    if (izq.type === "tuple_expression" || izq.type === "open_tuple") {
      const vs = this.prim.itera(v); hijos(izq).forEach((d, i) => this.asignaA(d, vs[i], sc)); return;
    }
    throw new NoSoportado("asignar a «" + izq.type.replace(/_/g, " ") + "»");
  }
  declaracion(n, sc) {
    const local = n.type === "local_statement";
    let v = NADA;
    for (const c of hijos(n)) {
      if (c.type === "identifier") { if (local) sc && sc.vars.set(c.text, NADA); else this.marcaGlobal(c.text, sc); continue; }
      if (c.type === "assignment") {
        const [izq, der] = hijos(c);
        v = this.valor(der, sc);
        if (local && sc) sc.vars.set(izq.text, v);
        else if (local) this.glob.set(izq.text, v);
        else { this.marcaGlobal(izq.text, sc); this.glob.set(izq.text, v); }
        continue;
      }
      if (c.type === "compound_assignment_expression" && !local) {     // global llamadas += 1
        const [izq] = hijos(c);
        if (izq.type !== "identifier") throw new NoSoportado("esta declaración");
        this.marcaGlobal(izq.text, sc); v = this.valor(c, sc); continue;
      }
      throw new NoSoportado("esta declaración");
    }
    return v;
  }
  marcaGlobal(nombre, sc) { for (let s = sc; s; s = s.padre) if (s.funcion) { s.globales.add(nombre); return; } }
  indices(x, ind, sc) {
    const viejo = this.fin;
    try {
      const partes = partesIndice(ind);
      const uno = p => p.type === "operator" && p.text === ":" ? { T: "Colon" } : p.type === "operator" && p.text === "!" ? { T: "Bang" } : this.valor(p, sc);
      if (partes.length === 2) {
        if (x.T === "DataFrame") { const r = []; partes.forEach((p, k) => { this.fin = k === 0 ? (x.cols.length ? V.largo(x.cols[0]) : 0) : undefined; r.push(uno(p)); }); return { T: "Indices2", a: r }; }
        if (!MX.esMatriz(x)) throw new NoSoportado("dos índices en un " + V.tipo(x));
        const ds = MX.dims(x), r = [];
        partes.forEach((p, k) => { this.fin = ds[k]; r.push(uno(p)); });
        return { T: "Indices2", a: r };
      }
      if (partes.length !== 1) throw new NoSoportado("indexar con " + partes.length + " índices");
      this.fin = V.esVector(x) || x.T === "Tuple" || x.T === "String" || MX.esMatriz(x) ? (x.T === "String" ? this.prim.ultimoIndice(x) : V.largo(x)) : undefined;
      return uno(partes[0]);
    } finally { this.fin = viejo; }
  }
  rango(n, sc) {
    const ps = hijos(n);
    let a, s = null, b;
    if (ps[0].type === "range_expression" && !this.entreParentesis(ps[0])) { const q = hijos(ps[0]); a = this.valor(q[0], sc); s = this.valor(q[1], sc); b = this.valor(ps[1], sc); }
    else { a = this.valor(ps[0], sc); b = this.valor(ps[1], sc); }
    return this.prim.rango(a, s, b);
  }
  entreParentesis(n) { return n.type === "parenthesized_expression"; }
  binaria(n, sc) {
    const op = opDe(n), [a, b] = hijos(n);
    if (op === "&&" || op === "||") {
      const x = this.valor(a, sc);
      if (x.T !== "Bool") throw new ErrorJulia("TypeError: non-boolean (" + V.tipo(x) + ") used in boolean context");
      if (op === "&&" ? !x.v : x.v) return x;
      const y = this.valor(b, sc);
      return y;
    }
    if (op === "=") return this.asignacion(n, sc);
    // a ^ b ^ c es a ^ (b ^ c), y a => b => c es a => (b => c); tree-sitter los lee al revés
    const cadena = this.cadenaDerecha(n);
    if (cadena) {
      const vals = cadena.map(c => this.valor(c, sc));
      let r = vals[vals.length - 1];
      for (let k = vals.length - 2; k >= 0; k--) {
        const ult = cadena[k + 1];
        if (op === "^" && k === vals.length - 2 && ult.type === "unary_expression" && opDe(ult) === "-" && hijos(ult)[0].type === "integer_literal" && vals[k].T === "Int64") r = this.prim.binaria("^", F(Number(vals[k].v)), r);
        else r = this.prim.binaria(op, vals[k], r);
      }
      return r;
    }
    if (op === ".=") { const v = this.valor(b, sc); this.prim.difundeAsignacion(this.valor(a, sc), v); return v; }
    if (op === "->" ) throw new NoSoportado("->");
    if (op === "|>") { const x = this.valor(a, sc), f = this.valor(b, sc); return this.aplica(f, [x], new Map()); }
    // .&& y .||: casilla a casilla, y cada casilla tiene que ser true o false
    if (op === ".&&" || op === ".||") {
      const x = this.valor(a, sc), y = this.valor(b, sc);
      const f = { T: "Primitiva", nombre: op.slice(1), f: ([p, q]) => {
        if (p.T !== "Bool") throw new ErrorJulia("TypeError: non-boolean (" + V.tipo(p) + ") used in boolean context");
        return (op === ".&&" ? !p.v : p.v) ? p : q; } };
      return this.prim.difunde(f, [x, y]);
    }
    // comparaciones encadenadas con punto: a .< b .< c es (a .< b) .& (b .< c)
    const esCmpPunto = o => o && o.startsWith(".") && COMPARA.has(o.slice(1));
    if (esCmpPunto(op) && a.type === "binary_expression" && esCmpPunto(opDe(a))) {
      const [a1, a2] = hijos(a);
      const x1 = this.valor(a1, sc), m = this.valor(a2, sc), z = this.valor(b, sc);
      const izq = this.prim.difunde(opDe(a).slice(1), [x1, m]), der = this.prim.difunde(op.slice(1), [m, z]);
      return this.prim.difunde("&", [izq, der]);
    }
    // comparaciones encadenadas: 1 < x <= 3
    if (COMPARA.has(op) && a.type === "binary_expression" && COMPARA.has(opDe(a))) {
      const [a1, a2] = hijos(a);
      const izq = this.binaria(a, sc);
      if (izq.T !== "Bool") throw new ErrorJulia("TypeError: non-boolean (" + V.tipo(izq) + ") used in boolean context");
      if (!izq.v) return izq;
      return this.prim.binaria(op, this.valor(a2, sc), this.valor(b, sc));
    }
    const x = this.valor(a, sc), y = this.valor(b, sc);
    if (op.startsWith(".") && op.length > 1 && op !== "...") return this.prim.difunde(op.slice(1), [x, y]);
    if (op === "^" && b.type === "unary_expression" && opDe(b) === "-" && hijos(b)[0].type === "integer_literal" && x.T === "Int64") return this.prim.binaria("^", F(Number(x.v)), y);
    return this.prim.binaria(op, x, y);
  }
  // los operandos de una cadena a ^ b ^ c (o =>, &&, ||) que tree-sitter ha leído como (a ^ b) ^ c
  cadenaDerecha(n) {
    const op = opDe(n);
    if (!["^", "=>", "&&", "||"].includes(op)) return null;
    let iz = hijos(n)[0];
    if (iz.type !== "binary_expression" || opDe(iz) !== op) return null;
    const xs = [hijos(n)[1]];
    while (iz.type === "binary_expression" && opDe(iz) === op) { xs.unshift(hijos(iz)[1]); iz = hijos(iz)[0]; }
    xs.unshift(iz);
    return xs;
  }
  argumentos(lista, sc) {
    const args = [], kw = new Map();
    const cs = hijos(lista);
    if (cs.some(c => c.type === "for_clause")) {        // sum(x^2 for x in v): un generador
      const cuerpo = cs[0], clausulas = cs.slice(1);
      if (!clausulas.every(c => c.type === "for_clause" || c.type === "if_clause")) throw new NoSoportado("este generador");
      return [[{ T: "Iter", nombre: "generador", a: this.generar(cuerpo, clausulas, sc) }], kw];
    }
    for (let i = 0; i < lista.childCount; i++) {
      const c = lista.child(i);
      if (!c.isNamed || c.type === "line_comment") continue;
      if (c.type === "named_argument") { const [k, v] = hijos(c); kw.set(k.text, this.valor(v, sc)); }
      else if (c.type === "splat_expression") throw new NoSoportado("los argumentos con ...");
      else if (c.type === "operator" && c.text === ":") args.push({ T: "Colon" });         // view(A, :, 2)
      else args.push(this.valor(c, sc));
    }
    return [args, kw];
  }
  llamada(n, sc, difundir) {
    // !(x == 3) o +(1, 2): un operador escrito como función
    if (n.namedChild(0).type === "operator") {
      const op = n.namedChild(0).text, lista0 = n.namedChildren.find(c => c.type === "argument_list");
      const [args] = this.argumentos(lista0, sc);
      if (difundir) return this.prim.difunde(op, args);
      // ==(6), <(3): con un solo argumento, una comparación a medio hacer (Base.Fix2)
      if (args.length === 1 && ["==", "!=", "≠", "<", "<=", "≤", ">", ">=", "≥", "===", "!==", "∈", "∉"].includes(op)) {
        const y = args[0], prim = this.prim;
        return { T: "Primitiva", nombre: op + "(" + V.repr(y) + ")", fix: true, f: ([x]) => prim.binaria(op, x, y) };
      }
      return args.length === 1 ? this.prim.unaria(op, args[0]) : args.slice(1).reduce((a, b) => this.prim.binaria(op, a, b), args[0]);
    }
    const fn = hijos(n)[0];
    const lista = n.namedChildren.find(c => c.type === "argument_list");
    if (fn.type === "parametrized_type_expression" && !difundir) {     // Dict{String, Int}()
      const [nom, llaves] = hijos(fn);
      if (this.prim.esTipoPropio(nom.text) && !this.glob.has(nom.text + "!")) {        // Punto{Float64}(1, 2)
        const [args, kw] = this.argumentos(lista, sc);
        return this.prim.creaStruct(nom.text, args, kw, hijos(llaves).map(c => this.nombreTipo(c)));
      }
      if (nom.text !== "Dict") throw new NoSoportado("el constructor " + fn.text);
      const ps = hijos(llaves).map(c => this.nombreTipo(c));
      if (ps.length !== 2) throw new NoSoportado("Dict con " + ps.length + " parámetros");
      const [args, kw] = this.argumentos(lista, sc);
      if (kw.size) throw new NoSoportado("Dict con argumentos con nombre");
      return this.prim.creaDict(args, ps[0], ps[1]);
    }
    if (fn.type === "identifier" && !difundir && fn.text in TIPOS && !this.glob.has(fn.text)) {
      const [args, kw] = this.argumentos(lista, sc);
      return this.prim.construye(TIPOS[fn.text].nombre, args, kw);
    }
    const f = this.valor(fn, sc);
    const [args, kw] = this.argumentos(lista, sc);
    if (args.some(a => a.T === "Colon") && !(f.T === "Primitiva" && f.nombre === "view" && !difundir)) throw new NoSoportado("un : suelto como argumento");
    if (difundir) return this.prim.difunde(f, args, kw);
    return this.aplica(f, args, kw);
  }
  // el nombre de un tipo escrito en el programa: Int → Int64, Vector{Int} → Vector{Int64}
  nombreTipo(c) {
    const NOMBRES = { Int: "Int64", Int64: "Int64", Float64: "Float64", String: "String", Char: "Char", Bool: "Bool", Any: "Any", Real: "Real", Integer: "Integer", AbstractString: "AbstractString", Number: "Number",
      Signed: "Signed", AbstractFloat: "AbstractFloat", AbstractChar: "AbstractChar", Nothing: "Nothing", Missing: "Missing", VersionNumber: "VersionNumber" };
    if (c.type === "identifier" && NOMBRES[c.text]) return NOMBRES[c.text];
    if (c.type === "identifier" && this.prim.esTipoPropio(c.text)) return c.text;
    if (c.type === "parametrized_type_expression") {
      const [nom, ll] = hijos(c);
      const [q] = hijos(ll);
      if (nom.text === "Vector" && q && q.type === "unary_expression" && opDe(q) === "<:") return "Vector{<:" + this.nombreTipo(hijos(q)[hijos(q).length - 1]) + "}";
      if (nom.text === "Vector") return "Vector{" + hijos(ll).map(x => this.nombreTipo(x)).join(", ") + "}";
      if (nom.text === "Rational" && q && q.text === "Int64" && hijos(ll).length === 1) return "Rational{Int64}";
      if (this.prim.esTipoPropio(nom.text) && this.prim.tipos.get(nom.text).params) return nom.text + "{" + hijos(ll).map(x => this.nombreTipo(x)).join(", ") + "}";
    }
    throw new NoSoportado("el tipo " + c.text);
  }
  aplica(f, args, kw) {
    if (f.T === "Funcion") return f.anonima ? f.llama(args) : this.llamaPrograma(f, args, kw);
    if (f.T === "Primitiva") return f.f(args, kw);
    if (f.T === "Tipo" && ["Expr", "QuoteNode", "Symbol"].includes(f.nombre)) return this.prim.funcion(f.nombre).f(args, kw);
    if (f.T === "Tipo") {
      const def = this.prim.tipos.get(f.nombre);
      const e = def && def.fn ? this.eligeMetodo(def.fn, args) : null;
      if (e) return this.llamaPrograma(def.fn, args, kw, e);
      return this.prim.construye(f.nombre, args, kw);
    }
    throw new ErrorJulia("MethodError: objects of type " + V.tipo(f) + " are not callable\nThe object of type `" + V.tipo(f) + "` exists, but no method is defined for this combination of argument types when trying to treat it as a callable object.");
  }
  // x -> x + 1: trazar.jl no recorre por dentro las funciones anónimas, y aquí tampoco
  anonima(n, sc) {
    const [p, cuerpo] = hijos(n);
    const ps = p.type === "identifier" ? [p.text] : p.type === "tuple_expression" ? hijos(p).map(c => c.text) : null;
    if (!ps) throw new NoSoportado("esta función anónima");
    const prog = this;
    return { T: "Funcion", nombre: "#anonima", anonima: true, metodos: [], nmetodos: () => 1,
      llama(args) {
        if (args.length !== ps.length) throw new ErrorJulia("MethodError: no method matching (anonymous function)");
        const amb = { vars: new Map(ps.map((x, i) => [x, args[i]])), padre: sc, funcion: true, globales: new Set() };
        return prog.valorSinTraza(cuerpo, amb);
      } };
  }
  valorSinTraza(n, sc) { return this.valor(n, sc); }
  comprension(n, sc) {
    const [cuerpo, ...clausulas] = hijos(n);
    if (!clausulas.length || !clausulas.every(c => c.type === "for_clause" || c.type === "if_clause")) throw new NoSoportado("esta comprensión");
    const enl = clausulas.length === 1 ? hijos(clausulas[0]).filter(c => c.type === "for_binding") : [];
    if (enl.length === 2) {          // [f(i, j) for i in 1:3, j in 1:4]: una matriz; i corre más deprisa (por columnas)
      const [di, fi] = [hijos(enl[0])[0], hijos(enl[0]).slice(-1)[0]], [dj, fj] = [hijos(enl[1])[0], hijos(enl[1]).slice(-1)[0]];
      const is = this.prim.itera(this.valor(fi, sc)), js = this.prim.itera(this.valor(fj, sc)), r = [];
      for (const y of js) for (const x of is) {
        const it = { vars: new Map(), padre: sc, funcion: false }; this.liga(di, x, it); this.liga(dj, y, it);
        r.push(this.valor(cuerpo, it));
      }
      if (!r.length) throw new NoSoportado("una matriz vacía");
      const v = this.prim.recoge(r);
      return MX.mat(v.el, is.length, js.length, v.a);
    }
    const res = this.generar(cuerpo, clausulas, sc);
    if (!res.length) throw new NoSoportado("una comprensión que no da ningún valor (vector vacío sin tipo)");
    return this.prim.recoge(res);
  }
  // los valores de [cuerpo for x in xs if cond] o de (cuerpo for x in xs if cond)
  generar(cuerpo, clausulas, sc) {
    const fors = clausulas.filter(c => c.type === "for_clause"), ifs = clausulas.filter(c => c.type === "if_clause");
    if (fors.length !== 1 || ifs.length > 1 || clausulas[0].type !== "for_clause") throw new NoSoportado("una comprensión con varios for o if");
    const enlaces = hijos(fors[0]).filter(c => c.type === "for_binding");
    if (enlaces.length !== 1) throw new NoSoportado("una comprensión con varios for");
    const [d, fuente] = [hijos(enlaces[0])[0], hijos(enlaces[0]).slice(-1)[0]];
    const xs = this.prim.itera(this.valor(fuente, sc)), res = [];
    for (const x of xs) {
      const it = { vars: new Map(), padre: sc, funcion: false }; this.liga(d, x, it);
      if (ifs.length) { const c = this.valor(hijos(ifs[0])[0], it); if (c.T !== "Bool") throw new ErrorJulia("TypeError: non-boolean (" + V.tipo(c) + ") used in boolean context"); if (!c.v) continue; }
      res.push(this.valor(cuerpo, it));
    }
    return res;
  }
  // ── El código como dato (capítulo 20) ─────────────────────────────────
  // Un trozo del árbol de tree-sitter como la Expr que lee Julia. interp: dentro de :( … ), $x mete el valor
  // de x (en el ámbito sc); en los argumentos de una macro y en Meta.parse, $ no se puede usar.
  aExpr(n, sc, interp) {
    const E = EX.nuevaExpr, Sy = EX.sym, ex = c => this.aExpr(c, sc, interp);
    const no = que => { throw new NoSoportado(que + " dentro de una expresión :( … )"); };
    switch (n.type) {
      case "identifier": case "operator": return Sy(n.text);
      case "integer_literal": case "float_literal": case "boolean_literal": case "character_literal": return this.valor(n, sc);
      case "string_literal":
        if (n.namedChildren.some(c => c.type === "string_interpolation")) no("un texto con $");
        return this.valor(n, sc);
      case "parenthesized_expression": {
        const cs = partesIndice(n);          // :(==): el operador solo es un nodo «operator»
        if (cs.length !== 1) no("un bloque ( ; )");
        return ex(cs[0]);
      }
      case "interpolation_expression": {
        if (!interp) throw new NoSoportado("$ fuera de una expresión :( … )");
        let c = n.namedChild(0);
        if (c.type === "parenthesized_expression" && hijos(c).length === 1) c = hijos(c)[0];
        const v = this.valor(c, sc);
        if (!EX.cabeEnExpr(v)) throw new NoSoportado("meter un " + V.tipo(v) + " dentro de una expresión con $");
        return v;
      }
      case "binary_expression": {
        if (pegado(n)) no("esta división pegada");
        const op = opDe(n), [a, b] = hijos(n);
        if (["<:", ">:", "::", "->"].includes(op)) no("el operador " + op);
        const cad = this.cadenaDerecha(n);
        if (cad) {          // a ^ b ^ c: a ^ (b ^ c)
          let r = ex(cad[cad.length - 1]);
          for (let k = cad.length - 2; k >= 0; k--) r = op === "&&" || op === "||" ? E(op, [ex(cad[k]), r]) : E("call", [Sy(op), ex(cad[k]), r]);
          return r;
        }
        if (op === "&&" || op === "||") return E(op, [ex(a), ex(b)]);
        if (EX.precOp(op) === 7 && op !== "isa" || ["in"].includes(op)) {        // a < b < c: una :comparison
          const partes = [b], ops = [op];
          let iz = a;
          while (iz.type === "binary_expression" && EX.precOp(opDe(iz)) === 7 && !["<:", ">:"].includes(opDe(iz))) { partes.unshift(hijos(iz)[1]); ops.unshift(opDe(iz)); iz = hijos(iz)[0]; }
          partes.unshift(iz);
          if (partes.length === 2) return E("call", [Sy(op), ex(a), ex(b)]);
          const args = [];
          partes.forEach((p, i) => { args.push(ex(p)); if (i < ops.length) args.push(Sy(ops[i])); });
          return E("comparison", args);
        }
        if (!EX.precOp(op)) no("el operador " + op);
        if (op === "+" || op === "*") {          // a + b + c: Julia la lee como +(a, b, c)
          const xs = [b];
          let iz = a;
          while (iz.type === "binary_expression" && opDe(iz) === op && !pegado(iz)) { xs.unshift(hijos(iz)[1]); iz = hijos(iz)[0]; }
          xs.unshift(iz);
          return E("call", [Sy(op), ...xs.map(ex)]);
        }
        return E("call", [Sy(op), ex(a), ex(b)]);
      }
      case "unary_expression": {
        const op = opDe(n), [a] = hijos(n);
        if ((op === "-" || op === "+") && (a.type === "integer_literal" || a.type === "float_literal")) {      // -1 es un número
          const v = this.valor(a, sc);
          return op === "+" ? v : this.prim.unaria("-", v);
        }
        if (op === "-" && a.type === "juxtaposition_expression") {        // -2x es (-2) * x
          const [k, y] = hijos(a);
          if (["integer_literal", "float_literal"].includes(k.type) && hijos(a).length === 2) return E("call", [Sy("*"), this.prim.unaria("-", this.valor(k, sc)), ex(y)]);
        }
        if (!["-", "+", "!", "√"].includes(op)) no("el operador " + op);
        return E("call", [Sy(op), ex(a)]);
      }
      case "juxtaposition_expression": {
        const cs = hijos(n);
        if (cs.length !== 2 || !["integer_literal", "float_literal"].includes(cs[0].type) || !["identifier", "parenthesized_expression"].includes(cs[1].type)) no("esta multiplicación sin *");
        return E("call", [Sy("*"), this.valor(cs[0], sc), ex(cs[1])]);
      }
      case "call_expression": {
        const f = n.namedChild(0), lista = n.namedChildren.find(c => c.type === "argument_list");
        if (!lista || n.namedChildren.some(c => c.type === "do_clause")) no("esta llamada");
        if (!["identifier", "operator", "interpolation_expression", "field_expression", "parenthesized_expression"].includes(f.type)) no("esta llamada");
        const args = [];
        for (let i = 0; i < lista.childCount; i++) {
          const c = lista.child(i);
          if (c.type === ";") no("una llamada con argumentos con nombre");
          if (!c.isNamed || c.type === "line_comment") continue;
          if (c.type === "named_argument" || c.type === "splat_expression") no("una llamada con argumentos con nombre o con ...");
          args.push(ex(c));
        }
        return E("call", [ex(f), ...args]);
      }
      case "index_expression": {
        const [obj, ind] = hijos(n);
        if (ind.type !== "vector_expression") no("este índice");
        return E("ref", [ex(obj), ...partesIndice(ind).map(ex)]);
      }
      case "field_expression": {
        const [obj, campo] = hijos(n);
        if (campo.type !== "identifier") no("este campo");
        return E(".", [ex(obj), { T: "QuoteNode", v: Sy(campo.text) }]);
      }
      case "tuple_expression": case "open_tuple":
        if (hijos(n).some(c => c.type === "named_field")) no("una tupla con nombre");
        return E("tuple", hijos(n).map(ex));
      case "vector_expression": return E("vect", hijos(n).map(ex));
      case "range_expression": {
        let cs = hijos(n);
        if (cs.length === 2 && cs[0].type === "range_expression" && hijos(cs[0]).length === 2) cs = [...hijos(cs[0]), cs[1]];       // 1:2:9
        if (cs.length < 2 || cs.length > 3) no("este rango");
        return E("call", [Sy(":"), ...cs.map(ex)]);
      }
      case "quote_expression": {
        const c = n.namedChild(0);
        if (c && (c.type === "identifier" || c.type === "operator")) return { T: "QuoteNode", v: Sy(c.text) };
        no("una expresión :( ) dentro de otra");
      }
      case "assignment": {
        const [a, b] = hijos(n);
        // f(x) = 2x: Julia guarda el cuerpo en un bloque, con la línea en que lo ha leído
        if (a.type === "call_expression") return E("=", [ex(a), E("block", [{ T: "LineNumberNode", line: linea(n), file: this.leyendo || "programa.jl" }, ex(b)])]);
        return E("=", [ex(a), ex(b)]);
      }
      case "compound_assignment_expression": {
        const op = opDe(n), [a, b] = hijos(n);
        if (EX.precOp(op) !== 1) no("el operador " + op);
        return E(op, [ex(a), ex(b)]);
      }
    }
    no("«" + n.type.replace(/_/g, " ") + "»");
  }
  // eval(x): ejecutar una expresión en el ámbito global, como Core.eval(Main, x). Se escribe como código, se lee
  // con tree-sitter y se ejecuta como lo demás (los mismos errores, las mismas llamadas). Una función que se
  // define así no la ha reescrito trazar.jl: no deja pasos ni marcos (mudo), y Julia no guarda su firma
  // Las globales nuevas que crea eval no se ven en la foto hasta que el programa principal pasa a la sentencia
  // siguiente (Julia 1.12+: cada sentencia corre en la «edad del mundo» en que empezó). @eval escrito en el
  // programa principal (no dentro de una función) llama a Core.eval directamente y pone el mundo al día
  evalua(x, sc = null, directo = false) {
    if (x.T === "Symbol") return this.busca(x.v, sc);
    if (x.T === "QuoteNode") return x.v;
    if (x.T === "GlobalRef") return this.busca(x.name, null);
    if (x.T !== "Expr") return x;
    const nodo = this.leeCodigo(EX.codigoExpr(x));
    const antes = new Set(this.glob.keys());
    try {
      if (!sc && (nodo.type === "function_definition" || (nodo.type === "assignment" && this.esDefCorta(nodo)))) return this.defineFuncion(nodo, 1, null, true);
      const mudo = this.mudo; this.mudo = (this.mudo || 0) + 1;
      try { return this.valor(nodo, sc); } finally { this.mudo = mudo; }
    } finally {
      if (directo && !this.pila.length && !this.mudo) this.pendientes.clear();
      else for (const k of this.glob.keys()) if (!antes.has(k)) this.pendientes.add(k);
    }
  }
  leeCodigo(texto) {
    const arbol = this.parser.parse(texto);
    const cs = hijos(arbol.rootNode);
    if (arbol.rootNode.hasError || cs.length !== 1) throw new NoSoportado("volver a leer la expresión " + texto);
    return cs[0];
  }
  // macro dime(ex) … end: una función que recibe código y devuelve código. trazar.jl no la reescribe
  defineMacro(n) {
    const sig = hijos(n).find(c => c.type === "signature"), llamada = sig && hijos(sig)[0];
    if (!llamada || llamada.type !== "call_expression" || llamada.namedChild(0).type !== "identifier") throw new NoSoportado("esta forma de definir una macro");
    const lista = llamada.namedChildren.find(c => c.type === "argument_list");
    const params = hijos(lista).map(c => { if (c.type !== "identifier") throw new NoSoportado("este argumento de una macro"); return { nombre: c.text }; });
    const nombre = "@" + llamada.namedChild(0).text;
    let f = this.glob.get(nombre);
    if (!f || !f.macro) { f = nuevaFuncion(nombre); f.macro = true; }
    this.agregaMetodo(f, { params, kw: [], cuerpo: hijos(n).filter(c => c.type !== "signature"), linea: linea(n) });
    this.glob.set(nombre, f);
  }
  argsMacro(n) {
    const l = n.namedChildren.find(c => c.type === "macro_argument_list");
    if (l) return hijos(l);
    const a = n.namedChildren.find(c => c.type === "argument_list");      // @dime(x + 1)
    return a ? hijos(a) : [];
  }
  // la expansión de una llamada a una macro del programa, con la higiene de Julia: lo que la macro protege con
  // esc es del que la llama; el resto de nombres son globales de Main (Main.println)
  expandeMacro(n, sc, mas = []) {
    const nombre = "@" + hijos(hijos(n)[0])[0].text, f = this.glob.get(nombre);
    const args = [...this.argsMacro(n), ...mas].map(a => this.aExpr(a, sc, false));
    const met = f.metodos.find(m => m.params.length === args.length);
    if (!met) throw new ErrorJulia("MethodError: no method matching " + nombre + "(::LineNumberNode, ::Module" + args.map(a => ", ::" + V.tipo(a)).join("") + ")");
    const amb = { vars: new Map(met.params.map((p, i) => [p.nombre, args[i]])), padre: null, funcion: true, globales: new Set() };
    const salida = this.salida, r = this.ejecutaMudo(met.cuerpo, amb);
    // Julia expande la macro una vez, al leer el código; el laboratorio, cada vez que llega a la línea. Solo se nota
    // si la macro escribe algo mientras trabaja
    if (this.salida !== salida) throw new NoSoportado("una macro que escribe en la consola mientras se expande: Julia la expande una sola vez, al leer el código, y el laboratorio cada vez que llega a la línea");
    return this.higiene(r);
  }
  higiene(x) {
    if (x.T === "Symbol") return { T: "GlobalRef", mod: "Main", name: x.v };
    if (x.T !== "Expr") return x;
    const a = x.args.a;
    if (x.head === "escape") { if (a.length !== 1) throw new NoSoportado("este esc"); return this.sinEscape(a[0]); }
    if (x.head === "=" || EX.precOp(x.head) === 1) throw new NoSoportado("una macro que asigna a una variable sin esc: Julia le pone un nombre nuevo (higiene) que el laboratorio no imita");
    if (["macrocall", "block", "quote", "function", "->", "let", "for", "while", "if", "kw", "parameters", "local", "global"].includes(x.head)) throw new NoSoportado("una macro que devuelve una expresión con :" + x.head);
    if (x.head === ".") return EX.nuevaExpr(".", [this.higiene(a[0]), ...a.slice(1)]);
    return EX.nuevaExpr(x.head, a.map(e => this.higiene(e)));
  }
  sinEscape(x) {
    if (x.T !== "Expr") return x;
    if (x.head === "escape") return this.sinEscape(x.args.a[0]);
    return EX.nuevaExpr(x.head, x.args.a.map(e => this.sinEscape(e)));
  }
  // ejecutar la expansión donde está la llamada: los Main.x se buscan en las globales; si alguno coincide con
  // una variable local de ese sitio, el laboratorio no sabe distinguirlos y lo dice
  evaluaExpansion(x, sc) {
    if (sc) {
      const locs = new Set();
      for (let s = sc; s; s = s.padre) { for (const k of s.vars.keys()) locs.add(k); if (s.funcion) break; }
      const mira = e => { if (e.T === "GlobalRef" && locs.has(e.name)) throw new NoSoportado("una macro que usa " + e.name + " sin esc donde también hay una variable local " + e.name + ": Julia busca la global (higiene) y el laboratorio no lo imita"); if (e.T === "Expr") e.args.a.forEach(mira); };
      mira(x);
    }
    if (x.T === "GlobalRef") return this.busca(x.name, null);
    if (x.T !== "Expr") return this.evalua(x, sc);
    const nodo = this.leeCodigo(EX.codigoExpr(x));
    return this.valor(nodo, sc);
  }
  // el cuerpo de una macro o de una función definida con eval: corre sin dejar pasos (trazar.jl no lo reescribe)
  ejecutaMudo(cuerpo, amb) {
    this.mudo = (this.mudo || 0) + 1;
    try {
      let v = NADA;
      for (let k = 0; k < cuerpo.length; k++) v = this.sentencia(cuerpo[k], 1, amb, k === cuerpo.length - 1 && cuerpo[k].type !== "return_statement");
      return v;
    } catch (e) {
      if (e instanceof Retorno) return e.v;
      throw e;
    } finally { this.mudo--; }
  }
  macro(n, sc) {
    const nombre = hijos(hijos(n)[0])[0]?.text;
    const args = this.argsMacro(n);
    const propia = this.glob.get("@" + nombre);
    if (propia && propia.macro) return this.evaluaExpansion(this.expandeMacro(n, sc), sc);
    if (nombre === "macroexpand" || nombre === "macroexpand1") {
      // @macroexpand @suma x 10: tree-sitter da a @suma solo la x; para Julia, @suma se lleva toda la línea
      if (!args.length || args[0].type !== "macrocall_expression") throw new NoSoportado("@" + nombre + " de algo que no es una llamada a una macro");
      const m = hijos(hijos(args[0])[0])[0]?.text, f = this.glob.get("@" + m);
      if (!f || !f.macro) throw new NoSoportado("@" + nombre + " de la macro @" + m + ": el laboratorio solo expande las macros que define el programa");
      return this.expandeMacro(args[0], sc, args.slice(1));
    }
    if (nombre === "view") {           // @view v[2:4]: una vista de esas casillas
      if (args.length !== 1 || args[0].type !== "index_expression") throw new NoSoportado("@view de algo que no es un índice, v[…]");
      const [obj, ind] = hijos(args[0]), x = this.valor(obj, sc);
      return this.prim.subvista(x, this.indices(x, ind, sc));
    }
    if (nombre === "test" || nombre === "test_throws") return this.prueba(n, nombre, args, sc);
    if (nombre === "views") throw new NoSoportado("la macro @views: cambia por vistas todos los trozos de un bloque, y el laboratorio aún no lo hace. Escribe @view en cada trozo");
    if (nombre === "eval") {
      if (args.length !== 1) throw new NoSoportado("@eval con varios argumentos");
      return this.evalua(this.aExpr(args[0], sc, true), null, true);
    }
    if (nombre === "show") {
      let v = NADA;
      for (const a of args) { v = this.valor(a, sc); this.salida += this.escribe(a) + " = " + V.repr(v) + "\n"; }
      return v;
    }
    // medir: el resultado depende del ordenador (y de cómo compila Julia), así que el laboratorio no lo inventa
    if (["time", "elapsed", "timed", "allocated", "allocations", "btime", "belapsed", "benchmark", "timev"].includes(nombre))
      throw new NoSoportado("la macro @" + nombre + ": medir tiempos o memoria depende del ordenador y de cómo compila Julia por dentro, y el laboratorio no lo puede imitar. Mídelo en la nube o en tu ordenador");
    if (["code_warntype", "code_typed", "code_llvm", "code_native", "code_lowered", "which", "profile"].includes(nombre))
      throw new NoSoportado("la macro @" + nombre + ": enseña lo que hace el compilador de Julia, que el laboratorio no tiene. Pruébalo en la nube o en tu ordenador");
    throw new NoSoportado("la macro @" + nombre);
  }
  // @test y @test_throws (capítulo 22), como Test de Julia 1.13 fuera de un @testset: si pasa, «Test Passed»;
  // si falla, el informe y el error «There was an error during testing», que detiene el programa
  prueba(n, nombre, args, sc) {
    if (!this.prim.cargado("Test")) throw new NoSoportado("@" + nombre + " sin using Test");
    const l = linea(n), texto = x => EX.textoExpr(this.aExpr(x, sc, false));
    const falla = lineas => { this.salida += "Test Failed at programa.jl:" + l + "\n" + lineas.join("\n") + "\n"; throw new ErrorJulia("There was an error during testing"); };
    const sinError = f => {
      try { return f(); } catch (e) {
        if (e instanceof ErrorJulia) throw new NoSoportado("un @test cuya expresión da un error: Julia escribe el error con el camino de llamadas (stacktrace), que el laboratorio no tiene. Usa @test_throws, o pruébalo en la nube");
        throw e;
      }
    };
    if (nombre === "test") {
      if (args.length !== 1) throw new NoSoportado("@test con opciones (atol, broken, skip…)");
      const x = args[0], ex = texto(x);
      const COMP = ["==", "!=", "≠", "≈", "<", "<=", "≤", ">", ">=", "≥", "===", "!=="];
      let ok, eval_ = null;
      if (x.type === "binary_expression" && COMP.includes(opDe(x))) {
        const [a, b] = hijos(x), op = opDe(x);
        const va = sinError(() => this.valor(a, sc)), vb = sinError(() => this.valor(b, sc));
        const r = this.prim.binaria(op === "≠" ? "!=" : op === "≤" ? "<=" : op === "≥" ? ">=" : op, va, vb);
        if (r.T !== "Bool") throw new NoSoportado("@test de una comparación que no da true ni false");
        ok = r.v; eval_ = V.repr(va) + " " + op + " " + V.repr(vb);
      } else if (x.type === "call_expression" && hijos(x)[1] && hijos(x)[1].type === "argument_list" && !hijos(hijos(x)[1]).some(c => c.type === "named_argument" || c.type === "splat_expression")) {
        // @test f(a, b): Julia calcula los argumentos y, si falla, enseña la llamada con sus valores
        const [cal, lista] = hijos(x);
        const f = sinError(() => this.valor(cal, sc)), vs = hijos(lista).map(a => sinError(() => this.valor(a, sc)));
        const r = sinError(() => this.aplica(f, vs, new Map()));
        if (r.T !== "Bool") throw new NoSoportado("@test de algo que no da true ni false: Julia lo cuenta como un error de la prueba");
        ok = r.v; eval_ = cal.text + "(" + vs.map(a => V.repr(a)).join(", ") + ")";
      } else {
        const r = sinError(() => this.valor(x, sc));
        if (r.T !== "Bool") throw new NoSoportado("@test de algo que no da true ni false: Julia lo cuenta como un error de la prueba");
        if (!r.v) throw new NoSoportado("un @test de esta forma que falla: el laboratorio solo sabe escribir el informe de una comparación o de una llamada");
        ok = r.v;
      }
      if (ok) return { T: "TestOK" };
      return falla(["  Expression: " + ex].concat(eval_ !== null && eval_ !== ex ? ["   Evaluated: " + eval_] : []));
    }
    if (args.length !== 2) throw new NoSoportado("@test_throws con " + args.length + " argumentos");
    const t = this.valor(args[0], sc);
    if (t.T !== "Tipo") throw new NoSoportado("@test_throws con un mensaje en lugar de un tipo de error");
    let lanzado = null;
    try { this.valor(args[1], sc); } catch (e) {
      if (!(e instanceof ErrorJulia)) throw e;
      lanzado = ER.valorDe(e);
    }
    if (!lanzado) return falla(["  Expression: " + texto(args[1]), "    Expected: " + t.nombre, "  No exception thrown"]);
    if (!this.prim.esDelTipo(lanzado, t.nombre)) throw new NoSoportado("@test_throws que recibe otro tipo de error: Julia escribe el error con el camino de llamadas (stacktrace), que el laboratorio no tiene");
    return { T: "TestOK", lanzado: V.tipo(lanzado) };
  }
  evaluaTexto(texto, locs) {
    const arbol = this.parser.parse(texto);
    const amb = { vars: new Map(locs), padre: null, funcion: false };
    const nodo = hijos(arbol.rootNode)[0];
    const pila = this.pila; this.pila = [];          // las columnas se calculan sin dejar pasos
    try { return this.valor(nodo, amb); } finally { this.pila = pila; }
  }

  // ── Escribir una expresión como Julia (string(expr)); con sc, sustituyendo los valores ─────
  escribe(n, sc = undefined) {
    const sust = sc !== undefined;
    const simple = v => v && ["Int64", "Float64", "Bool", "String", "Char", "Rational", "Irrational"].includes(v.T);
    const valorDe = nodo => {
      if (!sust) return null;
      try {
        if (nodo.type === "identifier") {
          if (nodo.text === "end") return null;
          const loc = this.locs(sc);
          const v = loc.has(nodo.text) ? loc.get(nodo.text) : this.glob.has(nodo.text) ? this.glob.get(nodo.text) : this.prim.tiene(nodo.text) ? this.prim.funcion(nodo.text) : null;
          return simple(v) ? v : null;
        }
        if (nodo.type === "index_expression" || (nodo.type === "call_expression" && ["length", "sum", "maximum", "minimum", "abs"].includes(hijos(nodo)[0].text))) {
          const pila = this.pila; this.pila = [];
          try { const v = this.valor(nodo, sc === null ? null : sc); return simple(v) ? v : null; } finally { this.pila = pila; }
        }
      } catch (e) { if (e instanceof NoSoportado) throw e; }
      return null;
    };
    const ESC = (nodo, padrePrec = 0, lado = "") => {
      const v = valorDe(nodo);
      if (v) return V.repr(v);
      switch (nodo.type) {
        case "identifier": return nodo.text;
        case "integer_literal": return BigInt(nodo.text.replace(/_/g, "")).toString();
        case "float_literal": return V.decimal(parseFloat(nodo.text.replace(/_/g, "")));
        case "boolean_literal": return nodo.text;
        case "string_literal": return nodo.text;
        case "character_literal": return nodo.text;
        case "parenthesized_expression": return ESC(hijos(nodo)[0], padrePrec, lado);
        case "binary_expression": case "juxtaposition_expression": return binario(nodo, padrePrec, lado);
        case "unary_expression": {
          const op = opDe(nodo), x = hijos(nodo)[0];
          if (op === "-" && (x.type === "integer_literal" || x.type === "float_literal")) return "-" + ESC(x);
          const xi = desnuda(x);
          if (xi.type === "binary_expression" && ["&&", "||"].includes(opDe(xi))) return op + "(" + ESC(xi) + ")";
          if (xi.type === "binary_expression") return op + (prec(opDe(xi)) < 13 ? "((" + ESC(xi) + "))" : "(" + ESC(xi) + ")");
          return op + ESC(x, 14);
        }
        case "call_expression": case "broadcast_call_expression": {
          const lista = nodo.namedChildren.find(c => c.type === "argument_list");
          if (nodo.namedChild(0).type === "operator") {
            const op = nodo.namedChild(0).text, as = hijos(lista);
            if (as.length === 1) { const x = desnuda(as[0]); return op + (x.type === "binary_expression" ? "(" + ESC(x) + ")" : ESC(x, 14)); }
            return as.map(a => ESC(a, prec(op), "i")).join(" " + op + " ");
          }
          const fn = hijos(nodo)[0];
          const pos = [], kws = [];
          let tras = false;
          for (let i = 0; i < lista.childCount; i++) {
            const c = lista.child(i);
            if (c.type === ";") { tras = true; continue; }
            if (!c.isNamed) continue;
            const t = c.type === "named_argument" ? ESC(hijos(c)[0]) + " = " + ESC(hijos(c)[1]) : ESC(c);
            (tras ? kws : pos).push(t);
          }
          return ESC(fn) + (nodo.type === "broadcast_call_expression" ? "." : "") + "(" + pos.join(", ") + (kws.length ? "; " + kws.join(", ") : "") + ")";
        }
        case "index_expression": {
          const [o, i] = hijos(nodo);
          const so = ESC(o);
          return (desnuda(o).type === "call_expression" ? "(" + so + ")" : so) + "[" + partesIndice(i).map(c => c.type === "operator" ? c.text : ESC(c)).join(", ") + "]";
        }
        case "range_expression": {
          const ps = hijos(nodo);
          if (ps[0].type === "range_expression") return hijos(ps[0]).map(c => ESC(c, 10)).join(":") + ":" + ESC(ps[1], 10);
          return ESC(ps[0], 10) + ":" + ESC(ps[1], 10);
        }
        case "vector_expression": return "[" + hijos(nodo).map(c => ESC(c)).join(", ") + "]";
        case "matrix_expression": return "[" + hijos(nodo).map(f => hijos(f).flatMap(casillasFila).map(({ signo, nodo: c }) => (signo || "") + ESC(c)).join(" ")).join("; ") + "]";
        case "adjoint_expression": return ESC(hijos(nodo)[0], 16) + "'";
        case "tuple_expression": case "open_tuple": return "(" + hijos(nodo).map(c => ESC(c)).join(", ") + ")";
        case "typed_expression": return ESC(hijos(nodo)[0]) + "::" + ESC(hijos(nodo)[1]);
        case "unary_typed_expression": return "::" + ESC(hijos(nodo)[0]);
        case "field_expression": return ESC(hijos(nodo)[0]) + "." + hijos(nodo)[1].text;
        case "named_field": return hijos(nodo)[0].text + " = " + ESC(hijos(nodo)[1]);
        case "parametrized_type_expression": { const [t, ll] = hijos(nodo); return ESC(t) + "{" + hijos(ll).map(c => ESC(c)).join(", ") + "}"; }
      }
      throw new NoSoportado("escribir «" + nodo.type.replace(/_/g, " ") + "»");
    };
    const desnuda = x => x.type === "parenthesized_expression" ? desnuda(hijos(x)[0]) : x;
    const binario = (nodo, padrePrec, lado) => {
      const [a, b] = hijos(nodo);
      if (nodo.type === "juxtaposition_expression") {
        const pg = pegado(nodo);
        if (pg) { const p = prec(pg.op); return envuelve(ESC(pg.a, p, "i") + " " + pg.op + " " + ESC(pg.b, p, "d"), p, padrePrec, lado); }
        if (a.type === "integer_literal" || a.type === "float_literal") {
          if (desnuda(b).type === "identifier" && !valorDe(b)) return ESC(a) + ESC(b);
        }
        return envuelve(ESC(a, 12, "i") + " * " + ESC(b, 12, "d"), 12, padrePrec, lado);
      }
      const op = opDe(nodo), p = prec(op);
      // cadena de comparaciones: se escribe tal cual, sin paréntesis
      if (COMPARA.has(op) && a.type === "binary_expression" && COMPARA.has(opDe(a))) {
        return envuelve(binario(a, 0, "") + " " + op + " " + ESC(b, p, "d"), p, padrePrec, lado);
      }
      // + y * con más de dos términos: Julia los junta en una sola llamada y no pone paréntesis
      if ((op === "+" || op === "*") && a.type === "binary_expression" && opDe(a) === op) {
        return envuelve(binario(a, 0, "") + " " + op + " " + ESC(b, p, "d"), p, padrePrec, lado);
      }
      return envuelve(ESC(a, p, "i") + " " + op + " " + ESC(b, p, "d"), p, padrePrec, lado);
    };
    const envuelve = (s, p, padrePrec, lado) => (padrePrec && p <= padrePrec && !(p === 7 && padrePrec === 7 && false)) ? "(" + s + ")" : s;
    return ESC(n).replace(/\bvar"end"/g, "end");
  }
}

function nuevaFuncion(nombre) {
  return { T: "Funcion", nombre, metodos: [],
    nmetodos() {     // un método por cada número de argumentos posible (los opcionales crean métodos)
      const firmas = new Set();
      for (const m of this.metodos) {
        const obl = m.params.filter(p => !p.defecto).length;
        for (let k = obl; k <= m.params.length; k++) firmas.add(m.params.slice(0, k).map(p => p.tipo || "Any").join(",") + JSON.stringify(m.vars || []));
      }
      return firmas.size;
    } };
}
