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
.tz table.dic{ border-collapse:collapse; font:500 14px/1.3 var(--mono); background:#fff; border:2px solid var(--tinta); max-width:100%; }   /* un Dict */
.tz table.dic th{ font:600 9.5px/1 var(--titulo); letter-spacing:.06em; text-transform:uppercase; color:var(--banda); text-align:left; padding:5px 8px; border-bottom:1px solid var(--filete); }
.tz table.dic td{ padding:5px 8px; border-top:1px solid var(--fila); white-space:pre; }
.tz table.dic td.flecha{ color:var(--banda); padding:5px 2px; }
.tz table.dic td:last-child{ white-space:pre-wrap; overflow-wrap:anywhere; }      /* un valor largo (un vector de versiones) parte la línea en el móvil */
.tz table.dic tr.nueva td, .tz table.dic tr.cambia td{ background:var(--suave); }
.tz table.dic tr.nueva td:first-child, .tz table.dic tr.cambia td:last-child{ color:var(--acento); font-weight:700; }
.tz .fila-letras{ display:flex; flex-wrap:wrap; row-gap:8px; }   /* un texto: sus letras, con el índice (de byte) de cada una */
.tz .letra{ display:flex; flex-direction:column; gap:4px; flex:none; }
.tz .letra .v{ height:40px; border:2px solid var(--tinta); margin-left:-2px; display:flex; align-items:center; justify-content:center;
  font:600 16px/1 var(--mono); background:#fff; transition:background .25s; }
.tz .letra:first-child .v{ margin-left:0; }
.tz .letra.multi .v{ color:var(--acento); }
.tz .letra.cambia .v{ background:var(--suave); border-color:var(--acento); }
.tz .letra .esp{ color:var(--filete); font-weight:500; }
.tz .letra .idx{ display:flex; justify-content:space-around; font:500 11.5px/1 var(--mono); color:var(--banda); }
.tz .letra .idx .no{ color:var(--filete); text-decoration:line-through; }
.tz .letra .bytes{ font:600 9px/1 var(--titulo); letter-spacing:.05em; text-transform:uppercase; color:var(--acento); text-align:center; }
.tz .codigo{ margin-left:8px; font:500 12px/1 var(--mono); color:var(--banda); }
.tz .fila-cas.bool{ flex-wrap:wrap; row-gap:6px; overflow-x:visible; }   /* una máscara se ve entera: sus true, en color */
.tz .fila-cas.bool .cas .v{ min-width:0; padding:0 6px; font-size:13.5px; }
.tz .fila-cas.bool .cas.si .v{ color:var(--acento); font-weight:700; }
.tz .fila-cas.bool .cas.no .v{ color:var(--filete); font-weight:500; }
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
.tz table.tdf{ border-collapse:collapse; font:500 12.5px/1.25 var(--mono); background:#fff; border:2px solid var(--tinta); }   /* un DataFrame */
.tz table.tdf th{ font:600 12px/1.2 var(--mono); text-align:left; padding:5px 7px 1px; color:var(--tinta); white-space:nowrap; }
.tz table.tdf th.tipo{ font:500 9.5px/1.2 var(--titulo); letter-spacing:.04em; color:var(--banda); padding:0 7px 5px; border-bottom:2px solid var(--tinta); }
.tz table.tdf th.fila{ color:var(--banda); font-weight:500; text-align:right; padding:4px 7px; border-right:1px solid var(--filete); }
.tz table.tdf td{ padding:3px 7px; border-top:1px solid var(--fila); white-space:pre; }
.tz table.tdf td.num{ text-align:right; }
.tz table.tdf td.cambia, .tz table.tdf .nueva{ background:var(--suave); }
.tz table.tdf td.cambia{ color:var(--acento); font-weight:700; }
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
.tz .ex{ display:flex; flex-direction:column; gap:6px; }      /* una expresión (Expr): su texto y su árbol */
.tz .ex-r{ font:600 13.5px/1.35 var(--mono); white-space:pre-wrap; overflow-wrap:anywhere; background:var(--fondo); padding:5px 8px; }
.tz .arbol{ overflow-x:auto; padding:2px 2px 4px; }
.tz .arbol ul{ display:flex; justify-content:center; margin:0; padding:14px 0 0; position:relative; }
.tz .arbol > ul{ padding-top:0; justify-content:flex-start; }
.tz .arbol li{ list-style:none; position:relative; padding:14px 3px 0; display:flex; flex-direction:column; align-items:center; }
.tz .arbol > ul > li{ padding-top:0; }
.tz .arbol li::before, .tz .arbol li::after{ content:""; position:absolute; top:0; right:50%; width:50%; height:14px; border-top:1.5px solid var(--banda); }
.tz .arbol li::after{ right:auto; left:50%; border-left:1.5px solid var(--banda); }
.tz .arbol li:first-child::before, .tz .arbol li:last-child::after{ border:0 none; }
.tz .arbol li:last-child::before{ border-right:1.5px solid var(--banda); border-radius:0 6px 0 0; }
.tz .arbol li:first-child::after{ border-radius:6px 0 0 0; }
.tz .arbol li:only-child::before{ border-top:0; border-radius:0; }
.tz .arbol li:only-child::after{ display:none; }
.tz .arbol > ul > li::before, .tz .arbol > ul > li::after{ display:none; }
.tz .arbol ul ul::before{ content:""; position:absolute; top:0; left:50%; height:14px; border-left:1.5px solid var(--banda); }
.tz .arbol .ai{ font:500 10px/1 var(--mono); color:var(--banda); margin-bottom:2px; }
.tz .arbol .cz{ font:700 12px/1 var(--mono); color:#fff; background:var(--tinta); border-radius:4px; padding:4px 7px; white-space:nowrap; }
.tz .arbol .hj{ font:600 13px/1 var(--mono); border:1.5px solid var(--tinta); background:#fff; border-radius:4px; padding:4px 7px; white-space:pre; }
.tz .arbol .hj.sym{ color:var(--acento); border-color:var(--acento); }
.tz .arbol .cambia{ background:var(--suave); box-shadow:0 0 0 2px var(--acento); }
.tz .arbol .cz.cambia{ background:var(--acento); }
.tz-cond{ border:1.5px dashed var(--filete); border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:6px; font:500 15px/1.35 var(--mono); }
.tz-cond .res{ align-self:flex-start; font:700 13px/1 var(--titulo); padding:5px 9px; border-radius:999px; color:#fff; }
.tz-cond .res.si{ background:var(--si); } .tz-cond .res.no{ background:var(--acento); }
.tz-aviso{ border:2px solid #8A5A00; background:#FBF3E2; color:#4A3000; border-radius:8px; padding:8px 12px; font-size:14px; }
.tz-aviso b{ font-family:var(--titulo); }
.tz-aviso .origen, .tz-error .origen{ font-family:var(--mono, ui-monospace, monospace); font-size:12.5px; opacity:.8; }
.tz-error{ border:2px solid var(--acento); background:var(--suave); border-radius:8px; padding:8px 12px; font-size:14px; }
.tz-error .txt{ white-space:pre-line; overflow-wrap:anywhere; }
.tz .modulo{ border-left:3px solid var(--acento); padding:2px 0 2px 10px; display:flex; flex-direction:column; gap:8px; }   /* capítulo 23 */
.tz .modulo .exp{ font:600 9.5px/1 var(--titulo); letter-spacing:.06em; text-transform:uppercase; color:#fff; background:var(--acento); border-radius:3px; padding:2px 4px; }
.tz .modulo .noexp{ font:400 11.5px/1 var(--texto); color:var(--banda); }
.tz-error.atrapado{ border-style:dashed; background:#fff; }      /* capítulo 22: un error que atrapa un catch */
.tz-error.atrapado b{ color:var(--acento); }
.tz .ln.salta{ border-left:4px dashed var(--acento); }
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
.tz .escalar{ min-height:40px; height:auto; max-width:100%; box-sizing:border-box; overflow-wrap:anywhere; white-space:pre-wrap; padding-top:6px; padding-bottom:6px; }   /* un texto largo parte la línea */
.tz .vec.cambia .escalar{ background:var(--suave); border-color:var(--acento); }
.tz .vec.local.cambia .escalar{ border-style:dashed; }
.tz .vec.esvista .cas .v{ border-style:dashed; }   /* una vista: sus casillas son las de otro */
.tz .cas .org{ font:600 10.5px/1 var(--mono); color:var(--acento); padding:0 4px; text-align:center; }
.tz .vec.esvista .cas{ align-items:stretch; }   /* cada casilla tan ancha como el nombre de la de origen */
.tz .vec.esvista .cas .idx{ text-align:center; }
.tz .cas.envista .v{ box-shadow:inset 0 -5px 0 var(--acento); }
.tz table.mat td.envista{ box-shadow:inset 0 -4px 0 var(--acento); }
.tz .cas-v .ali{ font:600 11px/1.2 var(--texto); color:var(--acento); background:var(--suave); border:1px solid var(--acento); border-radius:3px; padding:2px 6px; margin-left:auto; flex:none; white-space:nowrap; }
.tz .vec-cab .comparte{ font:600 11px/1.2 var(--texto); color:var(--acento); background:var(--suave); border:1px solid var(--acento); border-radius:3px; padding:2px 6px; }
.tz .rango{ font:500 12.5px/1.35 var(--texto); color:var(--banda); }
.tz .rango code{ font:600 12.5px/1 var(--mono); color:var(--tinta); }
.tz .vec.esrango .cas .v{ border-style:dotted; color:var(--sub); }
/* los gráficos (capítulo 12): la ficha de un Plot en la memoria y la caja donde se dibuja */
.tz .gficha{ display:flex; flex-direction:column; gap:5px; }
.tz .gficha .gtit{ font:500 12.5px/1.3 var(--texto); color:var(--sub); }
.tz .gficha .gtit b{ font-family:var(--titulo); color:var(--tinta); }
.tz .gserie{ display:flex; align-items:center; flex-wrap:wrap; gap:8px; border:2px solid var(--tinta); background:#fff; padding:6px 9px; transition:background .25s; }
.tz .gserie.cambia{ background:var(--suave); border-color:var(--acento); }
.tz .gserie .mues{ display:inline-block; width:26px; height:12px; flex:none; }
.tz .gserie .et{ font:600 13.5px/1.2 var(--mono); }
.tz .gserie .que{ font:500 12px/1.2 var(--texto); color:var(--banda); }
.tz .gvacio{ font:500 13px/1.4 var(--texto); color:var(--banda); padding:6px 0; }
.tz .tz-graf{ padding:10px; background:#fff; }
.tz .tz-graf img, .tz .tz-graf svg{ display:block; width:100%; height:auto; max-width:640px; margin:0 auto; }
.tz .tz-graf-caja{ margin-top:16px; }
.tz .tz-graf-caja.nuevo{ box-shadow:0 0 0 3px var(--suave); }
.tz .tz-graf-caja.nuevo .tz-barra{ background:var(--acento); }
.tz .tz-graf .vacio{ font:500 13px/1.4 var(--texto); color:var(--banda); margin:0; }
`;

// ── Dibujar un gráfico (capítulo 12) ─────────────────────────────────────────────────
// En el libro, el gráfico es el SVG que hace Plots. En el laboratorio se dibuja aquí, con lo que el
// intérprete ha calculado igual que Plots: los puntos de cada serie, sus colores, los límites de los ejes
// y sus marcas. El aspecto se parece al de Plots (GR), pero no es idéntico píxel a píxel.
let nGraf = 0;
function dibujaGrafico(g) {
  const sp = g.sp[0], W = 600, H = 400, e = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const xa = +sp.x.lim[0], xb = +sp.x.lim[1], ya = +sp.y.lim[0], yb = +sp.y.lim[1];
  const ancho = s => s.length * 7.2;
  const Lm = 16 + Math.max(0, ...sp.y.etiquetas.map(ancho)) + 8 + (sp.y.guia ? 22 : 0);
  const R = 18, T = 14 + (sp.titulo ? 30 : 0), B = 30 + (sp.x.guia ? 24 : 0);
  const X = v => Lm + (v - xa) / (xb - xa) * (W - Lm - R), Y = v => H - B - (v - ya) / (yb - ya) * (H - T - B);
  const id = "gclip" + (++nGraf);
  let o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" font-family="Helvetica, Arial, sans-serif" role="img" aria-label="' + e(sp.titulo || "Un gráfico") + '">' +
    '<rect width="' + W + '" height="' + H + '" fill="#fff"/><defs><clipPath id="' + id + '"><rect x="' + Lm + '" y="' + T + '" width="' + (W - Lm - R) + '" height="' + (H - T - B) + '"/></clipPath></defs>';
  sp.x.marcas.forEach(m => { const x = X(+m); o += '<line x1="' + x + '" y1="' + T + '" x2="' + x + '" y2="' + (H - B) + '" stroke="#000" stroke-opacity=".1"/>'; });
  sp.y.marcas.forEach(m => { const y = Y(+m); o += '<line x1="' + Lm + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '" stroke="#000" stroke-opacity=".1"/>'; });
  o += '<path d="M' + Lm + " " + T + "V" + (H - B) + "H" + (W - R) + '" fill="none" stroke="#000"/>';
  sp.x.marcas.forEach((m, i) => { const x = X(+m); o += '<line x1="' + x + '" y1="' + (H - B) + '" x2="' + x + '" y2="' + (H - B - 5) + '" stroke="#000"/><text x="' + x + '" y="' + (H - B + 17) + '" font-size="12" text-anchor="middle">' + e(sp.x.etiquetas[i]) + "</text>"; });
  sp.y.marcas.forEach((m, i) => { const y = Y(+m); o += '<line x1="' + Lm + '" y1="' + y + '" x2="' + (Lm + 5) + '" y2="' + y + '" stroke="#000"/><text x="' + (Lm - 6) + '" y="' + (y + 4) + '" font-size="12" text-anchor="end">' + e(sp.y.etiquetas[i]) + "</text>"; });
  if (sp.titulo) o += '<text x="' + ((Lm + W - R) / 2) + '" y="' + 28 + '" font-size="17" text-anchor="middle">' + e(sp.titulo) + "</text>";
  if (sp.x.guia) o += '<text x="' + ((Lm + W - R) / 2) + '" y="' + (H - 8) + '" font-size="14" text-anchor="middle">' + e(sp.x.guia) + "</text>";
  if (sp.y.guia) o += '<text transform="translate(16 ' + ((T + H - B) / 2) + ') rotate(-90)" font-size="14" text-anchor="middle">' + e(sp.y.guia) + "</text>";
  const DASH = { dash: "9 5", dot: "2 4", dashdot: "9 4 2 4", dashdotdot: "9 4 2 4 2 4" };
  const marca = (forma, x, y, r, s) => {
    const f = 'fill="' + s.relleno + '" stroke="' + s.borde + '" stroke-width="1"';
    const pol = pts => '<polygon points="' + pts.map(([a, b]) => (x + a * r).toFixed(1) + "," + (y + b * r).toFixed(1)).join(" ") + '" ' + f + "/>";
    if (forma === "rect") return '<rect x="' + (x - r * 0.9) + '" y="' + (y - r * 0.9) + '" width="' + r * 1.8 + '" height="' + r * 1.8 + '" ' + f + "/>";
    if (forma === "diamond") return pol([[0, -1.2], [1.2, 0], [0, 1.2], [-1.2, 0]]);
    if (forma === "utriangle") return pol([[0, -1.2], [1.1, 0.8], [-1.1, 0.8]]);
    if (forma === "dtriangle") return pol([[0, 1.2], [1.1, -0.8], [-1.1, -0.8]]);
    if (forma === "rtriangle") return pol([[1.2, 0], [-0.8, 1.1], [-0.8, -1.1]]);
    if (forma === "ltriangle") return pol([[-1.2, 0], [0.8, 1.1], [0.8, -1.1]]);
    if (/^star/.test(forma)) { const n = +forma.slice(4) || 5, pts = []; for (let k = 0; k < 2 * n; k++) { const a = -Math.PI / 2 + k * Math.PI / n, q = k % 2 ? 0.5 : 1.3; pts.push([q * Math.cos(a), q * Math.sin(a)]); } return pol(pts); }
    if (forma === "cross" || forma === "+") return '<path d="M' + (x - r) + " " + y + "H" + (x + r) + "M" + x + " " + (y - r) + "V" + (y + r) + '" stroke="' + s.relleno + '" stroke-width="2"/>';
    if (forma === "xcross" || forma === "x") return '<path d="M' + (x - r) + " " + (y - r) + "L" + (x + r) + " " + (y + r) + "M" + (x - r) + " " + (y + r) + "L" + (x + r) + " " + (y - r) + '" stroke="' + s.relleno + '" stroke-width="2"/>';
    if (["hexagon", "pentagon", "heptagon", "octagon"].includes(forma)) { const n = { pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8 }[forma], pts = []; for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + 2 * k * Math.PI / n; pts.push([1.1 * Math.cos(a), 1.1 * Math.sin(a)]); } return pol(pts); }
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" ' + f + "/>";
  };
  o += '<g clip-path="url(#' + id + ')">';
  for (const s of sp.series) {
    if (s.primaria === false) continue;          // la serie secundaria de unas barras no se ve
    const pts = s.x.map((x, i) => [+x, +s.y[i]]);
    const w = +s.ancho;
    if (s.tipo === "shape") {                    // barras: un polígono relleno por cada trozo entre NaN
      let d = "", nuevo = true;
      for (const [x, y] of pts) { if (!Number.isFinite(x) || !Number.isFinite(y)) { if (!nuevo) d += "Z"; nuevo = true; continue; } d += (nuevo ? "M" : "L") + X(x).toFixed(1) + " " + Y(y).toFixed(1); nuevo = false; }
      if (!nuevo) d += "Z";
      o += '<path d="' + d + '" fill="' + (s.fondo || s.relleno) + '" stroke="' + s.color + '" stroke-width="' + (w > 0 ? 1.2 * w : 0) + '" stroke-linejoin="miter"/>';
      continue;
    }
    if (s.tipo === "path" && w > 0) {
      let d = "", pluma = false;
      for (const [x, y] of pts) { if (!Number.isFinite(x) || !Number.isFinite(y)) { pluma = false; continue; } d += (pluma ? "L" : "M") + X(x).toFixed(1) + " " + Y(y).toFixed(1); pluma = true; }
      o += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (1.4 * w) + '" stroke-linejoin="round" stroke-linecap="round"' + (DASH[s.estilo] ? ' stroke-dasharray="' + DASH[s.estilo] + '"' : "") + "/>";
    }
    if (s.marca !== "none") for (const [x, y] of pts) if (Number.isFinite(x) && Number.isFinite(y)) o += marca(s.marca, X(x), Y(y), +s.tam * 1.05, s);
  }
  o += "</g>";
  // la leyenda: las series con etiqueta, en la esquina con menos puntos («best»)
  const conEt = sp.series.filter(s => s.etiqueta !== "" && s.primaria !== false);
  if (sp.leyenda !== "none" && conEt.length) {
    const lw = 46 + Math.max(...conEt.map(s => ancho(s.etiqueta))), lh = 10 + 20 * conEt.length;
    const esq = { topright: [W - R - lw - 8, T + 8], topleft: [Lm + 8, T + 8], bottomright: [W - R - lw - 8, H - B - lh - 8], bottomleft: [Lm + 8, H - B - lh - 8] };
    let pos = sp.leyenda.replace(/^outer/, "");
    if (pos === "right") pos = "topright"; if (pos === "left") pos = "topleft"; if (pos === "top") pos = "topright"; if (pos === "bottom") pos = "bottomright";
    if (!esq[pos]) {
      const dentro = ([lx, ly]) => sp.series.filter(s => s.primaria !== false).reduce((n, s) => n + s.x.filter((x, i) => { const px = X(+x), py = Y(+s.y[i]); return px >= lx && px <= lx + lw && py >= ly && py <= ly + lh; }).length, 0);
      pos = ["topright", "topleft", "bottomright", "bottomleft"].reduce((m, k) => dentro(esq[k]) < dentro(esq[m]) ? k : m, "topright");
    }
    const [lx, ly] = esq[pos];
    o += '<rect x="' + lx + '" y="' + ly + '" width="' + lw + '" height="' + lh + '" fill="#fff" stroke="#000" stroke-opacity=".35"/>';
    conEt.forEach((s, k) => {
      const y = ly + 15 + 20 * k;
      if (s.tipo === "shape") o += '<rect x="' + (lx + 12) + '" y="' + (y - 6) + '" width="18" height="12" fill="' + (s.fondo || s.relleno) + '" stroke="' + s.color + '"/>';
      if (s.tipo === "path" && +s.ancho > 0) o += '<line x1="' + (lx + 8) + '" y1="' + y + '" x2="' + (lx + 34) + '" y2="' + y + '" stroke="' + s.color + '" stroke-width="' + (1.4 * +s.ancho) + '"' + (DASH[s.estilo] ? ' stroke-dasharray="' + DASH[s.estilo] + '"' : "") + "/>";
      if (s.marca !== "none") o += marca(s.marca, lx + 21, y, Math.min(+s.tam * 1.05, 6), s);
      o += '<text x="' + (lx + 40) + '" y="' + (y + 4) + '" font-size="12">' + e(s.etiqueta) + "</text>";
    });
  }
  return o + "</svg>";
}

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const code = s => "<code>" + esc(s) + "</code>";
const plural = c => c === "vector" ? "vectores" : c + "s";
// un argumento que es un objeto del programa principal (el mismo, no una copia) o una vista de uno suyo
const nombreDeId = (id, est) => id ? Object.keys(est || {}).find(m => est[m] && est[m].id === id && !est[m].vista) : null;
const deFuera = (v, est) => {
  if (!v) return "";
  if (v.vista) { const p = nombreDeId(v.vista.padre, est); return p ? " (una <b>vista</b> de " + code(p + "[" + v.vista.i + "]") + ": sus casillas son las de " + code(p) + ")" : ""; }
  const m = !v.e && nombreDeId(v.id, est);
  return m ? " (" + (v.d ? "la misma matriz" : v.dict ? "el mismo diccionario" : v.struct ? "el mismo objeto" : "el mismo vector") + " que " + code(m) + ", no una copia)" : "";
};
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
  "SubString{String}": "un trozo de otro texto, que comparte sus bytes en vez de copiarlos",
  AbstractString: "un texto, de cualquier tipo de texto",
};
// un texto tal como lo escribe Julia ("canci\"ón") → el texto de verdad
const sinComillas = r => r.slice(1, -1).replace(/\\(.)/g, (_, c) => ({ n: "\n", t: "\t", r: "\r" })[c] || c);
const bytesDe = c => { const cp = c.codePointAt(0); return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4; };
const esTipoTexto = t => t === "String" || t === "SubString{String}";
// los tipos largos (los de algunos rangos) se abrevian: StepRangeLen{Float64, …}
const corta = t => t.length > 30 && t.includes("{") ? t.slice(0, t.indexOf("{") + 1) + t.slice(t.indexOf("{") + 1).split(",")[0].replace(/}$/, "") + ", …}" : t;
const queEs = t => TIPOS[t] || (/^Irrational/.test(t) ? "un número irracional, guardado de forma exacta" : /^Pair\{/.test(t) ? "una pareja, escrita con =>" : null);

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
<div class="tz-caja tz-graf-caja"><div class="tz-barra negro"><span>Gráfico</span><span class="tz-graf-sub"></span></div><div class="tz-graf"></div></div>
<div class="tz-caja tz-tabla-bloque"><div class="tz-barra"><span>Tabla de traza</span><span class="tz-tabla-sub"></span></div>
  <div style="overflow-x:auto"><table class="tz-tabla"><thead></thead><tbody></tbody></table></div><p class="tz-nota"></p></div>`;

// ── El laboratorio: el programa del alumno, ejecutado aquí mismo por el intérprete del libro ──────
const EJEMPLOS = [
  { nombre: "Julia como calculadora", codigo: "precio = 40\ndescuento = 0.15\nfinal = precio * (1 - descuento)\nfinal\nprecio = 50\nfinal" },
  { nombre: "Vectores y el punto", codigo: "notas = [9.0, 6.5, 4.0, 7.5]\nsubida = notas .+ 0.5\naprobado = notas .>= 5\nsum(aprobado)\nmedia = sum(notas) / length(notas)" },
  { nombre: "Letras y bytes", codigo: "s = \"canción\"\nn = length(s)\nb = ncodeunits(s)\no = s[6]\nfor c in s\n    println(c, \" \", Int(c))\nend\npalabras = split(\"El niño come\")\ns[7]" },
  { nombre: "Un diccionario", codigo: "notas = Dict(\"Ana\" => 9.0, \"Biel\" => 4.0)\nnotas[\"Carla\"] = 7.5\nnotas[\"Biel\"] = 5.0\nfor (nombre, nota) in notas\n    println(nombre, \": \", nota)\nend\nnotas[\"Eva\"]" },
  { nombre: "Una matriz", codigo: "notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5]\nbiel = notas[2, 3]\nnotas[:, 3] .+= 0.5\npor_examen = sum(notas; dims=1)\npesos = [0.25, 0.25, 0.5]\nfinales = notas * pesos\nv = vec(notas)\nnotas[4, 1]" },
  { nombre: "Un tipo propio", codigo: "mutable struct Ficha\n    nombre::String\n    faltas::Int\nend\nbiel = Ficha(\"Biel\", 0)\nbiel.faltas += 1\ncopia = biel\ncopia.faltas = 5\nbiel\nresumen(f::Ficha) = f.nombre * \": \" * string(f.faltas) * \" faltas\"\nr = resumen(biel)\nresumen(\"Biel\")" },
  { nombre: "Una tabla de datos", codigo: "using DataFrames, Statistics\nclase = DataFrame(nombre = [\"Ana\", \"Biel\", \"Carla\", \"Dani\"],\n                  curso = [2, 1, 2, 1],\n                  nota = [9.0, 4.5, 7.5, 6.0])\naprobados = clase[clase.nota .>= 5, :]\nranking = sort(clase, :nota, rev = true)\npor_curso = combine(groupby(clase, :curso), :nota => mean => :media)\nclase.aprobada = clase.nota .>= 5\nclase\nclase.edad" },
  { nombre: "Un sistema de ecuaciones", codigo: "using LinearAlgebra\nA = [2 1; 4 3]\nb = [5, 11]\nx = A \\ b\nd = det(A)\nF = [2//1 1; 4 3]\nFinv = inv(F)\nF * Finv == I\nB = [2 4; 1 2]\nB \\ [1, 2]" },
  { nombre: "Un gráfico", codigo: "using Plots\nexamen = 1:3\nana = [6.5, 8.0, 9.0]\nbiel = [5.0, 6.5, 7.5]\np = plot(examen, ana, label = \"Ana\", title = \"Notas\", xlabel = \"examen\")\nplot!(p, examen, biel, label = \"Biel\")\nscatter!(p, [3], [9.0], label = \"la mejor\", markersize = 7)" },
  { nombre: "Dados al azar", codigo: "using Plots, Random\nRandom.seed!(7)\nd1 = rand(1:6, 1000)\nd2 = rand(1:6, 1000)\nsuma = d1 .+ d2\nsietes = count(==(7), suma)\nhistogram(suma, bins = 1.5:1:12.5, label = \"suma de dos dados\")" },
  { nombre: "Una ecuación", codigo: "function biseccion(f, a, b; tol = 0.001)\n    while b - a > tol\n        m = (a + b) / 2\n        if f(a) * f(m) <= 0\n            b = m\n        else\n            a = m\n        end\n    end\n    return (a + b) / 2\nend\n\ng(x) = x^3 - x - 2\nr = biseccion(g, 1, 2)" },
  { nombre: "El café que se enfría", codigo: "k = 0.1\nT = 90.0\nt = 0.0\nh = 2.0\nwhile t < 20\n    T = T + h * (-k * (T - 20))\n    t += h\nend\nT", tabla: "t, T" },
  { nombre: "Medidas con ruido", codigo: "using Statistics, Random\nRandom.seed!(3)\nmedidas = 20.0 .+ 0.5 .* randn(8)\nmedia = mean(medidas)\ndesviacion = std(medidas)\nmargen = desviacion / sqrt(8)" },
  { nombre: "Tipos con parámetros", codigo: "struct Punto{T<:Real}\n    x::T\n    y::T\nend\nque_es(p::Punto{Int64}) = \"un punto de enteros\"\nque_es(p::Punto) = \"un punto de otro tipo\"\np = Punto(3, 4)\nq = Punto(1.5, 2.0)\nque_es(p)\nque_es(q)\ntypeof(q)" },
  { nombre: "Piedra, papel o tijera", codigo: "abstract type Jugada end\nstruct Piedra <: Jugada end\nstruct Papel <: Jugada end\nstruct Tijera <: Jugada end\ngana(a::Jugada, b::Jugada) = false\ngana(a::Piedra, b::Tijera) = true\ngana(a::Tijera, b::Papel) = true\ngana(a::Papel, b::Piedra) = true\ngana(Piedra(), Tijera())\ngana(Tijera(), Piedra())\ngana(Papel(), Papel())" },
  { nombre: "Un polinomio hecho código", codigo: "coefs = [1, -3, 2]\np = :(0)\nfor (k, c) in enumerate(coefs)\n    p = :($p + $c * x ^ $(k - 1))\nend\np\nx = 2\neval(p)\nx = 0.5\neval(p)", tabla: "k, c, p" },
  { nombre: "Una nota que no vale", codigo: "function nota(t)\n    n = tryparse(Float64, t)\n    n === nothing && throw(ArgumentError(\"«$t» no es un número\"))\n    0 <= n <= 10 || throw(DomainError(n, \"la nota va de 0 a 10\"))\n    return n\nend\nfor t in [\"8.5\", \"once\", \"12\", \"6\"]\n    try\n        println(t, \" → \", nota(t))\n    catch e\n        println(t, \" → \", typeof(e))\n    end\nend\nnota(\"diez\")" },
  { nombre: "Un módulo propio", codigo: "module Tienda\nexport precio\nconst IVA = 0.21\nprecio(base) = round(base * (1 + IVA); digits = 2)\nend\nusing .Tienda\nprecios = precio.([10.0, 4.5, 20.0])\nTienda.IVA\nv\"1.10.0\" > v\"1.9.0\"" },
  { nombre: "Un cuaderno que reacciona", codigo: "function afectadas(i, despues, orden = Int[])\n    for j in despues[i]\n        if !(j in orden)\n            afectadas(j, despues, orden)\n        end\n    end\n    pushfirst!(orden, i)\n    return orden\nend\nceldas = [\"precio = 20.0\", \"iva = 0.21 * precio\", \"total = precio + iva\"]\ndespues = [[2, 3], [3], Int[]]\nfor c in celdas\n    eval(Meta.parse(c))\nend\n(precio, iva, total)\nceldas[1] = \"precio = 50.0\"\nfor i in afectadas(1, despues)\n    eval(Meta.parse(celdas[i]))\nend\n(precio, iva, total)" },
  { nombre: "Una vista que trabaja", codigo: "function aprueba!(v)\n    for i in eachindex(v)\n        v[i] = max(v[i], 5)\n    end\n    return v\nend\nnotas = [3, 8, 4, 9, 2, 7]\ngrupo_a = view(notas, 1:3)\naprueba!(grupo_a)\nnotas\ncopia = notas[4:6]\naprueba!(copia)\nnotas" },
  { nombre: "Contar los pasos", codigo: "v = [3, 8, 15, 21, 30, 42, 57, 64, 77, 88]\nx = 64\nizq = 1\nder = length(v)\npasos = 0\nwhile izq <= der\n    pasos += 1\n    m = (izq + der) ÷ 2\n    if v[m] == x\n        break\n    elseif v[m] < x\n        izq = m + 1\n    else\n        der = m - 1\n    end\nend\npasos", tabla: "pasos, izq, m, der" },
  { nombre: "Un bucle que suma", codigo: "notas = [9.0, 6.5, 4.0, 7.5]\ntotal = 0.0\nfor i in eachindex(notas)\n    if notas[i] >= 5\n        total += notas[i]\n    end\nend\ntotal", tabla: "i, notas[i], total" },
  { nombre: "Una función", codigo: "function media(v)\n    s = 0.0\n    for x in v\n        s += x\n    end\n    return s / length(v)\nend\n\nm = media([2, 4, 9])\nprintln(\"La media es \", m)" },
  { nombre: "b = a no copia", codigo: "a = [1, 2, 3]\nb = a\nb[1] = 100\na\nc = copy(a)\nc[1] = 0\na" },
  { nombre: "Un error a propósito", codigo: "edad = 17\nmensaje = \"Tienes \" + edad" },
];
const ESTILOS_LAB = `
.lab{ font:400 15px/1.55 var(--texto); color:var(--tinta); }
.lab-caja{ border:2px solid var(--tinta); background:#fff; }
.lab-barra{ display:flex; justify-content:space-between; align-items:center; gap:10px; background:var(--acento); color:#fff; padding:7px 12px; font:600 11px/1 var(--titulo); letter-spacing:.12em; text-transform:uppercase; }
.lab-barra select{ font:500 12.5px/1.2 var(--texto); letter-spacing:0; text-transform:none; border:0; padding:4px 6px; border-radius:3px; max-width:60%; }
.lab-editor{ display:flex; font:500 14.5px/1.6 var(--mono); }
.lab-num{ padding:12px 8px 12px 12px; color:#9A9A9A; text-align:right; user-select:none; white-space:pre; background:#F4F4F4; }
.lab textarea{ flex:1; min-height:220px; border:0; outline:0; resize:vertical; padding:12px; font:inherit; color:var(--tinta); background:#fff; white-space:pre; overflow-x:auto; tab-size:4; }
.lab-opciones{ display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin:12px 0 0; }
.lab-opciones label{ font:600 12.5px/1.2 var(--titulo); }
.lab-opciones input{ font:500 13.5px/1.3 var(--mono); border:1px solid var(--banda); padding:6px 8px; min-width:12em; flex:1; }
.lab-boton{ font:600 14px/1 var(--titulo); padding:11px 18px; border:2px solid var(--tinta); background:var(--acento); color:#fff; cursor:pointer; }
.lab-boton:disabled{ opacity:.6; cursor:wait; }
.lab-aviso{ margin:14px 0 0; padding:12px 14px; border-left:4px solid var(--acento); background:var(--suave); font-size:14.5px; }
.lab-aviso b{ font-family:var(--titulo); }
.lab-nota{ margin:10px 0 0; font-size:13px; color:var(--sub); }
.lab-res{ margin-top:18px; }
`;
async function cargaJulia() {
  if (!cargaJulia.p) cargaJulia.p = (async () => {
    const base = new URL("../lab/", import.meta.url);
    const ts = await import(new URL("vendor/web-tree-sitter.js", base).href);
    await ts.Parser.init();
    const julia = await ts.Language.load(new URL("vendor/tree-sitter-julia.wasm", base).href);
    const parser = new ts.Parser(); parser.setLanguage(julia);
    const jl = await import(new URL("jl/julia.mjs", base).href);
    const vl = await import(new URL("jl/valores.mjs", base).href);
    return { parser, jl, vl };
  })();
  return cargaJulia.p;
}
function laboratorio(el, C) {
  el.innerHTML = '<style>' + ESTILOS + ESTILOS_JL + ESTILOS_LAB + '</style><div class="tz lab">' +
    '<div class="lab-caja"><div class="lab-barra"><span>Tu programa en Julia</span><select aria-label="Ejemplos"><option value="">Ejemplos…</option>' +
    EJEMPLOS.map((e, i) => '<option value="' + i + '">' + esc(e.nombre) + "</option>").join("") + '</select></div>' +
    '<div class="lab-editor"><div class="lab-num" aria-hidden="true"></div><textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Código Julia"></textarea></div></div>' +
    '<div class="lab-opciones"><button class="lab-boton">Ejecutar y ver paso a paso</button>' +
    '<label for="lab-tabla">Seguir en la tabla</label><input id="lab-tabla" placeholder="por ejemplo: i, total (opcional)"></div>' +
    '<p class="lab-nota">El intérprete del laboratorio entiende la parte de Julia de los capítulos publicados. Si algo no lo sabe hacer, te lo dice.</p>' +
    '<div class="lab-mensaje"></div><div class="lab-res"></div></div>';
  const q = s => el.querySelector(s);
  const ta = q("textarea"), num = q(".lab-num"), tabla = q("#lab-tabla"), boton = q(".lab-boton");
  const guarda = () => { try { localStorage.setItem("acinstitut-lab-julia", JSON.stringify({ codigo: ta.value, tabla: tabla.value })); } catch (e) {} };
  const numeros = () => { num.textContent = ta.value.split("\n").map((_, i) => i + 1).join("\n"); };
  let previo = null;
  try { previo = JSON.parse(localStorage.getItem("acinstitut-lab-julia")); } catch (e) {}
  ta.value = previo && previo.codigo ? previo.codigo : EJEMPLOS[0].codigo;
  tabla.value = previo && previo.tabla ? previo.tabla : "";
  numeros();
  ta.addEventListener("input", () => { numeros(); guarda(); });
  tabla.addEventListener("input", guarda);
  ta.addEventListener("keydown", e => {         // el tabulador escribe cuatro espacios, como en el REPL
    if (e.key !== "Tab") return;
    e.preventDefault();
    const i = ta.selectionStart; ta.setRangeText("    ", i, ta.selectionEnd, "end"); numeros(); guarda();
  });
  q("select").addEventListener("change", e => {
    const ej = EJEMPLOS[e.target.value]; if (!ej) return;
    ta.value = ej.codigo; tabla.value = ej.tabla || ""; numeros(); guarda(); e.target.value = "";
  });
  const nube = C.nube || "https://2i2c.mybinder.org/v2/gh/achanesespigares/julia-acinstitut/laboratorio?urlpath=lab/tree/laboratorio/laboratorio.ipynb";
  const aviso = html => { q(".lab-mensaje").innerHTML = html ? '<div class="lab-aviso">' + html + "</div>" : ""; };
  let limpia = null;
  boton.addEventListener("click", async () => {
    boton.disabled = true; const texto = boton.textContent; boton.textContent = "Cargando Julia del laboratorio…";
    aviso("");
    try {
      const { parser, jl, vl } = await cargaJulia();
      boton.textContent = "Ejecutando…";
      const codigo = ta.value.replace(/\s+$/, "");
      const columnas = tabla.value.split(",").map(t => t.trim()).filter(Boolean);
      let t;
      try { t = jl.traza(codigo, { columnas, fila_en: "fin_iteracion" }, parser); }
      catch (e) {
        if (e instanceof jl.ErrorSintaxis) { aviso("<b>Julia no entiende la línea " + e.linea + ".</b> Revisa los paréntesis, las comillas y que cada <code>for</code>, <code>if</code>, <code>while</code> y <code>function</code> termine con <code>end</code>."); return; }
        if (e instanceof vl.NoSoportado) { aviso("<b>Esto el laboratorio aún no lo sabe hacer:</b> " + esc(e.que) + ". Puedes probarlo en <a href=\"" + nube + "\" target=\"_blank\" rel=\"noopener\">Julia en la nube</a>, que es Julia de verdad."); return; }
        throw e;
      }
      if (limpia) limpia();
      const res = q(".lab-res"); res.innerHTML = "";
      const caja = document.createElement("div"); res.appendChild(caja);
      limpia = dibujaTraza(caja, { titulo: "Tu programa, paso a paso", etiqueta: "laboratorio", columnas, fila_en: "fin_iteracion", letras: true }, t);
      caja.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      aviso("<b>El laboratorio ha fallado.</b> Es un fallo nuestro, no de tu programa. Puedes probarlo en <a href=\"" + nube + "\" target=\"_blank\" rel=\"noopener\">Julia en la nube</a>. (" + esc(e.message || e) + ")");
      console.error(e);
    } finally { boton.disabled = false; boton.textContent = texto; }
  });
}

function render({ model, el }) {
  const C = model.get("config") || {};
  if (C.tipo === "laboratorio") return laboratorio(el, C);
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
  const hayGraficos = P.some(x => x.grafico);
  let grafPintado = null;

  q(".tz-tit").textContent = C.titulo || "";
  q(".tz-etq").textContent = C.etiqueta || "";
  q(".tz-idea").textContent = C.idea || "";
  if (!C.idea) q(".tz-idea").style.display = "none";
  q(".tz-codigo").innerHTML = L.map((l, i) => '<span class="ln" data-n="' + (i + 1) + '"><span class="fl">▶</span><span class="no">' + (i + 1) + "</span>" + '<span class="tx">' + (colorea(l) || " ") + "</span></span>").join("");
  if (!cols.length) q(".tz-tabla-bloque").style.display = "none";
  if (!hayGraficos) q(".tz-graf-caja").style.display = "none";
  q(".tz-tabla").querySelector("thead").innerHTML = "<tr>" + cols.map(c => "<th>" + esc(c) + "</th>").join("") + "</tr>";
  q(".tz-tabla-sub").textContent = porLinea ? "una fila por línea" : "una fila por vuelta";
  q(".tz-nota").textContent = porLinea ? "Cada fila es el estado justo después de ejecutar esa línea." : "La fila de cada vuelta se escribe al terminarla.";

  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const longitud = v => v && v.df ? (v.v.length ? v.v[0].length : 0) : v && v.v ? (v.nv || v.v.length) : 0;
  // las variables de un paso, en el orden en que aparecieron
  const nombres = (est, orden) => (orden || Object.keys(est)).filter(n => est[n] && !ocultas.has(n));
  const muestra = v => !v ? "" : v.dict ? (v.k.length ? "Dict(" + v.k.map((k, i) => k + " => " + v.v[i]).join(", ") + ")" : "un diccionario vacío") : v.struct ? v.t + "(" + v.el.map(e => muestra(e.v)).join(", ") + ")" : v.e ? v.v[0] : v.rango ? v.rango : v.v && !v.v.length && !v.nv && /^Vector\{.+\}$/.test(v.t || "") ? v.t.slice(7, -1) + "[]" : v.v ? "[" + v.v.join(", ") + (v.nv ? ", …" : "") + "]" : v.t === "function" ? v.r : v.r || v.t;
  const varDelFor = l => ((L[l - 1] || "").match(/^\s*for\s+([\w,() ]+?)\s*(?:\bin\b|=|∈)\s*(.+?)\s*$/) || []);

  const vis = sp => sp.series.filter(s => s.primaria !== false);      // las series que se ven (no la secundaria de unas barras)
  const nBarras = s => s.x.filter(x => x === "NaN").length + 1;
  const barrasTxt = n => n + (n === 1 ? " barra" : " barras");
  const nSeries = v => vis(v.plot.sp[0]).length;
  const seriesTxt = n => n + (n === 1 ? " serie" : " series");
  // el azar (capítulo 13): qué hace cada forma de rand y randn
  let azarDicho = false;
  function azarTxt(lt) {
    const m = lt.match(/\b(randn?)\(([^()]*(?:\([^()]*\))?[^()]*)\)/);
    if (!m) return "";
    const [, f, dentro] = m, args = dentro.split(/,(?![^\[(]*[\])])/).map(t => t.trim()).filter(Boolean);
    let t;
    if (f === "randn") t = " " + code("randn") + " saca " + (args.length ? "números" : "un número") + " de la <b>campana de Gauss</b>: alrededor de 0, casi siempre entre −2 y 2, y cuanto más lejos de 0, más raro.";
    else if (!args.length || args[0] === "Float64" && args.length === 1) t = " " + code("rand()") + " da un decimal al azar entre 0 y 1: puede salir 0, pero nunca 1, y todos los trozos del mismo tamaño tienen la misma probabilidad.";
    else if (/^\d+$/.test(args[0])) t = " " + code("rand(" + dentro + ")") + " da " + (args.length === 1 ? args[0] + " decimales" : "una matriz de decimales") + " al azar entre 0 y 1.";
    else if (args[0] === "Bool") t = " " + code("rand(Bool" + (args.length > 1 ? ", …" : "") + ")") + " echa " + (args.length > 1 ? "monedas" : "una moneda") + ": " + code("true") + " o " + code("false") + ", mitad y mitad.";
    else {
      const r = args[0].match(/^(-?\d+):(-?\d+)$/), cuantos = args.length > 1 ? args.slice(1).join(" × ") : null;
      const que = r ? "un entero de " + r[1] + " a " + r[2] + ", todos con la misma probabilidad" : "uno de los elementos de " + code(args[0]) + ", todos con la misma probabilidad";
      t = " " + code("rand(" + args[0] + (cuantos ? ", …" : "") + ")") + (cuantos ? " repite " + cuantos + " veces la elección de " + que + ": cada vez, sin acordarse de las anteriores." : " elige al azar " + que + ".");
    }
    if (!azarDicho) { azarDicho = true; t += " No es azar de verdad: Julia lo <b>calcula</b> a partir de una semilla, y con la misma semilla salen siempre los mismos números."; }
    return t;
  }
  // un histograma o unas barras: qué se ha contado
  function barrasTxtDe(lt, sp) {
    const s = sp.series.find(x => x.tipo === "shape" && x.primaria !== false);
    if (!s || !/\b(histogram|bar)!?\(/.test(lt)) return "";
    const n = s.x.filter(x => x === "NaN").length + 1;
    if (/\bhistogram!?\(/.test(lt)) {
      const sec = sp.series[sp.series.indexOf(s) + 1], total = sec ? sec.y.reduce((a, y) => a + +y, 0) : null;
      return " " + code("histogram") + " ha repartido " + (total !== null ? total + " valores" : "los valores") + " en " + barrasTxt(n) + ": cada barra cubre un trozo del eje x, de su borde izquierdo (incluido) al derecho (sin incluir), y su altura es <b>cuántos valores caen ahí</b>. La primera va de " + esc(s.x[0]) + " a " + esc(s.x[2]) + ".";
    }
    return " " + code("bar") + " dibuja " + barrasTxt(n) + ": una por dato, con la altura del dato.";
  }
  // capítulo 20: lo que hace cada $ de la línea (mete en la expresión el valor de ahora, no el nombre), y cómo se
  // ha hecho la expresión (Expr(…), Meta.parse)
  function exprCreacion(lt, p, prev) {
    const q = prev && prev.estado ? prev : p;           // los $ meten los valores de antes de la línea
    const mf = q.marcos && q.marcos.length ? q.marcos[q.marcos.length - 1].vars : null, vale = n => (mf && mf[n]) || q.estado[n];
    const ds = [...lt.matchAll(/\$(\w+)|\$\(([^()]*(?:\([^()]*\))?[^()]*)\)/g)].map(m => m[1] ? { t: "$" + m[1], n: m[1] } : { t: "$(" + m[2] + ")" });
    let s = "";
    if (ds.length) {
      const partes = ds.map(d => d.n && vale(d.n) ? code(d.t) + " mete " + code(muestra(vale(d.n))) : code(d.t) + " mete el resultado de " + code(d.t.slice(2, -1)));
      s += " " + (ds.length === 1 ? "El " + partes[0] + (ds[0].n && vale(ds[0].n) ? ", el valor que tiene " + code(ds[0].n) + " en ese momento" : " en ese momento")
        : "Cada " + code("$") + " mete el valor que tiene la variable en ese momento: " + partes.slice(0, -1).join(", ") + " y " + partes[partes.length - 1]) + ". No mete el nombre, sino su valor: es la <b>interpolación</b>.";
    }
    if (/\bExpr\(/.test(lt)) s += " Se ha hecho pieza a pieza con " + code("Expr(cabeza, argumentos…)") + ".";
    if (/\bMeta\.parse\(/.test(lt)) s += " " + code("Meta.parse") + " lee el texto como lo leería Julia y devuelve la expresión, sin ejecutarla.";
    return s;
  }
  const contieneExpr = (e, r) => !!e && (e.r === r || (e.a || []).some(h => contieneExpr(h, r)));
  function quees(v) {
    if (v.plot) return "un gráfico (" + code("Plots.Plot") + "): un objeto que guarda " + (nSeries(v) === 1 ? "una serie de datos y cómo dibujarla" : nSeries(v) ? seriesTxt(nSeries(v)) + " de datos y cómo dibujarlas" : "cómo dibujarse, aún sin datos") + " (colores, títulos, ejes)";
    if (v.t === "function") return "una función: guarda sus instrucciones, que no se ejecutan hasta que alguien la llame";
    if (v.t === "Module") return "un módulo, " + code(v.r) + ": un espacio de nombres propio" + (v.modulo ? ", con " + v.modulo.length + (v.modulo.length === 1 ? " nombre" : " nombres") : "");
    if (v.t === "VersionNumber") return "un número de versión (" + code("VersionNumber") + "), " + code(v.r) + ": tres números, mayor, menor y parche, que se comparan uno a uno";
    if (v.t === "Expr") {
      const e = v.expr, n = e ? e.a.length : 0;
      let s = "una expresión (" + code("Expr") + "): código guardado como dato, todavía sin ejecutar";
      if (!e) return s;
      s += ". Su cabeza (" + code("head") + ") es " + code(/^[\w!]+$/.test(e.h) ? ":" + e.h : ":(" + e.h + ")") + " y tiene " + n + (n === 1 ? " argumento" : " argumentos") + " (" + code("args") + ")";
      if (e.h === "call" && e.a[0] && e.a[0].t === "Symbol") s += ": la función que se llama, " + code(e.a[0].r) + (n > 1 ? ", y " + (n === 2 ? "el dato al que se aplica" : "los " + (n - 1) + " datos a los que se aplica") : "");
      const subs = e.a.map((x, k) => [x, k]).filter(([x]) => x.a);
      if (subs.length) s += ". " + (subs.length === 1 ? "El argumento " + (subs[0][1] + 1) + " es otra expresión, " + code(subs[0][0].r) : "Los argumentos " + subs.map(([, k]) => k + 1).join(" y ") + " son otras expresiones") + ": una expresión dentro de otra, como las ramas de un árbol";
      return s;
    }
    if (v.df) return "una tabla (" + code("DataFrame") + ") de " + longitud(v) + (longitud(v) === 1 ? " fila" : " filas") + " y " + v.cols.length + (v.cols.length === 1 ? " columna" : " columnas") + (v.cols.length ? ": " + v.cols.map(code).join(", ") : "");
    if (v.t === "Nothing") return "que vale " + code("nothing") + ": el valor de Julia para decir «aquí no hay nada». Su tipo es " + code("Nothing");
    if (v.t === "Missing") return "que vale " + code("missing") + ": un dato que falta. Su tipo es " + code("Missing");
    if (v.e && esTipoTexto(v.t) && C.letras) {
      const s = sinComillas(v.v[0]), n = [...s].length, b = [...s].reduce((k, c) => k + bytesDe(c), 0);
      return "un " + code(v.t) + " que vale " + code(v.v[0]) + ": " + queEs(v.t) + (n ? ", con " + n + (n === 1 ? " carácter" : " caracteres") + (b !== n ? " que ocupan " + b + " bytes" : "") : ", vacío");
    }
    if (v.e) { const t = queEs(v.t); return "un " + code(v.t) + " que vale " + code(v.v[0]) + (t ? ": " + t : ""); }
    if (v.dict) return v.k.length ? "un diccionario con " + v.k.length + (v.k.length === 1 ? " pareja" : " parejas") + " clave → valor (" + code(v.t) + ")" : "un diccionario vacío (" + code(v.t) + "): aún no tiene ninguna pareja";
    if (v.rango) return "un rango, " + code(v.rango) + " (" + code(corta(v.t)) + "): " + longitud(v) + (longitud(v) === 1 ? " número" : " números") + " seguidos que Julia no guarda uno a uno, sino que calcula cuando se le piden";
    if (v.d) {
      const tam = v.d[0] + (v.d[0] === 1 ? " fila" : " filas") + " y " + v.d[1] + (v.d[1] === 1 ? " columna" : " columnas");
      if (/^(LinearAlgebra\.)?(Adjoint|Transpose)\{/.test(v.t)) return "una <b>vista</b> traspuesta de " + tam + " (" + code(v.t) + "): no copia nada, lee las casillas de la original cambiando filas por columnas";
      if (v.t === "BitMatrix") return "una matriz de " + code("true") + " y " + code("false") + " de " + tam + " (" + code(v.t) + "): una <b>máscara</b>";
      return "una matriz de " + tam + " (" + code(v.t) + ")";
    }
    if (v.v && !longitud(v)) return "un vector vacío (" + code(v.t) + ")";
    if (v.v && v.t === "BitVector") return "un vector de " + code("true") + " y " + code("false") + ", " + longitud(v) + (longitud(v) === 1 ? " casilla" : " casillas") + " (" + code(v.t) + "): una <b>máscara</b>";
    if (v.v && /^Vector\{Vector\{/.test(v.t)) return "un <b>vector de vectores</b> de " + longitud(v) + (longitud(v) === 1 ? " elemento" : " elementos") + " (" + code(v.t) + "): cada casilla es otro vector";
    if (v.v) return "un vector de " + longitud(v).toLocaleString("es-ES") + (longitud(v) === 1 ? " elemento" : " elementos") + " (" + code(v.t) + ")" + (v.nv ? ". Aquí se ven los " + v.v.length + " primeros" : "");
    if (v.df && false) return "una tabla (" + code("DataFrame") + ") de " + longitud(v) + (longitud(v) === 1 ? " fila" : " filas") + " y " + v.cols.length + (v.cols.length === 1 ? " columna" : " columnas") + (v.cols.length ? ": " + v.cols.map(code).join(", ") : "");
    if (v.struct) return "un valor del tipo propio " + code(v.t) + ", con " + v.el.length + (v.el.length === 1 ? " campo" : " campos") + ": " + v.el.map(e => code(e.nombre)).join(", ") + (v.mutable ? ". Es <b>mutable</b>: sus campos se pueden cambiar" : "");
    if (v.t === "DataType") return "un tipo, " + code(v.r) + ": no es un dato, sino el molde con el que se hacen los datos de ese tipo";
    if (v.tupla && v.el.length && v.el.every(e => e.nombre)) return "una tupla con nombre, con " + v.el.length + (v.el.length === 1 ? " campo" : " campos") + ": " + v.el.map(e => code(e.nombre)).join(", ");
    if (/^(LinearAlgebra\.)?UniformScaling\{/.test(v.t)) return "la identidad multiplicada por un número (" + code(v.t) + "): una matriz sin tamaño fijo, con ese número en la diagonal y ceros fuera, que toma el tamaño de la matriz con la que opera";
    if (v.tupla) return "una tupla de " + v.el.length + (v.el.length === 1 ? " elemento" : " elementos") + " (" + code(v.t) + ")";
    return "un valor de tipo " + code(v.t);
  }

  // con varios métodos, qué método ha elegido Julia (el de la línea a la que salta) para estos tipos
  function eleccion(p, m, args) {
    const f = (p.estado || {})[m.nombre];
    if (!f || f.t !== "function" || !(f.m > 1)) return "";
    const sig = ((L[p.linea - 1] || "").match(new RegExp("^\\s*(?:function\\s+)?(" + m.nombre.replace(/[!.]/g, "\\$&") + "\\(.*?\\))")) || [])[1];
    if (!sig) return "";
    // capítulo 24: una sola definición con un argumento por defecto da dos métodos, con él y sin él
    const reDef = new RegExp("^\\s*(?:function\\s+)?" + m.nombre.replace(/[!.]/g, "\\$&") + "\\((.*)\\)\\s*(=[^=].*)?$");
    const defs = L.filter(l => reDef.test(l) && (/^\s*function\b/.test(l) || /\)\s*=[^=]/.test(l)));
    const pd = defs.length === 1 && (defs[0].match(reDef)[1].match(/(\w+)\s*=\s*([^,]+)$/) || null);
    if (pd) {
      const llamada = ((L[m.desde - 1] || "").match(new RegExp("\\b" + m.nombre.replace(/[!.]/g, "\\$&") + "\\((.*)")) || [])[1] || "";
      let prof = 0, comas = 0, vacia = true;
      for (const ch of llamada) { if (ch === "(" || ch === "[") prof++; else if (ch === ")" || ch === "]") { if (prof === 0) break; prof--; } else if (ch === "," && prof === 0) comas++; else if (!/\s/.test(ch)) vacia = false; }
      const nParams = defs[0].match(reDef)[1].split(",").length;
      if (!vacia && comas + 1 < nParams) {
        return " La llamada no da " + code(pd[1]) + ", así que toma su valor por defecto, " + code(pd[2].trim()) + (/\[\]$/.test(pd[2].trim()) ? ": un vector nuevo y vacío, distinto en cada llamada" : "") + ".";
      }
      return "";
    }
    const ts = args.map(a => m.vars[a] && m.vars[a].t).filter(Boolean);
    // la primera vez que se elige mirando varios argumentos, se dice que eso es el despacho múltiple
    const varios = x => { const mm = x.marcos && x.marcos[x.marcos.length - 1], ff = mm && (x.estado || {})[mm.nombre]; return x.tipo === "llamada" && ff && ff.m > 1 && mm.orden.filter(a => mm.vars[a]).length > 1; };
    const primera = ts.length > 1 && !P.slice(0, P.indexOf(p)).some(varios);
    return " Como " + code(m.nombre) + " tiene " + f.m + " métodos, Julia elige el más específico que encaja con " + (ts.length ? unosTipos(ts) : "estos argumentos") + ": " + code(sig) + ", el de la línea " + p.linea + "." +
      (primera ? " Mira los tipos de todos los argumentos a la vez: eso es el <b>despacho múltiple</b>." : "");
  }
  // «un Int64 y un Float64»; con tipos propios, «los tipos Piedra y Tijera»
  const DE_JULIA = /^(Int64|Float64|String|Char|Bool|Rational\{Int64\}|Vector\{.*\}|Matrix\{.*\}|Tuple\{.*\}|Dict\{.*\})$/;
  const unosTipos = ts => {
    const y = xs => xs.length > 1 ? xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1] : xs[0];
    if (ts.length === 1 || ts.every(t => DE_JULIA.test(t))) return y(ts.map(t => "un " + code(t)));
    return "los tipos " + y(ts.map(code));
  };
  // Base.:+(a::Punto, b::Punto) = …: un método para un operador de Julia
  const RE_BASE = /^\s*(?:function\s+)?Base\.:(\([^()]+\)|[^\s(]+)(\(.*?\))/;
  const opBase = t => t.replace(/^Base\.:/, "").replace(/^\((.*)\)$/, "$1");
  // throw(…) o error(…) en la línea: el error lo lanza el propio programa
  function quienLanza(l) {
    const lt = L[l - 1] || "";
    if (/\bthrow\(/.test(lt)) return " Lo lanza el propio programa, con " + code("throw") + ".";
    if (/(^|[^\w.])error\(/.test(lt)) return " Lo lanza el propio programa, con " + code("error") + ", que crea un " + code("ErrorException") + " con ese texto.";
    if (/(^|[^\w.])rethrow\(/.test(lt)) return " Es el mismo error de antes: " + code("rethrow") + " lo deja seguir su camino.";
    return "";
  }
  // capítulo 23: los módulos del programa que se usan antes de la línea l (using .Notas), y los nombres importados
  // uno a uno (using .Notas: media)
  const yLista = xs => xs.length > 1 ? xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1] : xs[0] || "";
  function usosAntes(l) {
    const usados = [], sueltos = {};
    for (let k = 0; k < l - 1; k++) {
      const m = (L[k] || "").match(/^\s*(using|import)\s+(.+?)\s*$/);
      if (!m) continue;
      const sel = m[2].match(/^\.(\w+)\s*:\s*(.+)$/);
      if (sel) { for (const x of sel[2].split(",")) sueltos[x.trim()] = sel[1]; continue; }
      if (m[1] === "using") for (const x of m[2].split(",")) { const t = x.trim(); if (/^\.\w+$/.test(t)) usados.push(t.slice(1)); }
    }
    return { usados, sueltos };
  }
  const exportaDe = (est, mod) => est && est[mod] && est[mod].modulo ? est[mod].modulo.filter(e => e.exporta).map(e => e.nombre) : [];
  function narraUso(p, lt) {
    const m = lt.match(/^(using|import)\s+(.+)$/), cmd = m[1];
    const sel = m[2].match(/^\.(\w+)\s*:\s*(.+)$/);
    if (sel) {
      const ns = sel[2].split(",").map(x => x.trim()), mod = sel[1];
      const otros = usosAntes(p.linea).usados.filter(x => x !== mod && ns.some(n => exportaDe(p.estado, x).includes(n)));
      return code(lt) + " trae de " + code(mod) + " solo " + yLista(ns.map(code)) + ", " + (ns.length === 1 ? "lo exporte o no" : "los exporte o no") + ": desde aquí, " + yLista(ns.map(code)) + (ns.length === 1 ? " es" : " son") + " " + (ns.length === 1 ? "la" : "los") + " de " + code(mod) + "." +
        (otros.length ? " " + yLista(otros.map(code)) + " también exporta " + yLista(ns.filter(n => otros.some(x => exportaDe(p.estado, x).includes(n))).map(code)) + ", pero un nombre importado así gana: ya no hay duda de cuál es." : "") +
        (cmd === "import" ? " Con " + code("import") + ", además, el programa podría añadirle métodos." : "") + " La memoria no cambia: lo que cambia es dónde busca Julia cada nombre.";
    }
    const mods = m[2].split(",").map(x => x.trim()).filter(x => /^\.\w+$/.test(x)).map(x => x.slice(1));
    if (cmd === "import") return code(lt) + " solo deja a la vista el nombre del módulo: para usar lo de dentro hay que escribir " + code(mods[0] + ".") + " delante.";
    const exp = mods.flatMap(x => exportaDe(p.estado, x));
    const antes = usosAntes(p.linea).usados, choques = [];
    for (const x of mods) for (const n of exportaDe(p.estado, x)) {
      const otro = antes.concat(mods.filter(y => y !== x && mods.indexOf(y) < mods.indexOf(x))).find(y => y !== x && exportaDe(p.estado, y).includes(n));
      if (otro && !choques.some(c => c[0] === n)) choques.push([n, otro, x]);
    }
    const primera = !P.slice(0, P.indexOf(p)).some(x => /^\s*using\s+\./.test(L[x.linea - 1] || ""));
    return code(lt) + " hace visibles aquí, en el programa principal, los nombres que " + (mods.length === 1 ? "exporta " + code(mods[0]) : "exportan " + yLista(mods.map(code))) + (exp.length ? ": " + yLista(exp.map(code)) : "") + "." +
      (primera ? " El punto de " + code("." + mods[0]) + " dice que el módulo está en este mismo programa; un paquete instalado se carga sin punto, como " + code("using DataFrames") + "." : "") +
      " La memoria no cambia: " + (exp.length ? code(exp[0]) + " sigue dentro de " + code(mods[0]) : "lo de dentro sigue dentro") + ", y lo que cambia es dónde busca Julia cada nombre." +
      (choques.length ? " Pero " + choques.map(([n, a, b]) => code(b) + " también exporta " + code(n) + ", igual que " + code(a)).join(", y ") + ": ahora hay dos " + code(choques[0][0]) + " distintas a la vista. Julia no se queja todavía; lo hará si el programa escribe " + code(choques[0][0]) + " sin decir de qué módulo es." : "");
  }
  // Notas.media: de qué módulo es la función, y por qué se ha podido escribir sin Notas. delante
  function deModulo(p, m) {
    const k = m.nombre.indexOf(".");
    if (k < 0 || /^Base\./.test(m.nombre)) return "";
    const mod = m.nombre.slice(0, k), f = m.nombre.slice(k + 1), ld = L[m.desde - 1] || "";
    if (new RegExp("\\b" + mod + "\\." + f.replace(/!/g, "\\!") + "\\(").test(ld)) return " Es la función " + code(f) + " del módulo " + code(mod) + ", escrita con el nombre del módulo delante.";
    const llama = p.marcos.length > 1 ? p.marcos[p.marcos.length - 2].nombre : null;
    if (llama && llama.startsWith(mod + ".")) return " " + code(f) + " es del mismo módulo, " + code(mod) + ": dentro de un módulo, sus nombres se usan sin " + code(mod + ".") + " delante.";
    const u = usosAntes(m.desde);
    if (u.sueltos[f] === mod) return " Es la función " + code(f) + " del módulo " + code(mod) + ", que el programa ha importado con " + code("using ." + mod + ": " + f) + ".";
    return " Es la función " + code(f) + " del módulo " + code(mod) + ": el programa la escribe sin " + code(mod + ".") + " delante porque " + code(mod) + " la exporta y el programa ha hecho " + code("using ." + mod) + ".";
  }
  function errorDeNombre(p) {
    const e = p.error || "", m = e.match(/^UndefVarError: `([^`]+)` not defined in `([^`]+)`/);
    if (!m) return "";
    if (/two or more modules export different bindings/.test(e)) {
      const mods = usosAntes(p.linea).usados.filter(x => exportaDe(p.estado, x).includes(m[1]));
      return " Hay dos " + code(m[1]) + " a la vista" + (mods.length > 1 ? ", " + yLista(mods.map(x => "la de " + code(x))) : "") + ", y Julia no elige por ti: para el programa principal, " + code(m[1]) + " no está definida. El arreglo es decir de cuál se habla: " + (mods.length ? code(mods[0] + "." + m[1] + "(…)") + ", o traer solo una con " + code("using ." + mods[0] + ": " + m[1]) : "con el nombre del módulo delante") + ".";
    }
    if (m[2] !== "Main") return " Dentro del módulo " + code(m[2].replace(/^Main\./, "")) + " solo se ven sus propios nombres y los de Julia: " + code(m[1]) + " no es de " + code(m[2].replace(/^Main\./, "")) + ".";
    const donde = Object.keys(p.estado || {}).find(x => p.estado[x].modulo && p.estado[x].modulo.some(f => f.nombre === m[1] && !f.exporta));
    return donde ? " " + code(m[1]) + " existe, pero dentro de " + code(donde) + ", que no la exporta: desde el programa principal no se ve así. Hay que escribir el nombre del módulo delante, " + code(donde + "." + m[1]) + "." : "";
  }
  function narra(p, prev) {
    if (p.tipo === "inicio") return "El programa está listo. Pulsa «Paso ▶» para ejecutar la primera línea.";
    if (p.tipo === "error") return "Julia se detiene en la línea " + p.linea + " con un error" + (p.marcos && p.marcos.length ? ", dentro de " + code(p.marcos[p.marcos.length - 1].llamada) : "") + ". Lo que viene detrás ya no se ejecuta." +
      quienLanza(p.linea) +
      (p.error === "There was an error during testing" ? " Es lo que hace un " + code("@test") + " que falla fuera de un " + code("@testset") + ": escribe en la consola qué ha fallado (la expresión y, debajo, con qué valores) y lanza este error, que detiene el programa." : "") +
      errorDeNombre(p) +
      (/ is ambiguous\./.test(p.error || "") ? " Hay varios métodos que encajan y ninguno es más específico que los demás, así que Julia no elige: es una <b>ambigüedad</b>. El mensaje dice qué método habría que añadir para resolverla." : "");
    if (p.tipo === "captura") {
      // catch e: la variable del error es la local nueva del catch
      const lt = L[p.linea - 1] || "", nom = (lt.match(/\bcatch\s+(\w+)/) || [])[1];
      const mf = p.marcos && p.marcos.length ? p.marcos[p.marcos.length - 1].vars : null, ev = nom && ((mf && mf[nom]) || p.estado[nom]);
      const cerradas = (prev && prev.marcos ? prev.marcos.length : 0) - (p.marcos ? p.marcos.length : 0);
      const primera = !P.slice(0, P.indexOf(p)).some(x => x.tipo === "captura");
      const enLlamada = cerradas > 0 ? prev.marcos[prev.marcos.length - 1].llamada : null;
      return "El error salta en la línea " + p.desde + (enLlamada ? ", dentro de " + code(enLlamada) + ", que se llamó desde el bloque " + code("try") : p.desde === p.linea ? "" : ", dentro del bloque " + code("try")) + "." + quienLanza(p.desde) +
        " Pero esta vez Julia no se detiene: el " + code("catch") + " lo <b>atrapa</b> y el programa sigue aquí, en la línea " + p.linea + "." +
        (primera ? " Lo que quedaba del bloque " + code("try") + " ya no se ejecuta." : "") +
        (cerradas > 0 ? " " + (cerradas === 1 ? "La llamada que estaba en curso termina" : "Las " + cerradas + " llamadas que estaban en curso terminan") + " sin devolver nada: " + (cerradas === 1 ? "su espacio" : "sus espacios") + " en la memoria " + (cerradas === 1 ? "desaparece" : "desaparecen") + "." : "") +
        (ev ? " El error queda guardado en " + code(nom) + ", una variable local del " + code("catch") + ": es un valor de tipo " + code(ev.t) + "." : "");
    }
    if (p.tipo === "finally") return "Empieza el bloque " + code("finally") + ". Julia lo ejecuta <b>siempre</b> al salir del " + code("try") + ": si todo ha ido bien, si un " + code("catch") + " ha atrapado un error y también si el error sigue su camino. Sirve para dejar las cosas en orden, como cerrar un archivo.";
    if (p.tipo === "vuelta") {
      // for a in xs, b in ys: un bucle dentro de otro, en una línea; cada vuelta es una pareja
      const dos = (L[p.linea - 1] || "").match(/^\s*for\s+(\w+)\s+in\s+(.+?)\s*,\s*(\w+)\s+in\s+(.+?)\s*$/);
      if (dos) {
        const mf = p.marcos && p.marcos.length ? p.marcos[p.marcos.length - 1].vars : null, vale = n => (mf && mf[n]) || p.estado[n];
        const partes = [dos[1], dos[3]].filter(vale).map(n => code(n) + " vale " + esc(muestra(vale(n))));
        return "Vuelta " + p.vuelta + " del <code>for</code>: la pareja número " + p.vuelta + (partes.length ? ", en la que " + partes.join(" y ") : "") + "." +
          (p.vuelta === 1 ? " Por cada elemento de " + code(dos[2]) + ", " + code(dos[3]) + " recorre todo " + code(dos[4]) + ": es un bucle dentro de otro. " + code(dos[1]) + " y " + code(dos[3]) + " son variables <b>locales</b> del bucle." : "");
      }
      const [, v, sec] = varDelFor(p.linea);
      const mf = p.marcos && p.marcos.length ? p.marcos[p.marcos.length - 1].vars : null;
      const val = v && ((mf && mf[v.trim()]) || p.estado[v.trim()]);
      if (v && /^\s*\(/.test(v)) {      // for (nombre, nota) in zip(…): la pareja se reparte entre las variables
        const ns = v.replace(/[()\s]/g, "").split(",").filter(Boolean);
        const vale = n => (mf && mf[n]) || p.estado[n];
        const partes = ns.filter(vale).map(n => code(n) + " vale " + esc(muestra(vale(n))));
        const y = xs => xs.length > 1 ? xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1] : xs.join("");
        const esDic = (mf && mf[sec.trim()] && mf[sec.trim()].dict) || (p.estado[sec.trim()] && p.estado[sec.trim()].dict);
        return "Vuelta " + p.vuelta + " del <code>for</code>: llega " + (esDic ? "la pareja número " + p.vuelta + " de " + code(sec) + ", en el orden en que Julia guarda el diccionario," : "el elemento " + p.vuelta + " de " + code(sec) + ",") + " que se reparte entre " + y(ns.map(code)) + (partes.length ? ": " + y(partes) : "") + "." +
          (p.vuelta === 1 ? " Son variables <b>locales</b> del bucle: solo existen dentro de él." : "");
      }
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
      if (/^(using|import)\s+\./.test(lt)) return narraUso(p, lt);
      const us = lt.match(/^using\s+(.+)$/);
      if (us && us[1].trim() === "Test") return "Se carga " + code("Test") + ", la biblioteca de pruebas. Viene con Julia, así que no hay que instalarla: basta con " + code("using") + ". Desde esta línea existen " + code("@test") + ", " + code("@test_throws") + " y " + code("@testset") + ".";
      if (us) {
        const ps = us[1].split(",").map(x => x.trim()), que = { DataFrames: "DataFrame, groupby, combine, nrow…", Statistics: "mean, median…", LinearAlgebra: "det, dot, norm, la identidad I…", Plots: "plot, scatter, plot!, bar, histogram…", Random: "Random.seed!, shuffle, randperm…" };
        return (ps.length > 1 ? "Se cargan los paquetes " + ps.slice(0, -1).map(code).join(", ") + " y " + code(ps[ps.length - 1]) : "Se carga el paquete " + code(ps[0])) + ". Desde esta línea existen sus funciones (" + ps.map(x => que[x] || "").filter(Boolean).join("; ") + "), que Julia no trae de serie.";
      }
      if (/^break\b/.test(lt)) return "Se ejecuta <code>break</code>: Julia sale del bucle en este mismo momento, sin terminar la vuelta.";
      if (/^continue\b/.test(lt)) return "Se ejecuta <code>continue</code>: Julia deja esta vuelta a medias y salta a la siguiente."; }
    if (p.tipo === "llamada" && /^Base\.:/.test(p.marcos[p.marcos.length - 1].nombre)) {      // a + b con un método tuyo
      const m = p.marcos[p.marcos.length - 1], args = m.orden.filter(a => m.vars[a]), op = opBase(m.nombre);
      const def = (L[p.linea - 1] || "").match(RE_BASE), ts = args.map(a => m.vars[a].t);
      return "Para calcular " + code(op) + " con " + unosTipos(ts) + ", Julia busca entre los métodos de " + code(op) + " y encuentra el que has añadido tú" +
        (def ? ": " + code(op + def[2]) + ", el de la línea " + p.linea : "") + ". Le da un espacio propio en la memoria, con sus argumentos: " +
        args.map(a => code(a) + " vale " + esc(muestra(m.vars[a]))).join(", ") + ". El programa salta al método" + (m.desde && m.desde !== p.linea ? " y la línea " + m.desde + " se queda esperando el resultado." : ".");
    }
    if (p.tipo === "devuelve" && /^Base\.:/.test(p.funcion))
      return "Tu método de " + code(opBase(p.funcion)) + " termina y devuelve " + code(p.valor) + ". Su espacio en la memoria desaparece, y el programa vuelve a la línea " + p.desde + ", que usa ese resultado.";
    if (p.tipo === "llamada") {
      const m = p.marcos[p.marcos.length - 1], args = m.orden.filter(a => m.vars[a]);
      return "Se llama a " + code(m.llamada) + ". Julia le da a la función un espacio propio en la memoria" +
        (args.length ? ", con sus argumentos: " + args.map(a => code(a) + " vale " + esc(muestra(m.vars[a])) + deFuera(m.vars[a], p.estado)).join(", ") : "") +
        ". El programa salta a la función" + (m.desde && m.desde !== p.linea ? " y la línea " + m.desde + " se queda esperando el resultado." : ".") + eleccion(p, m, args) + deModulo(p, m);
    }
    if (p.tipo === "devuelve" && /&&\s*return\b/.test(L[p.linea - 1] || "")) {
      const izq = (L[p.linea - 1] || "").match(/^\s*(.+?)\s*&&\s*return\b/)[1];
      return "Lo de la izquierda del <code>&&</code>, " + code(izq) + ", es <code>true</code>, así que se ejecuta lo de la derecha: el " + code("return") + ". " + code(p.funcion) + " termina ahí y devuelve " + code(p.valor) +
        ". Su espacio en la memoria desaparece, con todas sus variables, y el programa vuelve a la línea " + p.desde + ", que usa ese resultado.";
    }
    if (p.tipo === "devuelve")
      return code(p.funcion) + (p.valor === "nothing" ? " termina sin devolver nada útil (" + code("nothing") + ")" : " termina y devuelve " + code(p.valor)) +
        ". Su espacio en la memoria desaparece, con todas sus variables, y el programa vuelve a la línea " + p.desde + ", que usa ese resultado.";
    if (p.tipo === "condicion" && p.cond.valor !== "true" && p.cond.valor !== "false")
      return "Se comprueba " + code(p.cond.texto) + (p.cond.valores !== p.cond.texto ? ": con los valores de ahora, " + code(p.cond.valores) : "") + ", que es " + code(p.cond.valor) + ". Pero " +
        (/^\s*while\b/.test(L[p.linea - 1]) ? "un <code>while</code>" : "un <code>if</code>") + " necesita " + code("true") + " o " + code("false") + ": con cualquier otra cosa, Julia da un error.";
    if (p.tipo === "condicion") {
      const si = p.cond.valor === "true", lt = (L[p.linea - 1] || "").trim(), esWhile = /^while\b/.test(lt), esElseif = /^elseif\b/.test(lt);
      if (!/^(if|elseif|while)\b/.test(lt) && / \? /.test(lt))
        return "Se comprueba " + code(p.cond.texto) + (p.cond.valores !== p.cond.texto ? ": con los valores de ahora, " + code(p.cond.valores) : "") + ", que es " + code(p.cond.valor) + ". " +
          (si ? "El ternario se queda con lo que va entre <code>?</code> y <code>:</code>." : "El ternario se queda con lo que va detrás de <code>:</code>.");
      return "Se comprueba " + code(p.cond.texto) + (p.cond.valores !== p.cond.texto ? ": con los valores de ahora, " + code(p.cond.valores) : "") + ", que es " + code(p.cond.valor) + ". " +
        (esWhile ? (si ? "El <code>while</code> da otra vuelta." : "El <code>while</code> se detiene.")
          : si ? "Se entra en el bloque del <code>" + (esElseif ? "elseif" : "if") + "</code>."
          : "Se salta el bloque del <code>" + (esElseif ? "elseif" : "if") + "</code>" + (/^\s*(elseif|else)\b/.test(L.slice(p.linea).join("\n").split(/\n\s*end\b/)[0].split("\n").find(x => /^\s*(elseif|else)\b/.test(x)) || "") ? " y se pasa a la rama siguiente." : "."));
    }
    const frases = [];
    // capítulo 24: las variables que crea eval dentro de un bucle aparecen cuando termina el bucle (la edad del mundo)
    const ltE = (L[p.linea - 1] || "").trim();
    if (!(p.marcos && p.marcos.length) && prev && prev.estado && /\beval\(Meta\.parse\(/.test(L.join("\n"))) {
      const creadas = nombres(p.estado, p.orden).filter(n => !prev.estado[n] && p.estado[n].t !== "function" && !p.estado[n].local);
      if (creadas.length && !creadas.some(n => new RegExp("^" + n + "\\s*=[^=]").test(ltE)) && !/\beval\(/.test(ltE))
        frases.push((creadas.length === 1 ? "La variable " + code(creadas[0]) + " aparece" : "Las variables " + yLista(creadas.map(code)) + " aparecen") + " ahora en la memoria. " +
          (creadas.length === 1 ? "La creó" : "Las crearon") + " los " + code("eval") + " del bucle, pero Julia no enseña lo que crea " + code("eval") + " hasta que termina la sentencia del programa principal que lo llamó: el bucle entero (es la edad del mundo, de <i>Metaprogramación</i>).");
    }
    // eval(Meta.parse(celda)): ejecutar una celda del cuaderno
    const evC = ltE.match(/^eval\(Meta\.parse\((\w+)(?:\[(\w+)\])?\)\)$/);
    let celdaTxt = null;
    if (evC) {
      const vars = (p.marcos && p.marcos.length ? p.marcos[p.marcos.length - 1].vars : null) || p.estado;
      const de = k => vars[k] || p.estado[k];
      const x = de(evC[1]);
      if (x && !evC[2] && x.t === "String") celdaTxt = x.v[0];
      else if (x && evC[2] && x.v) { const i = /^\d+$/.test(evC[2]) ? +evC[2] : de(evC[2]) && +de(evC[2]).v[0]; if (i && x.v[i - 1]) celdaTxt = x.v[i - 1]; }
    }
    // se comparan las variables del ámbito que se está ejecutando: la llamada en curso o el programa principal
    const marco = x => x && x.marcos && x.marcos.length ? x.marcos[x.marcos.length - 1] : null;
    const mp = marco(p), ma = marco(prev);
    // al volver de otra llamada, el marco de antes es el de la función llamada: se busca el de esta en la pila
    const mismo = mp && prev && prev.marcos ? prev.marcos.find(m => m.id === mp.id) : null;
    const ahora = mp ? mp.vars : p.estado, antes = mp ? (mismo ? mismo.vars : {}) : prev.estado;
    const orden = mp ? mp.orden : p.orden;
    const hechos = [];      // las variables que ya han cambiado en este paso
    const casillasDe = [];  // las que cambian porque comparten casillas con la de la línea (vec, reshape)
    // primero la variable que nombra la línea (b[1] = 0 cambia b; si a es el mismo vector, a cambia «también»)
    const enLinea = ((L[p.linea - 1] || "").match(/^\s*(\w+)/) || [])[1];
    const lista = nombres(ahora, orden);
    if (enLinea && lista.includes(enLinea)) { lista.splice(lista.indexOf(enLinea), 1); lista.unshift(enLinea); }
    for (const n of lista) {
      const a = antes[n], b = ahora[n];
      const gemelo = b.id ? nombres(ahora, orden).find(m => m !== n && antes[m] && antes[m].id === b.id) : null;
      const cosa = b.dict ? "diccionario" : b.d ? "matriz" : b.struct ? "objeto" : b.plot ? "gráfico" : "vector", fem = !!b.d;
      if (!a && gemelo) { frases.push("Se crea " + code(n) + ", pero no es " + (fem ? "una matriz nueva" : "un " + cosa + " nuevo") + ": es <b>otro nombre</b> para " + (fem ? "la misma" : "el mismo") + " " + cosa + " que " + code(gemelo) + ". Julia no copia " + (fem ? "las matrices" : "los " + plural(cosa)) + " al asignarlos."); continue; }
      if (a && a.dict && b.dict && !igual(a, b)) {         // un diccionario que cambia
        const mapa = d => new Map(d.k.map((k, i) => [k, d.v[i]]));
        const ma = mapa(a), mb = mapa(b), fr = [];
        for (const [k, v] of mb) {
          if (!ma.has(k)) fr.push("Se añade la pareja " + code(k + " => " + v) + " a " + code(n) + ".");
          else if (ma.get(k) !== v) fr.push("Cambia " + code(n + "[" + k + "]") + ": valía " + esc(ma.get(k)) + " y ahora vale " + esc(v) + ".");
        }
        for (const k of ma.keys()) if (!mb.has(k)) fr.push("Se quita la clave " + code(k) + " de " + code(n) + ".");
        const mismas = a.k.filter(k => mb.has(k)), orden = b.k.filter(k => ma.has(k));
        if (mismas.join("\u0000") !== orden.join("\u0000")) fr.push("La tabla de " + code(n) + " ha crecido y Julia ha recolocado las parejas: por eso cambian de orden.");
        frases.push(...(fr.length ? fr : [code(n) + " cambia."]));
        if (b.id) hechos.push(n);
        continue;
      }
      const copia = ((L[p.linea - 1] || "").match(/=\s*copy\(\s*(\w+)\s*\)/) || [])[1];
      const trozo = ((L[p.linea - 1] || "").match(/^\s*\w+\s*=\s*(\w+)\[(.+)\]\s*$/) || []);
      if (!a && trozo[1] && b.v && !b.e && trozo[1] !== n && ahora[trozo[1]] && ahora[trozo[1]].v) {
        const k = longitud(b);
        if (!b.df && ahora[trozo[1]].df) { frases.push("Se crea " + code(n) + ": una <b>copia</b> de lo que elige " + code("[" + trozo[2] + "]") + " de la tabla " + code(trozo[1]) + ", " + quees(b) + ". Es un vector nuevo: cambiarlo no cambia la tabla."); continue; }
        if (b.df) { frases.push("Se crea " + code(n) + ": una tabla <b>nueva</b> con lo que elige " + code("[" + trozo[2] + "]") + " de " + code(trozo[1]) + ", de " + longitud(b) + (longitud(b) === 1 ? " fila" : " filas") + " y " + b.cols.length + (b.cols.length === 1 ? " columna" : " columnas") + "."); continue; }
        if (b.d) { frases.push("Se crea " + code(n) + ": una matriz <b>nueva</b> con las casillas de " + code(trozo[1]) + " que elige " + code("[" + trozo[2] + "]") + ", de " + b.d[0] + " × " + b.d[1] + " (" + code(b.t) + ")."); continue; }
        frases.push("Se crea " + code(n) + ": un vector <b>nuevo</b> con las casillas de " + code(trozo[1]) + " que elige " + code("[" + trozo[2] + "]") + (k ? ", " + k + (k === 1 ? " elemento" : " elementos") : ", ninguna: está vacío") + " (" + code(b.t) + ")."); continue;
      }
      const prof = ((L[p.linea - 1] || "").match(/=\s*deepcopy\(\s*(\w+)\s*\)/) || [])[1];
      if (!a && b.vista) {
        const pn = nombreDeId(b.vista.padre, ahora) || nombreDeId(b.vista.padre, p.estado), k = b.vista.pos.length;
        const pv = pn ? (ahora[pn] || p.estado[pn]) : null;
        const cas = pv ? b.vista.pos.map(j => code(pv.d ? pn + "[" + ((j - 1) % pv.d[0] + 1) + ", " + (Math.floor((j - 1) / pv.d[0]) + 1) + "]" : pn + "[" + j + "]")) : [];
        frases.push("Se crea " + code(n) + ", una <b>vista</b>" + (pn ? " de " + code(pn + "[" + b.vista.i + "]") : "") + ": no es un vector nuevo y no copia nada. No tiene casillas propias" +
          (cas.length && cas.length <= 6 ? ": sus " + (k === 1 ? "casilla es " + cas[0] : k + " casillas son " + cas.slice(0, -1).join(", ") + " y " + cas[k - 1]) : "") + ". Lo que se escriba en " + code(n) + " se escribirá en " + (pn ? code(pn) : "el vector del que sale") + ".");
        continue;
      }
      if (!a && prof && b.id) { frases.push("Se crea " + code(n) + ", una copia <b>profunda</b> de " + code(prof) + ": un " + (b.d ? "objeto" : "vector") + " nuevo y, dentro, " + (b.ids ? "objetos nuevos, una copia de cada uno" : "una copia de todo lo que guarda") + ". " + code(n) + " ya no comparte nada con " + code(prof) + "."); continue; }
      if (!a && copia && b.id && b.ids && b.ids.some(x => x != null)) {
        const og = ahora[copia] || p.estado[copia], k = og && og.ids ? b.ids.findIndex((x, i) => x != null && og.ids[i] === x) : -1;
        frases.push("Se crea " + code(n) + ", una copia de " + code(copia) + ": un vector nuevo, pero de <b>un solo piso</b>. Sus casillas señalan a los mismos objetos que las de " + code(copia) + ", sin copiarlos" +
          (k >= 0 ? ": " + code(n + "[" + (k + 1) + "]") + " y " + code(copia + "[" + (k + 1) + "]") + " son el mismo objeto." : "."));
        continue;
      }
      if (!a && copia && b.id) { frases.push("Se crea " + code(n) + ", una <b>copia</b> de " + code(copia) + ": " + (b.d ? "una matriz nueva" : "un vector nuevo") + ", con los mismos valores pero independiente."); continue; }
      if (!a && (b.t === "DataType" || b.t === "UnionAll") && /^\s*(mutable\s+struct|struct|abstract\s+type)\s/.test(L[p.linea - 1] || "")) {     // la definición de un tipo
        const lt = L[p.linea - 1], abstracto = /abstract/.test(lt);
        const pm = lt.match(/(?:struct|type)\s+\w+\{([^}]*)\}/);       // struct Punto{T<:Real}: sus parámetros
        const padre = (lt.replace(/\{[^}]*\}/, "").match(/<:\s*(\w+)/) || [])[1];
        const params = pm ? pm[1].split(",").map(x => x.trim()).map(x => { const m = x.match(/^(\w+)\s*<:\s*(\w+)$/); return m ? code(m[1]) + ", que puede ser cualquier subtipo de " + code(m[2]) : code(x) + ", que puede ser cualquier tipo"; }) : [];
        const campos = [], unaLinea = /\bend\s*$/.test(lt);       // struct Piedra <: Jugada end: sin campos
        if (!abstracto && !unaLinea) for (let k = p.linea; k < L.length && !/^\s*end\b/.test(L[k]); k++) { const c = (L[k].match(/^\s*(\w+)/) || [])[1]; if (c) campos.push(c); }
        frases.push(abstracto ? "Se define " + code(n) + ", un tipo <b>abstracto</b>: no tiene campos ni se pueden crear valores suyos. Sirve para agrupar otros tipos, que dirán que son de este con " + code("<: " + n) + "."
          : !campos.length ? "Se define el tipo " + code(n) + ", <b>sin campos</b>: sus valores no guardan nada, y lo único que importa de ellos es de qué tipo son." + (padre ? " Es un subtipo de " + code(padre) + "." : "") + " Un valor se crea con " + code(n + "()") + "."
          : "Se define el tipo " + code(n) + (/mutable/.test(lt) ? ", <b>mutable</b>," : "") + (params.length ? ", con " + (params.length === 1 ? "un parámetro, " : params.length + " parámetros: ") + params.join("; ") + "," : "") + " con " + campos.length + (campos.length === 1 ? " campo" : " campos") + ": " + campos.map(code).join(", ") + "." + (padre ? " Es un subtipo de " + code(padre) + "." : "") +
            " Es solo el molde: todavía no hay ningún valor de este tipo. Se crean llamando a " + code(n + "(…)") + ", con un valor para cada campo.");
        continue;
      }
      if (!a) {
        // álgebra lineal (capítulo 11): qué es lo que se acaba de calcular
        const lt = L[p.linea - 1] || "", sis = lt.match(/^\s*\w+\s*=\s*([\w.]+)\s*\\\s*(.+?)\s*$/);
        let extra = "";
        if (sis) extra = " Es la <b>solución del sistema</b>: lo que, multiplicado por " + code(sis[1]) + ", da " + code(sis[2]) + ".";
        else if (/=\s*inv\(/.test(lt)) extra = " Es la <b>inversa</b>: multiplicada por la matriz del paréntesis, da la identidad.";
        else if (/=\s*det\(/.test(lt)) extra = b.e && /^-?0(\.0|\/\/1)?$/.test(b.v[0]) ? " Es el <b>determinante</b>, y vale 0: un sistema con esta matriz no tiene una única solución." : " Es el <b>determinante</b>: como no es 0, un sistema con esta matriz tiene una única solución.";
        else if (/=\s*dot\(/.test(lt) || /'\s*\*/.test(lt)) extra = " Es el <b>producto escalar</b>: cada casilla por la de la misma posición, y todo sumado.";
        else if (/=\s*norm\(/.test(lt)) extra = " Es la <b>norma</b>: la longitud del vector, la raíz cuadrada de la suma de los cuadrados.";
        if (!b.plot && /\brandn?\(/.test(lt)) extra = azarTxt(lt);
        const cnt = lt.match(/\bcount\(\s*(==|!=|<=|>=|<|>|≤|≥|≠)\(([^()]+)\)\s*,\s*([^)]+)\)/);
        if (cnt) extra += " " + code(cnt[1] + "(" + cnt[2] + ")") + " es una función de una sola pregunta, «¿es " + ({ "==": "igual a", "!=": "distinto de", "≠": "distinto de", "<": "menor que", ">": "mayor que", "<=": "menor o igual que", "≤": "menor o igual que", ">=": "mayor o igual que", "≥": "mayor o igual que" })[cnt[1]] + " " + esc(cnt[2].trim()) + "?», y " + code("count") + " cuenta cuántos elementos de " + code(cnt[3].trim()) + " dicen que sí.";
        if (b.plot) extra = barrasTxtDe(lt, b.plot.sp[0]);
        if (b.plot && !p.grafico) extra += " Como la línea es una asignación, Julia no lo dibuja: el gráfico ya existe en la memoria, pero aún no se ve.";
        if (b.t === "Expr") extra += exprCreacion(lt, p, prev);
        if (b.t === "Module" && b.modulo) {       // module Notas … end (capítulo 23)
          const exp = b.modulo.filter(e => e.exporta), dentro = b.modulo.filter(e => !e.exporta);
          const primero = !P.slice(0, P.indexOf(p)).some(x => Object.values(x.estado || {}).some(v => v.modulo));
          frases.push("Se define el módulo " + code(n) + ": un <b>espacio de nombres</b> propio, una caja con sus variables y sus funciones. Dentro hay " + b.modulo.length + (b.modulo.length === 1 ? " nombre: " : " nombres: ") + yLista(b.modulo.map(e => code(e.nombre))) + ". " +
            (exp.length ? "Exporta " + yLista(exp.map(e => code(e.nombre))) + ": " + (exp.length === 1 ? "es el que se podrá" : "son los que se podrán") + " usar sin escribir " + code(n + ".") + " delante, después de " + code("using ." + n) + "." : "No exporta nada.") +
            (dentro.length ? " " + yLista(dentro.map(e => code(e.nombre))) + (dentro.length === 1 ? " se queda" : " se quedan") + " dentro: desde fuera se escribe " + code(n + "." + dentro[0].nombre) + "." : "") +
            " Las funciones de dentro todavía no se ejecutan." + (primero ? " Un paquete, como " + code("DataFrames") + ", es por dentro un módulo como este, con su propio nombre y lo que exporta." : ""));
          continue;
        }
        if (b.t === "function" && n.startsWith("@")) { frases.push("Se define la macro " + code(n) + ": una función especial que recibe <b>código</b>, no valores, y devuelve código. Cuando una línea la use, Julia ejecutará primero la macro y luego el código que devuelva, en lugar de lo escrito."); continue; }
        if (b.t === "function" && /@eval\b|\beval\(/.test(lt)) { frases.push("Se crea " + code(n) + ", una función que no está escrita en el programa con ese nombre: la ha definido " + code(/@eval/.test(lt) ? "@eval" : "eval") + " con el código que el programa acaba de construir. El programa escribe código, y ese código se ejecuta."); continue; }
        frases.push("Se crea " + code(n) + ", " + quees(b) + "." + extra + (b.local && !mp ? " Es una variable local del bucle." : "")); continue;
      }
      if (b.id && a.id === b.id && !igual(a, b) && hechos.some(m => ahora[m] && ahora[m].id === b.id)) {
        frases.push("Y " + code(n) + " también cambia, porque es " + (b.d ? "la misma matriz" : b.dict ? "el mismo diccionario" : b.struct ? "el mismo objeto" : b.plot ? "el mismo gráfico" : "el mismo vector") + " que " + code(hechos.find(m => ahora[m] && ahora[m].id === b.id)) + "."); hechos.push(n); continue;
      }
      if (a.t === "function" && b.t === "function" && b.m > a.m) {       // un método más para la misma función
        const sig = ((L[p.linea - 1] || "").match(/^\s*(?:function\s+)?(\w+!?\(.*?\))/) || [])[1];
        frases.push("Se añade a " + code(n) + " un método nuevo" + (sig ? ", " + code(sig) : "") + ": ahora la función tiene " + b.m + " métodos. Es la misma función, y en cada llamada Julia elegirá el método según el tipo de los argumentos."); continue;
      }
      if (a.df && b.df && a.id === b.id && !igual(a, b)) {           // una tabla que cambia: columnas nuevas, casillas
        const fr = [], nf = longitud(b);
        b.cols.forEach((c, k) => {
          const j = a.cols.indexOf(c);
          if (j < 0) { fr.push("Se añade a " + code(n) + " la columna " + code(c) + " (" + code(b.tipos[k]) + ")" + (nf ? ": " + esc(b.v[k].join(", ")) : "") + "."); return; }
          const camb = b.v[k].map((x, i) => x !== a.v[j][i] ? i : -1).filter(i => i >= 0);
          if (camb.length && camb.length <= 3) camb.forEach(i => fr.push("Cambia " + code(n + "[" + (i + 1) + ", :" + c + "]") + ": valía " + esc(a.v[j][i]) + " y ahora vale " + esc(b.v[k][i]) + "."));
          else if (camb.length) fr.push("Cambia la columna " + code(c) + " de " + code(n) + ": ahora vale " + esc(b.v[k].join(", ")) + ".");
          else if (a.cid[j] !== b.cid[k]) fr.push("La columna " + code(c) + " de " + code(n) + " es ahora otro vector, con los mismos valores.");
        });
        a.cols.forEach(c => { if (!b.cols.includes(c)) fr.push("Se quita la columna " + code(c) + " de " + code(n) + "."); });
        frases.push(...(fr.length ? fr : [code(n) + " cambia."])); hechos.push(n); continue;
      }
      if (a.plot && b.plot && a.id === b.id && !igual(a, b)) {         // un gráfico que cambia: plot! le añade series
        const sa = a.plot.sp[0], sb = b.plot.sp[0], fr = [], nuevas = vis(sb).slice(vis(sa).length);
        const desc = s => (s.etiqueta ? "«" + esc(s.etiqueta) + "», " : "") + (s.tipo === "shape" ? barrasTxt(nBarras(s)) : s.tipo === "scatter" ? (s.x.length === 1 ? "un punto suelto" : s.x.length + " puntos sueltos") : (s.marca !== "none" ? "una línea con marcas" : "una línea") + " de " + s.x.length + (s.x.length === 1 ? " punto" : " puntos"));
        if (nuevas.length) fr.push("Se añade a " + code(n) + (nuevas.length === 1 ? " una serie nueva (" + desc(nuevas[0]) + ")" : " " + nuevas.length + " series nuevas") + ": ahora tiene " + seriesTxt(vis(sb).length) + ". " + code(n) + " es el mismo objeto de antes: la función con " + code("!") + " lo cambia, no hace uno nuevo.");
        if (sa.titulo !== sb.titulo) fr.push("Cambia el título de " + code(n) + ": ahora es «" + esc(sb.titulo) + "».");
        if (sa.x.guia !== sb.x.guia) fr.push("Cambia el nombre del eje x de " + code(n) + ": «" + esc(sb.x.guia) + "».");
        if (sa.y.guia !== sb.y.guia) fr.push("Cambia el nombre del eje y de " + code(n) + ": «" + esc(sb.y.guia) + "».");
        if (!nuevas.length) for (const e of ["x", "y"]) if (sa[e].lim.join() !== sb[e].lim.join()) fr.push("Cambian los límites del eje " + e + " de " + code(n) + ": ahora va de " + esc(sb[e].lim[0]) + " a " + esc(sb[e].lim[1]) + ".");
        if (!fr.length) fr.push(code(n) + " cambia.");
        const lt = L[p.linea - 1] || "";
        if (/^\s*\w+!\(/.test(lt) && !new RegExp("^\\s*\\w+!\\(\\s*" + n + "\\b").test(lt)) fr.push("La línea no nombra a " + code(n) + ": una función como " + code((lt.match(/^\s*(\w+!)/) || [])[1]) + " sin un gráfico delante cambia el <b>gráfico actual</b>, el último que se ha hecho o cambiado, y ese es " + code(n) + ".");
        frases.push(...fr); hechos.push(n); continue;
      }
      if (b.t === "Expr" && !igual(a, b)) {          // una expresión que cambia, o un nombre que pasa a otra
        const lt = L[p.linea - 1] || "";
        if (a.t === "Expr" && a.id === b.id) frases.push("Cambia " + code(n) + " por dentro: ahora es " + code(b.r) + ". Sigue siendo la misma expresión, el mismo objeto: una " + code("Expr") + " se puede cambiar, como un vector, y " + code(n + ".args") + " es su vector de argumentos.");
        else if (a.t === "Expr") frases.push("El nombre " + code(n) + " pasa a señalar una expresión <b>nueva</b>, " + code(b.r) + (contieneExpr(b.expr, a.r) ? ", que lleva dentro la de antes, " + code(a.r) + ": la expresión crece hacia arriba, con la anterior como rama" : "") + "." + exprCreacion(lt, p, prev));
        else frases.push(code(n) + " valía " + esc(muestra(a)) + " y ahora es " + quees(b) + "." + exprCreacion(lt, p, prev));
        hechos.push(n); continue;
      }
      if (a.struct && b.struct && a.t === b.t && !igual(a, b)) {       // un objeto que cambia: campo a campo
        const fr = b.el.map((e, i) => igual(e.v, a.el[i].v) ? null : e.v.e && a.el[i].v.e ? "Cambia " + code(n + "." + e.nombre) + ": valía " + esc(a.el[i].v.v[0]) + " y ahora vale " + esc(e.v.v[0]) + "."
          : "Cambia " + code(n + "." + e.nombre) + ": ahora vale " + esc(muestra(e.v)) + ".").filter(Boolean);
        frases.push(...fr); hechos.push(n); continue;
      }
      // copia[1].faltas = 5 cambia también clase[1] si es el mismo objeto (una copia de un solo piso)
      if (a.v && b.v && a.ids && b.ids && !igual(a, b) && a.v.length === b.v.length) {
        const camb = b.v.map((x, i) => x !== a.v[i] && b.ids[i] != null && a.ids[i] === b.ids[i] ? i : -1).filter(i => i >= 0);
        const otro = i => { for (const m of hechos) { const x = ahora[m]; if (x && x.ids && x.ids.includes(b.ids[i])) return m + "[" + (x.ids.indexOf(b.ids[i]) + 1) + "]"; if (x && x.struct && x.id === b.ids[i]) return m; } return null; };
        if (camb.length && camb.every(otro)) {
          frases.push(...camb.map(i => "Y " + code(n + "[" + (i + 1) + "]") + " también cambia, porque es el mismo objeto que " + code(otro(i)) + ": los vectores son dos, pero el objeto es uno solo, sin copiar."));
          hechos.push(n); continue;
        }
      }
      // B[1, 1] = 100 cambia también A si B salió de vec o reshape: son otro objeto, pero con las mismas casillas
      if (a.v && b.v && !igual(a, b) && enLinea && enLinea !== n && hechos.includes(enLinea) && !new RegExp("\\b" + n + "\\b").test(L[p.linea - 1] || "") && ahora[enLinea] && ahora[enLinea].v) {
        casillasDe.push(n); hechos.push(n); continue;
      }
      if (igual(a, b)) continue;
      if (a.e && b.e) {
        frases.push(code(n) + " valía " + esc(a.v[0]) + " y ahora vale " + esc(b.v[0]) + "." +
          (a.t !== b.t ? " Ha cambiado de tipo: era un " + code(a.t) + " y ahora es un " + code(b.t) + "." : ""));
        continue;
      }
      // u = u + h * f(u), o v = [0.0, 0.0]: el nombre cambia de vector, aunque tenga la misma longitud; el de antes sigue ahí
      if (a.id && b.id && a.id !== b.id && a.v && b.v && !a.dict && !b.dict && !b.df && !b.plot && !b.struct) {
        const otros = nombres(p.estado, p.orden).filter(m => m !== n && p.estado[m] && p.estado[m].id === a.id);
        const valores = !b.d && !b.nv && b.v.length && b.v.length <= 6 ? ", " + code("[" + b.v.join(", ") + "]") : "";
        const ya = nombres(ahora, orden).find(m => m !== n && ahora[m].id === b.id && !ahora[m].vista);
        if (ya && !b.vista) {
          const nadie = !otros.length && !nombres(ahora, orden).some(m => m !== n && ahora[m].id === a.id);
          frases.push("El nombre " + code(n) + " deja " + (a.d ? "la matriz" : "el vector") + (!a.d && !a.nv && a.v.length <= 6 ? " " + code("[" + a.v.join(", ") + "]") : " de antes") + " y pasa a señalar " + (b.d ? "la misma matriz" : "el mismo vector") + " que " + code(ya) + ": ahora son dos nombres para un solo " + (b.d ? "objeto" : "vector") + "." +
            (nadie ? " Al de antes ya no lo señala nadie, y Julia lo borrará de la memoria cuando necesite el sitio." : ""));
          hechos.push(n); continue;
        }
        frases.push("El nombre " + code(n) + " pasa a señalar " + (b.d ? "una matriz <b>nueva</b>" : "un vector <b>nuevo</b>") + valores + ": " + quees(b) + "." +
          (otros.length ? " " + otros.map(code).join(" y ") + " no cambia: sigue siendo " + (b.d ? "la matriz" : "el vector") + " de antes." : ""));
        hechos.push(n); continue;
      }
      if (a.v && b.v && a.v.length === b.v.length && !a.nv && !b.nv && a.t === b.t) {
        const camb = b.v.map((x, i) => x !== a.v[i] ? i : -1).filter(i => i >= 0);
        if (b.d && a.d && a.d.join() === b.d.join()) {      // en una matriz, cada casilla con su fila y su columna
          const [nf, nc] = b.d, fi = i => i % nf + 1, co = i => Math.floor(i / nf) + 1, ij = i => code(n + "[" + fi(i) + ", " + co(i) + "]");
          const fs = new Set(camb.map(fi)), cs = new Set(camb.map(co));
          if (camb.length === 1) frases.push("Cambia " + ij(camb[0]) + ": valía " + esc(a.v[camb[0]]) + " y ahora vale " + esc(b.v[camb[0]]) + ".");
          else if (cs.size === 1 && nf > 1 && camb.length === nf) frases.push("Cambia la columna " + [...cs][0] + " de " + code(n) + ", " + code(n + "[:, " + [...cs][0] + "]") + ": ahora vale " + camb.map(i => esc(b.v[i])).join(", ") + ".");
          else if (fs.size === 1 && nc > 1 && camb.length === nc) frases.push("Cambia la fila " + [...fs][0] + " de " + code(n) + ", " + code(n + "[" + [...fs][0] + ", :]") + ": ahora vale " + camb.map(i => esc(b.v[i])).join(", ") + ".");
          else if (camb.length <= 4) frases.push("Cambian " + camb.map(ij).slice(0, -1).join(", ") + " y " + ij(camb[camb.length - 1]) + ": ahora valen " + camb.map(i => esc(b.v[i])).slice(0, -1).join(", ") + " y " + esc(b.v[camb[camb.length - 1]]) + ".");
          else frases.push("Cambian " + camb.length + " casillas de " + code(n) + ".");
          hechos.push(n); continue;
        }
        const k0 = camb[0];
        if (camb.length === 1 && a.ids && b.ids && b.ids[k0] != null && a.ids[k0] === b.ids[k0])
          frases.push("Cambia por dentro el objeto de " + code(n + "[" + (k0 + 1) + "]") + ": valía " + esc(a.v[k0]) + " y ahora vale " + esc(b.v[k0]) + ". Es el mismo objeto, con un campo distinto." + (nombres(ahora, orden).some(m => (m !== n && ahora[m].ids && ahora[m].ids.includes(b.ids[k0])) || (ahora[m].struct && ahora[m].id === b.ids[k0])) ? "" : " Ningún otro nombre lo señala, así que nada más cambia."));
        else if (camb.length === 1 && a.ids && b.ids && a.ids[k0] != null && a.ids[k0] !== b.ids[k0]) {
          const sigue = nombres(ahora, orden).flatMap(m => m !== n && ahora[m].ids ? ahora[m].ids.flatMap((y, j) => y === a.ids[k0] ? [m + "[" + (j + 1) + "]"] : []) : []);
          frases.push(code(n + "[" + (k0 + 1) + "]") + " pasa a señalar otro objeto, " + code(b.v[k0]) + "." + (sigue.length ? " " + sigue.map(code).join(" y ") + " no cambia: sigue señalando a " + code(a.v[k0]) + ". Cambiar una casilla de " + code(n) + " no toca el otro vector." : ""));
        }
        else if (camb.length === 1) frases.push("Cambia " + code(n + "[" + (k0 + 1) + "]") + ": valía " + esc(a.v[k0]) + " y ahora vale " + esc(b.v[k0]) + ".");
        else if (camb.length <= 4) frases.push("Cambian " + camb.map(i => code(n + "[" + (i + 1) + "]")).slice(0, -1).join(", ") + " y " + code(n + "[" + (camb[camb.length - 1] + 1) + "]") + ": ahora valen " + camb.map(i => esc(b.v[i])).slice(0, -1).join(", ") + " y " + esc(b.v[camb[camb.length - 1]]) + ".");
        else frases.push("Cambian " + camb.length + " elementos de " + code(n) + ".");
        hechos.push(n); continue;
      }
      if (a.v && b.v && !a.d && !b.d && !a.nv && !b.nv && b.v.length > a.v.length + 1 && a.v.every((x, i) => x === b.v[i])) {
        const nuevos = b.v.slice(a.v.length);
        frases.push(code(n) + " gana " + nuevos.length + " elementos al final, " + nuevos.slice(0, -1).map(esc).join(", ") + " y " + esc(nuevos[nuevos.length - 1]) + ": ahora tiene " + b.v.length + " elementos.");
        hechos.push(n); continue;
      }
      if (a.v && b.v && !a.d && !b.d && b.v.length === a.v.length + 1 && a.v.every((x, i) => x === b.v[i + 1]) && /\bpushfirst!\(/.test(L[p.linea - 1] || "")) {
        frases.push(code(n) + " gana un elemento <b>al principio</b>, " + esc(b.v[0]) + ": ahora tiene " + b.v.length + (b.v.length === 1 ? " elemento" : " elementos") + ", " + code("[" + b.v.join(", ") + "]") + ".");
        hechos.push(n); continue;
      }
      if (a.v && b.v && !a.d && !b.d && b.v.length === a.v.length + 1 && a.v.every((x, i) => x === b.v[i])) {
        frases.push(code(n) + " gana un elemento al final, " + esc(b.v[b.v.length - 1]) + ": ahora tiene " + b.v.length + (b.v.length === 1 ? " elemento." : " elementos."));
        hechos.push(n); continue;
      }
      if (a.id && b.id && a.id !== b.id) {     // otro objeto con el mismo nombre (diccionarios, tablas…)
        const otros = nombres(p.estado, p.orden).filter(m => m !== n && p.estado[m] && p.estado[m].id === a.id);
        frases.push("El nombre " + code(n) + " pasa a señalar un vector <b>nuevo</b>: " + quees(b) + "." +
          (otros.length ? " " + otros.map(code).join(" y ") + " no cambia: sigue siendo el vector de antes." : ""));
        hechos.push(n); continue;
      }
      if (a.t === "DataType" && b.t === "DataType") frases.push(code(n) + " valía el tipo " + code(a.r) + " y ahora vale el tipo " + code(b.r) + ".");
      else frases.push(code(n) + " cambia: ahora es " + quees(b) + ".");
    }
    // un vector que es también el campo de un objeto: e.notas y notas son el mismo vector
    for (const n of hechos) {
      const b = ahora[n]; if (!b || !b.v || !b.id) continue;
      const tab = nombres(ahora, orden).find(m => ahora[m].df && ahora[m].cid.includes(b.id) && m !== n);
      if (tab && !b.df) { frases.push(code(n) + " y " + code(tab + "." + ahora[tab].cols[ahora[tab].cid.indexOf(b.id)]) + " son el <b>mismo vector</b>: una columna de una tabla es un vector, y " + code(tab + "." + ahora[tab].cols[ahora[tab].cid.indexOf(b.id)]) + " da ese mismo vector, sin copiarlo."); break; }
      const due = nombres(ahora, orden).find(m => ahora[m].struct && ahora[m].el.some(e => e.v.id === b.id));
      if (due) { const c = ahora[due].el.find(e => e.v.id === b.id).nombre; frases.push(code(n) + " y " + code(due + "." + c) + " son el <b>mismo vector</b>: al construir " + code(due) + ", Julia guardó en el campo el vector, sin copiarlo."); break; }
    }
    const vL = enLinea && ahora[enLinea], vA = enLinea && antes[enLinea];
    const padreV = vL && vL.vista ? casillasDe.find(m => ahora[m].id === vL.vista.padre) : null;
    const hijasV = vL && !vL.vista ? casillasDe.filter(m => ahora[m].vista && ahora[m].vista.padre === vL.id) : [];
    if (padreV && vA && vA.v && vA.v.length === vL.v.length) {        // w[1] = 0 escribe en v[2]
      const camb = vL.v.map((x, i) => x !== vA.v[i] ? i : -1).filter(i => i >= 0), pv = ahora[padreV];
      const en = i => code(pv.d ? padreV + "[" + ((vL.vista.pos[i] - 1) % pv.d[0] + 1) + ", " + (Math.floor((vL.vista.pos[i] - 1) / pv.d[0]) + 1) + "]" : padreV + "[" + vL.vista.pos[i] + "]");
      frases.push("Y " + code(padreV) + " también cambia: " + code(enLinea) + " es una vista de sus casillas" + (camb.length && camb.length <= 4 ? ", y " + camb.map(i => code(enLinea + "[" + (i + 1) + "]")).join(", ") + (camb.length === 1 ? " es " : " son ") + camb.map(en).join(", ") : "") + ". La vista no tiene casillas propias: escribir en ella es escribir en " + code(padreV) + ".");
      casillasDe.splice(casillasDe.indexOf(padreV), 1);
    }
    if (hijasV.length) {
      frases.push("Y " + hijasV.map(code).join(" y ") + " también " + (hijasV.length === 1 ? "cambia: es una vista" : "cambian: son vistas") + " de " + code(enLinea) + ", y sus casillas son las de " + code(enLinea) + ".");
      for (const m of hijasV) casillasDe.splice(casillasDe.indexOf(m), 1);
    }
    if (casillasDe.length) {
      const y = casillasDe.map(code), varias = y.length > 1;
      frases.push("Y " + (varias ? y.slice(0, -1).join(", ") + " y " + y[y.length - 1] + " también cambian: no son" : y[0] + " también cambia: no es") + " el mismo objeto que " + code(enLinea) + ", pero " + (varias ? "guardan" : "guarda") + " sus valores en las <b>mismas casillas</b> de la memoria.");
    }
    // las que desaparecen (una variable local de un bucle que termina)
    for (const n of nombres(antes, prev && (mp ? (ma ? ma.orden : []) : prev.orden))) if (!ahora[n] && antes[n].local && !mp)
      frases.push(code(n) + " desaparece: era local " + (L.some(x => new RegExp("\\bcatch\\s+" + n + "\\b").test(x)) ? "del " + code("catch") : "del bucle") + ".");
    // el final de un try del programa principal (su valor, si no es nothing, sale en la consola)
    if (p.tipo === "linea" && /^\s*try\s*$/.test(L[p.linea - 1] || "")) frases.unshift("Termina el bloque " + code("try") + ". El programa sigue por la línea siguiente.");
    if (mp && prev && prev.estado) {          // dentro de una llamada, cambia algo del programa principal
      for (const n of nombres(p.estado, p.orden)) {
        const a = prev.estado[n], b = p.estado[n];
        if (a && igual(a, b)) continue;
        const vf = a && b && b.id ? Object.keys(mp.vars).find(x => mp.vars[x] && mp.vars[x].vista && mp.vars[x].vista.padre === b.id) : null;
        const pos = vf ? mp.vars[vf].vista.pos : [];
        frases.push((a ? "Cambia " : "Se crea ") + code(n) + " en el programa principal" + (vf ? ": " + code(vf) + " es una vista de sus casillas" + (pos.length <= 6 ? " " + (pos.length === 1 ? pos[0] : pos.slice(0, -1).join(", ") + " y " + pos[pos.length - 1]) : "") + ", y lo que se escribe en " + code(vf) + " se escribe en " + code(n) : "") + ".");
      }
    }
    if (p.salida.length > prev.salida.length) {
      const nueva = p.salida.slice(prev.salida.length).replace(/\n$/, "").split("\n");
      const linea = (L[p.linea - 1] || "").trim();
      const muestra1 = nueva.length === 1 ? code(nueva[0]) : "varias líneas";
      const esTabla = /^(\d+×\d+ DataFrame|DataFrameRow)$/.test(nueva[0]);
      const esUniforme = nueva.length === 2 && /^UniformScaling\{/.test(nueva[0]);
      const esVector = nueva.length > 1 && /^\d+-element/.test(nueva[0]), esMatriz = nueva.length > 1 && /^\d+×\d+ /.test(nueva[0]), esVista = / view\(/.test(nueva[0]);
      const cola = /^:\(/.test(nueva[0]) && nueva.length === 1 ? ": " + muestra1 + ". Una expresión se escribe entre " + code(":(") + " y " + code(")") + ": es código, no un resultado." : esUniforme ? ": la identidad, que Julia escribe " + code(nueva[1]) + " porque no tiene un tamaño fijo: toma el de la matriz con la que opera." : esTabla ? (nueva.length > 1 ? ": " + (nueva[0] === "DataFrameRow" ? "una fila de la tabla" : "la tabla entera") + ", con una línea de título, los nombres y los tipos de las columnas, y una fila por línea con su número." : ": " + muestra1 + ".") : esVista ? ": una <b>vista</b> (" + code("view") + ") de las casillas que han cambiado, con una cabecera que dice de dónde salen." :
        esMatriz ? ": la matriz entera, con una línea de cabecera (filas × columnas y su tipo) y una fila de la matriz por línea." :
        esVector ? ": el vector entero, con una línea de cabecera (su tamaño y su tipo) y una casilla por línea." : ": " + muestra1 + ".";
      const vistaVar = /^\w+$/.test(linea) && p.estado[linea] && p.estado[linea].vista ? p.estado[linea] : (mp && /^\w+$/.test(linea) && mp.vars[linea] && mp.vars[linea].vista ? mp.vars[linea] : null);
      const deQue = (nueva[0].match(/view\(::([^,]+),/) || [])[1];
      const colaV = vistaVar ? ": una <b>vista</b>. La cabecera dice cuántas casillas tiene, de qué vector sale" + (deQue ? " (un " + code(deQue) + ")" : "") + " y qué índices elige, " + code(vistaVar.vista.i) + "; debajo, sus valores, que son los de ese vector." : null;
      const bang = (linea.match(/^(\w+!)\(/) || [])[1];
      const mac = linea.match(/^@(\w+)\s*(.*)$/), propia = mac && p.estado["@" + mac[1]];
      const ev = linea.match(/\beval\((\w+)\)/), evx = ev && p.estado[ev[1]] && p.estado[ev[1]].t === "Expr" ? p.estado[ev[1]] : null;
      if (/^@macroexpand1?\b/.test(linea)) frases.push(code("@macroexpand") + " no ejecuta la macro: enseña el código en que se convierte la llamada, " + muestra1 + ". Lo que la macro protege con " + code("esc") + " queda tal cual: es código del que la llama. Los demás nombres llevan delante " + code("Main.") + ": la macro los busca en el programa principal, se use donde se use. Es la <b>higiene</b> de las macros.");
      else if (propia) frases.push("La macro " + code("@" + mac[1]) + " recibe el código " + code(mac[2]) + " sin calcularlo y devuelve código nuevo, que Julia ejecuta en lugar de la línea. Ese código escribe en la consola " + muestra1 + ".");
      else if (/^dump\(/.test(linea)) frases.push(code("dump") + " escribe la expresión por dentro, nivel a nivel: cada " + code("Expr") + " con su cabeza (" + code("head") + ") y sus argumentos (" + code("args") + "), y cada hoja con su tipo. Es el mismo árbol que se ve en la memoria.");
      else if (evC) frases.push("Como la línea no es una asignación, Julia muestra lo que devuelve " + code("eval") + ": el último valor que calcula la celda, " + muestra1 + ".");
      else if (ev) frases.push(code("eval") + " ejecuta " + (evx ? "la expresión " + code(evx.r) : code(ev[1])) + " como si su código estuviera escrito aquí, en el programa principal, con los valores de ahora, y Julia muestra el resultado: " + muestra1 + ".");
      else if (/^Random\.seed!\(/.test(linea)) frases.push(code(linea) + " fija la <b>semilla</b>: desde aquí, los números «al azar» son siempre los mismos, en cualquier ordenador. Devuelve el generador de números al azar, y Julia lo muestra como " + code("TaskLocalRNG()") + ".");
      else if (/\.[-+*\/^]=/.test(linea)) frases.push("Una operación como " + code(linea.match(/\.[-+*\/^]=/)[0]) + " cambia las casillas igual que " + code(".=") + ", pero para la consola no es una asignación: Julia muestra su resultado" + cola);
      else if (/^@test_throws\s+\S+\s+/.test(linea)) { const [, t, ex] = linea.match(/^@test_throws\s+(\S+)\s+(.*)$/);
        frases.push(code("@test_throws") + " comprueba que " + code(ex) + " lanza un error de tipo " + code(t) + ": lo lanza, así que la prueba <b>pasa</b>. Julia escribe «Test Passed» y, debajo, el tipo del error que se lanzó (" + code("Thrown") + "). El error no detiene el programa: lo ha atrapado la prueba."); }
      else if (/^@test\s+/.test(linea)) frases.push(code("@test") + " comprueba que " + code(linea.replace(/^@test\s+/, "")) + " es <code>true</code>: lo es, así que la prueba <b>pasa</b>, y Julia escribe «Test Passed».");
      else if (/^@show\b/.test(linea)) frases.push(code("@show") + " escribe en la consola la expresión y su valor: " + muestra1 + ".");
      else if (/^(.+?)\s*&&\s*print(ln)?\(/.test(linea)) frases.push("Se comprueba " + code(linea.match(/^(.+?)\s*&&/)[1]) + ": es <code>true</code>, así que el <code>&&</code> ejecuta lo de la derecha, y " + code("println") + " escribe en la consola " + muestra1 + ".");
      else if (/^print(ln)?\(/.test(linea)) frases.push(code(linea.match(/^print(ln)?/)[0]) + " escribe en la consola " + muestra1 + (/^println/.test(linea) ? ", y salta de línea." : "."));
      else if (linea === "VERSION") frases.push("Escribir solo " + code("VERSION") + " hace que Julia muestre su valor: es la versión de Julia que está ejecutando el programa, " + muestra1 + ". Es la del libro, y la que imita el laboratorio.");
      else if (/^[\w.!]+$/.test(linea)) frases.push("Escribir solo " + code(linea) + " hace que Julia muestre su valor en la consola" + (colaV || cola));
      else if (bang && esVector) frases.push(code(bang) + " devuelve el vector modificado, y Julia lo muestra en la consola" + cola);
      else if (!/(^|[^=!<>≈])=($|[^=])/.test(linea.replace(/"[^"]*"/g, ""))) {
        frases.push("La línea es una expresión: Julia calcula " + code(linea) + " y muestra su valor en la consola" + cola);
        if (/v"[^"]*"\s*(<|>|<=|>=|==)\s*v"/.test(linea)) frases.push("Los números de versión se comparan parte a parte, como números: primero el mayor, después el menor y al final el parche. Por eso " + code('v"1.10.0"') + " va después de " + code('v"1.9.2"') + ": 10 es más que 9.");
        const tx = linea.match(/^"([\d.]+)"\s*(<|>)\s*"([\d.]+)"$/);
        if (tx) { let k = 0; while (k < tx[1].length && tx[1][k] === tx[3][k]) k++;
          frases.push("Son <b>textos</b>, no versiones: Julia los compara letra a letra. Las " + k + " primeras letras son iguales (" + code(tx[1].slice(0, k)) + ") y, en la siguiente, " + code(tx[1][k] || "") + " va " + ((tx[1][k] || "") < (tx[3][k] || "") ? "antes" : "después") + " que " + code(tx[3][k] || "") + ": como en un diccionario, sin mirar qué número forman."); }
        if (/===/.test(linea)) frases.push(/(^|[^=!])==($|[^=])/.test(linea) ? code("==") + " compara los valores, casilla a casilla; " + code("===") + " pregunta si los dos lados son el <b>mismo objeto</b> de la memoria." : code("===") + " no compara los valores: pregunta si los dos lados son el <b>mismo objeto</b> de la memoria.");
        // una función definida con eval no tiene firma escrita en el programa: el visualizador no entra en ella
        const fe = (linea.match(/^(\w+!?)\(/) || [])[1], fv = fe && p.estado[fe];
        if (fv && fv.t === "function" && !/\(/.test(fv.r) && P.slice(0, P.indexOf(p)).some(x => x.estado && x.estado[fe]) && !P.some(x => x.tipo === "llamada" && x.funcion === fe)) frases.push("El código de " + code(fe) + " no está escrito en el programa: lo construyó el propio programa mientras corría, y por eso el visualizador no puede entrar en la función.");
      }
      else frases.push("Julia escribe en la consola " + muestra1 + ".");
    }
    if (p.grafico) {             // la línea muestra un gráfico: Julia lo dibuja
      const lt = (L[p.linea - 1] || "").trim(), f = (lt.match(/^([\w.]+!?)\(/) || [])[1], nG = vis(p.grafico.sp[0]).length;
      const primero = P.findIndex(x => x.grafico) === P.indexOf(p);
      const donde = primero ? " Aparece abajo, en «Gráfico» (en el REPL, Julia lo abre en una ventana)." : " Se ve abajo, en «Gráfico».";
      const sus = nG === 1 ? "su única serie" : "sus " + seriesTxt(nG);
      if (f === "display") frases.push(code("display") + " dibuja el gráfico." + donde);
      else if (f && /!$/.test(f)) frases.push("Como la línea no es una asignación, Julia muestra lo que devuelve " + code(f) + ", el gráfico ya cambiado, y mostrar un gráfico es <b>dibujarlo</b>, ahora con " + sus + "." + donde);
      else if (f) frases.push(code(f) + " crea un gráfico nuevo con " + (nG === 1 ? "una serie" : seriesTxt(nG)) + ". Como la línea no lo guarda en ninguna variable, Julia lo muestra, y mostrar un gráfico es <b>dibujarlo</b>." + donde);
      else if (/^[\w.]+$/.test(lt)) frases.push("Escribir solo " + code(lt) + " hace que Julia muestre su valor, y mostrar un gráfico es <b>dibujarlo</b>, con " + sus + "." + donde);
      else frases.push("Julia dibuja el gráfico." + donde);
    }
    if (!frases.length && RE_BASE.test(L[p.linea - 1] || "")) {
      const [, o, args] = (L[p.linea - 1] || "").match(RE_BASE), op = o.replace(/^\((.*)\)$/, "$1");
      return "Se añade a " + code(op) + " un método nuevo, " + code(op + args) + ". " + code(op) + " no es una función del programa: es de Julia, del módulo " + code("Base") +
        " (por eso se escribe " + code("Base.:" + o) + "), y ya tenía más de cien métodos, para los números y para muchos otros tipos. Ahora tiene uno más, para los tuyos. Como no se crea ningún nombre nuevo, la memoria del programa no cambia.";
    }
    if (!frases.length) {
      const lt = (L[p.linea - 1] || "").trim();
      if (prev && prev.tipo === "condicion" && prev.linea === p.linea && / \? /.test(lt))
        return "Se calcula la rama elegida: será el resultado" + (mp ? " de la función." : ".");
      const llam = (lt.match(/^([\w.]+!?)\(.*\)$/) || [])[1];
      if (llam && prev && prev.tipo === "devuelve" && prev.valor === "nothing")
        return "La llamada a " + code(llam) + " ha terminado. Como devuelve " + code("nothing") + ", la consola no muestra nada: lo que importaba era lo que ha hecho por el camino.";
    }
    // condición || error("…"): si el paso no es un error, la condición era true y error no llega a ejecutarse
    const oCorto = (L[p.linea - 1] || "").match(/^\s*(.+?)\s*\|\|\s*(error|throw)\(/);
    if (!frases.length && oCorto) return "Se comprueba " + code(oCorto[1]) + ": es <code>true</code>, así que el <code>||</code> no necesita mirar lo de la derecha, y <code>" + oCorto[2] + "</code> no se ejecuta. El programa sigue.";
    const yRet = (L[p.linea - 1] || "").match(/^\s*(.+?)\s*&&\s*(return\b.*|print(?:ln)?\(.*)$/);
    if (!frases.length && yRet) return "Se comprueba " + code(yRet[1]) + ": es <code>false</code>, así que el <code>&&</code> no necesita mirar lo de la derecha, y " + code(yRet[2]) + " no se ejecuta. " + (/^return/.test(yRet[2]) ? "La función sigue." : "El programa sigue.");
    const llamSuelta = ((L[p.linea - 1] || "").match(/^\s*([\w.]+!?)\(.*\)\s*$/) || [])[1];
    if (!frases.length && llamSuelta && prev && prev.tipo === "devuelve" && prev.funcion === llamSuelta)
      return "La llamada a " + code(llamSuelta) + " ha terminado. Lo que devuelve no se guarda en ninguna variable: lo que importaba era lo que ha hecho por el camino, en los vectores que recibe.";
    const yCorto = (L[p.linea - 1] || "").match(/^\s*(.+?)\s*&&\s*(error|throw)\(/);
    if (!frases.length && yCorto) return "Se comprueba " + code(yCorto[1]) + ": es <code>false</code>, así que el <code>&&</code> no necesita mirar lo de la derecha, y no se lanza ningún error. El programa sigue.";
    if (!frases.length && /^\s*Base\.showerror\(/.test(L[p.linea - 1] || "")) {
      const t = ((L[p.linea - 1] || "").match(/::\s*(\w+)\s*\)/) || [])[1];
      return "Se añade a " + code("showerror") + " un método" + (t ? " para " + code(t) : "") + ": así escribirá Julia ese error cuando lo tenga que enseñar. " + code("showerror") + " es de Julia, del módulo " + code("Base") + ", y el programa no la llama: la llama Julia. Como no se crea ningún nombre nuevo, la memoria no cambia.";
    }
    // e, sola, al final de un catch o de un try: es el valor del bloque
    if (!frases.length && /^\s*\w+\s*$/.test(L[p.linea - 1] || "")) {
      const sangria = (L[p.linea - 1].match(/^\s*/) || [""])[0].length;
      for (let j = p.linea - 2; j >= 0 && j >= p.linea - 12; j--) {
        const m = (L[j] || "").match(/^(\s*)(catch|try)\b/);
        if (m && m[1].length < sangria) return "Se calcula " + code(L[p.linea - 1].trim()) + ". Como es lo último del bloque, es lo que dará el " + code("try") + " entero si el programa llega hasta aquí.";
        if (/^\s*end\b/.test(L[j] || "")) break;
      }
    }
    if (evC && celdaTxt) {
      const nada = !frases.length;
      frases.unshift(code("Meta.parse") + " convierte el texto de la celda, " + code(celdaTxt) + ", en una expresión, y " + code("eval") + " la ejecuta, como si esa línea estuviera escrita aquí." +
        (nada ? (/^\s/.test(L[p.linea - 1] || "") && !Object.keys(prev && prev.estado || {}).some(k => celdaTxt.startsWith('"' + k + " =")) ? " Lo que define todavía no se ve en la memoria: aparecerá cuando termine el bucle." : " La memoria no cambia: el valor que calcula es el mismo que ya tenía.") : ""));
    }
    return frases.length ? frases.join(" ") : "Se ejecuta la línea " + p.linea + ".";
  }

  function casillas(v, previo, opciones = {}) {
    const cambia = i => previo && previo.v && previo.v.length === v.v.length && previo.v[i] !== v.v[i];
    // valores largos, o de un tipo propio (Punto{Int64}(1, 2)): uno debajo de otro
    const ali = opciones.alias || [], hayAli = !!opciones.alias;      // un vector de objetos: uno debajo de otro, con sus marcas
    if (hayAli || (!opciones.grande && (/^Vector\{Vector\{/.test(v.t || "") || (v.el === "String" && v.v.join("").length > 40) || v.v.some(x => String(x).length > 24) || (v.v.length > 1 && v.v.every(x => /^\w+(\{.*\})?\(.+\)$/.test(String(x))) && v.v.join("").length > 36))))
      return '<div class="fila-vert">' + v.v.map((x, i) => '<div class="cas-v' + (cambia(i) ? " cambia" : "") + '"><span class="idx">[' + (i + 1) + ']</span><span class="v">' + esc(x) + "</span>" +
        (ali[i] && ali[i].length ? '<span class="ali" title="la misma ficha, no una copia">↔ ' + ali[i].map(esc).join(", ") + "</span>" : "") + "</div>").join("") + "</div>";
    const marc = opciones.marcadas, org = opciones.origen;
    const bool = v.el === "Bool" && v.v.every(x => x === "true" || x === "false");
    return '<div class="fila-cas' + (bool ? " bool" : "") + (opciones.grande ? " grande" + (v.v.some(x => String(x).length > 4) ? " largo" : "") : "") + '">' + v.v.map((x, i) =>
      '<span class="cas' + (bool ? (x === "true" ? " si" : " no") : "") + (cambia(i) ? " cambia" : "") + (opciones.foco === i + 1 ? " foco" : "") + (marc && marc.has(i) ? " envista" : "") + '"><span class="v">' + esc(x) + '</span><span class="idx">[' + (i + 1) + "]</span>" +
        (org && org[i] ? '<span class="org">' + esc(org[i]) + "</span>" : "") + "</span>").join("") +
      (v.nv ? '<span class="cas mas"><span class="v">… y ' + (v.nv - v.v.length).toLocaleString("es-ES") + ' más</span></span>' : "") +
      (opciones.foco ? '<span class="puntero"><span class="et">' + esc(opciones.puntero) + " = " + opciones.foco + '</span><span class="flecha"></span></span>' : "") + "</div>";
  }
  const condicion = p => '<div class="tz-cond"><span>' + esc(p.cond.texto) + '</span><span style="color:var(--banda)">' + esc(p.cond.valores) + '</span><span class="res ' + (p.cond.valor === "true" ? "si" : "no") + '">' + esc(p.cond.valor) + "</span></div>";

  function cabecera(v) {
    if (v.plot) return '<span class="tipo" title="' + esc(v.t) + '">' + esc(v.t) + '</span><span class="lon">' + seriesTxt(nSeries(v)) + "</span>";
    if (v.d) return '<span class="tipo">' + esc(v.t) + '</span><span class="lon">' + v.d.join(" × ") + " (filas × columnas)</span>";
    if (v.df) return '<span class="tipo">DataFrame</span><span class="lon">' + longitud(v) + " × " + v.cols.length + " (filas × columnas)</span>";
    if (v.modulo) return '<span class="tipo">Module</span><span class="lon">' + v.modulo.length + (v.modulo.length === 1 ? " nombre" : " nombres") + "</span>";
    if (v.expr) return '<span class="tipo">Expr</span><span class="lon">' + v.expr.a.length + (v.expr.a.length === 1 ? " argumento" : " argumentos") + '</span><span class="loc">mutable</span>' + (v.local ? '<span class="loc">local</span>' : "");
    const lon = v.dict ? v.k.length + (v.k.length === 1 ? " pareja" : " parejas") : v.e || v.t === "function" ? (v.t === "function" && v.m > 1 ? v.m + " métodos" : "") : v.tupla ? v.el.length + (v.el.length && v.el.every(e => e.nombre) ? (v.el.length === 1 ? " campo" : " campos") : v.el.length === 1 ? " elemento" : " elementos") : v.v ? "longitud " + longitud(v).toLocaleString("es-ES") : "";
    return '<span class="tipo" title="' + esc(v.t) + '">' + esc(v.t === "function" ? "función" : corta(v.t)) + "</span>" + (lon ? '<span class="lon">' + lon + "</span>" : "") + (v.mutable ? '<span class="loc">mutable</span>' : "") + (v.local ? '<span class="loc">local</span>' : "");
  }
  // un texto como fila de letras, cada una con el índice de su primer byte; los bytes de en medio no son índices válidos
  function filaLetras(v, a) {
    const s = sinComillas(v.v[0]), antes = a && a.e && esTipoTexto(a.t) ? sinComillas(a.v[0]) : null;
    let i = 1, k = 0, html = '<div class="fila-letras">';
    const previas = antes != null ? [...antes] : null;
    for (const c of s) {
      const n = bytesDe(c), cambia = previas && previas[k] !== c;
      const malos = Array.from({ length: n - 1 }, (_, j) => '<span class="no" title="índice no válido">' + (i + j + 1) + "</span>").join("");
      html += '<span class="letra' + (n > 1 ? " multi" : "") + (cambia ? " cambia" : "") + '" style="min-width:' + (30 * n) + 'px">' +
        '<span class="v">' + (c === " " ? '<span class="esp">␣</span>' : c === "\n" ? '<span class="esp">\\n</span>' : esc(c)) + "</span>" +
        '<span class="idx"><span>[' + i + "]</span>" + malos + "</span>" + (n > 1 ? '<span class="bytes">' + n + " bytes</span>" : "") + "</span>";
      i += n; k++;
    }
    return html + "</div>";
  }
  // un diccionario: una tabla clave → valor, en el orden en que Julia lo guarda
  function tablaDict(v, a) {
    if (!v.k.length) return '<div class="otro">' + esc(v.t) + "() — vacío</div>";
    const ant = a && a.dict ? new Map(a.k.map((k, i) => [k, a.v[i]])) : null;
    return '<table class="dic"><thead><tr><th>clave</th><th></th><th>valor</th></tr></thead><tbody>' +
      v.k.map((k, i) => { const cl = ant && !ant.has(k) ? "nueva" : ant && ant.get(k) !== v.v[i] ? "cambia" : "";
        return '<tr class="' + cl + '"><td>' + esc(k) + '</td><td class="flecha">=&gt;</td><td>' + esc(v.v[i]) + "</td></tr>"; }).join("") + "</tbody></table>";
  }
  // un gráfico en la memoria: su título y sus series, cada una con su color
  function fichaGrafico(v, a) {
    const sp = v.plot.sp[0], na = a && a.plot && a.id === v.id ? vis(a.plot.sp[0]).length : null;
    let h = '<div class="gficha">';
    const ext = [sp.titulo && "título <b>«" + esc(sp.titulo) + "»</b>", sp.x.guia && "eje x <b>«" + esc(sp.x.guia) + "»</b>", sp.y.guia && "eje y <b>«" + esc(sp.y.guia) + "»</b>"].filter(Boolean);
    if (ext.length) h += '<div class="gtit">' + ext.join(" · ") + "</div>";
    if (!vis(sp).length) h += '<div class="gvacio">Sin series todavía.</div>';
    vis(sp).forEach((s, i) => {
      const linea = s.tipo === "path" && +s.ancho > 0, punto = s.marca !== "none", barra = s.tipo === "shape";
      const mues = '<svg class="mues" viewBox="0 0 26 12">' + (barra ? '<rect x="5" y="1" width="16" height="10" fill="' + (s.fondo || s.relleno) + '" stroke="' + s.color + '"/>' : "") + (linea ? '<line x1="1" y1="6" x2="25" y2="6" stroke="' + s.color + '" stroke-width="2.4"' + (s.estilo !== "solid" ? ' stroke-dasharray="4 3"' : "") + "/>" : "") + (punto ? '<circle cx="13" cy="6" r="4" fill="' + s.relleno + '" stroke="#000" stroke-width=".8"/>' : "") + "</svg>";
      h += '<div class="gserie' + (na !== null && i >= na ? " cambia" : "") + '">' + mues + '<span class="et">' + (s.etiqueta ? esc(s.etiqueta) : '<i style="font-weight:500;color:var(--banda)">sin etiqueta</i>') + '</span><span class="que">' +
        (barra ? barrasTxt(nBarras(s)) : (s.tipo === "scatter" ? "puntos" : punto ? "línea con marcas" : "línea") + " · " + s.x.length + (s.x.length === 1 ? " punto" : " puntos")) + "</span></div>";
    });
    return h + "</div>";
  }
  // una expresión (capítulo 20): el árbol que guarda Julia. Cada nodo, su cabeza (head); debajo, sus args en
  // orden, con su número (ex.args[3]); las hojas, símbolos (en color) y datos. Si la expresión es la misma de
  // antes (el mismo objeto) y ha cambiado por dentro, se marca lo que cambia
  function arbolExpr(v, a) {
    const viejo = a && a.expr && a.id === v.id ? a.expr : null;
    const nodo = (x, y, i) => {
      const idx = i != null ? '<span class="ai">' + (i + 1) + "</span>" : "";
      if (!x.a) return "<li>" + idx + '<span class="hj' + (x.t === "Symbol" ? " sym" : "") + (viejo && (!y || y.a || y.r !== x.r) ? " cambia" : "") + '" title="' + esc(x.t) + '">' + esc(x.r) + "</span></li>";
      const camb = viejo && (!y || !y.a || y.h !== x.h || y.a.length !== x.a.length);
      return "<li>" + idx + '<span class="cz' + (camb ? " cambia" : "") + '" title="head">:' + esc(x.h) + "</span><ul>" + x.a.map((h, k) => nodo(h, y && y.a ? y.a[k] : null, k)).join("") + "</ul></li>";
    };
    return '<div class="ex"><div class="ex-r">' + esc(v.r) + '</div><div class="arbol"><ul>' + nodo(v.expr, viejo, null) + "</ul></div></div>";
  }
  function valor(v, a, op = {}) {
    if (v.expr) return arbolExpr(v, a);
    if (v.plot) return fichaGrafico(v, a);
    if (v.dict) return tablaDict(v, a);
    if (v.df) return tablaDF(v, a);
    if (v.e && C.letras && esTipoTexto(v.t) && v.v[0].length > 2 && [...sinComillas(v.v[0])].length <= 40) return filaLetras(v, a);
    if (v.e && C.letras && v.t === "Char") { const c = sinComillas(v.v[0]); return '<span class="escalar">' + esc(v.v[0]) + '</span><span class="codigo">código ' + (c.length ? c.codePointAt(0) : "") + "</span>"; }
    if (v.e) return '<span class="escalar">' + esc(v.v[0]) + "</span>";
    if (v.d) return rejilla(v, a, op.celda, op.marcadas);
    if (v.modulo) return '<div class="modulo">' + (v.modulo.length ? v.modulo.map(e => {         // un módulo: sus nombres, y cuáles exporta
      const ea = a && a.modulo ? (a.modulo.find(x => x.nombre === e.nombre) || {}).v : null;
      return '<div class="elem' + (a && a.modulo && (!ea || !igual(ea, e.v)) ? " cambia" : "") + '"><div class="elem-cab"><span class="nom">' + esc(e.nombre) + "</span>" + cabecera(e.v) +
        (e.exporta ? '<span class="exp">exporta</span>' : '<span class="noexp">solo dentro</span>') + "</div>" + (e.v.t === "function" ? "" : valor(e.v, ea)) + "</div>";
    }).join("") : '<div class="otro">— vacío —</div>') + "</div>";
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
  // Una tabla de datos: cada columna con su nombre y su tipo, y una fila por alumno, con su número
  function tablaDF(v, a) {
    const n = longitud(v), mismo = a && a.df && longitud(a) === n;
    const ant = k => mismo ? a.cols.indexOf(v.cols[k]) : -1;
    const num = t => /^(Int|Float|Bool|Rational)/.test(t);
    let html = '<div class="rejilla"><table class="tdf"><thead><tr><th></th>' + v.cols.map((c, k) => '<th class="' + (a && a.df && ant(k) < 0 ? "nueva" : "") + '">' + esc(c) + "</th>").join("") +
      '</tr><tr><th class="tipo"></th>' + v.tipos.map((t, k) => '<th class="tipo' + (a && a.df && ant(k) < 0 ? " nueva" : "") + '">' + esc(t) + "</th>").join("") + "</tr></thead><tbody>";
    for (let i = 0; i < n; i++) {
      html += '<tr><th class="fila">' + (i + 1) + "</th>" + v.cols.map((c, k) => {
        const j = ant(k), cl = (num(v.tipos[k]) ? "num" : "") + (a && a.df ? (j < 0 ? " nueva" : a.v[j][i] !== v.v[k][i] ? " cambia" : "") : "");
        return '<td class="' + cl.trim() + '">' + esc(v.tipos[k] === "String" ? sinComillas(v.v[k][i]) : v.v[k][i]) + "</td>";
      }).join("") + "</tr>";
    }
    if (!n) html += '<tr><td colspan="' + (v.cols.length + 1) + '" style="color:var(--banda)">— sin filas —</td></tr>';
    return html + "</tbody></table></div>";
  }
  // Una matriz: Julia, como R, guarda los valores por columnas
  function rejilla(v, a, celda, marcadas = null) {
    const [nf, nc] = v.d, mismo = a && a.d && a.d.join() === v.d.join();
    let html = '<div class="rejilla"><table class="mat"><thead><tr><th></th>' +
      Array.from({ length: nc }, (_, j) => '<th class="' + (celda && celda[1] === j + 1 ? "foco" : "") + '">[:, ' + (j + 1) + "]</th>").join("") + "</tr></thead><tbody>";
    for (let i = 0; i < nf; i++) {
      html += '<tr><th class="' + (celda && celda[0] === i + 1 ? "foco" : "") + '">[' + (i + 1) + ", :]</th>";
      for (let j = 0; j < nc; j++) {
        const x = i + j * nf;
        const cl = (mismo && a.v[x] !== v.v[x] ? " cambia" : "") + (celda && celda[0] === i + 1 && celda[1] === j + 1 ? " foco" : "") + (marcadas && marcadas.has(x) ? " envista" : "");
        html += '<td class="' + cl.trim() + '">' + esc(v.v[x]) + "</td>";
      }
      html += "</tr>";
    }
    return html + "</tbody></table></div>";
  }

  // fuera = las variables de otro ámbito (el programa principal o la llamada en curso) y cómo nombrarlo
  function variables(est, orden, ant, conFoco, fuera = null) {
    let html = "";
    const ns = nombres(est, orden);
    const comparte = n => est[n].id ? ns.filter(m => m !== n && est[m].id === est[n].id).map(esc)
      .concat(ns.filter(m => est[m].df && m !== n).flatMap(m => est[m].cols.filter((c, k) => est[m].cid[k] === est[n].id).map(c => esc(m + "." + c))))
      .concat(ns.filter(m => est[m].struct).flatMap(m => est[m].el.filter(e => e.v.id === est[n].id).map(e => esc(m + "." + e.nombre))))
      .concat(fuera ? Object.keys(fuera.vars).filter(m => fuera.vars[m] && fuera.vars[m].id === est[n].id).map(m => esc(m) + " " + esc(fuera.donde)) : []) : [];
    const lista = conFoco && C.foco && ns.includes(C.foco) ? [C.foco].concat(ns.filter(n => n !== C.foco)) : ns;
    // todos los nombres a la vista: los de este ámbito y los del otro, con su apellido
    const todos = ns.map(m => [m, est[m], m]).concat(fuera ? Object.keys(fuera.vars).filter(m => fuera.vars[m]).map(m => [m, fuera.vars[m], m + " " + fuera.donde]) : []);
    const deId = (id, menos) => { const t = todos.find(([m, x]) => x.id === id && m !== menos && !x.vista); return t ? t : null; };
    // las vistas: de qué vector son, y en el vector, qué casillas mira cada una
    const vistaTxt = v => { const p = deId(v.vista.padre); return p ? p[0] + "[" + v.vista.i + "]" : null; };
    const origen = v => { const p = deId(v.vista.padre); if (!p) return null;
      return v.vista.pos.map(k => p[1].d ? p[0] + "[" + ((k - 1) % p[1].d[0] + 1) + ", " + (Math.floor((k - 1) / p[1].d[0]) + 1) + "]" : p[0] + "[" + k + "]"); };
    const miranle = (n, v) => todos.filter(([m, x]) => x.vista && x.vista.padre === v.id && v.id);
    // las fichas de un vector que son la misma que otra casilla o que otra variable
    const alias = (n, v) => v.ids ? v.ids.map((id, i) => id == null ? [] : todos.flatMap(([m, x, et]) =>
      (x.ids ? x.ids.flatMap((y, k) => y === id && !(m === n && k === i && x === v) ? [m + "[" + (k + 1) + "]" + et.slice(m.length)] : []) : []).concat(x.struct && x.id === id ? [et] : []))) : null;
    for (const n of lista) {
      const v = est[n], a = ant && ant[n];
      const cambio = !a || !igual(a, v);
      const pp = C.puntero;
      const foco = conFoco && n === C.foco && v.v && !v.d && pp && !Array.isArray(pp) && est[pp] && est[pp].v ? Number(est[pp].v[0]) : null;
      const celda = conFoco && n === C.foco && v.d && Array.isArray(pp) && pp.every(x => est[x] && est[x].v) ? pp.map(x => Number(est[x].v[0])) : null;
      const gem = v.vista ? [] : comparte(n).concat(v.struct && v.id ? todos.flatMap(([m, x, et]) => x.ids ? x.ids.flatMap((y, k) => y === v.id ? [esc(m + "[" + (k + 1) + "]" + et.slice(m.length))] : []) : []) : []);
      const mir = v.vista ? [] : miranle(n, v), vt = v.vista ? vistaTxt(v) : null;
      const marcadas = mir.length ? new Set(mir.flatMap(([, x]) => x.vista.pos.map(k => k - 1))) : null;
      html += '<div class="vec' + (cambio && ant ? " cambia" : "") + (v.local ? " local" : "") + (v.rango ? " esrango" : "") + (v.vista ? " esvista" : "") + '"><div class="vec-cab"><span class="nom">' + esc(n) + "</span>" + cabecera(v) +
        (gem.length ? '<span class="comparte">↔ ' + (v.dict ? "el mismo diccionario" : v.d ? "la misma matriz" : v.struct ? "el mismo objeto" : v.plot ? "el mismo gráfico" : "el mismo vector") + " que " + gem.join(", ") + "</span>" : "") +
        (v.vista ? '<span class="comparte" title="no tiene casillas propias: son las de otro vector">vista de ' + (vt ? code(vt) : "otro vector") + "</span>" : "") +
        (mir.length ? '<span class="comparte" title="las casillas marcadas debajo">' + mir.map(([m, x, et]) => esc(et)).join(", ") + (mir.length === 1 ? " mira " : " miran ") + (marcadas.size === 1 ? "una casilla" : marcadas.size + " casillas") + "</span>" : "") + "</div>" +
        (v.t === "function" ? '<div class="otro">' + esc(v.r) + "</div>" : valor(v, a, { grande: conFoco && n === C.foco && !v.d && !v.e, foco: foco >= 1 && foco <= (v.v || []).length ? foco : null, puntero: C.puntero, celda,
          marcadas, origen: v.vista ? origen(v) : null, alias: alias(n, v) })) + "</div>";
    }
    return html;
  }

  function memoria(p, prev) {
    const M = p.marcos || [];
    let html = p.tipo === "condicion" ? condicion(p) : "";
    const hayGlobal = nombres(p.estado, p.orden).length;
    if (!M.length && !hayGlobal) html += '<p class="tz-vacio">Todavía no hay ninguna variable.</p>';
    if (M.length) html += '<span class="tz-ambito">Programa principal</span>' + (hayGlobal ? "" : '<p class="tz-vacio">Sin variables.</p>');
    const enCurso = M.length ? M[M.length - 1] : null;
    html += variables(p.estado, p.orden, prev && prev.estado, true, enCurso ? { vars: enCurso.vars, donde: "(en la llamada a " + enCurso.nombre + ")" } : null);
    const antes = prev && prev.marcos ? Object.fromEntries(prev.marcos.map(m => [m.id, m.vars])) : {};
    M.forEach((m, i) => {
      const activo = i === M.length - 1;
      html += '<div class="marco' + (activo ? " activo" : "") + '"><div class="marco-cab"><span>' + esc(m.llamada) + '</span><span class="que">' +
        (activo ? "llamada en curso" : "esperando a " + esc(M[i + 1].nombre)) + "</span></div>" +
        (Object.keys(m.vars).length ? variables(m.vars, m.orden, antes[m.id], false, { vars: p.estado, donde: "(del programa principal)" }) : '<p class="tz-vacio">Sin variables.</p>') +
        (activo && p.tipo === "devuelve" ? '<span class="devuelve">devuelve ' + esc(p.valor) + "</span>" : "") + "</div>";
    });
    if (p.tipo === "error") html += '<div class="tz-error"><b>Error de Julia</b><br><span class="txt">' + esc(p.error) + "</span></div>";
    if (p.tipo === "captura") html += '<div class="tz-error atrapado"><b>Error atrapado por el catch</b> (saltó en la línea ' + p.desde + ')<br><span class="txt">' + esc(p.error) + "</span></div>";
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
    el.querySelectorAll(".ln").forEach(n => n.classList.remove("hecha", "error", "espera", "salta"));
    if (p.tipo === "captura" && p.desde !== p.linea) { const ln = el.querySelector('.ln[data-n="' + p.desde + '"]'); if (ln) ln.classList.add("salta"); }
    (p.marcos || []).forEach(m => { const ln = m.desde && el.querySelector('.ln[data-n="' + m.desde + '"]'); if (ln && m.desde !== p.linea) ln.classList.add("espera"); });
    if (p.linea) { const ln = el.querySelector('.ln[data-n="' + p.linea + '"]'); if (ln) { ln.classList.add("hecha"); if (p.tipo === "error") ln.classList.add("error"); } }
    q(".tz-lin").textContent = p.linea ? "línea " + p.linea : "";
    q(".tz-narr").innerHTML = narra(p, prev);
    q(".tz-mem").innerHTML = memoria(p, k ? prev : null);
    q(".tz-consola").textContent = p.salida || "";
    if (hayGraficos) {          // el último gráfico que se ha dibujado hasta este paso
      let j = k; while (j > 0 && !P[j].grafico) j--;
      const caja = q(".tz-graf-caja");
      caja.classList.toggle("nuevo", !!P[k].grafico);
      q(".tz-graf-sub").textContent = !P[j].grafico ? "" : j === k ? "se acaba de dibujar" : "el último que se ha dibujado";
      if (grafPintado !== j) {
        grafPintado = j;
        q(".tz-graf").innerHTML = !P[j].grafico ? '<p class="vacio">Todavía no se ha dibujado ningún gráfico.</p>'
          : P[j].svg ? '<img src="' + new URL("../" + P[j].svg, import.meta.url).href + '" alt="El gráfico que dibuja Plots en este paso">' : dibujaGrafico(P[j].grafico);
      }
    }
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
