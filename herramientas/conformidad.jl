# conformidad.jl · Trazas de Julia de verdad para comparar con el intérprete del laboratorio
# Uso: julia --project=herramientas herramientas/conformidad.jl entrada.json salida.json
# entrada.json: [{"nombre": …, "codigo": …, "config": {…}}, …]
include(joinpath(@__DIR__, "trazar.jl"))
casos = JSON.parsefile(ARGS[1]; dicttype = Dict{String,Any})
res = Dict{String,Any}()
# los programas que usan Plots, al final: Plots carga paquetes que cambian algunos mensajes de error (ver trazar.jl)
usa_plots(c) = occursin(r"\busing\s+.*\bPlots\b", c["codigo"])
for c in vcat(filter(!usa_plots, casos), filter(usa_plots, casos))
    res[c["nombre"]] = try
        traza(c["codigo"], c["config"])
    catch e
        Dict("fallo" => sprint(showerror, e))
    end
end
write(ARGS[2], JSON.json(res))
