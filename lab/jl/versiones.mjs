// versiones.mjs · los números de versión de Julia (capítulo 23): v"1.8.3", VersionNumber(1, 8, 3), VERSION
//
// Un VersionNumber tiene tres partes, major.minor.patch, y se compara parte a parte (v"1.10.0" > v"1.9.2", al
// revés que los textos). Sus campos son UInt32: Julia escribe v.major como 0x00000001. El laboratorio sabe lo
// justo de UInt32 para usarlos en una cuenta o una comparación con enteros (como Julia, que los pasa a Int64);
// lo demás da NoSoportado. Las versiones con -pre o +build, también.
import { ErrorJulia, NoSoportado, I } from "./valores.mjs";

export const version = (major, minor = 0n, patch = 0n) => ({ T: "VersionNumber", a: [BigInt(major), BigInt(minor), BigInt(patch)] });
// la versión de Julia que imita el laboratorio, la de trazar.jl
export const VERSION_JULIA = version(1, 13, 4);

// v"1.8.3", v"1.8" (1.8.0), v"1" (1.0.0)
export function lee(t) {
  const m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?\s*$/.exec(t);
  if (m) return version(m[1], m[2] || 0, m[3] || 0);
  if (/^\s*v?\d+(\.\d+){0,2}[-+]/.test(t)) throw new NoSoportado("las versiones con -pre o +build (" + t + ")");
  throw new ErrorJulia("ArgumentError: invalid version string: " + t);
}
export const texto = x => x.a.join(".");
export const repr = x => 'v"' + texto(x) + '"';

// VersionNumber(1, 8, 3), VersionNumber(2), VersionNumber("1.8.3")
export function construye(args) {
  if (args.length === 1 && args[0].T === "String") return lee(args[0].v);
  if (!args.length || args.length > 3) throw new NoSoportado("VersionNumber() con " + args.length + " argumentos");
  const ps = args.map(x => {
    if (x.T !== "Int64" && x.T !== "UInt32") throw new NoSoportado("VersionNumber() con un " + x.T);
    if (x.v < 0n) throw new ErrorJulia("InexactError: convert(UInt32, " + x.v + ")");
    return x.v;
  });
  return version(...ps);
}

export function compara(x, y) {       // -1, 0 o 1
  for (let k = 0; k < 3; k++) if (x.a[k] !== y.a[k]) return x.a[k] < y.a[k] ? -1 : 1;
  return 0;
}

export function campo(x, c) {
  const k = ["major", "minor", "patch"].indexOf(c);
  if (k >= 0) return { T: "UInt32", v: x.a[k] };
  if (c === "prerelease" || c === "build") throw new NoSoportado("el campo ." + c + " de un VersionNumber");
  throw new ErrorJulia("FieldError: type VersionNumber has no field `" + c + "`, available fields: `major`, `minor`, `patch`, `prerelease`, `build`");
}

// UInt32: Julia lo escribe en hexadecimal, con 8 cifras; print lo escribe en decimal
export const reprU32 = x => "0x" + x.v.toString(16).padStart(8, "0");
// una cuenta o una comparación entre un UInt32 y un Int64: Julia pasa el UInt32 a Int64
export function aEntero(a, b) {
  const u = x => x.T === "UInt32";
  if (u(a) && b.T === "Int64") return [I(a.v), b];
  if (u(b) && a.T === "Int64") return [a, I(b.v)];
  throw new NoSoportado("esta operación con un UInt32 (un entero sin signo)");
}
