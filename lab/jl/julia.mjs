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
import * as MX from "./matrices.mjs";

const LIMITE = 2000;
class Retorno { constructor(v) { this.v = v; } }
class Corte { constructor(que) { this.que = que; } }       // break o continue

// ── Precedencias de Julia (Base.operator_precedence), para escribir expresiones como Julia ─────
const PREC = { "=": 1, "=>": 4, "||": 5, "&&": 6, ":": 10, "+": 11, "-": 11, "|": 11, "*": 12, "/": 12, "÷": 12, "%": 12, "&": 12, "//": 13, "^": 15 };
const COMPARA = new Set(["<", ">", "<=", ">=", "==", "!=", "≠", "≤", "≥", "≈", "===", "!==", "∈", "in", "isa"]);
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
    this.glob = new Map();
    this.pasos = []; this.filas = []; this.orden = []; this.pila = [];
    this.nmarcos = 0; this.vueltas = new Map(); this.actual = 0;
    this.locales = new Map();
    this.columnas = config.columnas || []; this.porLinea = config.fila_en === "cada_linea";
    this.ocultar = new Set(config.ocultar || []);
    this.salida = ""; this.firmas = new Map(); this.ids = new Map();
    this.prim = crearPrimitivas(this);
  }

  // ── Fotografiar ────────────────────────────────────────────────────────
  oculto(n) { return n.startsWith("#") || n.startsWith("__") || this.ocultar.has(n); }
  firma(nombre) { const f = this.firmas.get(nombre); return f && f.length ? f.join("\n") : nombre; }
  unId(x) { if (!this.ids.has(x)) this.ids.set(x, this.ids.size + 1); return this.ids.get(x); }
  describe(x, prof = 0) {
    if (x.T === "Funcion") return { t: "function", r: this.firma(x.nombre), m: x.nmetodos() };
    if (x.T === "Primitiva") return { t: "function", r: x.nombre, m: 1 };
    if (V.esEscalar(x)) return { t: V.tipo(x), e: true, v: [V.repr(x)] };
    if (x.vistaTxt || x.T === "VistaRara") throw new NoSoportado("guardar una vista (view) en una variable");
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
      if (V.esRango(x)) d.rango = V.repr(x); else d.id = this.unId(x);
      return d;
    }
    if (x.T === "Tuple" && prof < 4 && x.a.length <= 30) return { t: V.tipo(x), tupla: true, el: x.a.map(e => ({ v: this.describe(e, prof + 1) })) };
    if (x.T === "NamedTuple" && prof < 4 && x.a.length <= 30) return { t: V.tipo(x), tupla: true, el: x.a.map((e, i) => ({ nombre: x.nombres[i], v: this.describe(e, prof + 1) })) };
    if (x.T === "Dict" && x.t.count <= 30) { const es = x.t.entradas(); return { t: V.tipo(x), dict: true, k: es.map(([k]) => V.repr(k)), v: es.map(([, w]) => V.repr(w)), id: this.unId(x) }; }
    if (x.T === "Tipo") return { t: "DataType", e: true, v: [x.nombre] };
    return { t: V.tipo(x), r: this.prim.muestra(x) };
  }
  corto(x) {
    if (x.T === "Funcion") return this.firma(x.nombre);
    if ((x.T === "Vector" || x.T === "BitVector") && x.a.length > 12) return x.a.slice(0, 3).map(e => V.repr(e)).join(", ") + ", … (" + x.a.length + " valores)";
    return V.repr(x);
  }
  foto() {
    const ns = [...this.glob.keys()].filter(n => !this.oculto(n)).sort();
    for (const n of ns) if (!this.orden.includes(n)) this.orden.push(n);
    this.orden.push(...this.enOrdenDeLectura([...this.locales.keys()].filter(n => !this.oculto(n) && !this.orden.includes(n))));
    const est = {}, orden = [];
    for (const n of this.orden) {
      if (this.locales.has(n) && !this.oculto(n)) { const d = this.describe(this.locales.get(n)); d.local = true; est[n] = d; orden.push(n); }
      else if (this.glob.has(n) && !this.oculto(n)) { est[n] = this.describe(this.glob.get(n)); orden.push(n); }
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
  va(l) { this.actual = l; }
  paso(l, sc) { const locs = this.locs(sc); this.ponLocales(locs); if (this.porLinea) this.fila(locs); this.anota({ linea: l, tipo: "linea" }); }
  cabecera(l, sc) { this.vueltas.set(l, (this.vueltas.get(l) || 0) + 1); this.ponLocales(this.locs(sc)); this.anota({ linea: l, tipo: "vuelta", vuelta: this.vueltas.get(l) }); }
  finVuelta(l, sc) { const locs = this.locs(sc); this.ponLocales(locs); if (!this.porLinea) this.fila(locs); }
  finBucle(l, sc) { this.ponLocales(this.locs(sc)); this.anota({ linea: l, tipo: "fin", vuelta: this.vueltas.get(l) || 0 }); this.vueltas.delete(l); }
  cond(l, nodo, v, sc) {
    const locs = this.locs(sc); this.ponLocales(locs);
    const valor = v.T === "Bool" ? (v.v ? "true" : "false") : V.repr(v);
    this.anota({ linea: l, tipo: "condicion", cond: { texto: this.escribe(nodo), valores: this.escribe(nodo, sc), valor } });
  }
  entra(f, met, l, sc, args) {
    this.nmarcos++;
    const locs = this.locs(sc);
    const llamada = f.nombre + "(" + args.filter(a => locs.has(a)).map(a => a + " = " + this.corto(locs.get(a))).join(", ") + ")";
    this.pila.push({ id: this.nmarcos, nombre: f.nombre, vars: locs, orden: [...args], desde: this.actual, llamada });
    this.anota({ linea: l, tipo: "llamada", funcion: f.nombre });
  }
  sale(v) {
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
    if (nombre in TIPOS) return TIPOS[nombre];
    if (this.prim.tiene(nombre)) return this.prim.funcion(nombre);
    if (CONOCIDAS.has(nombre)) throw new NoSoportado("la función " + nombre + "()");
    throw new ErrorJulia("UndefVarError: `" + nombre + "` not defined in `Main`\nSuggestion: check for spelling errors or missing imports.");
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
      for (const st of hijos(raiz)) this.sentencia(st, 0, null);
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
        if (this.pila.length) p.marcos = this.fotoMarcos();
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
      case "using_statement": case "import_statement": throw new NoSoportado("cargar paquetes (using)");
      case "struct_definition": throw new NoSoportado("los tipos propios (struct)");
      case "macro_definition": case "module_definition": throw new NoSoportado(n.type);
      case "const_statement": throw new NoSoportado("const");
    }
    if (final) { const v = this.valor(n, sc); return n.type === "local_statement" || n.type === "global_statement" ? NADA : v; }
    this.va(l);
    if (nivel === 0) {
      const v = this.valor(n, sc);
      // como es_asignacion de trazar.jl: x ÷= 2 o A .+= 1 no cuentan como asignaciones y el REPL escribe su valor
      const asignacion = ["assignment", "local_statement", "global_statement"].includes(n.type) || (n.type === "binary_expression" && opDe(n) === ".=") ||
        (n.type === "compound_assignment_expression" && ["+=", "-=", "*=", "/=", "^=", ".="].includes(opDe(n)));
      if (!asignacion && v.T !== "Nothing") this.salida += this.prim.muestra(v) + "\n";
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
    const c = n.childForFieldName("condition");
    const cuerpo = hijos(n).filter(x => x.id !== c.id);
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
  siEntonces(n, nivel, sc) {
    const c = n.childForFieldName("condition");
    const lc = linea(c.type === "if_statement" ? n : n);
    const ramas = hijos(n).filter(x => x.type === "elseif_clause" || x.type === "else_clause");
    const cuerpo = hijos(n).filter(x => x.id !== c.id && x.type !== "elseif_clause" && x.type !== "else_clause");
    const v = this.valor(c, sc);
    this.cond(n.type === "elseif_clause" ? linea(n) : linea(n), c, v, sc);
    if (this.booleano(v)) return this.bloque(cuerpo, nivel + 1, sc);
    for (const r of ramas) {
      if (r.type === "elseif_clause") {
        const rc = r.childForFieldName("condition");
        const rv = this.valor(rc, sc);
        this.cond(linea(r), rc, rv, sc);
        if (this.booleano(rv)) return this.bloque(hijos(r).filter(x => x.id !== rc.id), nivel + 1, sc);
      } else return this.bloque(hijos(r), nivel + 1, sc);
    }
    return NADA;
  }

  // ── Funciones del programa ─────────────────────────────────────────────
  esDefCorta(n) { const izq = hijos(n)[0]; return izq && (izq.type === "call_expression" || (izq.type === "where_expression")); }
  defineFuncion(n, nivel, sc) {
    const l = linea(n);
    let llamada, cuerpo;
    if (n.type === "function_definition") {
      const sig = hijos(n).find(c => c.type === "signature");
      llamada = hijos(sig)[0];
      cuerpo = hijos(n).filter(c => c.type !== "signature");
    } else { llamada = hijos(n)[0]; cuerpo = [hijos(n)[1]]; }
    if (llamada.type !== "call_expression") throw new NoSoportado("esta forma de definir funciones");
    const nombre = hijos(llamada)[0].text;
    const params = [], kw = [];
    let tras = false;
    const lista = llamada.namedChildren.find(c => c.type === "argument_list");
    for (let i = 0; i < lista.childCount; i++) {
      const c = lista.child(i);
      if (c.type === ";") { tras = true; continue; }
      if (!c.isNamed) continue;
      if (c.type === "identifier") params.push({ nombre: c.text });
      else if (c.type === "typed_expression") params.push({ nombre: hijos(c)[0].text, tipo: hijos(c)[1].text });
      else if (c.type === "named_argument") { const [a, d] = hijos(c); (tras ? kw : params).push({ nombre: a.type === "typed_expression" ? hijos(a)[0].text : a.text, defecto: d, tipo: a.type === "typed_expression" ? hijos(a)[1].text : null }); }
      else throw new NoSoportado("este tipo de argumento");
    }
    if (!this.firmas.has(nombre)) this.firmas.set(nombre, []);
    this.firmas.get(nombre).push(this.escribe(llamada));
    let f = (sc ? this.locs(sc).get(nombre) : null) || this.glob.get(nombre);
    if (!f || f.T !== "Funcion") f = nuevaFuncion(nombre);
    f.metodos.push({ params, kw, cuerpo, linea: l });
    if (nivel === 0) { this.va(l); this.asigna(nombre, f, sc); this.paso(l, sc); return NADA; }
    this.asigna(nombre, f, sc);
    return f;
  }
  llamaPrograma(f, args, kwargs) {
    const n = args.length;
    const cands = f.metodos.filter(m => {
      const obl = m.params.filter(p => !p.defecto).length;
      return n >= obl && n <= m.params.length && m.params.every((p, i) => i >= n || !p.tipo || this.prim.esDelTipo(args[i], p.tipo));
    });
    const met = cands[cands.length - 1];
    if (!met) throw V.errorMetodo(f.nombre, args);
    const amb = { vars: new Map(), padre: null, funcion: true, globales: new Set() };
    met.params.forEach((p, i) => amb.vars.set(p.nombre, i < n ? args[i] : this.valor(p.defecto, amb)));
    for (const p of met.kw) amb.vars.set(p.nombre, kwargs.has(p.nombre) ? kwargs.get(p.nombre) : this.valor(p.defecto, amb));
    for (const k of kwargs.keys()) if (!met.kw.some(p => p.nombre === k)) throw new ErrorJulia("MethodError: no method matching " + f.nombre + "(" + args.map(a => "::" + V.tipo(a)).join(", ") + "; " + k + "::" + V.tipo(kwargs.get(k)) + ")");
    // Julia pone primero los argumentos con nombre (así queda la función por dentro)
    const nombres = met.kw.map(p => p.nombre).concat(met.params.map(p => p.nombre));
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
      throw e;
    }
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
      case "character_literal": return Ch(this.caracter(n.text));
      case "identifier": {
        if (n.text === "end") { if (this.fin === undefined) throw new NoSoportado("end fuera de unos corchetes"); return I(this.fin); }
        return this.busca(n.text, sc);
      }
      case "parenthesized_expression": return this.valor(hijos(n)[0], sc);
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
          this.prim.difundeAsignacion(this.valor(izq, sc), v);
          return v;
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
      case "juxtaposition_expression": { const [a, b] = hijos(n); return this.prim.binaria("*", this.valor(a, sc), this.valor(b, sc)); }
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
        if (x.T === "NamedTuple") {
          const i = x.nombres.indexOf(c);
          if (i < 0) throw new ErrorJulia("FieldError: type NamedTuple has no field `" + c + "`, available fields: " + x.nombres.map(m => "`" + m + "`").join(", "));
          return x.a[i];
        }
        if (x.T === "Pair") { if (c === "first") return x.a; if (c === "second") return x.b; throw new ErrorJulia("FieldError: type Pair has no field `" + c + "`, available fields: `first`, `second`"); }
        throw new NoSoportado("el campo ." + c + " de un " + V.tipo(x));
      }
      case "range_expression": return this.rango(n, sc);
      case "index_expression": {
        const [obj, ind] = hijos(n);
        if (obj.type === "identifier" && obj.text in TIPOS && ind.type === "vector_expression") {
          return this.prim.vectorTipado(TIPOS[obj.text].nombre, hijos(ind).map(c => this.valor(c, sc)));
        }
        const x = this.valor(obj, sc);
        return this.prim.indexa(x, this.indices(x, ind, sc));
      }
      case "macrocall_expression": return this.macro(n, sc);
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
      else if (c.type === "string_interpolation") { const e = hijos(c)[0]; r += V.texto(this.valor(e, sc)); }
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
      throw new NoSoportado("esta declaración");
    }
    return v;
  }
  marcaGlobal(nombre, sc) { for (let s = sc; s; s = s.padre) if (s.funcion) { s.globales.add(nombre); return; } }
  indices(x, ind, sc) {
    const viejo = this.fin;
    try {
      const partes = partesIndice(ind);
      const uno = p => p.type === "operator" && p.text === ":" ? { T: "Colon" } : this.valor(p, sc);
      if (partes.length === 2) {
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
      return args.length === 1 ? this.prim.unaria(op, args[0]) : args.slice(1).reduce((a, b) => this.prim.binaria(op, a, b), args[0]);
    }
    const fn = hijos(n)[0];
    const lista = n.namedChildren.find(c => c.type === "argument_list");
    if (fn.type === "parametrized_type_expression" && !difundir) {     // Dict{String, Int}()
      const [nom, llaves] = hijos(fn);
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
    if (difundir) return this.prim.difunde(f, args, kw);
    return this.aplica(f, args, kw);
  }
  // el nombre de un tipo escrito en el programa: Int → Int64, Vector{Int} → Vector{Int64}
  nombreTipo(c) {
    const NOMBRES = { Int: "Int64", Int64: "Int64", Float64: "Float64", String: "String", Char: "Char", Bool: "Bool", Any: "Any", Real: "Real", Integer: "Integer", AbstractString: "AbstractString", Number: "Number" };
    if (c.type === "identifier" && NOMBRES[c.text]) return NOMBRES[c.text];
    if (c.type === "parametrized_type_expression") { const [nom, ll] = hijos(c); if (nom.text === "Vector") return "Vector{" + hijos(ll).map(x => this.nombreTipo(x)).join(", ") + "}"; }
    throw new NoSoportado("el tipo " + c.text);
  }
  aplica(f, args, kw) {
    if (f.T === "Funcion") return f.anonima ? f.llama(args) : this.llamaPrograma(f, args, kw);
    if (f.T === "Primitiva") return f.f(args, kw);
    if (f.T === "Tipo") return this.prim.construye(f.nombre, args, kw);
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
  macro(n, sc) {
    const nombre = hijos(hijos(n)[0])[0]?.text;
    const args = hijos(n.namedChildren.find(c => c.type === "macro_argument_list") || n);
    if (nombre === "show") {
      let v = NADA;
      for (const a of args) { v = this.valor(a, sc); this.salida += this.escribe(a) + " = " + V.repr(v) + "\n"; }
      return v;
    }
    throw new NoSoportado("la macro @" + nombre);
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
            const t = c.type === "named_argument" ? ESC(hijos(c)[0]) + " = " + ESC(hijos(c)[1]) : c.type === "typed_expression" ? ESC(hijos(c)[0]) + "::" + ESC(hijos(c)[1]) : ESC(c);
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
        case "field_expression": return ESC(hijos(nodo)[0]) + "." + hijos(nodo)[1].text;
        case "named_field": return hijos(nodo)[0].text + " = " + ESC(hijos(nodo)[1]);
      }
      throw new NoSoportado("escribir «" + nodo.type.replace(/_/g, " ") + "»");
    };
    const desnuda = x => x.type === "parenthesized_expression" ? desnuda(hijos(x)[0]) : x;
    const binario = (nodo, padrePrec, lado) => {
      const [a, b] = hijos(nodo);
      if (nodo.type === "juxtaposition_expression") {
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
        for (let k = obl; k <= m.params.length; k++) firmas.add(m.params.slice(0, k).map(p => p.tipo || "Any").join(","));
      }
      return firmas.size;
    } };
}
