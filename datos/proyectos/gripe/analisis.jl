# El proyecto entero, de los datos al gráfico: julia --project=. analisis.jl
include(joinpath(@__DIR__, "src", "Epidemia.jl"))
using .Epidemia, Plots

cama = leer_datos(joinpath(@__DIR__, "datos", "gripe_internado.csv"))
e, β, γ = ajusta(cama, 1.0:0.01:2.5, 0.2:0.01:0.8)
I = simula(β, γ, 14)

println("β = $β, γ = $γ, error = $(round(e, digits = 1))")
println("R₀ = $(round(β / γ, digits = 2)); pico el día $(argmax(I)), con $(round(Int, maximum(I))) enfermos")

scatter(1:14, cama, label = "en cama (datos)", xlabel = "día", ylabel = "chicos")
plot!(1:14, I, label = "modelo SIR")
savefig(joinpath(@__DIR__, "gripe.svg"))
println("Gráfico guardado en gripe.svg")

include(joinpath(@__DIR__, "test", "runtests.jl"))
