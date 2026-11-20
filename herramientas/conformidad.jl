# conformidad.jl · Trazas de Julia de verdad para comparar con el intérprete del laboratorio
# Uso: julia --project=herramientas herramientas/conformidad.jl entrada.json salida.json
# entrada.json: [{"nombre": …, "codigo": …, "config": {…}}, …]
include(joinpath(@__DIR__, "trazar.jl"))
casos = JSON.parsefile(ARGS[1]; dicttype = Dict{String,Any})
res = Dict{String,Any}()
for c in casos
    res[c["nombre"]] = try
        traza(c["codigo"], c["config"])
    catch e
        Dict("fallo" => sprint(showerror, e))
    end
end
write(ARGS[2], JSON.json(res))
