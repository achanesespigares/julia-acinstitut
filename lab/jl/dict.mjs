// dict.mjs · Los Dict de Julia, con su mismo orden
//
// Un Dict de Julia es una tabla hash de direccionamiento abierto: cada clave va a la casilla
// hash(clave) & (tamaño - 1) + 1, o a la siguiente libre. Al recorrerlo, Julia va casilla a casilla,
// así que el orden depende del hash de cada clave y del tamaño de la tabla, no del orden en que
// se metieron. Para que el laboratorio enseñe el mismo orden que Julia, aquí se copian su hash
// (base/hashing.jl, base/char.jl, base/tuple.jl de Julia 1.13) y su tabla (base/dict.jl).

const M64 = (1n << 64n) - 1n;
const u64 = x => x & M64;
const HASH_SEED = 0xbdd89aa982704029n;
const SECRET = [0x2d358dccaa6c78a5n, 0x8bb84b93962eacc9n, 0x4b33a62ed433d4a3n, 0xaaaaaaaaaaaaaaaan];
const TUPLA_SEED = 0x77cfa1eef01bca90n;

const mulParts = (a, b) => { const p = a * b; return [(p >> 64n) & M64, p & M64]; };
const hashMix = (a, b) => { const [hi, lo] = mulParts(a, b); return hi ^ lo; };
function finalizer(x) {
  x ^= x >> 32n;
  x = u64(x * 0x63652a4cd374b267n);
  x ^= x >> 33n;
  return x;
}
const hashUInt64 = (x, h) => finalizer(u64(3n * h - x));

// rapidhash de los bytes UTF-8 de un texto (hash_bytes con puntero, en base/hashing.jl)
export function hashBytes(bytes, seed) {
  const n = bytes.length, buflen = BigInt(n);
  const b8 = i => BigInt(bytes[i - 1]);                     // índices desde 1, como load_le de Julia
  const l64 = i => { let r = 0n; for (let k = 7; k >= 0; k--) r = (r << 8n) | BigInt(bytes[i - 1 + k]); return r; };
  const l32 = i => { let r = 0n; for (let k = 3; k >= 0; k--) r = (r << 8n) | BigInt(bytes[i - 1 + k]); return r; };
  seed = seed ^ hashMix(seed ^ SECRET[2], SECRET[1]);
  let a = 0n, b = 0n, i = buflen;
  if (buflen <= 16n) {
    if (buflen >= 4n) {
      seed ^= buflen;
      if (buflen >= 8n) { a = l64(1); b = l64(n - 7); }
      else { a = l32(1); b = l32(n - 3); }
    } else if (buflen > 0n) {
      a = u64((b8(1) << 45n) | b8(n));
      b = b8(Math.floor(n / 2) + 1);
    }
  } else {
    let pos = 1;
    if (i > 48n) {
      let see1 = seed, see2 = seed;
      while (i > 48n) {
        seed = hashMix(l64(pos) ^ SECRET[0], l64(pos + 8) ^ seed);
        see1 = hashMix(l64(pos + 16) ^ SECRET[1], l64(pos + 24) ^ see1);
        see2 = hashMix(l64(pos + 32) ^ SECRET[2], l64(pos + 40) ^ see2);
        pos += 48; i -= 48n;
      }
      seed ^= see1; seed ^= see2;
    }
    if (i > 16n) {
      seed = hashMix(l64(pos) ^ SECRET[2], l64(pos + 8) ^ seed);
      if (i > 32n) seed = hashMix(l64(pos + 16) ^ SECRET[2], l64(pos + 24) ^ seed);
    }
    a = l64(n - 15) ^ i;
    b = l64(n - 7);
  }
  a ^= SECRET[1];
  b ^= seed;
  const [hi, lo] = mulParts(a, b);
  b = hi; a = lo;
  return hashMix(a ^ SECRET[3], b ^ SECRET[1] ^ i);
}

const utf8 = s => [...new TextEncoder().encode(s)];
const letraUInt32 = c => { const bs = utf8(c); let r = 0n; for (let k = 0; k < 4; k++) r = (r << 8n) | BigInt(bs[k] || 0); return r; };
const f64bits = x => { const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x); return dv.getBigUint64(0); };

export class SinHash extends Error {}

// hash(x, h) para los valores que pueden ser claves en el laboratorio
export function hash(x, h = HASH_SEED) {
  switch (x.T) {
    case "Int64": return hashUInt64(u64(x.v), h);
    case "Bool": return hashUInt64(x.v ? 1n : 0n, h);
    case "Float64": {
      const v = x.v;
      if (Number.isNaN(v)) throw new SinHash("NaN");
      if (Object.is(v, -0)) return hashUInt64(f64bits(v), h);   // isequal(-0.0, 0) es false: se usan sus bits
      if (Number.isInteger(v) && v >= -(2 ** 63) && v < 2 ** 63) return hashUInt64(u64(BigInt(v)), h);
      if (Number.isInteger(v) && v >= 0 && v < 2 ** 64) return hashUInt64(BigInt(v), h);
      return hashUInt64(f64bits(v), h);
    }
    case "Char": return finalizer(u64(((letraUInt32(x.v) + 0xd4d64234n) << 32n) ^ h));
    case "String": return hashBytes(utf8(x.v), h);
    case "Tuple": { let r = h ^ TUPLA_SEED; for (let k = x.a.length - 1; k >= 0; k--) r = hash(x.a[k], r); return r; }
    default: throw new SinHash(x.T);
  }
}

// ── La tabla, como la de base/dict.jl ─────────────────────────────────────
const tablesz = x => x < 16 ? 16 : 2 ** Math.ceil(Math.log2(x));   // _tablesz: la potencia de 2 que llega a x
const shorthash7 = hsh => Number(hsh >> 57n) | 0x80;
const MAXPROBE_PERMITIDO = 16, MAXPROBE_SHIFT = 6;

// iguales(a, b) es isequal de Julia (lo pasa quien crea la tabla)
export class TablaHash {
  constructor(iguales) { this.iguales = iguales; this.slots = []; this.keys = []; this.vals = []; this.ndel = 0; this.count = 0; this.idxfloor = 1; this.maxprobe = 0; }
  get sz() { return this.slots.length; }
  hashindex(k, sz) { const h = hash(k); return [Number(h & BigInt(sz - 1)) + 1, shorthash7(h)]; }
  rehash(newsz) {
    const olds = this.slots, oldk = this.keys, oldv = this.vals, sz = olds.length;
    newsz = tablesz(newsz);
    this.idxfloor = 1;
    if (this.count === 0) { this.slots = new Array(newsz).fill(0); this.keys = new Array(newsz); this.vals = new Array(newsz); this.ndel = 0; this.maxprobe = 0; return; }
    const slots = new Array(newsz).fill(0), keys = new Array(newsz), vals = new Array(newsz);
    let count = 0, maxprobe = 0;
    for (let i = 1; i <= sz; i++) {
      if (olds[i - 1] & 0x80) {
        const k = oldk[i - 1], v = oldv[i - 1];
        let [index] = this.hashindex(k, newsz); const index0 = index;
        while (slots[index - 1] !== 0) index = (index & (newsz - 1)) + 1;
        const probe = (index - index0) & (newsz - 1);
        if (probe > maxprobe) maxprobe = probe;
        slots[index - 1] = olds[i - 1]; keys[index - 1] = k; vals[index - 1] = v; count++;
      }
    }
    this.slots = slots; this.keys = keys; this.vals = vals; this.count = count; this.ndel = 0; this.maxprobe = maxprobe;
  }
  sizehint(n) {
    n = Math.max(n, this.count);
    const newsz = tablesz(Math.ceil(3 * n / 2));
    if (newsz !== this.sz) this.rehash(newsz);
  }
  indice(k) {                         // ht_keyindex: dónde está la clave, o -1
    if (this.count === 0) return -1;
    const sz = this.sz; let iter = 0;
    let [index, sh] = this.hashindex(k, sz);
    while (true) {
      if (this.slots[index - 1] === 0) return -1;
      if (this.slots[index - 1] === sh && this.iguales(k, this.keys[index - 1])) return index;
      index = (index & (sz - 1)) + 1;
      if (++iter > this.maxprobe) return -1;
    }
  }
  indice2(k) {                        // ht_keyindex2_shorthash!: [índice, sh], negativo si hay que insertar
    let sz = this.sz;
    if (sz === 0) { this.rehash(4); const [index, sh] = this.hashindex(k, this.sz); return [-index, sh]; }
    let iter = 0, avail = 0;
    let [index, sh] = this.hashindex(k, sz);
    while (true) {
      const s = this.slots[index - 1];
      if (s === 0) return [avail < 0 ? avail : -index, sh];
      if (s === 0x7f) { if (avail === 0) avail = -index; }
      else if (s === sh && this.iguales(k, this.keys[index - 1])) return [index, sh];
      index = (index & (sz - 1)) + 1;
      if (++iter > this.maxprobe) break;
    }
    if (avail < 0) return [avail, sh];
    const maxallowed = Math.max(MAXPROBE_PERMITIDO, sz >> MAXPROBE_SHIFT);
    while (iter < maxallowed) {
      if (!(this.slots[index - 1] & 0x80)) { this.maxprobe = iter; return [-index, sh]; }
      index = (index & (sz - 1)) + 1; iter++;
    }
    this.rehash(this.count > 64000 ? sz * 2 : sz * 4);
    return this.indice2(k);
  }
  pon(k, v) {
    const [index, sh] = this.indice2(k);
    if (index > 0) { this.keys[index - 1] = k; this.vals[index - 1] = v; return; }
    const i = -index;
    if (this.slots[i - 1] === 0x7f) this.ndel--;
    this.slots[i - 1] = sh; this.keys[i - 1] = k; this.vals[i - 1] = v; this.count++;
    if (i < this.idxfloor) this.idxfloor = i;
    if ((this.count + this.ndel) * 3 > this.sz * 2) this.rehash(this.count > 64000 ? this.count * 2 : Math.max(this.count * 4, 4));
  }
  quita(k) {
    let index = this.indice(k);
    if (index <= 0) return false;
    const sz = this.sz;
    this.keys[index - 1] = undefined; this.vals[index - 1] = undefined;
    let ndel = 1;
    const sig = (index & (sz - 1)) + 1;
    if (this.slots[sig - 1] === 0) {
      while (true) {
        ndel--;
        this.slots[index - 1] = 0;
        index = ((index - 2) & (sz - 1)) + 1;
        if (this.slots[index - 1] !== 0x7f) break;
      }
    } else this.slots[index - 1] = 0x7f;
    this.ndel += ndel; this.count--;
    return true;
  }
  // las parejas en el orden en que las recorre Julia
  entradas() { const r = []; for (let i = Math.max(1, this.idxfloor); i <= this.sz; i++) if (this.slots[i - 1] & 0x80) r.push([this.keys[i - 1], this.vals[i - 1]]); return r; }
  copia() { const t = new TablaHash(this.iguales); Object.assign(t, { slots: [...this.slots], keys: [...this.keys], vals: [...this.vals], ndel: this.ndel, count: this.count, idxfloor: this.idxfloor, maxprobe: this.maxprobe }); return t; }
}

// ── Los Dict en el laboratorio ───────────────────────────────────────────
import { ErrorJulia, NoSoportado, I, B, NADA, tipo, repr, errorMetodo } from "./valores.mjs";
import * as V from "./valores.mjs";

// typejoin de los tipos de las claves (o de los valores) de un Dict(...)
const NUMERICOS = ["Int64", "Float64", "Bool", "Rational{Int64}"];
export function une(tipos) {
  const u = [...new Set(tipos)];
  if (u.length === 1) return u[0];
  if (u.every(t => t === "String" || t === "SubString{String}")) return "AbstractString";
  if (u.every(t => t === "Int64" || t === "Bool")) return "Integer";
  if (u.every(t => NUMERICOS.includes(t))) return "Real";
  return "Any";
}
const ABSTRACTOS = ["Any", "Real", "Integer", "AbstractString"];
const tipoDe = x => tipo(x);

export function funcionesDeDict(fn, P, prog) {
  const isequal = (a, b) => {
    if (a.T === "Float64" && b.T === "Float64") return Object.is(a.v, b.v) || (Number.isNaN(a.v) && Number.isNaN(b.v));
    if ((a.T === "Float64" && Object.is(a.v, -0)) || (b.T === "Float64" && Object.is(b.v, -0))) return false;
    return P.iguales(a, b);
  };
  P.isequal = isequal;
  const nuevo = (K, Vt) => ({ T: "Dict", K, V: Vt, t: new TablaHash(isequal) });
  const encaja = (x, t) => ABSTRACTOS.includes(t) ? (t === "Any" || (t === "Real" && NUMERICOS.includes(x.T === "Rational" ? "Rational{Int64}" : x.T)) || (t === "Integer" && (x.T === "Int64" || x.T === "Bool")) || (t === "AbstractString" && x.T === "String")) : tipo(x) === t;
  const aTipo = (x, t) => { if (encaja(x, t)) return x; return V.convierte(x, t); };
  const conHash = (k, f) => { try { return f(); } catch (e) { if (e instanceof SinHash) throw new NoSoportado("un Dict con claves de tipo " + tipo(k)); throw e; } };
  const pon = (d, k, v) => { const kk = aTipo(k, d.K); conHash(kk, () => d.t.pon(kk, aTipo(v, d.V))); };
  const esDict = x => x.T === "Dict";
  const pide = (nombre, args) => { if (!esDict(args[0])) throw errorMetodo(nombre, args); return args[0]; };
  P.esDict = esDict;
  P.ponDict = pon;
  P.indexaDict = (d, k) => {
    const i = conHash(k, () => d.t.indice(k));
    if (i < 0) throw new ErrorJulia("KeyError: key " + repr(k) + " not found");
    return d.t.vals[i - 1];
  };
  // Dict(pares...), Dict(zip(…)), Dict(vector de parejas) y Dict{K, V}(…)
  const parejas = args => {
    if (args.length === 1 && args[0].T !== "Pair") {
      const xs = P.itera(args[0]);
      return xs.map(x => { if (x.T === "Pair") return [x.a, x.b]; if (x.T === "Tuple" && x.a.length === 2) return x.a; throw new NoSoportado("Dict con estos elementos"); });
    }
    if (!args.every(a => a.T === "Pair")) throw new NoSoportado("Dict con argumentos que no son parejas k => v");
    return args.map(a => [a.a, a.b]);
  };
  P.creaDict = (args, K, Vt) => {
    const ps = parejas(args);
    if (!K) { if (!ps.length) { K = "Any"; Vt = "Any"; } else { K = une(ps.map(p => tipoDe(p[0]))); Vt = une(ps.map(p => tipoDe(p[1]))); } }
    const d = nuevo(K, Vt);
    if (ps.length > 1 || (args.length === 1 && args[0].T !== "Pair")) d.t.sizehint(ps.length);
    for (const [k, v] of ps) pon(d, k, v);
    return d;
  };
  fn.Dict = (args, kw) => { if (kw && kw.size) throw new NoSoportado("Dict con argumentos con nombre"); return P.creaDict(args); };
  fn.haskey = args => { const d = pide("haskey", args); return B(conHash(args[1], () => d.t.indice(args[1])) > 0); };
  fn.get = args => {
    const d = args[0];
    if (!esDict(d)) throw new NoSoportado("get fuera de un Dict");
    const i = conHash(args[1], () => d.t.indice(args[1]));
    return i > 0 ? d.t.vals[i - 1] : args[2];
  };
  fn["get!"] = args => {
    const d = pide("get!", args), [, k, def] = args;
    const i = conHash(k, () => d.t.indice(k));
    if (i > 0) return d.t.vals[i - 1];
    pon(d, k, def);
    return aTipo(def, d.V);
  };
  fn["delete!"] = args => { const d = pide("delete!", args); conHash(args[1], () => d.t.quita(args[1])); return d; };
  const popVector = fn["pop!"];
  fn["pop!"] = args => {
    if (!esDict(args[0])) return popVector(args);
    const d = args[0], k = args[1];
    if (k === undefined) throw new NoSoportado("pop! de un Dict sin clave");
    const i = conHash(k, () => d.t.indice(k));
    if (i < 0) { if (args.length > 2) return args[2]; throw new ErrorJulia("KeyError: key " + repr(k) + " not found"); }
    const v = d.t.vals[i - 1];
    d.t.quita(k);
    return v;
  };
  fn.keys = args => { const d = pide("keys", args); return { T: "Claves", que: "keys", d }; };
  fn.values = args => { const d = pide("values", args); return { T: "Claves", que: "values", d }; };
  fn.pairs = args => pide("pairs", args);
  fn.merge = args => {
    if (!args.every(esDict)) throw new NoSoportado("merge de algo que no es un Dict");
    const K = une(args.map(d => d.K)), Vt = une(args.map(d => d.V));
    const r = nuevo(K, Vt);
    if (K === args[0].K && Vt === args[0].V) r.t = args[0].t.copia();
    else { r.t.sizehint(args[0].t.count); for (const [k, v] of args[0].t.entradas()) pon(r, k, v); }
    for (const d of args.slice(1)) for (const [k, v] of d.t.entradas()) pon(r, k, v);
    return r;
  };
  fn["empty!"] = args => { const d = pide("empty!", args); const sz = d.t.sz; d.t.slots = new Array(sz).fill(0); d.t.keys = new Array(sz); d.t.vals = new Array(sz); d.t.ndel = 0; d.t.count = 0; d.t.maxprobe = 0; d.t.idxfloor = Math.max(1, sz); return d; };
}
