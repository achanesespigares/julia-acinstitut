// graficos.mjs · Una parte de Plots.jl (1.41, con GR) para el capítulo «Gráficos»
// (Mirar y ver · Julia · cómo piensa tu código · AC Institut)
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
  "fillcolor":"fillcolor","fillcolors":"fillcolor","fillcolour":"fillcolor","fc":"fillcolor","fcolor":"fillcolor","fcolour":"fillcolor",
  "bins":"bins","bin":"bins","nb":"bins","nbin":"bins","nbins":"bins",
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
  const ex = sp.extremos && sp.extremos[eje];          // las barras ensanchan su eje (expand_extrema!)
  if (ex) { amin = Math.min(ex[0], amin); amax = Math.max(ex[1], amax); }
  const lims = sp[eje + "lims"];
  if (lims) { if (Number.isFinite(lims[0])) amin = lims[0]; if (Number.isFinite(lims[1])) amax = lims[1]; }
  if (amax <= amin && Number.isFinite(amin)) amax = amin + 1.0;
  if (!Number.isFinite(amin) && !Number.isFinite(amax)) { amin = 0; amax = 1; }
  if (!lims && sp.series.length && !(sp.sinEnsanchar && sp.sinEnsanchar[eje])) {
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
      relleno: s.relleno, borde: s.borde, fondo: s.fondo, primaria: s.primaria !== false, x: s.x.map(v => v.s), y: s.y.map(v => v.s) })) }] };
}


// ── Barras e histogramas (las recetas :bar, :barbins y :barhist de Plots, y StatsBase.histrange) ──
const bits64 = x => { const d = new DataView(new ArrayBuffer(8)); d.setFloat64(0, x); return d.getBigUint64(0); };
const deBits = b => { const d = new DataView(new ArrayBuffer(8)); d.setBigUint64(0, b); return d.getFloat64(0); };
const siguiente = x => x === 0 ? 5e-324 : x > 0 ? deBits(bits64(x) + 1n) : deBits(bits64(x) - 1n);
const anterior = x => -siguiente(-x);
function epsDe(x) {                         // eps(x) de Julia: la distancia al siguiente Float64
  const a = Math.abs(x);
  if (!Number.isFinite(a)) return NaN;
  return siguiente(a) - a;
}
const exp10 = k => Number("1e" + k);        // exp10 de un entero: el decimal más cercano (comprobado en Julia)
function log10Seguro(x) {
  const l = Math.log10(x), k = Math.round(l);
  if (Math.abs(l - k) < 1e-12) { if (x === exp10(k)) return k; throw new NoSoportado("un histograma con barras de ancho tan cerca de una potencia de 10"); }
  return l;
}
// StatsBase.histrange(lo, hi, n, :left): bordes «redondos» (1, 2 o 5 por una potencia de 10)
function histrange(lo, hi, n) {
  let start, step, divisor, len;
  if (hi === lo) { start = hi; step = Math.max(1, epsDe(start)); divisor = 1; len = 1; }
  else {
    let bw = (hi - lo) / n;
    bw = Math.max(bw, epsDe(hi), epsDe(lo));
    const lbw = log10Seguro(bw);
    if (lbw >= 0) {
      step = exp10(Math.floor(lbw));
      const r = bw / step;
      if (r <= 1.1) {} else if (r <= 2.2) step *= 2; else if (r <= 5.5) step *= 5; else step *= 10;
      divisor = 1;
      start = step * Math.floor(lo / step);
      len = Math.ceil((hi - start) / step);
    } else {
      divisor = exp10(-Math.floor(lbw));
      const r = bw * divisor;
      if (r <= 1.1) {} else if (r <= 2.2) divisor /= 2; else if (r <= 5.5) divisor /= 5; else divisor /= 10;
      step = 1;
      start = Math.floor(lo * divisor);
      len = Math.ceil(hi * divisor - start);
    }
  }
  while (lo < start / divisor) start -= step;
  while ((start + (len - 1) * step) / divisor <= hi) len += 1;
  if (len > 10001) throw new NoSoportado("un histograma de tantas barras");
  // StepRangeLen(TwicePrecision((start, divisor)), TwicePrecision((step, divisor)), len): cada borde en doble-doble
  const ref = dd(start, divisor), paso = dd(step, divisor);
  return Array.from({ length: len }, (_, u) => {
    const sh = u * paso[0], sl = u * paso[1], [xh, xl] = add12(ref[0], sh);
    return xh + (xl + (sl + ref[1]));
  });
}
// la aritmética de Base.TwicePrecision que hace falta para eso
const canon2 = (a, b) => { const h = a + b; return [h, (a - h) + b]; };
const add12 = (x, y) => Math.abs(y) > Math.abs(x) ? canon2(y, x) : canon2(x, y);
function parte(a) { const c = 134217729 * a, h = c - (c - a); return [h, a - h]; }
function mul12(a, b) {                       // Math.two_mul: a·b = h + l exactamente (Dekker)
  const h = a * b; if (!Number.isFinite(h)) return [h, h];
  const [ah, al] = parte(a), [bh, bl] = parte(b);
  return [h, ((ah * bh - h) + ah * bl + al * bh) + al * bl];
}
function dd(n, d) {                          // TwicePrecision{Float64}((n, d)) = TwicePrecision(n) / d
  const hi = n / d, [uh, ul] = mul12(hi, d), lo = (((n - uh) - ul) + 0) / d;
  if (hi === 0 || !Number.isFinite(hi)) return [hi, hi];
  return canon2(hi, lo);
}
// Statistics.quantile (tipo 7) sobre datos ya ordenados
function cuantil(v, p, enteros) {
  const n = v.length, m = 1 - p, aleph = n * p + m;        // fma(n, p, m): aquí es exacto
  const j = Math.min(Math.max(Math.trunc(aleph), 1), n - 1), g = Math.min(Math.max(aleph - j, 0), 1);
  const a = n === 1 ? v[0] : v[j - 1], b = n === 1 ? v[0] : v[j];
  const aprox = enteros ? a === b : (a === b || Math.abs(a - b) <= 1.4901161193847656e-8 * Math.max(Math.abs(a), Math.abs(b)));
  if (Number.isFinite(a) && Number.isFinite(b) && aprox) return a + g * (b - a);
  return (1 - g) * a + g * b;
}
// n^(1/3) como lo calcula Julia (pow de ARM, casi siempre el Float64 más cercano): el valor exacto con
// enteros grandes, y los dos candidatos cuando cae casi en medio de dos Float64 (comprobado con n ≤ 300 000)
function icbrt(N) {
  if (N < 2n) return N;
  let x = 1n << BigInt(Math.ceil(N.toString(2).length / 3));
  for (;;) { const y = (2n * x + N / (x * x)) / 3n; if (y >= x) break; x = y; }
  while (x * x * x > N) x--; while ((x + 1n) ** 3n <= N) x++;
  return x;
}
function enFijo(x) { const b = bits64(x), e = Number((b >> 52n) & 0x7ffn), m = (b & ((1n << 52n) - 1n)) | (1n << 52n); return m << BigInt(e - 1075 + 110); }
function raicesCubicas(n) {
  if (n === 1) return [1];
  const P = 110n, c = icbrt(BigInt(n) << (3n * P));
  // 1/3 en Float64 es 1/3 − 1/(3·2^54): n^y = ∛n · (1 − ln(n)/(3·2^54) + …)
  const T = c - ((c * BigInt(Math.round(Math.log(n) / (3 * 2 ** 54) * 2 ** 110))) >> P);
  let d = n ** (1 / 3);
  for (let k = 0; k < 3; k++) { const a = enFijo(d); if (a > T && enFijo(anterior(d)) >= T) d = anterior(d); else if (a < T && enFijo(siguiente(d)) <= T) d = siguiente(d); }
  const a = enFijo(d), o = T >= a ? siguiente(d) : anterior(d), b = enFijo(o), mid = (a + b) / 2n;
  const ulp = b > a ? b - a : a - b, dist = T > mid ? T - mid : mid - T;
  if (dist * 20n < ulp) return [d, o];
  return [(T > a ? T - a : a - T) <= (T > b ? T - b : b - T) ? d : o];
}
// cuántas barras: Freedman–Diaconis (bins = :auto), Sturges, raíz cuadrada o Rice
function numeroDeBarras(v, modo, enteros) {
  const n = v.length, cl = x => Math.min(Math.ceil(Math.max(x, 1)), 10000);
  const pide = f => { const r = raicesCubicas(n).map(f);
    if (r.some(t => t !== r[0])) throw new NoSoportado("este número de barras: cae justo en el borde y depende del último decimal"); return r[0]; };
  if (modo === "auto" || modo === "fd") {
    const o = [...v].sort((a, b) => a - b);
    let q = cuantil(o, 0.75, enteros) - cuantil(o, 0.25, enteros); if (!(q > 0)) q = 1;
    const span = o[n - 1] - o[0];
    return pide(nd => cl(span / (2 * q / nd)));
  }
  if (modo === "sqrt") return cl(Math.sqrt(n));
  if (modo === "sturges") { const x = Math.log2(n) + 1; if (Math.abs(x - Math.round(x)) < 1e-12 && !Number.isInteger(Math.log2(n))) throw new NoSoportado("bins = :sturges con este tamaño"); return cl(x); }
  if (modo === "rice") return pide(nd => cl(2 * nd));
  throw new NoSoportado("bins = :" + modo);
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
    const idx = sp.series.filter(t => t.primaria !== false).length + 1;     // las series secundarias no cuentan
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
    s.fondo = "fillcolor" in at ? color(deSerie(at.fillcolor, j)) : base;
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
    if ("bins" in at) throw new NoSoportado("bins fuera de un histograma");
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

  // las barras: una serie :shape con un rectángulo por barra (separados por NaN) y una serie secundaria
  // :scatter invisible con los centros; el eje y no se ensancha y el eje x se ensancha alrededor de las barras
  const ACEPTA_BARRAS = ["label", "seriescolor", "linecolor", "fillcolor", "markercolor", "linewidth", "bins", "title", "xguide", "yguide", "xlims", "ylims", "legend_position"];
  const NANV = { n: NaN, s: "NaN" };
  function barras(p, centros, alturas, hw, at) {
    for (const k of Object.keys(at)) if (!ACEPTA_BARRAS.includes(k)) throw new NoSoportado("el atributo " + k + " en unas barras");
    const sp = p.sp;
    const xs = [], ys = [];
    centros.forEach((c, i) => {
      const y = alturas[i];
      if (!Number.isFinite(c.n) || !Number.isFinite(y)) return;
      if (xs.length) { xs.push(NANV); ys.push(NANV); }
      const a = c.n - hw[i], b = c.n + hw[i], A = { n: a, s: V.decimal(a) }, Bv = { n: b, s: V.decimal(b) };
      const Y = { n: y, s: V.decimal(y) }, Z = { n: 0, s: "0.0" };
      xs.push(A, A, Bv, Bv, A); ys.push(Y, Z, Z, Y, Y);
    });
    if (!xs.length) throw new NoSoportado("unas barras sin ningún valor que dibujar");
    let lo = Infinity, hi = -Infinity;
    for (const v of xs) if (Number.isFinite(v.n)) { lo = Math.min(lo, v.n); hi = Math.max(hi, v.n); }
    const mid = (lo + hi) / 2, span = (hi - lo) / 2;
    const e = [mid + (-span) * AMPLIAR, mid + span * AMPLIAR];
    sp.extremos = sp.extremos || {};
    sp.extremos.x = sp.extremos.x ? [Math.min(sp.extremos.x[0], e[0]), Math.max(sp.extremos.x[1], e[1])] : e;
    sp.sinEnsanchar = sp.sinEnsanchar || {}; sp.sinEnsanchar.y = true;     // ywiden --> false
    const idx = sp.series.filter(t => t.primaria !== false).length + 1;
    let etiqueta = "y" + idx;
    if ("label" in at) {
      const l = at.label;
      if (l.T === "Bool" && l.v) throw new NoSoportado("label = true");
      etiqueta = (l.T === "Bool" && !l.v) || l.T === "Nothing" ? "" : V.texto(l);
    }
    const base = "seriescolor" in at ? color(at.seriescolor) : PALETA[(idx - 1) % PALETA.length];
    const lc = "linecolor" in at ? color(at.linecolor) : null;
    const fondo = "fillcolor" in at ? color(at.fillcolor) : base, relleno = "markercolor" in at ? color(at.markercolor) : base;
    sp.series.push({ tipo: "shape", etiqueta, color: lc || "#000000", ancho: "linewidth" in at ? numero(at.linewidth, "linewidth") : I(1), estilo: "solid",
      marca: "none", tam: I(4), relleno, borde: "#000000", fondo, primaria: true, x: xs, y: ys });
    sp.series.push({ tipo: "scatter", etiqueta, color: lc || base, ancho: I(0), estilo: "solid", marca: "circle", tam: I(0), relleno, borde: "#000000", fondo,
      primaria: false, x: centros, y: alturas.map(y => ({ n: y, s: V.decimal(y) })) });
  }
  // bar(y), bar(x, y): las barras centradas en x, de ancho 0,8 veces la menor distancia entre centros
  function anadeBarras(p, args, kw) {
    const at = atributos(kw);
    aplicaGrafico(p.sp, at);
    if ("bins" in at) throw new NoSoportado("bins en bar");
    if (!args.length) return;
    if (args.length > 2) throw new NoSoportado("bar con más de dos datos");
    if (args.some(a => MX.esMatriz(a))) throw new NoSoportado("bar con una matriz (barras agrupadas)");
    const ys = datos(args[args.length - 1]).map(v => v.n);
    const xs = args.length === 2 ? datos(args[0]) : ys.map((_, i) => ({ n: i + 1, s: String(i + 1) }));
    if (xs.length !== ys.length) throw new NoSoportado("bar con x e y de distinta longitud (" + xs.length + " y " + ys.length + ")");
    let m = 1;
    if (xs.length > 1) {
      const o = xs.map(v => v.n).sort((a, b) => a - b), d = [];
      for (let i = 1; i < o.length; i++) { const t = o[i] - o[i - 1]; if (t > 0) d.push(t); }
      if (!d.length) throw new NoSoportado("barras todas en el mismo x");
      m = Math.min(...d);
    }
    const h = 0.5 * 0.8 * m;
    barras(p, xs, ys, xs.map(() => h), at);
  }
  // histogram(v): cuenta los valores de cada intervalo [a, b) y dibuja una barra por intervalo
  function anadeHistograma(p, args, kw) {
    const at = atributos(kw);
    aplicaGrafico(p.sp, at);
    if (!args.length) return;
    if (args.length > 1) throw new NoSoportado("histogram con más de un dato");
    const x = args[0];
    if (!V.esVector(x)) throw new NoSoportado("histogram de un " + V.tipo(x));
    const enteros = V.esRango(x) && x.T !== "FloatRange";
    const v = datos(x).map(e => e.n).filter(Number.isFinite);
    if (!v.length) throw new NoSoportado("un histograma sin datos");
    let bordes;
    const bins = "bins" in at ? at.bins : { T: "Symbol", v: "auto" };
    if (bins.T === "Symbol" || bins.T === "Int64") {
      const n = bins.T === "Int64" ? Number(bins.v) : numeroDeBarras(v, bins.v, enteros);
      if (n < 1) throw new ErrorJulia("ArgumentError: number of bins must be ≥ 1 for a non-empty array, got " + n);
      let lo = Infinity, hi = -Infinity; for (const t of v) { lo = Math.min(lo, t); hi = Math.max(hi, t); }
      bordes = histrange(lo, hi, n);
    } else if (V.esVector(bins)) {
      bordes = datos(bins).map(e => e.n);
      for (let i = 1; i < bordes.length; i++) if (!(bordes[i] > bordes[i - 1])) throw new NoSoportado("unos bordes que no van de menor a mayor");
      if (bordes.length < 2) throw new NoSoportado("bins con menos de dos bordes");
    } else throw new NoSoportado("bins = " + V.repr(bins));
    const nb = bordes.length - 1, cuenta = new Array(nb).fill(0);
    for (const t of v) {                       // searchsortedlast: el último borde ≤ t
      let a = 0, b = bordes.length;             // bordes[a] ≤ t < bordes[b]
      if (t < bordes[0]) continue;
      while (b - a > 1) { const m = (a + b) >> 1; if (bordes[m] <= t) a = m; else b = m; }
      if (a < nb) cuenta[a]++;
    }
    const centros = [], hw = [];
    for (let i = 0; i < nb; i++) { const c = (bordes[i] + bordes[i + 1]) / 2; centros.push({ n: c, s: V.decimal(c) }); hw.push(0.5 * (bordes[i + 1] - bordes[i])); }
    if (nb * 6 > 5000) throw new NoSoportado("un histograma de más de 800 barras");
    barras(p, centros, cuenta, hw, at);
  }
  const creaCon = f => (args, kw) => { const p = nuevo(); f(p, args, kw); actual = p; return p; };
  const sobreCon = f => (args, kw) => {
    let p;
    if (args.length && esPlot(args[0])) { p = args[0]; args = args.slice(1); }
    else p = actual || nuevo();
    f(p, args, kw); actual = p; return p;
  };
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
    bar: creaCon(anadeBarras), "bar!": sobreCon(anadeBarras), histogram: creaCon(anadeHistograma), "histogram!": sobreCon(anadeHistograma),
    current: () => { if (!actual) throw new NoSoportado("current() sin un gráfico"); return actual; },
    savefig: () => { throw new NoSoportado("savefig: el laboratorio no guarda archivos"); },
  };
  for (const n of ["heatmap", "contour", "surface", "pie", "boxplot", "layout", "@layout", "gui", "annotate!", "hline!", "vline!", "plot3d", "scatter3d", "areaplot", "sticks", "density", "@animate", "animate", "gif"])
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
