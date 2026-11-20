// conformidad.mjs · ¿Escribe el intérprete del laboratorio las mismas trazas que Julia de verdad?
//
// Reúne los programas de todos los capítulos (cada celda con su visualizador) y los del banco de pruebas
// lab/pruebas/*.jl, los ejecuta con herramientas/trazar.jl (Julia) y con lab/jl/julia.mjs, y compara las
// trazas paso a paso. Un programa que el intérprete aún no sabe ejecutar se cuenta aparte: no es un fallo,
// pero tampoco un acierto.
//
// Uso: node herramientas/conformidad.mjs [filtro]      (necesita Julia en el PATH)
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { Parser, Language } from "web-tree-sitter";
import { traza, ErrorSintaxis } from "../lab/jl/julia.mjs";
import { NoSoportado } from "../lab/jl/valores.mjs";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const filtro = process.argv[2] || "";
const casos = [];
for (const f of fs.readdirSync(path.join(raiz, "capitulos")).filter(f => f.endsWith(".md")).sort()) {
  const L = fs.readFileSync(path.join(raiz, "capitulos", f), "utf8").split("\n");
  let n = 0;
  L.forEach((l, i) => {
    if (!/^```\{anywidget\} .*traza-jl\.mjs/.test(l)) return;
    const cfg = JSON.parse(L[i + 1]).config;
    if (cfg.tipo === "laboratorio") return;
    let fin = i - 1; while (L[fin] !== "```") fin--;
    let ini = fin - 1; while (!L[ini].startsWith("```{code-cell} julia")) ini--;
    casos.push({ nombre: f.replace(/\.md$/, "") + "-" + (++n), codigo: L.slice(ini + 1, fin).join("\n"), config: cfg });
  });
}
const dirP = path.join(raiz, "lab", "pruebas");
if (fs.existsSync(dirP)) for (const f of fs.readdirSync(dirP).filter(f => f.endsWith(".jl")).sort()) {
  const codigo = fs.readFileSync(path.join(dirP, f), "utf8").replace(/\n+$/, "");
  const m = /^# config: (.*)\n/.exec(codigo);
  casos.push({ nombre: "prueba/" + f.replace(/\.jl$/, ""), codigo: m ? codigo.slice(m[0].length) : codigo, config: m ? JSON.parse(m[1]) : {} });
}
const elegidos = casos.filter(c => c.nombre.includes(filtro));
const tmp = fs.mkdtempSync("/tmp/conf-");
fs.writeFileSync(path.join(tmp, "e.json"), JSON.stringify(elegidos));
execFileSync("julia", ["--project=" + path.join(raiz, "herramientas"), path.join(raiz, "herramientas", "conformidad.jl"), path.join(tmp, "e.json"), path.join(tmp, "s.json")], { stdio: "inherit", env: { ...process.env, LANG: "es_ES.UTF-8" } });
const julia = JSON.parse(fs.readFileSync(path.join(tmp, "s.json"), "utf8"));

await Parser.init();
const parser = new Parser();
parser.setLanguage(await Language.load(path.join(raiz, "node_modules", "tree-sitter-julia", "tree-sitter-julia.wasm")));

// la primera diferencia entre dos valores JSON, con su camino
function diferencia(a, b, camino = "") {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) return [camino, a, b];
  if (Array.isArray(a)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = diferencia(a[i], b[i], camino + "[" + i + "]"); if (d) return d; }
    return null;
  }
  if (a && typeof a === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = diferencia(a[k], b[k], camino + "." + k); if (d) return d; }
    return null;
  }
  return a === b ? null : [camino, a, b];
}
let bien = 0, mal = 0, nose = 0;
for (const c of elegidos) {
  const j = julia[c.nombre];
  let js;
  try { js = traza(c.codigo, c.config, parser); }
  catch (e) {
    if (e instanceof NoSoportado) { nose++; console.log("· " + c.nombre + ": aún no soportado — " + e.que); continue; }
    if (e instanceof ErrorSintaxis) { mal++; console.log("✗ " + c.nombre + ": el intérprete ve un error de sintaxis en la línea " + e.linea); continue; }
    mal++; console.log("✗ " + c.nombre + ": el intérprete falla: " + (e.stack || e).toString().split("\n").slice(0, 4).join(" | ")); continue;
  }
  if (j.fallo) { mal++; console.log("✗ " + c.nombre + ": Julia falla: " + j.fallo); continue; }
  const d = diferencia(j, js);
  if (!d) { bien++; console.log("✓ " + c.nombre + " (" + j.pasos.length + " pasos)"); continue; }
  mal++;
  const paso = /^\.pasos\[(\d+)\]/.exec(d[0]);
  console.log("✗ " + c.nombre + ": distinto en " + d[0] + (paso ? " (línea " + j.pasos[paso[1]]?.linea + ")" : ""));
  console.log("    Julia:      " + JSON.stringify(d[1])?.slice(0, 300));
  console.log("    intérprete: " + JSON.stringify(d[2])?.slice(0, 300));
}
console.log(`\n${bien} iguales a Julia, ${mal} distintos, ${nose} aún no soportados (de ${elegidos.length})`);
process.exit(mal ? 1 : 0);
