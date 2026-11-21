// tipos.mjs · Los tipos propios: struct, mutable struct y abstract type
// (Entendiendo Julia, desde dentro · AC Institut)
//
// Un valor de un tipo propio es { T: "Struct", tipo, a: [campos], mut }. Si es mutable, su identidad es la
// del objeto de JavaScript (como un vector); si no, dos valores con los mismos campos son el mismo valor.
import * as V from "./valores.mjs";
import { ErrorJulia, NoSoportado, B, errorMetodo, tipo, repr } from "./valores.mjs";
import * as ER from "./errores.mjs";

// El árbol de los tipos de Julia que conoce el laboratorio (supertype de cada uno, como en Julia 1.13)
export const PADRE_JULIA = {
  Int64: "Signed", Signed: "Integer", Bool: "Integer", Integer: "Real", Float64: "AbstractFloat", AbstractFloat: "Real",
  "Rational{Int64}": "Real", Real: "Number", Number: "Any", String: "AbstractString", AbstractString: "Any",
  Char: "AbstractChar", AbstractChar: "Any", Nothing: "Any", Missing: "Any", DataType: "Type{T}", Symbol: "Any",
  Exception: "Any", IO: "Any",
};
// los tipos de error de Julia (capítulo 22): todos son subtipos directos de Exception
for (const n of ER.NOMBRES) PADRE_JULIA[n] = "Exception";
export const ABSTRACTOS_JULIA = new Set(["Any", "Number", "Real", "Integer", "Signed", "AbstractFloat", "AbstractString", "AbstractChar", "Exception", "IO"]);
// Lo específico que es un tipo al elegir método: cuanto más abajo en el árbol de tipos, más
const PROF = { Char: 1 };
const profJulia = t => { let k = 0; for (let x = t; x && x !== "Any"; x = PADRE_JULIA[x]) k++; return k; };

export function tiposPropios(P, fn) {
  const tipos = new Map();          // nombre → { nombre, campos: [{ nombre, tipo }], mutable, padre, abstracto }
  P.tipos = tipos;
  P.esTipoPropio = n => tipos.has(n);
  P.esSubtipo = (a, b) => {
    if (b === "Any" || a === b) return true;
    const pa = /^(\w+)\{/.exec(a);                         // Punto{Int64} <: Punto
    if (pa && pa[1] === b && tipos.has(b)) return true;
    for (let t = tipos.get(pa ? pa[1] : a); t; t = tipos.get(t.padre)) { if (t.padre === b) return true; if (t.padre === "Exception") return false; }
    if (!tipos.has(a)) for (let x = PADRE_JULIA[a]; x; x = x === "Any" ? null : PADRE_JULIA[x]) if (x === b) return true;
    return false;
  };
  P.conocido = t => tipos.has(t) || t in PADRE_JULIA || t === "Any" || /^\w+\{/.test(t) && tipos.has(/^(\w+)/.exec(t)[1]);
  const ancestros = n => { const r = [n]; for (let t = tipos.get(n); t && t.padre !== "Any"; t = tipos.get(t.padre)) r.push(t.padre); return r.concat("Any"); };
  // el supertipo común de varios tipos (typejoin): Circulo y Rectangulo → Figura; si no hay, Any
  const une = ts => { const [p, ...resto] = ts; return ancestros(p).find(a => resto.every(t => P.esSubtipo(t, a))) || "Any"; };
  V.GANCHOS.esTipoPropio = P.esTipoPropio;
  V.GANCHOS.esSubtipo = P.esSubtipo;
  V.GANCHOS.esSingleton = n => { const d = tipos.get(n); return !!d && !d.abstracto && !d.mutable && !d.params && !d.campos.length; };
  V.GANCHOS.uneTipos = ts => ts.every(t => tipos.has(t)) ? une(ts) : "Any";
  P.profundidad = t => {
    if (!t || t === "Any") return 0;
    if (tipos.has(t)) return ancestros(t).length - 1;
    if (t in PROF) return PROF[t];
    if (t in PADRE_JULIA) return profJulia(t);
    return 3;
  };

  P.defineTipo = def => {
    const viejo = tipos.get(def.nombre);
    if (viejo && JSON.stringify({ ...viejo, fn: undefined }) !== JSON.stringify({ ...def, fn: undefined })) throw new NoSoportado("redefinir el tipo " + def.nombre + " con otros campos");
    // struct NotaFuera <: Exception: un tipo de error propio (capítulo 22)
    if (def.padre !== "Any" && def.padre !== "Exception" && !(tipos.has(def.padre) && tipos.get(def.padre).abstracto))
      throw new NoSoportado(tipos.has(def.padre) ? "heredar de un tipo concreto" : "heredar de " + def.padre);
    if (!viejo) tipos.set(def.nombre, def);
    return tipos.get(def.nombre);
  };

  // un valor para un campo con tipo, como convert(T, x) al construir o al asignar
  const errConvierte = (x, t) => errorMetodo("convert", null, "Cannot `convert` an object of type " + tipo(x) + " to an object of type " + t);
  P.aCampo = (x, t) => {
    if (!t || t === "Any") return x;
    if (tipos.has(t)) { if (x.T === "Struct" && P.esSubtipo(x.tipo, t)) return x; throw errConvierte(x, t); }
    const m = /^Vector\{(.+)\}$/.exec(t);
    if (m) {
      if (x.T === "Vector" && tipo(x) === t) return x;            // el mismo vector, sin copiarlo
      if (V.esVector(x)) return V.vec(m[1], V.elementos(x).map(e => P.aCampo(e, m[1])));
      throw errConvierte(x, t);
    }
    if (["Real", "Number", "Integer", "AbstractFloat", "AbstractString"].includes(t)) { if (P.esDelTipo(x, t)) return x; throw errConvierte(x, t); }
    return V.convierte(x, t);
  };
  // con parámetros (struct Punto{T<:Real}): T sale de los argumentos, o se da explícito, Punto{Float64}(1, 2)
  P.creaStruct = (nombre, args, kw, dados) => {
    const def = tipos.get(nombre);
    if (def.abstracto) throw new NoSoportado("construir un tipo abstracto");
    if (kw && kw.size) throw new NoSoportado("argumentos con nombre al construir un " + nombre);
    if (args.length !== def.campos.length) throw errorMetodo(nombre, args);
    if (!def.params) { if (dados) throw new NoSoportado(nombre + " no tiene parámetros"); return { T: "Struct", tipo: nombre, mut: def.mutable, a: def.campos.map((c, i) => P.aCampo(args[i], c.tipo)) }; }
    let vals;
    if (dados) {
      if (dados.length !== def.params.length) throw new NoSoportado("dar " + dados.length + " parámetros a " + nombre);
      def.params.forEach((q, k) => { if (!P.esSubtipo(dados[k], q.cota)) throw new ErrorJulia("TypeError: in " + nombre + ", in " + q.nombre + ", expected " + q.cota + ", got Type{" + dados[k] + "}"); });
      vals = dados;
    } else {
      vals = def.params.map(q => {
        const ts = def.campos.map((c, i) => c.tipo === q.nombre ? tipo(args[i]) : null).filter(Boolean);
        if (!ts.length) throw new NoSoportado("deducir el parámetro " + q.nombre + " de " + nombre);
        if (ts.some(t => t !== ts[0]) || !P.conocido(ts[0]) || !P.esSubtipo(ts[0], q.cota)) throw errorMetodo(nombre, args);
        return ts[0];
      });
    }
    const sust = t => { const k = def.params.findIndex(q => q.nombre === t); return k < 0 ? t : vals[k]; };
    return { T: "Struct", tipo: nombre, params: vals, mut: def.mutable, a: def.campos.map((c, i) => P.aCampo(args[i], sust(c.tipo))) };
  };
  const errCampo = (x, c) => new ErrorJulia("FieldError: type " + x.tipo + " has no field `" + c + "`, available fields: " + tipos.get(x.tipo).campos.map(k => "`" + k.nombre + "`").join(", "));
  P.leeCampo = (x, c) => {
    const k = tipos.get(x.tipo).campos.findIndex(k => k.nombre === c);
    if (k < 0) throw errCampo(x, c);
    return x.a[k];
  };
  P.ponCampo = (x, c, v) => {
    const def = tipos.get(x.tipo);
    if (!def.mutable) throw new ErrorJulia("setfield!: immutable struct of type " + x.tipo + " cannot be changed");
    const k = def.campos.findIndex(k => k.nombre === c);
    if (k < 0) throw errCampo(x, c);
    x.a[k] = P.aCampo(v, def.campos[k].tipo);
  };
  // === entre tipos propios: un mutable es él mismo; uno inmutable, sus campos (con === cada uno)
  P.identicosStruct = (a, b) => {
    if (a.T !== "Struct" || b.T !== "Struct" || a.tipo !== b.tipo) return false;
    if (a.mut) return a === b;
    return a.a.every((x, i) => P.identicos(x, b.a[i]));
  };

  const T = nombre => ({ T: "Tipo", nombre });
  fn.supertype = ([t]) => {
    if (!t || t.T !== "Tipo") throw errorMetodo("supertype", [t]);
    const pa = /^(\w+)\{/.exec(t.nombre);
    if (tipos.has(t.nombre) && !t.unionall) return T(tipos.get(t.nombre).padre);
    if (pa && tipos.has(pa[1])) return T(tipos.get(pa[1]).padre);
    if (t.nombre === "Any") return T("Any");
    if (t.nombre in PADRE_JULIA && t.nombre !== "DataType") return T(PADRE_JULIA[t.nombre]);
    throw new NoSoportado("supertype de " + t.nombre);
  };
  const clase = t => {
    if (!t || t.T !== "Tipo") return null;
    if (t.unionall) return "unionall";
    if (tipos.has(t.nombre)) return tipos.get(t.nombre).abstracto ? "abstracto" : "concreto";
    if (/^\w+\{/.test(t.nombre) && tipos.has(/^(\w+)/.exec(t.nombre)[1])) return "concreto";
    if (ABSTRACTOS_JULIA.has(t.nombre)) return "abstracto";
    if (t.nombre in PADRE_JULIA || /^(Vector|Tuple)\{[\w{}, ]+\}$/.test(t.nombre)) return "concreto";
    return null;
  };
  fn.isabstracttype = ([t]) => { const c = clase(t); if (!c) throw new NoSoportado("isabstracttype de " + V.repr(t)); return B(c === "abstracto"); };
  fn.isconcretetype = ([t]) => { const c = clase(t); if (!c) throw new NoSoportado("isconcretetype de " + V.repr(t)); return B(c === "concreto"); };
  fn.fieldnames = ([t]) => {
    if (!t || t.T !== "Tipo") throw errorMetodo("fieldnames", [t]);
    if (!tipos.has(t.nombre)) throw new NoSoportado("fieldnames de " + t.nombre);
    return { T: "Tuple", a: tipos.get(t.nombre).campos.map(c => ({ T: "Symbol", v: c.nombre })) };
  };
  fn.isa = ([x, t]) => { if (!t || t.T !== "Tipo") throw new ErrorJulia("TypeError: in isa, expected Type, got a value of type " + tipo(t)); return B(P.esDelTipo(x, t.nombre)); };
}
