# trazar.jl · genera las trazas de los visualizadores de un capítulo del libro de Julia
#
# Uso (desde la raíz del libro):
#   julia --project=herramientas herramientas/trazar.jl capitulos/*.md
#
# Busca cada directiva {anywidget} que carga traza-jl.mjs, toma la celda {code-cell} julia que la
# precede, ejecuta ese código paso a paso y guarda la traza en datos/trazas/<capítulo>-<n>.json. La parte
# "config" de la directiva la escribes tú y se conserva tal cual.
#
# Cómo se ejecuta paso a paso: el programa se reescribe antes de ejecutarlo. Detrás de cada línea se
# añade una llamada que fotografía las variables y la pantalla; en cada vuelta de un for se fotografía la
# cabecera, y cada condición de un if o un while se fotografía con su resultado. Las funciones del
# programa también se recorren paso a paso: cada llamada abre su marco (sus argumentos y sus variables
# locales), y al salir se anota lo que devuelve y la línea a la que vuelve el programa.
#
# El programa se ejecuta como en el REPL: las variables globales se pueden cambiar dentro de un bucle sin
# escribir `global` (la regla «soft scope» del REPL y de los cuadernos). Y, como en el REPL con las
# asignaciones terminadas en punto y coma, se escribe el valor de cada línea que no es una asignación ni
# una definición.
#
# Claves de "config": titulo, etiqueta, idea, foco, puntero, columnas, fila_en ("cada_linea" o
# "fin_iteracion") y ocultar, como en el libro de R.
using JSON, REPL
# Las tablas de datos (capítulo 10): DataFrames se carga aquí para poder describir sus tablas, pero un
# programa solo puede usarlo si escribe `using DataFrames`, como en el REPL
using DataFrames

const LIMITE = 2000

mutable struct Estado
    modulo::Module
    pasos::Vector{Any}
    filas::Vector{Any}
    orden::Vector{Symbol}
    pila::Vector{Any}
    nmarcos::Int
    vueltas::Dict{Int,Int}
    actual::Int
    locales::Dict{Symbol,Any}      # las variables locales de un bucle del programa principal
    columnas::Vector{String}
    por_linea::Bool
    ocultar::Vector{String}
    salida::String                 # el archivo donde va lo que el programa escribe
    firmas::Dict{Symbol,Vector{String}}
    ids::Dict{UInt,Int}            # un número por cada vector distinto: dos nombres con el mismo número son el mismo vector
end
const T = Ref{Estado}()

# ── Cómo se describe un valor ────────────────────────────────────────────
# El programa corre en un módulo propio, Module(:Main), y Julia escribe sus tipos como Main.Main.Alumna. En el
# REPL, un tipo definido por el usuario se escribe Alumna: se quita ese prefijo de todo lo que se escribe.
sin_main(s) = replace(s, "Main.Main." => "")
un_valor(x) = sin_main(repr(x))
nombre_tipo(x) = sin_main(string(typeof(x)))
es_escalar(x) = x isa Union{Number,AbstractString,AbstractChar,Symbol,Nothing,Missing}

un_id(x) = (ids = T[].ids; get!(ids, objectid(x), length(ids) + 1))

function firma(n::Symbol)
    fs = get(T[].firmas, n, String[])
    isempty(fs) ? string(n) : join(fs, "\n")
end

function describe(x, prof = 0)
    if x isa Function
        n = nameof(x)
        nm = length(methods(x))
        return Dict("t" => "function", "r" => firma(n), "m" => nm)
    end
    if es_escalar(x)
        return Dict("t" => nombre_tipo(x), "e" => true, "v" => [un_valor(x)])
    end
    if x isa AbstractRange && length(x) <= 30
        return Dict("t" => nombre_tipo(x), "rango" => un_valor(x), "v" => [un_valor(e) for e in x])
    end
    if x isa AbstractVector
        n = length(x)
        xs = n > 30 ? x[1:20] : x
        d = Dict{String,Any}("t" => nombre_tipo(x), "v" => [un_valor(e) for e in xs], "el" => sin_main(string(eltype(x))))
        n > 30 && (d["nv"] = n)
        x isa AbstractRange && (d["rango"] = un_valor(x))
        x isa AbstractRange || (d["id"] = un_id(x))
        return d
    end
    if x isa AbstractMatrix && length(x) <= 400
        return Dict("t" => nombre_tipo(x), "d" => collect(size(x)), "el" => sin_main(string(eltype(x))), "id" => un_id(x),
                    "v" => [un_valor(e) for e in vec(x)])
    end
    if x isa Tuple && prof < 4 && length(x) <= 30
        return Dict("t" => nombre_tipo(x), "tupla" => true, "el" => [Dict("v" => describe(e, prof + 1)) for e in x])
    end
    if x isa AbstractDict && length(x) <= 30
        return Dict("t" => nombre_tipo(x), "dict" => true, "k" => [un_valor(k) for k in keys(x)],
                    "v" => [un_valor(v) for v in values(x)], "id" => un_id(x))
    end
    if x isa NamedTuple && prof < 4 && length(x) <= 30
        return Dict("t" => nombre_tipo(x), "tupla" => true,
                    "el" => [Dict("nombre" => string(k), "v" => describe(v, prof + 1)) for (k, v) in pairs(x)])
    end
    # una tabla de datos: sus columnas, cada una con su nombre, su tipo, sus valores y su identidad
    # (una columna es un vector: clase.nota da ese mismo vector)
    if x isa DataFrames.DataFrame && DataFrames.nrow(x) <= 30 && DataFrames.ncol(x) <= 12
        return Dict{String,Any}("t" => "DataFrame", "df" => true, "id" => un_id(x), "cols" => names(x),
                                "tipos" => [sin_main(string(eltype(c))) for c in DataFrames.eachcol(x)],
                                "cid" => [un_id(c) for c in DataFrames.eachcol(x)],
                                "v" => [[un_valor(e) for e in c] for c in DataFrames.eachcol(x)])
    end
    # un tipo propio (definido en el programa): una ficha con sus campos, como una tupla con nombre;
    # si es mutable, con su identidad, para ver cuándo dos nombres son el mismo objeto
    if parentmodule(typeof(x)) === T[].modulo && isstructtype(typeof(x)) && prof < 4
        d = Dict{String,Any}("t" => nombre_tipo(x), "tupla" => true, "struct" => true,
                             "el" => [Dict("nombre" => string(f), "v" => describe(getfield(x, f), prof + 1)) for f in fieldnames(typeof(x))])
        ismutable(x) && (d["mutable"] = true; d["id"] = un_id(x))
        return d
    end
    Dict{String,Any}("t" => nombre_tipo(x), "r" => sin_main(sprint(show, MIME"text/plain"(), x; context = (:limit => true, :displaysize => (24, 80)))))
end

function corto(x)
    x isa Function && return firma(nameof(x))
    if x isa AbstractVector && !(x isa AbstractRange) && length(x) > 12
        return join(un_valor.(x[1:3]), ", ") * ", … ($(length(x)) valores)"
    end
    un_valor(x)
end

# ── Fotografiar ──────────────────────────────────────────────────────────
oculto(n::Symbol) = (s = string(n); startswith(s, "#") || startswith(s, "__") || s in T[].ocultar)

function globales()
    M = T[].modulo
    ns = [n for n in names(M; all = true) if n !== :Main && n !== :eval && n !== :include &&
          !oculto(n) && isdefined(M, n)]
    ns
end

# Cuando aparecen varias locales a la vez (for (nombre, nota) in …), Base.@locals las da en el
# orden de un diccionario. Se ordenan por su primera aparición en el programa, como se leen.
const CODIGO = Ref("")
function primera(n)
    m = findfirst(Regex("(?<![A-Za-z0-9_])\\Q" * string(n) * "\\E(?![A-Za-z0-9_!])"), CODIGO[])
    m === nothing ? typemax(Int) : first(m)
end
en_orden_de_lectura(ns) = sort!(collect(ns); by = n -> (primera(n), string(n)))

function foto()
    st = T[]
    M = st.modulo
    ns = globales()
    for n in ns
        n in st.orden || push!(st.orden, n)
    end
    append!(st.orden, en_orden_de_lectura(n for n in keys(st.locales) if !(oculto(n) || n in st.orden)))
    out = Dict{String,Any}[]
    est = Dict{String,Any}()
    orden = String[]
    for n in st.orden
        if haskey(st.locales, n) && !oculto(n)
            d = describe(st.locales[n]); d["local"] = true
            est[string(n)] = d; push!(orden, string(n))
        elseif n in ns
            est[string(n)] = describe(getfield(M, n)); push!(orden, string(n))
        end
    end
    est, orden
end

function foto_marcos()
    [Dict("id" => m[:id], "nombre" => string(m[:nombre]), "llamada" => m[:llamada], "desde" => m[:desde],
          "vars" => Dict(string(k) => describe(v) for (k, v) in m[:vars] if !oculto(k)),
          "orden" => [string(k) for k in m[:orden] if haskey(m[:vars], k) && !oculto(k)])
     for m in T[].pila]
end

function lee_pantalla()
    flush(stdout)
    sin_main(read(T[].salida, String))
end

function anota(paso::Dict)
    st = T[]
    length(st.pasos) >= LIMITE && error("el programa da demasiados pasos (más de $LIMITE)")
    est, orden = foto()
    paso["estado"] = est
    paso["orden"] = orden
    isempty(st.pila) || (paso["marcos"] = foto_marcos())
    paso["salida"] = lee_pantalla()
    paso["nfilas"] = length(st.filas)
    push!(st.pasos, paso)
    nothing
end

# El valor de una expresión de la tabla, con las variables locales a mano
function evalua(texto, locs)
    st = T[]
    ex = Meta.parse(texto)
    asig = [Expr(:(=), k, v) for (k, v) in locs if !oculto(k)]
    Core.eval(st.modulo, Expr(:let, Expr(:block, asig...), ex))
end

function fila(locs)
    st = T[]
    isempty(st.columnas) && return
    push!(st.filas, Dict(c => (try corto(evalua(c, locs)) catch; "" end) for c in st.columnas))
end

# Actualiza las variables locales: las del marco abierto o las del bucle del programa principal
function pon_locales(locs)
    st = T[]
    if isempty(st.pila)
        st.locales = locs
    else
        m = st.pila[end]
        m[:vars] = locs
        append!(m[:orden], en_orden_de_lectura(k for k in keys(locs) if !(k in m[:orden])))
    end
end

# ── Las ayudas que el programa reescrito llama ───────────────────────────
va(l) = (T[].actual = l; nothing)
function paso(l, locs)
    pon_locales(locs)
    T[].por_linea && fila(locs)
    anota(Dict{String,Any}("linea" => l, "tipo" => "linea"))
end
# El REPL escribe los diccionarios con :limit (alinea las flechas => y corta a 20 filas en una pantalla de 24 × 80)
const REPL_LIMITE = Union{AbstractDict, Base.KeySet, Base.ValueIterator}
function muestra(v)
    if v isa REPL_LIMITE
        show(IOContext(stdout, :limit => true, :displaysize => (24, 80)), MIME"text/plain"(), v)
        println(stdout)
    elseif v !== nothing
        show(stdout, MIME"text/plain"(), v)
        println(stdout)
    end
    nothing
end
function cabecera(l, locs)
    st = T[]
    st.vueltas[l] = get(st.vueltas, l, 0) + 1
    pon_locales(locs)
    anota(Dict{String,Any}("linea" => l, "tipo" => "vuelta", "vuelta" => st.vueltas[l]))
end
fin_vuelta(l, locs) = (pon_locales(locs); T[].por_linea || fila(locs); nothing)
function fin_bucle(l, locs)
    st = T[]
    pon_locales(locs)
    anota(Dict{String,Any}("linea" => l, "tipo" => "fin", "vuelta" => get(st.vueltas, l, 0)))
    delete!(st.vueltas, l)
    nothing
end

# La condición con sus valores: x[i] > 3  →  7 > 3
function sustituye(ex, locs)
    M = T[].modulo
    valor(s) = haskey(locs, s) ? (true, locs[s]) : (isdefined(M, s) ? (true, getfield(M, s)) : (false, nothing))
    simple(v) = v isa Union{Number,AbstractString,AbstractChar,Bool}
    rec(e) = begin
        if e isa Symbol
            ok, v = valor(e)
            return ok && simple(v) ? v : e
        elseif e isa Expr
            if e.head == :ref || (e.head == :call && e.args[1] in (:length, :sum, :maximum, :minimum, :abs))
                v = try evalua(string(e), locs) catch; nothing end
                simple(v) && return v
            end
            if e.head == :call
                return Expr(:call, e.args[1], map(rec, e.args[2:end])...)
            end
            return Expr(e.head, map(rec, e.args)...)
        end
        e
    end
    string(rec(ex))
end
como_si(v) = v isa Bool ? string(v) : un_valor(v)
# string(:(v[end])) escribe v[var"end"]: en el libro se escribe como en el código
limpia(t) = replace(t, "var\"end\"" => "end")
function cond(l, v, texto, locs)
    pon_locales(locs)
    anota(Dict{String,Any}("linea" => l, "tipo" => "condicion",
        "cond" => Dict("texto" => limpia(texto), "valores" => limpia(sustituye(Meta.parse(texto), locs)), "valor" => como_si(v))))
    v
end
function entra(nombre, l, locs, args)
    st = T[]
    st.nmarcos += 1
    llamada = string(nombre, "(", join(["$a = $(corto(locs[a]))" for a in args if haskey(locs, a)], ", "), ")")
    push!(st.pila, Dict{Symbol,Any}(:id => st.nmarcos, :nombre => nombre, :vars => locs, :orden => collect(args),
                                    :desde => st.actual, :llamada => llamada))
    anota(Dict{String,Any}("linea" => l, "tipo" => "llamada", "funcion" => string(nombre)))
end
function sale(v)
    st = T[]
    m = st.pila[end]
    anota(Dict{String,Any}("linea" => st.actual, "tipo" => "devuelve", "funcion" => string(m[:nombre]),
                           "desde" => m[:desde], "valor" => corto(v)))
    pop!(st.pila)
    st.actual = m[:desde]
    v
end

# ── Reescribir el programa ───────────────────────────────────────────────
const LOCALS = Expr(:macrocall, Expr(:., :Base, QuoteNode(Symbol("@locals"))), LineNumberNode(0, :none))
llama(f, args...) = Expr(:call, f, args...)

es_asignacion(e) = e isa Expr && (e.head in (:(=), :+=, :-=, :*=, :/=, :^=, :.=, :local, :global, :const) )
es_def_funcion(e) = e isa Expr && (e.head == :function ||
    (e.head == :(=) && e.args[1] isa Expr && e.args[1].head in (:call, :where)))

nombre_firma(sig) = begin
    s = sig
    while s isa Expr && s.head in (:where, :(::)) && !(s.head == :(::) && length(s.args) == 1)
        s = s.args[1]
    end
    s
end
function args_de(call)
    out = Symbol[]
    for a in call.args[2:end]
        if a isa Symbol; push!(out, a)
        elseif a isa Expr && a.head == :(::) && a.args[1] isa Symbol; push!(out, a.args[1])
        elseif a isa Expr && a.head == :kw; b = a.args[1]; push!(out, b isa Expr ? b.args[1] : b)
        elseif a isa Expr && a.head == :parameters
            for p in a.args
                q = p isa Expr && p.head == :kw ? p.args[1] : p
                q isa Expr && q.head == :(::) && (q = q.args[1])
                q isa Symbol && push!(out, q)
            end
        end
    end
    out
end

# return e → return sale(e), sin entrar en funciones anidadas
function cambia_returns(e)
    e isa Expr || return e
    e.head in (:function, :->) && return e
    es_def_funcion(e) && return e
    if e.head == :return
        v = isempty(e.args) ? nothing : e.args[1]
        return Expr(:return, llama(sale, cambia_returns(v)))
    end
    Expr(e.head, map(cambia_returns, e.args)...)
end
tiene_return_final(b) = b isa Expr && b.head == :return

function instrumenta(fex, linea)
    sig = fex.args[1]
    call = nombre_firma(sig)
    nombre = call.args[1]
    args = args_de(call)
    push!(get!(T[].firmas, nombre isa Symbol ? nombre : Symbol(string(nombre)), String[]), string(sig))
    body = fex.args[2]
    body isa Expr && body.head == :block || (body = Expr(:block, body))
    sts = Any[]; lin = linea
    for a in body.args
        if a isa LineNumberNode; lin = a.line; continue; end
        push!(sts, (a, lin))
    end
    nuevo = Any[llama(entra, QuoteNode(nombre), linea, LOCALS, args)]
    for (k, (a, l)) in enumerate(sts)
        if k == length(sts)
            if tiene_return_final(a)
                push!(nuevo, Expr(:block, llama(va, l), cambia_returns(a)))
            else
                push!(nuevo, Expr(:block, llama(va, l), llama(sale, reescribe(cambia_returns(a), l, 1; final = true))))
            end
        else
            push!(nuevo, reescribe(cambia_returns(a), l, 1))
        end
    end
    isempty(sts) && push!(nuevo, llama(sale, nothing))
    Expr(fex.head, sig, Expr(:block, nuevo...))
end

function cuerpo(b, linea, nivel)
    b isa Expr && b.head == :block || return reescribe(b, linea, nivel)
    out = Any[]; lin = linea
    for a in b.args
        if a isa LineNumberNode; lin = a.line; push!(out, a); continue; end
        push!(out, reescribe(a, lin, nivel))
    end
    Expr(:block, out...)
end

function reescribe_if(e, linea, nivel)
    c = e.args[1]; lc = linea
    if c isa Expr && c.head == :block      # elseif: (block, LineNumberNode, cond)
        for a in c.args; a isa LineNumberNode && (lc = a.line); end
        c = c.args[end]
    end
    nuevo = Any[llama(cond, lc, c, string(c), LOCALS), cuerpo(e.args[2], lc, nivel + 1)]
    if length(e.args) == 3
        o = e.args[3]
        push!(nuevo, o isa Expr && o.head == :elseif ? reescribe_if(o, lc, nivel) : cuerpo(o, lc, nivel + 1))
    end
    Expr(e.head, nuevo...)
end

# final = true: la última sentencia de una función, cuyo valor es lo que devuelve
function reescribe(e, linea, nivel; final = false)
    if es_def_funcion(e)
        f = instrumenta(e, linea)
        return nivel == 0 ? Expr(:block, llama(va, linea), f, llama(paso, linea, LOCALS), nothing) : f
    end
    if e isa Expr && e.head == :for
        e2 = Expr(:for, e.args[1], Expr(:block, llama(cabecera, linea, LOCALS), cuerpo(e.args[2], linea, nivel + 1),
                                        llama(fin_vuelta, linea, LOCALS)))
        return Expr(:block, llama(va, linea), e2, llama(fin_bucle, linea, LOCALS), nothing)
    end
    if e isa Expr && e.head == :while
        e2 = Expr(:while, llama(cond, linea, e.args[1], string(e.args[1]), LOCALS),
                  Expr(:block, cuerpo(e.args[2], linea, nivel + 1), llama(fin_vuelta, linea, LOCALS)))
        return Expr(:block, llama(va, linea), e2, llama(fin_bucle, linea, LOCALS), nothing)
    end
    if e isa Expr && e.head == :if
        return Expr(:block, llama(va, linea), reescribe_if(e, linea, nivel))
    end
    if e isa Expr && e.head in (:break, :continue)
        return Expr(:block, llama(va, linea), llama(paso, linea, LOCALS), e)
    end
    # global x / local x: la declaración va sola (no puede ser el valor de otra expresión)
    if e isa Expr && e.head in (:global, :local)
        final && return Expr(:block, llama(va, linea), e, nothing)
        return Expr(:block, llama(va, linea), e, llama(paso, linea, LOCALS), nothing)
    end
    if nivel == 0 && e isa Expr && e.head in (:const, :using, :import, :struct, :macro, :module, :abstract, :primitive)
        return Expr(:block, llama(va, linea), e, llama(paso, linea, LOCALS), nothing)
    end
    if nivel == 0 && !final
        mostrar = !(es_asignacion(e) || (e isa Expr && e.head in (:using, :import, :struct, :macro, :module)))
        v = gensym("__v")
        return Expr(:block, llama(va, linea), Expr(:(=), v, e), mostrar ? llama(muestra, v) : nothing,
                    llama(paso, linea, LOCALS), nothing)
    end
    # la última línea de una función no lleva paso propio: su valor es lo que devuelve, y eso lo cuenta
    # el paso de salida
    final && return e
    # dentro de un bloque, la sentencia conserva su valor (lo necesita la última línea de una función)
    v = Symbol("__valor")
    Expr(:block, llama(va, linea), Expr(:local, Expr(:(=), v, e)), llama(paso, linea, LOCALS), v)
end

# ── Ejecutar y fotografiar ───────────────────────────────────────────────
function traza(codigo::AbstractString, config::AbstractDict)
    salida = tempname()
    touch(salida)
    st = Estado(Module(:Main), Any[], Any[], Symbol[], Any[], 0, Dict{Int,Int}(), 0, Dict{Symbol,Any}(),
                String.(get(config, "columnas", String[])), get(config, "fila_en", "") == "cada_linea",
                String.(get(config, "ocultar", String[])), salida, Dict{Symbol,Vector{String}}(), Dict{UInt,Int}())
    T[] = st
    CODIGO[] = codigo
    Core.eval(st.modulo, :(using Random; Random.seed!(1)))
    push!(st.pasos, Dict("linea" => nothing, "tipo" => "inicio", "estado" => Dict(), "orden" => String[],
                         "salida" => "", "nfilas" => 0))
    ex = Meta.parseall(codigo; filename = "programa.jl")
    error_txt = nothing
    momento = nothing
    open(salida, "w") do f
        redirect_stdout(f) do
            linea = 1
            try
                for a in ex.args
                    if a isa LineNumberNode; linea = a.line; continue; end
                    if a isa Expr && a.head == :error
                        error("error de sintaxis en la línea $linea: " * string(a.args[1]))
                    end
                    Core.eval(st.modulo, REPL.softscope(reescribe(a, linea, 0)))
                end
            catch err
                error_txt = sin_main(replace(Base.invokelatest(sprint, showerror, err isa LoadError ? err.error : err), "`Main.Main`" => "`Main`"))
                # la lista de «Closest candidates» de un MethodError no cabe en el visualizador
                error_txt = strip(first(split(error_txt, "\n\nClosest candidates")))
                # desde aquí, como en el REPL, hay que mirar la «edad del mundo» más reciente: las variables que
                # el programa ha creado no existen para el código compilado antes de crearlas (Julia 1.12+)
                est, orden = Base.invokelatest(foto)
                momento = (est, orden, isempty(st.pila) ? nothing : Base.invokelatest(foto_marcos))
            end
        end
    end
    if error_txt !== nothing
        p = Dict{String,Any}("linea" => st.actual, "tipo" => "error", "error" => error_txt,
                             "estado" => momento[1], "orden" => momento[2],
                             "salida" => sin_main(read(salida, String)), "nfilas" => length(st.filas))
        momento[3] === nothing || (p["marcos"] = momento[3])
        push!(st.pasos, p)
    end
    rm(salida; force = true)
    Dict("codigo" => codigo, "pasos" => st.pasos, "filas" => st.filas)
end

# ── Leer y escribir los capítulos ────────────────────────────────────────
const CARPETA_TRAZAS = "datos/trazas"
function procesa(fichero)
    lineas = readlines(fichero)
    base = replace(basename(fichero), r"\.md$" => "")
    mkpath(CARPETA_TRAZAS)
    for f in readdir(CARPETA_TRAZAS; join = true)
        startswith(basename(f), base * "-") && endswith(f, ".json") && rm(f)
    end
    n = 0
    for i in eachindex(lineas)
        occursin(r"^```\{anywidget\} .*traza-jl\.mjs", lineas[i]) || continue
        datos = JSON.parse(lineas[i+1]; dicttype = Dict{String,Any})
        cfg = datos["config"]
        get(cfg, "tipo", "") == "laboratorio" && continue
        fins = [j for j in 1:i-1 if lineas[j] == "```"]
        isempty(fins) && (@warn "$fichero: un visualizador sin celda de código delante"; continue)
        fin = maximum(fins)
        ini = maximum([j for j in 1:fin-1 if startswith(lineas[j], "```{code-cell} julia")])
        codigo = join(lineas[ini+1:fin-1], "\n")
        n += 1
        archivo = joinpath(CARPETA_TRAZAS, "$base-$n.json")
        write(archivo, JSON.json(traza(codigo, cfg)))
        lineas[i+1] = JSON.json(Dict("config" => cfg, "archivo" => archivo))
    end
    write(fichero, join(lineas, "\n") * "\n")
    println(stderr, "$fichero: $n trazas")
end

if abspath(PROGRAM_FILE) == @__FILE__
    for f in ARGS
        procesa(f)
    end
end
