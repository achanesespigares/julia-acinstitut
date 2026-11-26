// errores.mjs · Los errores como valores: throw, error, catch e, rethrow (capítulo 22)
// (Mirar y ver · Julia · cómo piensa tu código · AC Institut)
//
// Un error de Julia en el laboratorio es un ErrorJulia con su texto (lo que escribe showerror). Para atraparlo
// con `catch e` hace falta además el valor: un { T: "Excepcion", tipo, a } con los campos de Julia
// (ArgumentError tiene msg; KeyError, key; DomainError, val y msg…). Los que lanza el programa con throw lo
// llevan pegado (err.exc); los que lanza el propio laboratorio se reconstruyen de su texto, y si no se puede,
// NoSoportado: nunca se inventa un valor.
import * as V from "./valores.mjs";
import { ErrorJulia, NoSoportado, S, I, F, NADA, errorMetodo, tipo, repr } from "./valores.mjs";

// Los tipos de error de Julia que el laboratorio sabe construir, con sus campos (fieldnames, Julia 1.13)
export const CAMPOS = {
  ArgumentError: ["msg"], ErrorException: ["msg"], KeyError: ["key"], DomainError: ["val", "msg"],
  OverflowError: ["msg"], DimensionMismatch: ["msg"], DivideError: [],
};
// Todos los tipos de error que el laboratorio conoce por su nombre (para isa, typeof y supertype)
export const NOMBRES = Object.keys(CAMPOS).concat(["BoundsError", "MethodError", "UndefVarError", "InexactError",
  "StringIndexError", "FieldError", "TypeError", "SingularException", "LoadError"]);

export const exc = (t, a) => ({ T: "Excepcion", tipo: t, a });
const campo = (x, c) => x.a[CAMPOS[x.tipo].indexOf(c)];

// show(e): DomainError(-4.0, "…"), KeyError("Carla")
export const reprExc = x => x.tipo + "(" + x.a.map(e => repr(e)).join(", ") + ")";

// showerror(e): lo que escribe Julia al detenerse (base/errorshow.jl)
export function textoExc(x) {
  switch (x.tipo) {
    case "ArgumentError": case "OverflowError": case "DimensionMismatch": return x.tipo + ": " + V.texto(campo(x, "msg"));
    case "ErrorException": return V.texto(campo(x, "msg"));
    case "KeyError": return "KeyError: key " + repr(campo(x, "key")) + " not found";
    case "DomainError": { const m = V.texto(campo(x, "msg")); return "DomainError with " + V.texto(campo(x, "val")) + (m !== undefined ? ":\n" + m : ""); }
    case "DivideError": return "DivideError: integer division error";
  }
  throw new NoSoportado("escribir un " + x.tipo);
}

// Un valor que se escribe como Julia lo leería: "Carla", 3, 2.5, 'a', :x
function leeValor(t) {
  if (/^-?\d+$/.test(t)) return I(BigInt(t));
  if (/^-?(\d+\.\d*|\d*\.\d+)(e-?\d+)?$/.test(t) || /^-?\d+e-?\d+$/.test(t)) return F(Number(t));
  if (/^"([^"\\$]|\\.)*"$/.test(t)) { try { return S(JSON.parse(t)); } catch { return null; } }
  return null;
}

// El valor de un error del laboratorio, para catch e
export function valorDe(err) {
  if (err.exc) return err.exc;
  const t = err.texto;
  let m;
  if ((m = /^(ArgumentError|OverflowError|DimensionMismatch): ([\s\S]*)$/.exec(t))) return exc(m[1], [S(m[2])]);
  if ((m = /^KeyError: key ([\s\S]*) not found$/.exec(t))) { const k = leeValor(m[1]); if (k) return exc("KeyError", [k]); }
  if ((m = /^DomainError with ([^\n]*?):\n([\s\S]*)$/.exec(t))) { const v = leeValor(m[1]); if (v) return exc("DomainError", [v, S(m[2])]); }
  if (t === "DivideError: integer division error") return exc("DivideError", []);
  const nombre = (/^(\w+)/.exec(t) || [])[1];
  throw new NoSoportado("guardar en una variable este error" + (nombre && NOMBRES.includes(nombre) ? " (" + nombre + ")" : "") + ": el laboratorio aún no sabe convertirlo en un valor");
}

export function operacionesDeErrores(P, fn, prog) {
  P.CAMPOS_EXC = CAMPOS;
  // ArgumentError("…"), DomainError(x, "…"): los constructores
  const viejaC = P.construye;
  P.construye = (nombre, args, kw) => {
    if (!(nombre in CAMPOS)) return viejaC(nombre, args, kw);
    if (kw && kw.size) throw errorMetodo(nombre, args);
    const cs = CAMPOS[nombre];
    if (nombre === "DomainError" && args.length === 1) return exc(nombre, [args[0], S("")]);
    if (args.length !== cs.length) throw errorMetodo(nombre, args);
    if (cs.includes("msg") && nombre !== "DomainError") {
      const k = cs.indexOf("msg");
      if (args[k].T !== "String") throw new NoSoportado(nombre + " con un mensaje que no es un texto");
    }
    if (nombre === "DomainError" && args[1].T !== "String") throw new NoSoportado("DomainError con un mensaje que no es un texto");
    return exc(nombre, args);
  };
  P.leeCampoExc = (x, c) => {
    const k = CAMPOS[x.tipo].indexOf(c);
    if (k < 0) throw new ErrorJulia("FieldError: type " + x.tipo + " has no field `" + c + "`, available fields: " + CAMPOS[x.tipo].map(f => "`" + f + "`").join(", "));
    return x.a[k];
  };

  // El texto de un error que lanza el programa: los de Julia, como showerror; los del programa, con su
  // Base.showerror si lo ha escrito, o si no como los escribe show (NotaFuera(11.0))
  P.textoError = x => {
    if (x.T === "Excepcion") return textoExc(x);
    if (x.T === "Struct" && P.esSubtipo(x.tipo, "Exception")) {
      const io = { T: "IO", buf: "" };
      if (prog.escribeError(x, io)) return io.buf;
      return repr(x);
    }
    throw new NoSoportado("lanzar con throw un " + tipo(x) + ": el laboratorio solo lanza errores (subtipos de Exception)");
  };
  P.lanza = x => { const e = new ErrorJulia(P.textoError(x)); e.exc = x; return e; };

  fn.throw = args => { if (args.length !== 1) throw errorMetodo("throw", args); throw P.lanza(args[0]); };
  // error("…") lanza un ErrorException con el texto
  fn.error = args => {
    const msg = args.map(a => V.texto(a)).join("");
    const e = new ErrorJulia(msg); e.exc = exc("ErrorException", [S(msg)]); throw e;
  };
  // rethrow(): el error que se está atrapando sigue su camino, tal cual
  fn.rethrow = args => {
    if (args.length) throw new NoSoportado("rethrow con un argumento");
    const e = prog.atrapados[prog.atrapados.length - 1];
    if (!e) throw new NoSoportado("rethrow() fuera de un catch");
    throw e;
  };
}
