// graficos.mjs · Una parte de Plots.jl (1.41, con GR) para el capítulo «Gráficos»
// (Entendiendo Julia, desde dentro · AC Institut)
//
// Un gráfico es { T: "Plot", sp: { titulo, xguia, yguia, xlims, ylims, leyenda, series } }: un objeto que
// cambia (plot! le añade series), como en Julia. El laboratorio calcula lo mismo que Plots antes de
// dibujar: los datos de cada serie (convertidos a Float64 salvo los rangos), sus colores (la paleta de
// Plots), los límites de cada eje (los datos, ensanchados un 6 % alrededor del centro) y sus marcas, con
// el algoritmo de Wilkinson de PlotUtils.optimize_ticks y las etiquetas de Showoff. trazar.jl describe el
// gráfico con esos mismos datos; el dibujo lo hace el visualizador.
import * as V from "./valores.mjs";
import { ErrorJulia, NoSoportado, I, F, S, NADA } from "./valores.mjs";
import * as MX from "./matrices.mjs";

// la paleta :default de Plots y los colores con nombre (Colors.jl), comprobados en Julia
const PALETA = ["#009AFA", "#E36F47", "#3EA44E", "#C371D2", "#AC8E18", "#00AAAE", "#ED5E93", "#C68225", "#00A98D", "#8E971E", "#00A9CC", "#9B7FE9", "#618DF6", "#F06073", "#DD65B6", "#6C9F33"];
const COLORES = {"aqua":"#00FFFF","beige":"#F5F5DC","black":"#000000","blue":"#0000FF","brown":"#A52A2A","chocolate":"#D2691E","coral":"#FF7F50","crimson":"#DC143C","cyan":"#00FFFF","darkblue":"#00008B","darkgray":"#A9A9A9","darkgreen":"#006400","darkgrey":"#A9A9A9","darkorange":"#FF8C00","darkred":"#8B0000","firebrick":"#B22222","forestgreen":"#228B22","fuchsia":"#FF00FF","gold":"#FFD700","gray":"#808080","green":"#008000","grey":"#808080","indigo":"#4B0082","khaki":"#F0E68C","lightblue":"#ADD8E6","lightgray":"#D3D3D3","lightgreen":"#90EE90","lightgrey":"#D3D3D3","lime":"#00FF00","magenta":"#FF00FF","maroon":"#800000","navy":"#000080","olive":"#808000","orange":"#FFA500","orchid":"#DA70D6","pink":"#FFC0CB","purple":"#800080","red":"#FF0000","royalblue":"#4169E1","salmon":"#FA8072","silver":"#C0C0C0","skyblue":"#87CEEB","steelblue":"#4682B4","tan":"#D2B48C","teal":"#008080","tomato":"#FF6347","turquoise":"#40E0D0","violet":"#EE82EE","white":"#FFFFFF","yellow":"#FFFF00"};
// los nombres de los atributos (Plots._keyAliases) que el laboratorio entiende
const ALIAS = {"c":"seriescolor","color":"seriescolor","colour":"seriescolor","seriescolor":"seriescolor","seriescolors":"seriescolor",
  "key":"legend_position","leg":"legend_position","legend":"legend_position","legends":"legend_position","legendposition":"legend_position","legend_position":"legend_position",
  "lab":"label","labels":"label","label":"label","lc":"linecolor","lcolor":"linecolor","lcolour":"linecolor","linecolor":"linecolor","linecolors":"linecolor","linecolour":"linecolor",
  "linestyle":"linestyle","linestyles":"linestyle","ls":"linestyle","s":"linestyle","style":"linestyle","linewidth":"linewidth","linewidths":"linewidth","lw":"linewidth","w":"linewidth","width":"linewidth",
  "markercolor":"markercolor","markercolors":"markercolor","markercolour":"markercolor","mc":"markercolor","mcolor":"markercolor","mcolour":"markercolor",
  "markershape":"markershape","markershapes":"markershape","shape":"markershape","marker":"markershape","m":"markershape","markers":"markershape","mark":"markershape",
  "markersize":"markersize","markersizes":"markersize","ms":"markersize","msize":"markersize",
  "seriestype":"seriestype","seriestypes":"seriestype","st":"seriestype","t":"seriestype","typ":"seriestype","linetype":"seriestype","lt":"seriestype",
  "title":"title","titles":"title","xguide":"xguide","xguides":"xguide","x_guide":"xguide","xl":"xguide","xlab":"xguide","xlabel":"xguide",
  "yguide":"yguide","yguides":"yguide","y_guide":"yguide","yl":"yguide","ylab":"yguide","ylabel":"yguide",
  "xlims":"xlims","xlim":"xlims","xlimit":"xlims","xlimits":"xlims","x_lims":"xlims","xrange":"xlims","ylims":"ylims","ylim":"ylims","ylimit":"ylims","ylimits":"ylims","y_lims":"ylims","yrange":"ylims"};
const MARCAS = ["none", "circle", "rect", "star5", "diamond", "hexagon", "cross", "xcross", "utriangle", "dtriangle", "rtriangle", "ltriangle", "pentagon", "heptagon", "octagon", "star4", "star6", "star7", "star8", "vline", "hline", "+", "x"];
const ALIAS_MARCAS = {"uptriangle":"utriangle","no":"none","sq":"rect","X":"xcross",">":"rtriangle","rt":"rtriangle","righttri":"rtriangle","ltri":"ltriangle","d":"diamond","lighttri":"ltriangle","oct":"octagon","downtriangle":"dtriangle","r":"rect","downtri":"dtriangle","star1":"star5","lt":"ltriangle","lighttriangle":"ltriangle","hex":"hexagon","o":"octagon","p":"pentagon","n":"none","c":"circle","V":"dtriangle","h":"hexagon","square":"rect","<":"ltriangle","ellipse":"circle","^":"utriangle","righttriangle":"rtriangle","plus":"cross","dtri":"dtriangle","circ":"circle","s2":"star8","s":"star5","v":"dtriangle","utri":"utriangle","ut":"utriangle","star":"star5","dt":"dtriangle","spike":"vline","star2":"star8","rtri":"rtriangle","uptri":"utriangle","hep":"heptagon","pent":"pentagon"};
const ESTILOS = ["solid", "dash", "dot", "dashdot", "dashdotdot"], ALIAS_ESTILOS = { d: "dash", s: "solid", ddd: "dashdotdot", dd: "dashdot" };
const LEYENDAS = ["none", "best", "right", "left", "top", "bottom", "inside", "legend", "topright", "topleft", "bottomleft", "bottomright", "outerright", "outerleft", "outertop", "outerbottom", "outertopright", "outertopleft", "outerbottomright", "outerbottomleft", "inline"];

// ── Números como los escribe Julia ─────────────────────────────────────────
// 10.0^k de Julia (Base.pow_body) no siempre es el decimal más cercano a 10^k: estos son los que cambian
const POT10 = {"33":"1.0000000000000001e33","34":"1.0000000000000001e34","37":"1.0000000000000001e37","39":"1.0000000000000001e39","45":"1.0000000000000001e45","49":"1.0000000000000001e49","-12":"1.0000000000000002e-12","-18":"9.999999999999999e-19","-2":"0.010000000000000002","-20":"1.0000000000000001e-20","-21":"1.0000000000000001e-21","-22":"9.999999999999999e-23","-25":"9.999999999999999e-26","-29":"1.0000000000000001e-29","-30":"9.999999999999999e-31","-33":"9.999999999999999e-34","-34":"1.0000000000000001e-34","-40":"1.0000000000000001e-40","-42":"9.999999999999999e-43","-43":"9.999999999999999e-44","-44":"1.0000000000000001e-44","-45":"1.0000000000000001e-45","-50":"9.999999999999999e-51","-56":"9.999999999999999e-57","-7":"1.0000000000000001e-7"};
function pot10(k) {
  if (Math.abs(k) > 60) throw new NoSoportado("un gráfico con números tan grandes o tan pequeños");
  return k in POT10 ? parseFloat(POT10[k]) : parseFloat("1e" + k);
}
// round(x) de Julia: al par en los empates, y conserva el signo del cero
function redondea(v) {
  if (!Number.isFinite(v)) return v;
  const f = Math.floor(v), d = v - f;
  let r = d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1);
  if (r === 0 && (v < 0 || Object.is(v, -0))) r = -0;
  return r;
}
// round(x, sigdigits = s) de Julia (Base._round_sigdigits)
function redondeaCifras(x, s) {
  const h = x === 0 ? 0 : 1 + Math.floor(Math.log10(Math.abs(x)));
  const dig = s - h;
  if (dig >= 0) {
    const inv = pot10(dig);
    const y = redondea(x * inv) / inv;
    return Number.isFinite(y) ? y : x;
  }
  const paso = pot10(-dig), y = redondea(x / paso) * paso;
  if (!Number.isFinite(y)) throw new NoSoportado("un gráfico con números tan grandes");
  return y;
}
function ordenDeMagnitud(xspan) {         // PlotUtils.bounding_order_of_magnitude
  let a = 1; while (xspan < pot10(a)) a -= 1;
  let b = 1; while (xspan > pot10(b)) b += 1;
  while (a + 1 < b) { const c = Math.trunc((a + b) / 2); if (xspan < pot10(c)) b = c; else a = c; }
  return b;
}
const EPS = 2.220446049250313e-16;
// PlotUtils.optimize_ticks con los valores de Plots: entre 4 y 8 marcas, 5 la ideal, sin salirse del eje
function marcas(xmin, xmax) {
  const kmin = 4, kmax = 8, kideal = 5;
  if (Math.abs(xmin - xmax) <= 1000 * EPS * Math.max(Math.abs(xmin), Math.abs(xmax)))
    throw new NoSoportado("un eje en el que el valor más pequeño y el más grande son casi iguales");
  const Q = [[1, 1], [5, 0.9], [2, 0.7], [2.5, 0.5], [3, 0.2]];
  const gw = 1 / 4, sw = 1 / 6, cw = 1 / 3, nw = 1 / 4;
  for (let pasada = 1; pasada <= 2; pasada++) {
    const estricto = pasada === 1;
    const xspan = xmax - xmin;
    let z = ordenDeMagnitud(xspan);
    const numDig = ordenDeMagnitud(Math.max(Math.abs(xmin), Math.abs(xmax))) + 1;
    let alto = -Infinity, mejor = null;
    while (2 * kmax * pot10(z + 1) > xspan) {
      const sig = Math.max(1, numDig - z);
      for (let k = kmin; k <= 2 * kmax; k++) {
        for (const [q, qs] of Q) {
          const tick = q * pot10(z);
          if (tick < EPS * Math.max(Math.abs(xmin), Math.abs(xmax))) continue;
          const span = (k - 1) * tick;
          if (span < xspan) continue;
          const rf = (xmax - span) / tick;
          if (!Number.isFinite(rf)) continue;
          let r = Math.ceil(rf);
          while (r * tick <= xmin) {
            const Sv = [];
            for (let i = 0; i < k; i++) Sv.push((r + i) * tick);
            let vmin = Sv[0] = redondeaCifras(Sv[0], sig);
            let vmax = Sv[k - 1] = redondeaCifras(Sv[k - 1], sig);
            let lista;
            if (estricto) {
              vmin = Math.max(vmin, xmin); vmax = Math.min(vmax, xmax);
              const buf = 0 * (vmax - vmin);
              lista = Sv.filter(s => vmin - buf <= s && s <= vmax + buf);
            } else lista = Sv;
            const len = lista.length;
            const conCero = r <= 0 && Math.abs(r) < k;
            const s = conCero ? 1 : 0;
            const g = 0 < len && len < 2 * kideal ? 1 - Math.abs(len - kideal) / kideal : 0;
            const c = len > 1 ? 1.5 * xspan / ((len - 1) * tick) : 0;
            let puntos = gw * g + sw * s + cw * c + nw * qs;
            if (estricto && span > xspan) puntos -= 10000;
            if (span >= 2 * xspan) puntos -= 1000;
            if (puntos > alto && kmin <= len && len <= kmax) { alto = puntos; mejor = lista.slice(); }
            r += 1;
          }
        }
      }
      z -= 1;
    }
    if (alto !== -Infinity) return mejor;
  }
  throw new NoSoportado("las marcas de este eje (Plots usa otro método cuando no encuentra unas buenas)");
}
// Showoff: el exponente del último dígito del Float32 más corto (Ryu.reduce_shortest)
function exponente32(y) {
  const f = Math.fround(y);
  if (!Number.isFinite(f)) throw new NoSoportado("un gráfico con números tan grandes");
  let s;
  for (let p = 1; p <= 9; p++) { s = f.toExponential(p - 1); if (Math.fround(parseFloat(s)) === f) break; }
  const [m, e] = s.split("e");
  const dig = m.replace("-", "").replace(".", "").replace(/0+$/, "") || "0";
  return parseInt(e, 10) - (dig.length - 1);
}
// Ryu.writefixed(x, p): x con p decimales exactos, redondeando al par
function bitsDe(x) {
  const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x);
  const hi = dv.getUint32(0), lo = dv.getUint32(4);
  const exp = (hi >>> 20) & 0x7ff, mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  return exp === 0 ? [mant, -1074] : [mant | (1n << 52n), exp - 1075];
}
function fijo(x, p) {
  if (x === Infinity) return "∞"; if (x === -Infinity) return "-∞"; if (Number.isNaN(x)) return "NaN";
  const neg = x < 0 || Object.is(x, -0);
  const [m, e] = bitsDe(Math.abs(x));
  const diez = 10n ** BigInt(p);
  let q;
  if (e >= 0) q = m * (1n << BigInt(e)) * diez;
  else {
    const num = m * diez, den = 1n << BigInt(-e);
    q = num / den; const r = num % den;
    if (2n * r > den || (2n * r === den && q % 2n === 1n)) q += 1n;
  }
  let t = q.toString();
  if (p > 0) { t = t.padStart(p + 1, "0"); t = t.slice(0, -p) + "." + t.slice(-p); }
  return (neg ? "-" : "") + t;
}
// Ryu.writeexp(x, p): x en notación científica con p decimales exactos (redondeando al par), como 1.5e+05
function cientifico(x, p) {
  const neg = x < 0;
  const [m, e] = bitsDe(Math.abs(x));
  const num0 = e >= 0 ? m << BigInt(e) : m, den0 = e >= 0 ? 1n : 1n << BigInt(-e);
  const mayorIgual = (k) => k >= 0 ? num0 >= den0 * 10n ** BigInt(k) : num0 * 10n ** BigInt(-k) >= den0;   // x ≥ 10^k
  let E = Math.floor(Math.log10(Math.abs(x)));
  while (!mayorIgual(E)) E--;
  while (mayorIgual(E + 1)) E++;
  const k = p - E;            // dígitos = x · 10^k, redondeado
  let num = num0, den = den0;
  if (k >= 0) num *= 10n ** BigInt(k); else den *= 10n ** BigInt(-k);
  let q = num / den; const r = num % den;
  if (2n * r > den || (2n * r === den && q % 2n === 1n)) q += 1n;
  if (q === 10n ** BigInt(p + 1)) { q /= 10n; E++; }
  const t = q.toString();
  const base = p > 0 ? t[0] + "." + t.slice(1) : t;
  return (neg ? "-" : "") + base + "e" + (E < 0 ? "-" : "+") + String(Math.abs(E)).padStart(2, "0");
}
function precisionPlana(ys) {          // Showoff.plain_precision_heuristic
  let emin = Infinity, emax = -Infinity;
  for (const y of ys.filter(Number.isFinite)) {
    const e10 = Math.abs(y) <= 1e-16 ? Math.min(emin, 0) : exponente32(y);
    emin = Math.min(emin, e10); emax = Math.max(emax, e10);
  }
  return Math.max(0, Math.min(-emin, -emax + 16));
}
const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
function etiquetas(ts) {
  const fin = ts.filter(Number.isFinite);
  if (!fin.length) return ts.map(t => String(t));
  const xmin = Math.min(...fin), xmax = Math.max(...fin);
  let r;
  if (xmax !== xmin && Math.abs(Math.log10(xmax - xmin)) > 4) {
    // notación científica: Showoff escribe 1.5×10⁵, y Plots (GR) lo pasa a 1.5×10^{5}
    const ys = fin.map(x => { if (x === 0) return 0; const z = Math.log10(Math.abs(x)); return redondeaCifras(Math.pow(10, z - Math.floor(z)), 15); });
    const p = precisionPlana(ys) + 1;
    r = ts.map(x => {
      if (x === 0) return "0";
      if (!Number.isFinite(x)) return Number.isNaN(x) ? "NaN" : x < 0 ? "-∞" : "∞";
      const [b, pw] = cientifico(x, p).split("e");
      let s = b + "×10" + (pw[0] === "-" ? "⁻" : "");
      const i = [...pw].findIndex(c => c >= "1" && c <= "9");
      s += i < 0 ? SUPER[0] : [...pw.slice(i)].map(c => SUPER[+c]).join("");
      return s;
    }).map(s => {      // Plots.convert_sci_unicode
      let t = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => String(SUPER.indexOf(c))).replace(/⁻/g, "-").replace(/×10/g, "×10^{");
      return t.includes("×10^{") ? t + "}" : t;
    });
  } else {
    const p = precisionPlana(fin);
    r = ts.map(t => fijo(t, p));
  }
  // con GR, Plots cambia el guion por el signo menos (U+2212)
  return r.map(s => s.replace(/-/g, "−"));
}

// ── El gráfico ─────────────────────────────────────────────────────────────
const AMPLIAR = 1.06;
function limites(sp, eje) {
  let amin = Infinity, amax = -Infinity;
  for (const s of sp.series) for (const v of s[eje]) if (Number.isFinite(v.n)) { amin = Math.min(v.n, amin); amax = Math.max(v.n, amax); }
  const lims = sp[eje + "lims"];
  if (lims) { if (Number.isFinite(lims[0])) amin = lims[0]; if (Number.isFinite(lims[1])) amax = lims[1]; }
  if (amax <= amin && Number.isFinite(amin)) amax = amin + 1.0;
  if (!Number.isFinite(amin) && !Number.isFinite(amax)) { amin = 0; amax = 1; }
  if (!lims && sp.series.length) {
    const mid = (amin + amax) / 2, span = (amax - amin) / 2;
    amin = mid + (-span) * AMPLIAR; amax = mid + span * AMPLIAR;
  }
  return [amin, amax];
}
function describeEje(sp, eje) {
  const [a, b] = limites(sp, eje);
  const ts = marcas(a, b);
  return { guia: sp[eje + "guia"], lim: [V.decimal(a), V.decimal(b)], marcas: ts.map(t => V.decimal(t)), etiquetas: etiquetas(ts) };
}
export function describeGrafico(p) {
  const sp = p.sp;
  if (sp.series.reduce((n, s) => n + s.x.length, 0) > 5000) throw new NoSoportado("un gráfico de más de 5000 puntos");
  return { sp: [{ titulo: sp.titulo, leyenda: sp.leyenda, x: describeEje(sp, "x"), y: describeEje(sp, "y"),
    series: sp.series.map(s => ({ tipo: s.tipo, etiqueta: s.etiqueta, color: s.color, ancho: V.repr(s.ancho), estilo: s.estilo, marca: s.marca, tam: V.repr(s.tam),
      relleno: s.relleno, borde: s.borde, x: s.x.map(v => v.s), y: s.y.map(v => v.s) })) }] };
}

export function graficos(P, fn, prog) {
  let actual = null;                                   // el gráfico actual (Plots.current())
  const esPlot = x => x && x.T === "Plot";
  const nuevo = () => ({ T: "Plot", sp: { titulo: "", xguia: "", yguia: "", xlims: null, ylims: null, leyenda: "best", series: [] } });

  // los datos de una serie: los rangos se quedan como están; lo demás se convierte en Float64
  const num = e => {
    if (e.T === "Float64") return e.v;
    if (e.T === "Int64") { const n = Number(e.v); if (BigInt(n) !== e.v) throw new NoSoportado("un entero tan grande en un gráfico"); return n; }
    if (e.T === "Bool") return e.v ? 1 : 0;
    if (e.T === "Rational") { const a = Number(e.n), b = Number(e.d); if (BigInt(a) !== e.n || BigInt(b) !== e.d) throw new NoSoportado("una fracción tan grande en un gráfico"); return a / b; }
    if (e.T === "Irrational") return e.v;
    if (e.T === "String" || e.T === "Char" || e.T === "Symbol") throw new NoSoportado("un eje de textos (categorías)");
    if (e.T === "Missing") throw new NoSoportado("missing en un gráfico");
    throw new NoSoportado("estos datos en un gráfico (" + V.tipo(e) + ")");
  };
  const datos = x => {
    if (V.esRango(x)) return V.elementos(x).map(e => ({ n: num(e), s: V.repr(e) }));
    if (V.esVector(x)) return V.elementos(x).map(e => { const n = num(e); return { n, s: V.decimal(n) }; });
    throw new NoSoportado("estos datos en un gráfico (" + V.tipo(x) + ")");
  };
  const columnas = y => {
    if (MX.esMatriz(y)) {
      const [f, c] = MX.dims(y), lin = MX.lineal(y);
      return Array.from({ length: c }, (_, j) => lin.slice(j * f, (j + 1) * f).map(e => { const n = num(e); return { n, s: V.decimal(n) }; }));
    }
    return [datos(y)];
  };

  // los atributos: los del gráfico (título, ejes, límites, leyenda) y los de cada serie
  const sim = (v, que) => {
    if (v.T === "Symbol") return v.v;
    if (v.T === "String") return v.v;
    throw new NoSoportado(que + " = " + V.repr(v));
  };
  const color = v => {
    const n = sim(v, "este color");
    if (n in COLORES) return COLORES[n];
    throw new NoSoportado("el color " + V.repr(v) + " (el laboratorio conoce: " + Object.keys(COLORES).slice(0, 12).join(", ") + "…)");
  };
  const numero = (v, que) => { if (v.T === "Int64" || v.T === "Float64") return v; throw new NoSoportado(que + " = " + V.repr(v)); };
  const lims = v => {
    if (v.T === "Symbol" && v.v === "auto") return null;
    if (v.T === "Tuple" && v.a.length === 2 && v.a.every(e => e.T === "Int64" || e.T === "Float64")) return v.a.map(e => Number(e.v));
    throw new NoSoportado("estos límites: " + V.repr(v));
  };
  const leyenda = v => {
    if (v.T === "Bool") return v.v ? "best" : "none";
    const n = sim(v, "legend");
    if (LEYENDAS.includes(n)) return n;
    throw new NoSoportado("legend = " + V.repr(v));
  };
  function atributos(kw) {
    const r = {};
    for (const [k, v] of kw) {
      const a = ALIAS[k];
      if (!a) throw new NoSoportado("el atributo " + k + " de Plots");
      r[a] = v;
    }
    return r;
  }
  function aplicaGrafico(sp, at) {
    if ("title" in at) sp.titulo = V.texto(at.title);
    if ("xguide" in at) sp.xguia = V.texto(at.xguide);
    if ("yguide" in at) sp.yguia = V.texto(at.yguide);
    if ("xlims" in at) sp.xlims = lims(at.xlims);
    if ("ylims" in at) sp.ylims = lims(at.ylims);
    if ("legend_position" in at) sp.leyenda = leyenda(at.legend_position);
  }
  // el valor de un atributo para la serie j de una llamada: una fila (1×n) da uno a cada serie
  const deSerie = (v, j) => {
    if (MX.esMatriz(v)) { const [f, c] = MX.dims(v); if (f !== 1) throw new NoSoportado("un atributo con una matriz que no es una fila"); return MX.lineal(v)[j % c]; }
    if (V.esVector(v) && v.T !== "String") throw new NoSoportado("un atributo con un vector (Plots lo reparte entre los puntos)");
    return v;
  };
  function serie(sp, tipoBase, xs, ys, at, j) {
    const idx = sp.series.length + 1;
    let tipo = tipoBase;
    if ("seriestype" in at) {
      const t = sim(deSerie(at.seriestype, j), "seriestype");
      if (t === "path" || t === "line") tipo = "path"; else if (t === "scatter") tipo = "scatter";
      else throw new NoSoportado("seriestype = :" + t);
    }
    const s = { tipo, x: xs, y: ys };
    if ("label" in at) {
      const l = deSerie(at.label, j);
      s.etiqueta = l.T === "Bool" && !l.v ? "" : l.T === "Nothing" ? "" : V.texto(l);
      if (l.T === "Bool" && l.v) throw new NoSoportado("label = true");
    } else s.etiqueta = "y" + idx;
    const base = "seriescolor" in at ? color(deSerie(at.seriescolor, j)) : PALETA[(idx - 1) % PALETA.length];
    s.color = "linecolor" in at ? color(deSerie(at.linecolor, j)) : base;
    s.relleno = "markercolor" in at ? color(deSerie(at.markercolor, j)) : base;
    s.borde = "#000000";
    // en un scatter, Plots deja el grosor de línea en 0 aunque se le dé otro
    s.ancho = tipo === "scatter" ? I(0) : "linewidth" in at ? numero(deSerie(at.linewidth, j), "linewidth") : I(1);
    if ("linestyle" in at) {
      let e = sim(deSerie(at.linestyle, j), "linestyle"); e = ALIAS_ESTILOS[e] || e;
      if (!ESTILOS.includes(e)) throw new NoSoportado("linestyle = :" + e);
      s.estilo = e;
    } else s.estilo = "solid";
    if ("markershape" in at) {
      const v = deSerie(at.markershape, j);
      if (v.T === "Bool") s.marca = v.v ? "circle" : "none";
      else { let m = sim(v, "marker"); m = ALIAS_MARCAS[m] || m; if (!MARCAS.includes(m)) throw new NoSoportado("marker = :" + m); s.marca = m; }
      if (tipo === "scatter" && s.marca === "none") s.marca = "circle";
    } else s.marca = tipo === "scatter" ? "circle" : "none";
    s.tam = "markersize" in at ? numero(deSerie(at.markersize, j), "markersize") : I(4);
    sp.series.push(s);
  }
  // plot(y), plot(x, y), plot(x, Y): una serie por cada columna de Y
  function anade(p, tipo, args, kw) {
    const at = atributos(kw);
    aplicaGrafico(p.sp, at);
    if (!args.length) return;
    if (args.length > 2) throw new NoSoportado("un gráfico con más de dos datos (x, y): los de tres dimensiones aún no");
    if (args.some(a => V.esFuncion(a))) throw new NoSoportado("dibujar una función directamente: Plots elige él los puntos. Escribe x = range(a, b, length = 100) y plot(x, f.(x))");
    if (args.some(a => esPlot(a))) throw new NoSoportado("juntar varios gráficos en uno (layout)");
    let xs, cols;
    if (args.length === 1) { cols = columnas(args[0]); xs = cols[0].map((_, i) => ({ n: i + 1, s: String(i + 1) })); }
    else {
      if (MX.esMatriz(args[0])) throw new NoSoportado("una matriz en el eje x");
      xs = datos(args[0]); cols = columnas(args[1]);
    }
    cols.forEach((ys, j) => {
      if (ys.length !== xs.length) throw new NoSoportado("x e y de distinta longitud (" + xs.length + " y " + ys.length + ")");
      serie(p.sp, tipo, xs, ys, at, j);
    });
  }
  const crea = tipo => (args, kw) => { const p = nuevo(); anade(p, tipo, args, kw); actual = p; return p; };
  const sobre = tipo => (args, kw) => {
    let p;
    if (args.length && esPlot(args[0])) { p = args[0]; args = args.slice(1); }
    else p = actual || nuevo();          // sin gráfico actual, plot! empieza uno nuevo
    anade(p, tipo, args, kw);
    actual = p;
    return p;
  };
  // title!("…"), xlabel!(p, "…"), xlims!(0, 10): cambian el gráfico (el actual si no se dice cuál)
  const cambia = (nombre, clave, dos) => (args, kw) => {
    if (kw.size) throw new NoSoportado(nombre + " con opciones");
    let p = actual;
    if (args.length && esPlot(args[0])) { p = args[0]; args = args.slice(1); }
    if (!p) throw new NoSoportado(nombre + " sin un gráfico antes");
    const v = dos ? (args.length === 2 ? { T: "Tuple", a: args } : args[0]) : args[0];
    if (!v || args.length !== (dos && args.length === 2 ? 2 : 1)) throw new NoSoportado(nombre + " con estos argumentos");
    aplicaGrafico(p.sp, { [clave]: v });
    actual = p;
    return p;
  };
  const PL = {
    plot: crea("path"), "plot!": sobre("path"), scatter: crea("scatter"), "scatter!": sobre("scatter"),
    "title!": cambia("title!", "title"), "xlabel!": cambia("xlabel!", "xguide"), "ylabel!": cambia("ylabel!", "yguide"),
    "xlims!": cambia("xlims!", "xlims", true), "ylims!": cambia("ylims!", "ylims", true),
    current: () => { if (!actual) throw new NoSoportado("current() sin un gráfico"); return actual; },
    savefig: () => { throw new NoSoportado("savefig: el laboratorio no guarda archivos"); },
  };
  for (const n of ["bar", "bar!", "histogram", "histogram!", "heatmap", "contour", "surface", "pie", "boxplot", "layout", "@layout", "gui", "annotate!", "hline!", "vline!", "plot3d", "scatter3d", "areaplot", "sticks", "density", "@animate", "animate", "gif"])
    PL[n] = () => { throw new NoSoportado(n + " de Plots: el laboratorio aún no lo dibuja"); };
  P.paquetes.Plots = PL;
  P.describeGrafico = describeGrafico;
  P.esPlot = esPlot;
  // display(p) dibuja el gráfico; con otro valor, lo escribe como el REPL
  fn.display = ([x]) => {
    if (esPlot(x)) prog.grafico = describeGrafico(x);
    else prog.salida += P.muestra(x) + "\n";
    return NADA;
  };
}
