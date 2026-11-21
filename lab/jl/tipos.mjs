// tipos.mjs · Los tipos propios: struct, mutable struct y abstract type
// (Entendiendo Julia, desde dentro · AC Institut)
//
// Un valor de un tipo propio es { T: "Struct", tipo, a: [campos], mut }. Si es mutable, su identidad es la
// del objeto de JavaScript (como un vector); si no, dos valores con los mismos campos son el mismo valor.
import * as V from "./valores.mjs";
import { ErrorJulia, NoSoportado, B, errorMetodo, tipo, repr } from "./valores.mjs";

// Lo específico que es un tipo al elegir método: cuanto más abajo en el árbol de tipos, más
const PROF = { Any: 0, Number: 1, AbstractString: 1, Real: 2, String: 2, Integer: 3, AbstractFloat: 3, Int64: 4, Float64: 4, Bool: 4, Char: 1 };

export function tiposPropios(P, fn) {
  const tipos = new Map();          // nombre → { nombre, campos: [{ nombre, tipo }], mutable, padre, abstracto }
  P.tipos = tipos;
  P.esTipoPropio = n => tipos.has(n);
  P.esSubtipo = (a, b) => {
    if (b === "Any" || a === b) return true;
    for (let t = tipos.get(a); t; t = tipos.get(t.padre)) if (t.padre === b) return true;
    return false;
  };
  const ancestros = n => { const r = [n]; for (let t = tipos.get(n); t && t.padre !== "Any"; t = tipos.get(t.padre)) r.push(t.padre); return r.concat("Any"); };
  // el supertipo común de varios tipos (typejoin): Circulo y Rectangulo → Figura; si no hay, Any
  const une = ts => { const [p, ...resto] = ts; return ancestros(p).find(a => resto.every(t => P.esSubtipo(t, a))) || "Any"; };
  V.GANCHOS.esTipoPropio = P.esTipoPropio;
  V.GANCHOS.esSubtipo = P.esSubtipo;
  V.GANCHOS.uneTipos = ts => ts.every(t => tipos.has(t)) ? une(ts) : "Any";
  P.profundidad = t => {
    if (!t || t === "Any") return 0;
    if (tipos.has(t)) return ancestros(t).length - 1;
    if (t in PROF) return PROF[t];
    return 3;
  };

  P.defineTipo = def => {
    const viejo = tipos.get(def.nombre);
    if (viejo && JSON.stringify({ ...viejo, fn: undefined }) !== JSON.stringify({ ...def, fn: undefined })) throw new NoSoportado("redefinir el tipo " + def.nombre + " con otros campos");
    if (def.padre !== "Any" && !(tipos.has(def.padre) && tipos.get(def.padre).abstracto))
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
  P.creaStruct = (nombre, args, kw) => {
    const def = tipos.get(nombre);
    if (def.abstracto) throw new NoSoportado("construir un tipo abstracto");
    if (kw && kw.size) throw new NoSoportado("argumentos con nombre al construir un " + nombre);
    if (args.length !== def.campos.length) throw errorMetodo(nombre, args);
    return { T: "Struct", tipo: nombre, mut: def.mutable, a: def.campos.map((c, i) => P.aCampo(args[i], c.tipo)) };
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
    if (tipos.has(t.nombre)) return T(tipos.get(t.nombre).padre);
    throw new NoSoportado("supertype de " + t.nombre);
  };
  fn.fieldnames = ([t]) => {
    if (!t || t.T !== "Tipo") throw errorMetodo("fieldnames", [t]);
    if (!tipos.has(t.nombre)) throw new NoSoportado("fieldnames de " + t.nombre);
    return { T: "Tuple", a: tipos.get(t.nombre).campos.map(c => ({ T: "Symbol", v: c.nombre })) };
  };
  fn.isa = ([x, t]) => { if (!t || t.T !== "Tipo") throw new ErrorJulia("TypeError: in isa, expected Type, got a value of type " + tipo(t)); return B(P.esDelTipo(x, t.nombre)); };
}
