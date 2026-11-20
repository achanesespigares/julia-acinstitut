// traza-jl.mjs · Visualizador de trazas de Julia (AC Institut · anywidget para MyST / Jupyter Book 2)
// Un programa de Julia ejecutándose paso a paso: la línea, las variables de la memoria con su tipo
// (un número suelto es un valor; un vector, su fila de casillas numeradas desde 1), las variables
// locales de los bucles, las llamadas a funciones con su marco, las condiciones con sus valores, la
// consola y la tabla de traza. La traza la escribe herramientas/trazar.jl en datos/trazas/.

const ESTILOS = `
.tz{ --acento:#7A1F36; --suave:#F6F0EE; --oscuro:#5A1628; --banda:#6B6B6B; --filete:#9A9A9A; --fila:#D4D4D4;
  --fondo:#F4F4F4; --sub:#333; --tinta:#111; --si:#2D5A48;
  --titulo:"Montserrat","Helvetica Neue",Arial,sans-serif; --texto:"Arimo","Liberation Sans",Arial,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
  font:400 15px/1.55 var(--texto); color:var(--tinta); background:#fff; display:flex; flex-direction:column; gap:16px;
  padding:16px; border:1px solid var(--fila); border-radius:10px; margin:1.25rem 0; }
.tz *{ box-sizing:border-box; min-width:0; }
.tz p{ margin:0; }
.tz-cab{ display:flex; justify-content:space-between; align-items:baseline; gap:10px; flex-wrap:wrap; }
.tz-tit{ font:700 18px/1.2 var(--titulo); }
.tz-etq{ font:600 10.5px/1 var(--titulo); letter-spacing:.1em; text-transform:uppercase; color:var(--acento);
  border:1.5px solid var(--acento); border-radius:6px; padding:5px 8px; }
.tz-idea{ border-left:4px solid var(--acento); padding:2px 0 2px 12px; color:var(--sub); }
.tz-escena{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:16px; align-items:start; }
.tz-col{ display:flex; flex-direction:column; gap:12px; }
.tz.amplio .tz-escena{ grid-template-columns:minmax(0,1fr); }   /* tuberías y gráficos: una sola columna, más ancha */
.tz-caja{ border:2px solid var(--tinta); background:#fff; }
.tz-barra{ background:var(--acento); color:#fff; padding:6px 12px; font:600 10.5px/1.2 var(--titulo); letter-spacing:.12em;
  text-transform:uppercase; display:flex; justify-content:space-between; gap:2px 8px; flex-wrap:wrap; }
.tz-barra > *{ white-space:nowrap; }
.tz-barra.negro{ background:var(--tinta); }
pre.tz-codigo{ margin:0; font:400 14px/1.85 var(--mono); overflow-x:auto; background:var(--fondo); padding:6px 0; border:0; }
.tz .ln{ display:flex; align-items:center; white-space:pre; padding-right:12px; border-left:4px solid transparent; min-width:max-content; }
.tz .ln > span{ flex:none; min-width:auto; }   /* que el coloreado no se encoja si la línea no cabe: el código se desplaza */
.tz .ln .fl{ width:20px; flex:none; text-align:center; font-size:11px; color:transparent; }
.tz .ln .no{ width:2.4ch; flex:none; text-align:right; color:var(--filete); margin-right:12px; }
.tz .ln.hecha{ border-left-color:var(--acento); background:var(--suave); }
.tz .ln.hecha .fl{ color:var(--acento); }
.tz .ln.error{ background:#F3E3E6; }
.tz .ln.espera{ border-left:4px dashed var(--acento); }
.tz .ln.espera .fl{ color:var(--acento); opacity:.45; }
.tz-ambito{ font:600 10px/1 var(--titulo); letter-spacing:.1em; text-transform:uppercase; color:var(--banda); }
.tz .marco{ border:2px solid var(--filete); border-left:5px solid var(--filete); padding:8px 10px 10px; display:flex; flex-direction:column; gap:10px; background:#fff; }
.tz .marco.activo{ border-color:var(--acento); background:var(--suave); }
.tz .marco-cab{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; font:600 13.5px/1.3 var(--mono); }
.tz .marco-cab .que{ font:600 9.5px/1 var(--titulo); letter-spacing:.08em; text-transform:uppercase; color:var(--banda); }
.tz .marco.activo .marco-cab .que{ color:var(--acento); }
.tz .marco-padre{ font:500 12px/1.35 var(--texto); color:var(--banda); margin-top:-4px; }
.tz .marco-padre b{ font:600 12px/1.35 var(--mono); color:var(--tinta); }
.tz .cierre{ border:1.5px dashed var(--filete); padding:6px 8px 8px; display:flex; flex-direction:column; gap:8px; }
.tz .cierre .que{ font:600 9.5px/1.3 var(--titulo); letter-spacing:.08em; text-transform:uppercase; color:var(--banda); }
.tz .arbol{ background:var(--fondo); padding:8px 12px; font:500 14px/1.55 var(--mono); overflow-x:auto; }
.tz .arama{ white-space:pre; color:var(--banda); }
.tz .arbol .af{ color:var(--acento); font-weight:700; }
.tz .arbol .as{ color:var(--tinta); font-weight:600; }
.tz .arbol .ac{ color:#2D5A48; }
.tz .arbol .anom{ color:var(--banda); font-style:italic; }
.tz span.tipo.clase{ background:var(--acento); color:#fff; border-color:var(--acento); text-transform:none; letter-spacing:0; font-family:var(--mono); }
.tz .cierre .que b{ font:600 11.5px/1.3 var(--mono); letter-spacing:0; text-transform:none; color:var(--tinta); }
.tz .otro .ent{ display:block; margin-top:4px; font:italic 500 12px/1.3 var(--texto); color:var(--banda); }
.tz .devuelve{ align-self:flex-start; font:600 13.5px/1 var(--mono); color:#fff; background:var(--acento); border-radius:5px; padding:6px 9px; }
.tz .kw{ color:var(--acento); font-weight:600; } .tz .str{ color:#4A5A2A; } .tz .num{ color:#1E4A6B; } .tz .com{ color:var(--filete); font-style:italic; }
.tz-narr{ min-height:4.4em; padding:10px 12px; background:var(--suave); border-left:4px solid var(--acento); }
.tz-narr code,.tz-cond code{ font:500 13px/1 var(--mono); background:#fff; padding:2px 5px; border-radius:4px; }
.tz-mandos{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.tz-mandos button{ font:600 14px/1 var(--titulo); min-height:40px; padding:0 14px; border:2px solid var(--tinta); background:#fff; color:var(--tinta); border-radius:6px; cursor:pointer; }
.tz-mandos button.pri{ background:var(--acento); border-color:var(--acento); color:#fff; }
.tz-mandos button:disabled{ opacity:.4; cursor:default; }
.tz-mandos button:focus-visible{ outline:3px solid var(--acento); outline-offset:2px; }
.tz-cuenta{ font:500 12.5px/1 var(--mono); color:var(--banda); margin-left:auto; }
.tz-mem{ padding:12px; display:flex; flex-direction:column; gap:14px; }
.tz-vacio{ font-size:14px; color:var(--banda); font-style:italic; }
.tz .vec{ display:flex; flex-direction:column; gap:4px; }
.tz .vec-cab{ display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; font:600 14px/1.2 var(--mono); }
.tz .vec-cab .tipo{ font:600 9.5px/1 var(--titulo); letter-spacing:.06em; text-transform:uppercase; color:var(--acento); border:1px solid var(--acento); border-radius:3px; padding:2px 4px; }
.tz .vec-cab .lon{ font:400 12px/1 var(--texto); color:var(--banda); }
.tz .vec.cambia .vec-cab .nom{ color:var(--acento); }
.tz .fila-cas{ display:flex; overflow-x:auto; position:relative; padding-bottom:2px; }
.tz .cas{ display:flex; flex-direction:column; align-items:center; gap:4px; flex:none; }
.tz .cas .v{ min-width:44px; height:40px; padding:0 6px; border:2px solid var(--tinta); margin-left:-2px; display:flex; align-items:center;
  justify-content:center; font:600 16px/1 var(--mono); background:#fff; transition:background .25s; }
.tz .cas:first-child .v{ margin-left:0; }
.tz .cas .idx{ font:500 11.5px/1 var(--mono); color:var(--banda); }
.tz .cas .v{ position:relative; white-space:pre; }
.tz .cas.mas .v{ border-style:dashed; color:var(--banda); font:italic 500 13px/1 var(--mono); padding:0 10px; margin-left:6px; }
.tz .cas.mas::after{ content:""; height:11.5px; }
.tz .fila-vert{ display:flex; flex-direction:column; border:2px solid var(--tinta); overflow-x:auto; }
.tz .cas-v{ display:flex; gap:10px; align-items:baseline; padding:6px 8px; border-top:1px solid var(--filete); background:#fff; }
.tz .cas-v:first-child{ border-top:0; }
.tz .cas-v .idx{ font:500 11.5px/1 var(--mono); color:var(--banda); flex:none; min-width:2.6em; }
.tz .cas-v .v{ font:600 13.5px/1.35 var(--mono); white-space:pre-wrap; word-break:break-all; }
.tz .cas-v.cambia{ background:var(--suave); }   /* los espacios de un texto se ven, como en R */
.tz .cas .cod{ position:absolute; top:2px; left:3px; font:600 9.5px/1 var(--mono); color:var(--acento); }
.tz .cas.na .v{ color:var(--banda); font-style:italic; }
.tz .niveles{ display:flex; flex-wrap:wrap; align-items:center; gap:4px 6px; font:500 12.5px/1.2 var(--mono); color:var(--sub); margin-top:2px; }
.tz .niveles .que{ font:600 9.5px/1 var(--titulo); letter-spacing:.08em; text-transform:uppercase; color:var(--banda); }
.tz .niveles .nv{ border:1.5px solid var(--acento); border-radius:4px; padding:3px 6px; background:#fff; }
.tz .niveles .nv b{ color:var(--acento); margin-right:4px; }
.tz .niveles .menor{ color:var(--acento); font-weight:700; }
.tz .lista{ display:flex; flex-direction:column; gap:8px; border-left:3px solid var(--tinta); padding:2px 0 2px 10px; }
.tz .elem{ display:flex; flex-direction:column; gap:4px; }
.tz .elem-cab{ display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; font:600 13.5px/1.2 var(--mono); }
.tz .elem-cab .tipo{ font:600 9.5px/1 var(--titulo); letter-spacing:.06em; text-transform:uppercase; color:var(--acento); border:1px solid var(--acento); border-radius:3px; padding:2px 4px; }
.tz .elem-cab .lon{ font:400 12px/1 var(--texto); color:var(--banda); }
.tz .elem.cambia > .elem-cab .nom{ color:var(--acento); }
.tz .elem .lista{ border-left-color:var(--filete); }
.tz .rejilla{ overflow-x:auto; padding-bottom:2px; }
.tz table.mat{ border-collapse:collapse; font:600 15px/1 var(--mono); }
.tz table.mat td{ border:2px solid var(--tinta); min-width:46px; height:36px; padding:0 7px; text-align:center; background:#fff; transition:background .25s; }
.tz table.mat th{ font:500 11.5px/1 var(--mono); color:var(--banda); padding:3px 6px; white-space:nowrap; }
.tz table.mat thead th{ text-align:center; }
.tz table.mat tbody th{ text-align:right; }
.tz table.mat td.cambia{ background:var(--suave); border-color:var(--acento); }
.tz table.mat td.foco{ outline:3px solid var(--acento); outline-offset:-3px; background:var(--suave); }
.tz table.mat th.foco{ color:var(--acento); font-weight:700; }
.tz table.df{ border-collapse:collapse; font:500 13.5px/1.2 var(--mono); }
.tz table.df th, .tz table.df td{ border-bottom:1px solid var(--filete); padding:6px 7px; text-align:left; white-space:nowrap; }
.tz table.df thead th{ border-bottom:2px solid var(--tinta); vertical-align:bottom; font-weight:700; }
.tz table.df thead th .tipo{ display:block; margin-top:3px; font:600 9px/1 var(--titulo); letter-spacing:.06em; text-transform:uppercase; color:var(--acento); }
.tz table.df tbody th{ color:var(--banda); font-weight:500; font-size:12px; text-align:right; }
.tz table.df td.dcha{ text-align:right; }
.tz table.df td.na{ color:var(--banda); font-style:italic; }
.tz table.df .nueva{ background:var(--suave); }
.tz table.df td.cambia{ background:var(--suave); color:var(--acento); font-weight:700; }
.tz table.df tr.foco th, .tz table.df tr.foco td{ background:var(--suave); }
.tz table.df tr.foco th{ color:var(--acento); font-weight:700; box-shadow:inset 4px 0 0 var(--acento); }
.tz .grupos{ font:600 10px/1 var(--titulo); letter-spacing:.06em; text-transform:uppercase; color:#fff; background:var(--acento); border-radius:3px; padding:3px 6px; }
.tz .tuberia{ border:2px solid var(--tinta); background:#fff; padding:10px; display:flex; flex-direction:column; gap:8px; }
.tz .tub-cab{ font:600 10px/1 var(--titulo); letter-spacing:.1em; text-transform:uppercase; color:var(--banda); }
.tz .tub-etapas{ display:flex; flex-wrap:wrap; align-items:center; gap:4px 6px; font:500 12.5px/1.3 var(--mono); }
.tz .tub-etapas .et{ border:1.5px solid var(--filete); border-radius:5px; padding:4px 7px; background:var(--fondo); color:var(--sub); }
.tz .tub-etapas .et.hecha{ border-color:var(--tinta); color:var(--tinta); background:#fff; }
.tz .tub-etapas .et.ahora{ border-color:var(--acento); background:var(--suave); color:var(--acento); font-weight:700; }
.tz .tub-etapas .flecha-t{ color:var(--banda); font-weight:700; }
.tz .tub-sale{ font:600 10px/1 var(--titulo); letter-spacing:.08em; text-transform:uppercase; color:var(--acento); margin-top:2px; }
.tz .grafico{ border:2px solid var(--tinta); background:#fff; padding:6px; }
.tz .grafico img{ display:block; width:100%; height:auto; }
.tz table.df tr.mas td{ color:var(--banda); font-style:italic; text-align:left; border-bottom:0; }
.tz .capa{ font:600 11.5px/1 var(--mono); color:var(--banda); margin:6px 0 3px; }
.tz .cas.cambia .v{ background:var(--suave); border-color:var(--acento); position:relative; z-index:1; }
.tz .cas.foco .v{ border:3px solid var(--acento); background:var(--suave); position:relative; z-index:2; }
.tz .cas.foco .idx{ color:var(--acento); font-weight:600; }
.tz .grande .cas .v{ min-width:54px; height:52px; font-size:19px; }
.tz .grande{ padding-top:34px; }
.tz .grande.largo .cas .v{ min-width:40px; font-size:14px; padding:0 3px; }
.tz .puntero{ position:absolute; top:0; display:flex; flex-direction:column; align-items:center; gap:2px; transition:left .35s ease; pointer-events:none; transform:translateX(-50%); }
.tz .puntero .et{ font:600 12.5px/1 var(--mono); color:#fff; background:var(--acento); padding:4px 7px; border-radius:4px; white-space:nowrap; }
.tz .puntero .flecha{ width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid var(--acento); }
.tz .otro{ font:500 13.5px/1.4 var(--mono); white-space:pre-wrap; background:var(--fondo); padding:6px 8px; }
.tz-cond{ border:1.5px dashed var(--filete); border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:6px; font:500 15px/1.35 var(--mono); }
.tz-cond .res{ align-self:flex-start; font:700 13px/1 var(--titulo); padding:5px 9px; border-radius:999px; color:#fff; }
.tz-cond .res.si{ background:var(--si); } .tz-cond .res.no{ background:var(--acento); }
.tz-aviso{ border:2px solid #8A5A00; background:#FBF3E2; color:#4A3000; border-radius:8px; padding:8px 12px; font-size:14px; }
.tz-aviso b{ font-family:var(--titulo); }
.tz-aviso .origen, .tz-error .origen{ font-family:var(--mono, ui-monospace, monospace); font-size:12.5px; opacity:.8; }
.tz-error{ border:2px solid var(--acento); background:var(--suave); border-radius:8px; padding:8px 12px; font-size:14px; }
.tz-consola{ background:var(--tinta); color:#EDEDED; font:400 14px/1.6 var(--mono); padding:10px 12px; min-height:2.6em; white-space:pre; overflow-x:auto; margin:0; }   /* como la consola: las columnas no se parten */
.tz-tabla{ border-collapse:collapse; font:500 14px/1.2 var(--mono); width:100%; }
.tz-tabla th{ font:600 10.5px/1.2 var(--titulo); letter-spacing:.06em; text-align:left; color:var(--banda); padding:6px 10px; border-bottom:1.5px solid var(--tinta); }
.tz-tabla td{ padding:6px 10px; border-bottom:1px solid var(--fila); }
.tz-tabla tr.nueva td{ background:var(--suave); }
.tz-nota{ font-size:12.5px; color:var(--banda); padding:8px 12px 10px; }
.tz-teclas{ display:none; font:500 12.5px/1.3 var(--mono); color:var(--banda); flex-basis:100%; }
.tz:fullscreen{ overflow:auto; padding:24px 4vw; border:0; border-radius:0; margin:0; }
.tz:fullscreen > *{ zoom:1.25; }
.tz:fullscreen .tz-teclas{ display:block; }
.tz:focus{ outline:none; }
@media (max-width:760px){ .tz-escena{ grid-template-columns:minmax(0,1fr); } }
@media (prefers-reduced-motion:reduce){ .tz *{ transition:none !important; } }
`;


const ESTILOS_JL = `
.tz .vec-cab .tipo, .tz .elem-cab .tipo{ text-transform:none; letter-spacing:0; font:600 11.5px/1 var(--mono); padding:2px 5px; }   /* los tipos de Julia, tal como se escriben */
.tz .vec.local > .vec-cab .nom{ font-style:italic; }
.tz .vec.local .cas .v, .tz .vec.local .escalar{ border-style:dashed; }
.tz .vec-cab .loc{ font:600 9.5px/1 var(--titulo); letter-spacing:.06em; text-transform:uppercase; color:var(--banda); border:1px dashed var(--banda); border-radius:3px; padding:2px 4px; }
.tz .escalar{ display:inline-flex; align-items:center; min-width:52px; height:40px; padding:0 10px; border:2px solid var(--tinta);
  font:600 16px/1 var(--mono); background:#fff; white-space:pre; align-self:flex-start; transition:background .25s; }
.tz .vec.cambia .escalar{ background:var(--suave); border-color:var(--acento); }
.tz .vec.local.cambia .escalar{ border-style:dashed; }
.tz .rango{ font:500 12.5px/1.35 var(--texto); color:var(--banda); }
.tz .rango code{ font:600 12.5px/1 var(--mono); color:var(--tinta); }
.tz .vec.esrango .cas .v{ border-style:dotted; color:var(--sub); }
`;

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const code = s => "<code>" + esc(s) + "</code>";
const PALABRAS = /\b(for|in|while|if|elseif|else|end|function|return|continue|break|begin|let|local|global|const|struct|mutable|using|import|module|do|try|catch|finally|true|false|nothing|missing)\b/g;

function colorea(linea) {
  const com = linea.indexOf("#");
  const [cuerpo, resto] = com >= 0 ? [linea.slice(0, com), linea.slice(com)] : [linea, ""];
  const trozos = cuerpo.split(/("[^"]*"|'(?:\\.|[^'\\])')/);
  const html = trozos.map((t, i) => i % 2 ? '<span class="str">' + esc(t) + "</span>"
    : esc(t).replace(/\b(\d+(?:\.\d+)?(?:e-?\d+)?)\b/g, '<span class="num">$1</span>').replace(PALABRAS, '<span class="kw">$1</span>')).join("");
  return html + (resto ? '<span class="com">' + esc(resto) + "</span>" : "");
}

// Cada tipo de Julia, en pocas palabras
const TIPOS = {
  Int64: "un número entero", Int32: "un número entero de 32 bits", UInt8: "un entero sin signo de 8 bits",
  Float64: "un número decimal, de coma flotante", Float32: "un número decimal de 32 bits",
  String: "un texto", Char: "un carácter", Bool: "un valor lógico, verdadero o falso", Symbol: "un símbolo",
  Nothing: "la nada: " + code("nothing"), Missing: "un dato que falta: " + code("missing"),
  "Rational{Int64}": "una fracción exacta", "ComplexF64": "un número complejo", BigInt: "un entero tan grande como haga falta",
  BigFloat: "un decimal con la precisión que se pida", Irrational: "un número irracional",
};
const queEs = t => TIPOS[t] || (/^Irrational/.test(t) ? "un número irracional, guardado de forma exacta" : null);

const PLANTILLA = `
<div class="tz-cab"><span class="tz-tit"></span><span class="tz-etq"></span></div>
<p class="tz-idea"></p>
<div class="tz-escena">
  <div class="tz-col">
    <div class="tz-caja"><div class="tz-barra"><span>Código</span><span class="tz-lin"></span></div><pre class="tz-codigo"></pre></div>
    <div class="tz-narr" aria-live="polite"></div>
    <div class="tz-mandos">
      <button class="tz-ant" aria-label="Paso anterior">◀</button>
      <button class="tz-sig pri">Paso ▶</button>
      <button class="tz-play">Reproducir</button>
      <button class="tz-reset">Reiniciar</button>
      <button class="tz-proy" aria-pressed="false" title="Pantalla completa para proyectar en clase (tecla F)">Proyectar</button>
      <span class="tz-cuenta"></span>
      <span class="tz-teclas">→ paso · ← atrás · P reproducir · Inicio reiniciar · Esc salir</span>
    </div>
  </div>
  <div class="tz-col">
    <div class="tz-caja"><div class="tz-barra negro"><span>Memoria</span><span>cada valor tiene su tipo</span></div><div class="tz-mem"></div></div>
    <div class="tz-caja"><div class="tz-barra negro"><span>Consola</span></div><pre class="tz-consola"></pre></div>
  </div>
</div>
<div class="tz-caja tz-tabla-bloque"><div class="tz-barra"><span>Tabla de traza</span><span class="tz-tabla-sub"></span></div>
  <div style="overflow-x:auto"><table class="tz-tabla"><thead></thead><tbody></tbody></table></div><p class="tz-nota"></p></div>`;

function render({ model, el }) {
  const C = model.get("config") || {};
  const D = model.get("traza"), archivo = model.get("archivo");
  if (D && D.pasos) return dibujaTraza(el, C, D);
  if (!archivo) { el.textContent = "Falta la traza: ejecuta herramientas/trazar.jl sobre este capítulo."; return; }
  // la traza está en su propio archivo JSON (en datos/trazas/, junto a trazar.jl): se descarga al abrir la página
  el.innerHTML = '<p style="font:500 13px/1.4 sans-serif;color:#6B6B6B;margin:0;padding:12px 0">Cargando el visualizador…</p>';
  return fetch(new URL("../" + archivo, import.meta.url))
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(t => { el.innerHTML = ""; return dibujaTraza(el, C, t); })
    .catch(e => { el.textContent = "No se ha podido cargar el visualizador (" + archivo + ")."; });
}

function dibujaTraza(el, C, D) {
  el.innerHTML = '<style>' + ESTILOS + ESTILOS_JL + '</style><div class="tz">' + PLANTILLA + "</div>";
  const q = s => el.querySelector(s);
  const P = D.pasos, L = D.codigo.split("\n"), cols = C.columnas || [];
  const porLinea = C.fila_en === "cada_linea";
  const ocultas = new Set(C.ocultar || []);
  let k = 0, timer = null;

  q(".tz-tit").textContent = C.titulo || "";
  q(".tz-etq").textContent = C.etiqueta || "";
  q(".tz-idea").textContent = C.idea || "";
  if (!C.idea) q(".tz-idea").style.display = "none";
  q(".tz-codigo").innerHTML = L.map((l, i) => '<span class="ln" data-n="' + (i + 1) + '"><span class="fl">▶</span><span class="no">' + (i + 1) + "</span>" + '<span class="tx">' + (colorea(l) || " ") + "</span></span>").join("");
  if (!cols.length) q(".tz-tabla-bloque").style.display = "none";
  q(".tz-tabla").querySelector("thead").innerHTML = "<tr>" + cols.map(c => "<th>" + esc(c) + "</th>").join("") + "</tr>";
  q(".tz-tabla-sub").textContent = porLinea ? "una fila por línea" : "una fila por vuelta";
  q(".tz-nota").textContent = porLinea ? "Cada fila es el estado justo después de ejecutar esa línea." : "La fila de cada vuelta se escribe al terminarla.";

  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const longitud = v => v && v.v ? (v.nv || v.v.length) : 0;
  // las variables de un paso, en el orden en que aparecieron
  const nombres = (est, orden) => (orden || Object.keys(est)).filter(n => est[n] && !ocultas.has(n));
  const muestra = v => !v ? "" : v.e ? v.v[0] : v.rango ? v.rango : v.v ? "[" + v.v.join(", ") + (v.nv ? ", …" : "") + "]" : v.t === "function" ? v.r : v.r || v.t;
  const varDelFor = l => ((L[l - 1] || "").match(/^\s*for\s+([\w,() ]+?)\s*(?:\bin\b|=|∈)\s*(.+?)\s*$/) || []);

  function quees(v) {
    if (v.t === "function") return "una función: guarda sus instrucciones, que no se ejecutan hasta que alguien la llame";
    if (v.t === "Nothing") return "que vale " + code("nothing") + ": el valor de Julia para decir «aquí no hay nada». Su tipo es " + code("Nothing");
    if (v.t === "Missing") return "que vale " + code("missing") + ": un dato que falta. Su tipo es " + code("Missing");
    if (v.e) { const t = queEs(v.t); return "un " + code(v.t) + " que vale " + code(v.v[0]) + (t ? ": " + t : ""); }
    if (v.rango) return "un rango, " + code(v.rango) + " (" + code(v.t) + "): " + longitud(v) + (longitud(v) === 1 ? " número" : " números") + " seguidos que Julia no guarda uno a uno, sino que calcula cuando se le piden";
    if (v.d) return "una matriz de " + v.d[0] + (v.d[0] === 1 ? " fila" : " filas") + " y " + v.d[1] + (v.d[1] === 1 ? " columna" : " columnas") + " (" + code(v.t) + ")";
    if (v.v) return "un vector de " + longitud(v).toLocaleString("es-ES") + (longitud(v) === 1 ? " elemento" : " elementos") + " (" + code(v.t) + ")" + (v.nv ? ". Aquí se ven los " + v.v.length + " primeros" : "");
    if (v.tupla) return "una tupla de " + v.el.length + (v.el.length === 1 ? " elemento" : " elementos") + " (" + code(v.t) + ")";
    return "un valor de tipo " + code(v.t);
  }

  function narra(p, prev) {
    if (p.tipo === "inicio") return "El programa está listo. Pulsa «Paso ▶» para ejecutar la primera línea.";
    if (p.tipo === "error") return "Julia se detiene en la línea " + p.linea + " con un error" + (p.marcos && p.marcos.length ? ", dentro de " + code(p.marcos[p.marcos.length - 1].llamada) : "") + ". Lo que viene detrás ya no se ejecuta.";
    if (p.tipo === "vuelta") {
      const [, v, sec] = varDelFor(p.linea);
      const mf = p.marcos && p.marcos.length ? p.marcos[p.marcos.length - 1].vars : null;
      const val = v && ((mf && mf[v.trim()]) || p.estado[v.trim()]);
      return v ? "Vuelta " + p.vuelta + " del <code>for</code>: " + code(v.trim()) + " toma el elemento " + p.vuelta + " de " + code(sec) + (val ? ", que vale " + esc(muestra(val)) : "") + "." +
        (p.vuelta === 1 && val && (val.local || mf) ? " " + code(v.trim()) + " es una variable <b>local</b> del bucle: solo existe dentro de él." : "")
        : "Vuelta " + p.vuelta + " del bucle.";
    }
    if (p.tipo === "fin") {
      const lp = prev && prev.linea ? (L[prev.linea - 1] || "").trim() : "";
      const idas = nombres(prev.estado, prev.orden).filter(n => prev.estado[n].local && !p.estado[n]);
      const desap = idas.length ? " " + idas.map(code).join(" y ") + (idas.length === 1 ? " desaparece: era local del bucle." : " desaparecen: eran locales del bucle.") : "";
      if (/^break\b/.test(lp)) return "El <code>break</code> ha cortado el bucle" + (p.vuelta ? " en la vuelta " + p.vuelta : "") + ": las vueltas que quedaban ya no se dan y el programa sigue después del bucle." + desap;
      if (/^\s*while\b/.test(L[p.linea - 1] || "")) return "La condición del <code>while</code> ya es <code>false</code>: el bucle termina" + (p.vuelta ? " después de " + p.vuelta + (p.vuelta === 1 ? " vuelta" : " vueltas") : "") + " y el programa sigue después de él." + desap;
      return (p.vuelta ? "El <code>for</code> ya ha recorrido todos los elementos (" + p.vuelta + (p.vuelta === 1 ? " vuelta" : " vueltas") + "): el programa sigue después del bucle."
        : "El bucle termina: el programa sigue después de él.") + desap;
    }
    { const lt = (L[p.linea - 1] || "").trim();
      if (/^break\b/.test(lt)) return "Se ejecuta <code>break</code>: Julia sale del bucle en este mismo momento, sin terminar la vuelta.";
      if (/^continue\b/.test(lt)) return "Se ejecuta <code>continue</code>: Julia deja esta vuelta a medias y salta a la siguiente."; }
    if (p.tipo === "llamada") {
      const m = p.marcos[p.marcos.length - 1], args = m.orden.filter(a => m.vars[a]);
      return "Se llama a " + code(m.llamada) + ". Julia le da a la función un espacio propio en la memoria" +
        (args.length ? ", con sus argumentos: " + args.map(a => code(a) + " vale " + esc(muestra(m.vars[a]))).join(", ") : "") +
        ". El programa salta a la función" + (m.desde && m.desde !== p.linea ? " y la línea " + m.desde + " se queda esperando el resultado." : ".");
    }
    if (p.tipo === "devuelve")
      return code(p.funcion) + (p.valor === "nothing" ? " termina sin devolver nada útil (" + code("nothing") + ")" : " termina y devuelve " + code(p.valor)) +
        ". Su espacio en la memoria desaparece, con todas sus variables, y el programa vuelve a la línea " + p.desde + ", que usa ese resultado.";
    if (p.tipo === "condicion" && p.cond.valor !== "true" && p.cond.valor !== "false")
      return "Se comprueba " + code(p.cond.texto) + (p.cond.valores !== p.cond.texto ? ": con los valores de ahora, " + code(p.cond.valores) : "") + ", que es " + code(p.cond.valor) + ". Pero " +
        (/^\s*while\b/.test(L[p.linea - 1]) ? "un <code>while</code>" : "un <code>if</code>") + " necesita " + code("true") + " o " + code("false") + ": con cualquier otra cosa, Julia da un error.";
    if (p.tipo === "condicion") {
      const si = p.cond.valor === "true", lt = (L[p.linea - 1] || "").trim(), esWhile = /^while\b/.test(lt), esElseif = /^elseif\b/.test(lt);
      return "Se comprueba " + code(p.cond.texto) + (p.cond.valores !== p.cond.texto ? ": con los valores de ahora, " + code(p.cond.valores) : "") + ", que es " + code(p.cond.valor) + ". " +
        (esWhile ? (si ? "El <code>while</code> da otra vuelta." : "El <code>while</code> se detiene.")
          : si ? "Se entra en el bloque del <code>" + (esElseif ? "elseif" : "if") + "</code>."
          : "Se salta el bloque del <code>" + (esElseif ? "elseif" : "if") + "</code>" + (/^\s*(elseif|else)\b/.test(L.slice(p.linea).join("\n").split(/\n\s*end\b/)[0].split("\n").find(x => /^\s*(elseif|else)\b/.test(x)) || "") ? " y se pasa a la rama siguiente." : "."));
    }
    const frases = [];
    // se comparan las variables del ámbito que se está ejecutando: la llamada en curso o el programa principal
    const marco = x => x && x.marcos && x.marcos.length ? x.marcos[x.marcos.length - 1] : null;
    const mp = marco(p), ma = marco(prev);
    const ahora = mp ? mp.vars : p.estado, antes = mp ? (ma && ma.id === mp.id ? ma.vars : {}) : prev.estado;
    const orden = mp ? mp.orden : p.orden;
    for (const n of nombres(ahora, orden)) {
      const a = antes[n], b = ahora[n];
      if (!a) { frases.push("Se crea " + code(n) + ", " + quees(b) + "." + (b.local && !mp ? " Es una variable local del bucle." : "")); continue; }
      if (igual(a, b)) continue;
      if (a.e && b.e) {
        frases.push(code(n) + " valía " + esc(a.v[0]) + " y ahora vale " + esc(b.v[0]) + "." +
          (a.t !== b.t ? " Ha cambiado de tipo: era un " + code(a.t) + " y ahora es un " + code(b.t) + "." : ""));
        continue;
      }
      if (a.v && b.v && a.v.length === b.v.length && !a.nv && !b.nv && a.t === b.t) {
        const camb = b.v.map((x, i) => x !== a.v[i] ? i : -1).filter(i => i >= 0);
        if (camb.length === 1) frases.push("Cambia " + code(n + "[" + (camb[0] + 1) + "]") + ": valía " + esc(a.v[camb[0]]) + " y ahora vale " + esc(b.v[camb[0]]) + ".");
        else frases.push("Cambian " + camb.length + " elementos de " + code(n) + ".");
        continue;
      }
      if (a.v && b.v && !a.d && !b.d && b.v.length === a.v.length + 1 && a.v.every((x, i) => x === b.v[i])) {
        frases.push(code(n) + " gana un elemento al final, " + esc(b.v[b.v.length - 1]) + ": ahora tiene " + b.v.length + (b.v.length === 1 ? " elemento." : " elementos."));
        continue;
      }
      frases.push(code(n) + " cambia: ahora es " + quees(b) + ".");
    }
    // las que desaparecen (una variable local de un bucle que termina)
    for (const n of nombres(antes, prev && (mp ? (ma ? ma.orden : []) : prev.orden))) if (!ahora[n] && antes[n].local && !mp) frases.push(code(n) + " desaparece: era local del bucle.");
    if (mp && prev && prev.estado) {          // dentro de una llamada, cambia algo del programa principal
      for (const n of nombres(p.estado, p.orden)) {
        const a = prev.estado[n], b = p.estado[n];
        if (a && igual(a, b)) continue;
        frases.push((a ? "Cambia " : "Se crea ") + code(n) + " en el programa principal.");
      }
    }
    if (p.salida.length > prev.salida.length) {
      const nueva = p.salida.slice(prev.salida.length).replace(/\n$/, "").split("\n");
      const linea = (L[p.linea - 1] || "").trim();
      const muestra1 = nueva.length === 1 ? code(nueva[0]) : "varias líneas";
      if (/^@show\b/.test(linea)) frases.push(code("@show") + " escribe en la consola la expresión y su valor: " + muestra1 + ".");
      else if (/^print(ln)?\(/.test(linea)) frases.push(code(linea.match(/^print(ln)?/)[0]) + " escribe en la consola " + muestra1 + (/^println/.test(linea) ? ", y salta de línea." : "."));
      else if (/^[\w.!]+$/.test(linea)) frases.push("Escribir solo " + code(linea) + " hace que Julia muestre su valor en la consola: " + muestra1 + ".");
      else if (!/(^|[^=!<>≈])=($|[^=])/.test(linea.replace(/"[^"]*"/g, ""))) frases.push("La línea es una expresión: Julia calcula " + code(linea) + " y muestra su valor en la consola, " + muestra1 + ".");
      else frases.push("Julia escribe en la consola " + muestra1 + ".");
    }
    return frases.length ? frases.join(" ") : "Se ejecuta la línea " + p.linea + ".";
  }

  function casillas(v, previo, opciones = {}) {
    const cambia = i => previo && previo.v && previo.v.length === v.v.length && previo.v[i] !== v.v[i];
    if (!opciones.grande && v.v.some(x => String(x).length > 24))
      return '<div class="fila-vert">' + v.v.map((x, i) => '<div class="cas-v' + (cambia(i) ? " cambia" : "") + '"><span class="idx">[' + (i + 1) + ']</span><span class="v">' + esc(x) + "</span></div>").join("") + "</div>";
    return '<div class="fila-cas' + (opciones.grande ? " grande" + (v.v.some(x => String(x).length > 4) ? " largo" : "") : "") + '">' + v.v.map((x, i) =>
      '<span class="cas' + (cambia(i) ? " cambia" : "") + (opciones.foco === i + 1 ? " foco" : "") + '"><span class="v">' + esc(x) + '</span><span class="idx">[' + (i + 1) + "]</span></span>").join("") +
      (v.nv ? '<span class="cas mas"><span class="v">… y ' + (v.nv - v.v.length).toLocaleString("es-ES") + ' más</span></span>' : "") +
      (opciones.foco ? '<span class="puntero"><span class="et">' + esc(opciones.puntero) + " = " + opciones.foco + '</span><span class="flecha"></span></span>' : "") + "</div>";
  }
  const condicion = p => '<div class="tz-cond"><span>' + esc(p.cond.texto) + '</span><span style="color:var(--banda)">' + esc(p.cond.valores) + '</span><span class="res ' + (p.cond.valor === "true" ? "si" : "no") + '">' + esc(p.cond.valor) + "</span></div>";

  function cabecera(v) {
    if (v.d) return '<span class="tipo">' + esc(v.t) + '</span><span class="lon">' + v.d.join(" × ") + " (filas × columnas)</span>";
    const lon = v.e || v.t === "function" ? (v.t === "function" && v.m > 1 ? v.m + " métodos" : "") : v.tupla ? v.el.length + (v.el.length === 1 ? " elemento" : " elementos") : v.v ? "longitud " + longitud(v).toLocaleString("es-ES") : "";
    return '<span class="tipo">' + esc(v.t === "function" ? "función" : v.t) + "</span>" + (lon ? '<span class="lon">' + lon + "</span>" : "") + (v.local ? '<span class="loc">local</span>' : "");
  }
  function valor(v, a, op = {}) {
    if (v.e) return '<span class="escalar">' + esc(v.v[0]) + "</span>";
    if (v.d) return rejilla(v, a, op.celda);
    if (v.tupla) return '<div class="lista">' + v.el.map((e, i) => {
      const ea = a && a.el && a.el[i] ? a.el[i].v : null;
      return '<div class="elem' + (a && (!ea || !igual(ea, e.v)) ? " cambia" : "") + '"><div class="elem-cab"><span class="nom">' + (e.nombre ? esc(e.nombre) : "[" + (i + 1) + "]") + "</span>" + cabecera(e.v) + "</div>" + valor(e.v, ea) + "</div>";
    }).join("") + "</div>";
    if (v.v) {
      if (!v.v.length) return '<div class="otro">' + esc(v.t) + "[] — vacío</div>";
      return casillas(v, a, op) + (v.rango ? '<p class="rango">El rango ' + code(v.rango) + " no guarda las casillas: sabe dónde empieza, dónde acaba y de cuánto en cuánto va.</p>" : "");
    }
    return '<div class="otro">' + esc(v.r || v.t) + "</div>";
  }
  // Una matriz: Julia, como R, guarda los valores por columnas
  function rejilla(v, a, celda) {
    const [nf, nc] = v.d, mismo = a && a.d && a.d.join() === v.d.join();
    let html = '<div class="rejilla"><table class="mat"><thead><tr><th></th>' +
      Array.from({ length: nc }, (_, j) => '<th class="' + (celda && celda[1] === j + 1 ? "foco" : "") + '">[:, ' + (j + 1) + "]</th>").join("") + "</tr></thead><tbody>";
    for (let i = 0; i < nf; i++) {
      html += '<tr><th class="' + (celda && celda[0] === i + 1 ? "foco" : "") + '">[' + (i + 1) + ", :]</th>";
      for (let j = 0; j < nc; j++) {
        const x = i + j * nf;
        const cl = (mismo && a.v[x] !== v.v[x] ? " cambia" : "") + (celda && celda[0] === i + 1 && celda[1] === j + 1 ? " foco" : "");
        html += '<td class="' + cl.trim() + '">' + esc(v.v[x]) + "</td>";
      }
      html += "</tr>";
    }
    return html + "</tbody></table></div>";
  }

  function variables(est, orden, ant, conFoco) {
    let html = "";
    const ns = nombres(est, orden);
    const lista = conFoco && C.foco && ns.includes(C.foco) ? [C.foco].concat(ns.filter(n => n !== C.foco)) : ns;
    for (const n of lista) {
      const v = est[n], a = ant && ant[n];
      const cambio = !a || !igual(a, v);
      const pp = C.puntero;
      const foco = conFoco && n === C.foco && v.v && !v.d && pp && !Array.isArray(pp) && est[pp] && est[pp].v ? Number(est[pp].v[0]) : null;
      const celda = conFoco && n === C.foco && v.d && Array.isArray(pp) && pp.every(x => est[x] && est[x].v) ? pp.map(x => Number(est[x].v[0])) : null;
      html += '<div class="vec' + (cambio && ant ? " cambia" : "") + (v.local ? " local" : "") + (v.rango ? " esrango" : "") + '"><div class="vec-cab"><span class="nom">' + esc(n) + "</span>" + cabecera(v) + "</div>" +
        (v.t === "function" ? '<div class="otro">' + esc(v.r) + "</div>" : valor(v, a, { grande: conFoco && n === C.foco && !v.d && !v.e, foco: foco >= 1 && foco <= (v.v || []).length ? foco : null, puntero: C.puntero, celda })) + "</div>";
    }
    return html;
  }

  function memoria(p, prev) {
    const M = p.marcos || [];
    let html = p.tipo === "condicion" ? condicion(p) : "";
    const hayGlobal = nombres(p.estado, p.orden).length;
    if (!M.length && !hayGlobal) html += '<p class="tz-vacio">Todavía no hay ninguna variable.</p>';
    if (M.length) html += '<span class="tz-ambito">Programa principal</span>' + (hayGlobal ? "" : '<p class="tz-vacio">Sin variables.</p>');
    html += variables(p.estado, p.orden, prev && prev.estado, true);
    const antes = prev && prev.marcos ? Object.fromEntries(prev.marcos.map(m => [m.id, m.vars])) : {};
    M.forEach((m, i) => {
      const activo = i === M.length - 1;
      html += '<div class="marco' + (activo ? " activo" : "") + '"><div class="marco-cab"><span>' + esc(m.llamada) + '</span><span class="que">' +
        (activo ? "llamada en curso" : "esperando a " + esc(M[i + 1].nombre)) + "</span></div>" +
        (Object.keys(m.vars).length ? variables(m.vars, m.orden, antes[m.id], false) : '<p class="tz-vacio">Sin variables.</p>') +
        (activo && p.tipo === "devuelve" ? '<span class="devuelve">devuelve ' + esc(p.valor) + "</span>" : "") + "</div>";
    });
    if (p.tipo === "error") html += '<div class="tz-error"><b>Error de Julia</b><br>' + esc(p.error) + "</div>";
    return html;
  }

  function coloca() {
    const f = el.querySelector(".grande"); if (!f) return;
    const c = f.querySelector(".cas.foco"), pt = f.querySelector(".puntero");
    if (c && pt) pt.style.left = (c.offsetLeft + c.offsetWidth / 2) + "px";
    if (c && f.scrollWidth > f.clientWidth) {
      const izq = c.offsetLeft, der = izq + c.offsetWidth;
      if (izq < f.scrollLeft) f.scrollLeft = izq - 8;
      else if (der > f.scrollLeft + f.clientWidth) f.scrollLeft = der - f.clientWidth + 8;
    }
  }

  function pinta() {
    const p = P[k], prev = P[Math.max(0, k - 1)];
    el.querySelectorAll(".ln").forEach(n => n.classList.remove("hecha", "error", "espera"));
    (p.marcos || []).forEach(m => { const ln = m.desde && el.querySelector('.ln[data-n="' + m.desde + '"]'); if (ln && m.desde !== p.linea) ln.classList.add("espera"); });
    if (p.linea) { const ln = el.querySelector('.ln[data-n="' + p.linea + '"]'); if (ln) { ln.classList.add("hecha"); if (p.tipo === "error") ln.classList.add("error"); } }
    q(".tz-lin").textContent = p.linea ? "línea " + p.linea : "";
    q(".tz-narr").innerHTML = narra(p, prev);
    q(".tz-mem").innerHTML = memoria(p, k ? prev : null);
    q(".tz-consola").textContent = p.salida || "";
    q(".tz-cuenta").textContent = "paso " + k + " de " + (P.length - 1);
    q(".tz-ant").disabled = k === 0; q(".tz-sig").disabled = k === P.length - 1;
    const filas = (D.filas || []).slice(0, p.nfilas || 0);
    q(".tz-tabla").querySelector("tbody").innerHTML = filas.map((f, i) => '<tr class="' + (i === filas.length - 1 && p.nfilas > (prev.nfilas || 0) ? "nueva" : "") + '">' +
      cols.map(c => "<td>" + esc(f[c] ?? "") + "</td>").join("") + "</tr>").join("");
    requestAnimationFrame(coloca);
  }
  const para = () => { if (timer) { clearInterval(timer); timer = null; q(".tz-play").textContent = "Reproducir"; } };
  q(".tz-sig").addEventListener("click", () => { para(); if (k < P.length - 1) { k++; pinta(); } });
  q(".tz-ant").addEventListener("click", () => { para(); if (k > 0) { k--; pinta(); } });
  q(".tz-reset").addEventListener("click", () => { para(); k = 0; pinta(); });
  q(".tz-play").addEventListener("click", () => {
    if (timer) return para();
    if (k === P.length - 1) k = 0;
    q(".tz-play").textContent = "Pausa";
    timer = setInterval(() => { if (k >= P.length - 1) return para(); k++; pinta(); }, 1100);
  });
  // Proyectar: a pantalla completa con letra grande; teclado o mando de presentaciones (Av Pág / Re Pág)
  const raiz = q(".tz"), proy = q(".tz-proy");
  raiz.tabIndex = -1;
  const proyectando = () => ((raiz.getRootNode().fullscreenElement || document.fullscreenElement) === raiz);
  if (!document.fullscreenEnabled || !raiz.requestFullscreen) proy.remove();
  else proy.addEventListener("click", () => { if (proyectando()) document.exitFullscreen(); else raiz.requestFullscreen().then(() => raiz.focus()).catch(() => {}); });
  const alCambiarPantalla = () => {
    const on = proyectando();
    proy.setAttribute("aria-pressed", on ? "true" : "false");
    proy.textContent = on ? "Salir de la proyección" : "Proyectar";
    requestAnimationFrame(coloca);
  };
  document.addEventListener("fullscreenchange", alCambiarPantalla);
  raiz.addEventListener("keydown", e => {
    if (e.target.matches && e.target.matches("input, textarea, select")) return;
    const acciones = { ArrowRight: ".tz-sig", PageDown: ".tz-sig", ArrowLeft: ".tz-ant", PageUp: ".tz-ant", Home: ".tz-reset", p: ".tz-play", P: ".tz-play", f: ".tz-proy", F: ".tz-proy" };
    const b = acciones[e.key] && q(acciones[e.key]);
    if (b && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); b.click(); }
  });
  pinta();
  return () => { para(); document.removeEventListener("fullscreenchange", alCambiarPantalla); };
}

export default { render };
