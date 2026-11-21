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
# Los gráficos (capítulo 12): Plots, con GR y sin ventana. Se carga la primera vez que un programa escribe
# `using Plots`, y no antes: Plots carga otros paquetes (SparseArrays, StatsBase) que cambian algunos mensajes
# de error de Julia, y un programa que no usa Plots debe dar los mensajes de un REPL recién abierto. Por eso
# conformidad.jl deja para el final los programas que usan Plots.
ENV["GKSwstype"] = "100"
const PLOTS = Ref{Any}(nothing)
function carga_plots()
    PLOTS[] === nothing || return
    Core.eval(Main, :(using Plots))
    PLOTS[] = Base.invokelatest(getfield, Main, :Plots)
    Core.eval(Main, :(Base.display(p::Plots.Plot) = registra(p)))
end
es_plot(x) = PLOTS[] !== nothing && Base.invokelatest(isa, x, PLOTS[].Plot)

const LIMITE = 2000

mutable struct Estado
    modulo::Module
    pasos::Vector{Any}
    filas::Vector{Any}
    orden::Vector{Symbol}
    pila::Vector{Any}
    nmarcos::Int
    vueltas::Dict{Tuple{Int,Int},Int}  # (marco, línea): cada llamada cuenta las vueltas de sus bucles (una función recursiva tiene varias a la vez)
    actual::Int
    locales::Dict{Symbol,Any}      # las variables locales de un bucle del programa principal
    columnas::Vector{String}
    por_linea::Bool
    ocultar::Vector{String}
    salida::String                 # el archivo donde va lo que el programa escribe
    firmas::Dict{Symbol,Vector{String}}
    ids::IdDict{Any,Int}           # un número por cada vector distinto: dos nombres con el mismo número son el mismo vector
                                   # (con el objeto como clave, y no su objectid: así no se libera, y su dirección no la reutiliza otro)
    grafico::Any                   # el gráfico que el programa acaba de mostrar (va en el paso siguiente)
    svg::Union{Nothing,String}     # en el libro, dónde se guarda como SVG cada gráfico que se muestra
    nsvg::Int
    svgfile::Union{Nothing,String}
    pendientes::Vector{Int}        # las líneas donde estaba el programa al entrar en cada finally
    al_fallar::Any                 # (error, marcos) cuando un error salió de una función del programa
end
const T = Ref{Estado}()

# ── Cómo se describe un valor ────────────────────────────────────────────
# El programa corre en un módulo propio, Module(:Main), y Julia escribe sus tipos como Main.Main.Alumna. En el
# REPL, un tipo definido por el usuario se escribe Alumna: se quita ese prefijo de todo lo que se escribe.
sin_main(s) = replace(s, "Main.Main." => "")
# Julia escribe un tipo sin el nombre de su módulo si el programa lo ve: con `using LinearAlgebra`, I es un
# UniformScaling{Bool}; sin él, un LinearAlgebra.UniformScaling{Bool}. El contexto :module hace que se escriba
# como lo vería el programa, que corre en su propio módulo (capítulo 11)
contexto(io) = IOContext(io, :module => T[].modulo)
de_modulo(f, x) = sprint(f, x; context = :module => T[].modulo)
un_valor(x) = sin_main(de_modulo(show, x))
nombre_tipo(x) = sin_main(de_modulo(show, typeof(x)))
es_escalar(x) = x isa Union{Number,AbstractString,AbstractChar,Symbol,Nothing,Missing}

un_id(x) = (ids = T[].ids; get!(ids, x, length(ids) + 1))

function firma(n::Symbol)
    fs = get(T[].firmas, n, String[])
    isempty(fs) ? string(n) : join(fs, "\n")
end
# Una función de un módulo del programa (capítulo 23) se guarda con el nombre del módulo delante, Notas.media:
# dos módulos pueden tener una función con el mismo nombre
# el REPL escribe un módulo con su nombre completo, Main.Notas (con el contexto :module, Julia lo acortaría)
nombre_modulo(m) = m === T[].modulo ? "Main" : parentmodule(m) === m ? string(nameof(m)) :
                   nombre_modulo(parentmodule(m)) * "." * string(nameof(m))
# Un módulo del programa (Main.Notas, capítulo 23) cuelga de Module(:Main), que a su vez cuelga del Main de
# verdad: Julia lo escribiría Main.Main.Notas, y sin_main lo dejaría en Notas. En el REPL es Main.Notas
function Base.show(io::IO, m::Module)
    if isassigned(T) && m !== T[].modulo && parentmodule(m) === T[].modulo
        print(io, "Main.", nameof(m))
    elseif Base.is_root_module(m)
        print(io, nameof(m))
    else
        Base.print_fullname(io, m)
    end
end
function clave_funcion(f)
    M = parentmodule(f)
    M !== T[].modulo && parentmodule(M) === T[].modulo && M !== M.Main ? Symbol(nameof(M), ".", nameof(f)) : nameof(f)
end

# ── Los gráficos (capítulo 12) ───────────────────────────────────────────
# Un gráfico se describe con lo que Plots ha calculado para dibujarlo: cada serie (su tipo, su etiqueta, sus
# colores y sus puntos) y cada eje (su título, sus límites y sus marcas con sus etiquetas). El laboratorio
# calcula lo mismo y lo dibuja; el libro enseña además el SVG que hace Plots.
color_hex(c) = (C = PLOTS[].Colors; "#" * Base.invokelatest(C.hex, Base.invokelatest(C.RGB, c)))
num(x) = un_valor(x isa Integer || x isa AbstractFloat ? x : Float64(x))
function describe_eje(sp, letra)
    ax = sp[Symbol(letra, :axis)]
    lim = Base.invokelatest(PLOTS[].axis_limits, sp, letra)
    tk = Base.invokelatest(PLOTS[].get_ticks, sp, ax)
    d = Dict{String,Any}("guia" => string(ax[:guide]), "lim" => [un_valor(Float64(lim[1])), un_valor(Float64(lim[2]))])
    if tk isa Tuple && length(tk) == 2
        d["marcas"] = [un_valor(Float64(t)) for t in tk[1]]
        d["etiquetas"] = [string(e) for e in tk[2]]
    else
        d["marcas"] = String[]; d["etiquetas"] = String[]
    end
    d
end
function describe_serie(s)
    Dict{String,Any}("tipo" => string(s[:seriestype]), "etiqueta" => string(s[:label]),
        "color" => color_hex(s[:linecolor]), "ancho" => num(s[:linewidth]), "estilo" => string(s[:linestyle]),
        "marca" => string(s[:markershape]), "tam" => num(s[:markersize]),
        "relleno" => color_hex(s[:markercolor]), "borde" => color_hex(s[:markerstrokecolor]),
        "fondo" => color_hex(s[:fillcolor]), "primaria" => s[:primary] === true,
        "x" => [un_valor(v) for v in s[:x]], "y" => [un_valor(v) for v in s[:y]])
end
describe_grafico(p) = Dict{String,Any}("sp" => [Dict{String,Any}("titulo" => string(sp[:title]),
    "leyenda" => string(sp[:legend_position]), "x" => describe_eje(sp, :x), "y" => describe_eje(sp, :y),
    "series" => [describe_serie(s) for s in sp.series_list]) for sp in p.subplots])
# Mostrar un gráfico (escribir p, o una línea que acaba en plot!(…)) no escribe nada en la consola: lo
# dibuja. El paso siguiente lleva el gráfico, y en el libro el SVG que ha hecho Plots
function registra(p)
    st = T[]
    st.grafico = describe_grafico(p)
    if st.svg !== nothing
        st.nsvg += 1
        f = st.svg * "-" * string(st.nsvg) * ".svg"
        mkpath(dirname(f))
        Base.invokelatest(PLOTS[].savefig, p, f)
        st.svgfile = f
    end
    nothing
end

# ── El código como dato (capítulo 20) ────────────────────────────────────
# Una expresión (Expr) se describe como la escribe el REPL y, además, como árbol: cada nodo con su cabeza
# (head) y sus argumentos (args); las hojas son símbolos, números, textos… El visualizador dibuja ese árbol.
# Es mutable (ex.args[1] = :* la cambia sin hacer otra): lleva identidad, como un vector.
const EXPR_NODOS = 60
function arbol_expr(x, cuenta)
    cuenta[] += 1
    cuenta[] > EXPR_NODOS && return nothing
    x isa Expr || return Dict{String,Any}("t" => nombre_tipo(x), "r" => un_valor(x))
    hs = Any[arbol_expr(a, cuenta) for a in x.args]
    any(isnothing, hs) && return nothing
    Dict{String,Any}("h" => string(x.head), "r" => un_valor(x), "a" => hs)
end
# Un GlobalRef (lo que deja la higiene de una macro: println pasa a ser Main.println) se escribe con su módulo.
# El programa corre en Module(:Main), que Julia escribe Main.Main; en el REPL es Main. Es la función de
# base/show.jl, con ese único cambio
function Base.show_globalref(io::IO, ex::GlobalRef; allow_macroname = false)
    print(io, isassigned(T) && ex.mod === T[].modulo ? "Main" : ex.mod)
    print(io, '.')
    quoted = !Base.isidentifier(ex.name) && !startswith(string(ex.name), "@")
    parens = quoted && (!Base.isoperator(ex.name) || (ex.name in Base.quoted_syms))
    quoted && print(io, ':')
    parens && print(io, '(')
    Base.show_sym(io, ex.name, allow_macroname = allow_macroname)
    parens && print(io, ')')
    nothing
end

function describe(x, prof = 0)
    if x isa Expr
        d = Dict{String,Any}("t" => "Expr", "r" => sin_main(sprint(show, MIME"text/plain"(), x; context = :module => T[].modulo)), "id" => un_id(x))
        a = arbol_expr(x, Ref(0))
        a === nothing || (d["expr"] = a)
        return d
    end
    if es_plot(x)
        return Dict{String,Any}("t" => nombre_tipo(x), "plot" => describe_grafico(x), "id" => un_id(x))
    end
    if x isa Function
        nm = length(methods(x))
        return Dict("t" => "function", "r" => firma(clave_funcion(x)), "m" => nm)
    end
    # un módulo del programa (capítulo 23): una ficha con sus nombres, cada uno con su valor y si lo exporta
    if x isa Module
        d = Dict{String,Any}("t" => "Module", "r" => nombre_modulo(x))
        if x !== T[].modulo && parentmodule(x) === T[].modulo && prof < 2
            # en el orden en que se definen (la línea export no cuenta)
            sin_export = replace(CODIGO[], r"(?m)^\s*export .*$" => s -> " "^length(s))
            pos(n) = (m = findfirst(Regex("(?<![A-Za-z0-9_.])\\Q" * string(n) * "\\E(?![A-Za-z0-9_!])"), sin_export);
                      m === nothing ? typemax(Int) : first(m))
            ns = sort!([n for n in names(x; all = true) if n !== nameof(x) && !(n in (:eval, :include)) &&
                        !oculto(n) && isdefined(x, n)]; by = n -> (pos(n), string(n)))
            d["modulo"] = [Dict{String,Any}("nombre" => string(n), "v" => describe(getfield(x, n), prof + 1),
                                            "exporta" => Base.isexported(x, n)) for n in ns]
        end
        return d
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
        d = Dict{String,Any}("t" => nombre_tipo(x), "v" => [un_valor(e) for e in xs], "el" => sin_main(de_modulo(show, eltype(x))))
        n > 30 && (d["nv"] = n)
        x isa AbstractRange && (d["rango"] = un_valor(x))
        x isa AbstractRange || (d["id"] = un_id(x))
        # capítulo 21: un vector de objetos mutables (fichas) lleva la identidad de cada uno, para ver que copy
        # copia el vector pero no las fichas
        propio(e) = ismutable(e) && parentmodule(typeof(e)) === T[].modulo && isstructtype(typeof(e))
        n <= 30 && any(propio, xs) && (d["ids"] = Any[propio(e) ? un_id(e) : nothing for e in xs])
        # una vista (view, @view): de qué vector o matriz es, con qué índices y qué casillas suyas ve
        if x isa SubArray && parent(x) isa Array && n <= 30
            ind(i) = i isa Base.Slice ? ":" : un_valor(i)
            pos = vec(collect(LinearIndices(parent(x))[parentindices(x)...]))
            d["vista"] = Dict{String,Any}("padre" => un_id(parent(x)), "i" => join(map(ind, parentindices(x)), ", "), "pos" => pos)
        end
        return d
    end
    if x isa AbstractMatrix && length(x) <= 400
        return Dict("t" => nombre_tipo(x), "d" => collect(size(x)), "el" => sin_main(de_modulo(show, eltype(x))), "id" => un_id(x),
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
                                "tipos" => [sin_main(de_modulo(show, eltype(c))) for c in DataFrames.eachcol(x)],
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
    Dict{String,Any}("t" => nombre_tipo(x), "r" => sin_main(sprint(show, MIME"text/plain"(), x; context = (:limit => true, :displaysize => (24, 80), :module => T[].modulo))))
end

function corto(x)
    x isa Function && return firma(clave_funcion(x))
    x isa Module && return nombre_modulo(x)
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

# Las variables de cada marco se describen en su orden (el de los argumentos y luego el de lectura), no en
# el de m[:vars], que es un diccionario: así los ids de los vectores nuevos salen siempre en el mismo orden.
function foto_marcos()
    map(T[].pila) do m
        ks = [k for k in m[:orden] if haskey(m[:vars], k) && !oculto(k)]
        todas = vcat(ks, [k for k in keys(m[:vars]) if !(k in ks) && !oculto(k)])
        vars = Dict{String,Any}()
        for k in todas
            vars[string(k)] = describe(m[:vars][k])
        end
        Dict("id" => m[:id], "nombre" => string(m[:nombre]), "llamada" => m[:llamada], "desde" => m[:desde],
             "vars" => vars, "orden" => [string(k) for k in ks])
    end
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
    if st.grafico !== nothing
        paso["grafico"] = st.grafico
        st.svgfile === nothing || (paso["svg"] = st.svgfile)
        st.grafico = nothing; st.svgfile = nothing
    end
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
    if es_plot(v)
        registra(v)
    elseif v isa Module
        println(stdout, nombre_modulo(v))
    elseif v isa REPL_LIMITE
        show(IOContext(stdout, :limit => true, :displaysize => (24, 80), :module => T[].modulo), MIME"text/plain"(), v)
        println(stdout)
    elseif v !== nothing
        show(contexto(stdout), MIME"text/plain"(), v)
        println(stdout)
    end
    nothing
end
clave_vuelta(st, l) = (isempty(st.pila) ? 0 : st.pila[end][:id], l)
function cabecera(l, locs)
    st = T[]
    k = clave_vuelta(st, l)
    st.vueltas[k] = get(st.vueltas, k, 0) + 1
    pon_locales(locs)
    anota(Dict{String,Any}("linea" => l, "tipo" => "vuelta", "vuelta" => st.vueltas[k]))
end
fin_vuelta(l, locs) = (pon_locales(locs); T[].por_linea || fila(locs); nothing)
function fin_bucle(l, locs)
    st = T[]
    pon_locales(locs)
    k = clave_vuelta(st, l)
    anota(Dict{String,Any}("linea" => l, "tipo" => "fin", "vuelta" => get(st.vueltas, k, 0)))
    delete!(st.vueltas, k)
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

# ── Los errores (capítulo 22) ────────────────────────────────────────────
# El texto de un error, como lo escribe el REPL (sin la lista de candidatos ni dónde se definió cada uno)
function texto_error(err)
    # un @test que falla fuera de un @testset lanza este error; el REPL escribe solo su mensaje
    nameof(typeof(err)) === :FallbackTestSetException && return String(getfield(err, :msg))
    t = sin_main(replace(Base.invokelatest(sprint, showerror, err isa LoadError ? err.error : err; context = :module => T[].modulo), "`Main.Main`" => "`Main`"))
    # la lista de «Closest candidates» de un MethodError no cabe en el visualizador
    t = strip(first(split(t, "\n\nClosest candidates")))
    # en un «is ambiguous», cada candidato lleva debajo dónde se definió («@ Main programa.jl:2»): el
    # visualizador ya enseña el programa, así que se quita
    replace(t, r"\n    @ [^\n]*" => "")
end
profundidad() = length(T[].pila)
# Un error sale de una función del programa: la primera vez (en la más interna) se guarda cómo estaba la pila,
# para que el paso del error enseñe dónde falló si nadie lo atrapa; después se cierra el marco.
function abandona(err)
    st = T[]
    if st.al_fallar === nothing || st.al_fallar[1] !== err
        st.al_fallar = (err, Base.invokelatest(foto_marcos))
    end
    isempty(st.pila) || pop!(st.pila)
    nothing
end
# Un catch atrapa el error: las llamadas que se habían abierto dentro del try se cierran (sus marcos
# desaparecen sin devolver nada) y el programa sigue en el catch. El paso dice dónde falló (desde) y el error.
function captura(l, err, prof, locs)
    st = T[]
    desde = st.actual
    while length(st.pila) > prof
        pop!(st.pila)
    end
    pon_locales(locs)
    anota(Dict{String,Any}("linea" => l, "tipo" => "captura", "desde" => desde, "error" => texto_error(err)))
end
# El bloque finally se ejecuta siempre: al salir del try, del catch o con un error que sigue su camino.
# Al terminar, el programa vuelve a la línea que estaba (si el error sigue, es la que falló).
function entra_finally(l, prof, locs)
    st = T[]
    push!(st.pendientes, st.actual)
    while length(st.pila) > prof
        pop!(st.pila)
    end
    pon_locales(locs)
    anota(Dict{String,Any}("linea" => l, "tipo" => "finally"))
end
sale_finally() = (T[].actual = pop!(T[].pendientes); nothing)
# la línea de una palabra (catch, finally) del programa, buscando hacia atrás desde la primera sentencia de su bloque
function linea_de(palabra, desde)
    L = split(CODIGO[], '\n')
    k = min(desde, length(L))
    # la palabra suelta, fuera de los textos ("primer catch" no cuenta)
    while k >= 1 && !occursin(Regex("(^|[\\s;])" * palabra * "(\\s|;|\$)"), replace(L[k], r"\"(\\.|[^\"\\])*\"" => "\"\""))
        k -= 1
    end
    k >= 1 ? k : desde
end
primera_linea(b) = (b isa Expr && (i = findfirst(a -> a isa LineNumberNode, b.args)) !== nothing) ? b.args[i].line : nothing
ultima_linea(b, defecto) = (b isa Expr && (i = findlast(a -> a isa LineNumberNode, b.args)) !== nothing) ? b.args[i].line : defecto
# la línea de catch o finally: hacia atrás desde la primera sentencia de su bloque o, si el bloque está vacío,
# hacia delante desde la última sentencia del bloque anterior
function linea_bloque(palabra, b, antes)
    p = primera_linea(b)
    p === nothing || return linea_de(palabra, p)
    L = split(CODIGO[], '\n')
    k = antes + 1
    while k <= length(L) && !occursin(Regex("^\\s*" * palabra * "\\b"), L[k])
        k += 1
    end
    k <= length(L) ? k : antes
end
const NTRY = Ref(0)
function reescribe_try(e, linea, nivel)
    NTRY[] += 1
    dv = Symbol("__prof", NTRY[])
    tb, var, cb = e.args[1], e.args[2], e.args[3]
    ev = var === false ? Symbol("__err") : var
    nuevo = Any[cuerpo(tb, linea, nivel + 1), ev]
    if cb === false
        push!(nuevo, false)
    else
        lc = linea_bloque("catch", cb, ultima_linea(tb, linea))
        push!(nuevo, Expr(:block, llama(captura, lc, ev, dv, LOCALS), cuerpo(cb, lc, nivel + 1)))
    end
    if length(e.args) >= 4 && e.args[4] !== false
        fb = e.args[4]
        lf = linea_bloque("finally", fb, ultima_linea(cb === false ? tb : cb, linea))
        push!(nuevo, Expr(:block, llama(entra_finally, lf, dv, LOCALS), cuerpo(fb, lf, nivel + 1), llama(sale_finally)))
    elseif length(e.args) >= 5
        push!(nuevo, false)
    end
    length(e.args) >= 5 && push!(nuevo, cuerpo(e.args[5], linea, nivel + 1))
    # catch sin nombre: Julia no permite «catch» con una variable y sin bloque, así que se nombra igual
    Expr(:block, Expr(:(=), dv, llama(profundidad)), Expr(:try, nuevo...))
end
es_try(e) = e isa Expr && e.head == :try

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
    isempty(PREFIJO[]) || (nombre = Symbol(PREFIJO[], nombre))
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
    # si un error sale de la función, su marco se cierra al salir (capítulo 22: lo puede atrapar un catch, o
    # el propio Julia, como hace @test_throws); el error sigue su camino
    exc = Symbol("__exc")
    Expr(fex.head, sig, Expr(:block, Expr(:try, Expr(:block, nuevo...), exc, Expr(:block, llama(abandona, exc), Expr(:call, :rethrow)))))
end

# ── Los módulos (capítulo 23) ────────────────────────────────────────────
# Definir un módulo es un solo paso. Dentro, sus funciones se reescriben como las del programa, para entrar en
# ellas al llamarlas; su marco lleva el nombre del módulo, Notas.media. Va en un :toplevel, porque Julia
# solo admite `module` en el nivel de arriba (no dentro de un bloque).
const PREFIJO = Ref("")
function reescribe_modulo(e, linea)
    nombre = e.args[2]
    out = Any[]; lin = linea
    PREFIJO[] = string(nombre, ".")
    try
        for a in e.args[3].args
            if a isa LineNumberNode; lin = a.line; push!(out, a); continue; end
            push!(out, es_def_funcion(a) && !es_showerror(a) ? instrumenta(a, lin) : a)
        end
    finally
        PREFIJO[] = ""
    end
    Expr(:toplevel, llama(va, linea), Expr(:module, e.args[1], nombre, Expr(:block, out...)), llama(paso, linea, LOCALS), nothing)
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
# Base.showerror(io::IO, e::MiError) = …: un método que Julia llama para escribir el error, no el programa
# (capítulo 22); no se recorre paso a paso
function es_showerror(e)
    es_def_funcion(e) || return false
    c = nombre_firma(e.args[1])
    c isa Expr && c.head == :call && string(c.args[1]) in ("Base.showerror", "showerror", "Base.show")
end
function reescribe(e, linea, nivel; final = false)
    if es_showerror(e)
        return Expr(:block, llama(va, linea), e, llama(paso, linea, LOCALS), nothing)
    end
    if es_def_funcion(e)
        f = instrumenta(e, linea)
        return nivel == 0 ? Expr(:block, llama(va, linea), f, llama(paso, linea, LOCALS), nothing) : f
    end
    if es_try(e)
        t = reescribe_try(e, linea, nivel)
        if nivel == 0      # como en el REPL, el valor del try se escribe; el paso del final lo enseña
            v = gensym("__v")
            return Expr(:block, llama(va, linea), Expr(:(=), v, t), llama(muestra, v), llama(paso, linea, LOCALS), nothing)
        end
        final && return Expr(:block, llama(va, linea), t)
        return Expr(:block, llama(va, linea), t)
    end
    # x = try … end: se reescribe el try de la derecha
    if e isa Expr && e.head == :(=) && es_try(e.args[2]) && !es_def_funcion(e)
        t = Expr(:(=), e.args[1], reescribe_try(e.args[2], linea, nivel))
        final && return Expr(:block, llama(va, linea), t)
        return Expr(:block, llama(va, linea), t, llama(paso, linea, LOCALS), nivel == 0 ? nothing : e.args[1])
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
    if nivel == 0 && e isa Expr && e.head == :module
        return reescribe_modulo(e, linea)
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
function traza(codigo::AbstractString, config::AbstractDict; svg = nothing)
    salida = tempname()
    touch(salida)
    st = Estado(Module(:Main), Any[], Any[], Symbol[], Any[], 0, Dict{Tuple{Int,Int},Int}(), 0, Dict{Symbol,Any}(),
                String.(get(config, "columnas", String[])), get(config, "fila_en", "") == "cada_linea",
                String.(get(config, "ocultar", String[])), salida, Dict{Symbol,Vector{String}}(), IdDict{Any,Int}(),
                nothing, svg, 0, nothing, Int[], nothing)
    T[] = st
    occursin(r"\busing\s+.*\bPlots\b", codigo) && carga_plots()
    PLOTS[] === nothing || (PLOTS[].CURRENT_PLOT.nullableplot = nothing)     # cada programa empieza sin gráfico actual
    CODIGO[] = codigo
    NTRY[] = 0
    Core.eval(st.modulo, :(using Random; Random.seed!(1)))
    # Module(:Main) no trae eval, que todo módulo hecho con `module … end` sí tiene (capítulo 20)
    Core.eval(st.modulo, :(eval(x) = Core.eval($(st.modulo), x)))
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
                error_txt = texto_error(err)
                # desde aquí, como en el REPL, hay que mirar la «edad del mundo» más reciente: las variables que
                # el programa ha creado no existen para el código compilado antes de crearlas (Julia 1.12+)
                est, orden = Base.invokelatest(foto)
                e0 = err isa LoadError ? err.error : err
                marcos = st.al_fallar !== nothing && st.al_fallar[1] === e0 ? st.al_fallar[2] :
                         isempty(st.pila) ? nothing : Base.invokelatest(foto_marcos)
                momento = (est, orden, marcos === nothing || isempty(marcos) ? nothing : marcos)
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
const CARPETA_GRAFICOS = "datos/graficos"
function procesa(fichero)
    lineas = readlines(fichero)
    base = replace(basename(fichero), r"\.md$" => "")
    mkpath(CARPETA_TRAZAS)
    for f in readdir(CARPETA_TRAZAS; join = true)
        startswith(basename(f), base * "-") && endswith(f, ".json") && rm(f)
    end
    if isdir(CARPETA_GRAFICOS)
        for f in readdir(CARPETA_GRAFICOS; join = true)
            startswith(basename(f), base * "-") && endswith(f, ".svg") && rm(f)
        end
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
        write(archivo, JSON.json(traza(codigo, cfg; svg = joinpath(CARPETA_GRAFICOS, "$base-$n"))))
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
