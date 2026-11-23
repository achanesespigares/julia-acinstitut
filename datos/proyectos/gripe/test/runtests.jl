# Las pruebas del proyecto: julia --project=. test/runtests.jl
using Test
isdefined(@__MODULE__, :Epidemia) || include(joinpath(@__DIR__, "..", "src", "Epidemia.jl"))
using .Epidemia

@testset "Epidemia" begin
    datos = leer_datos(joinpath(@__DIR__, "..", "datos", "gripe_internado.csv"))
    @test length(datos) == 14
    @test datos[1] == 3 && maximum(datos) == 298

    u0 = [N - 1.0, 1.0, 0.0]
    @test sum(sir(u0, 1.67, 0.44)) ≈ 0 atol = 1e-12     # lo que sale de un grupo entra en otro
    @test sum(paso(u0, 1.0, 1.67, 0.44)) ≈ N            # nadie aparece ni desaparece
    @test all(simula(0.0, 0.44, 5) .< 1)                # sin contagios, el brote se apaga
    @test argmax(simula(1.67, 0.44, 14)) == 6           # el pico, el sexto día, como en los datos

    e, β, γ = ajusta(datos, 1.0:0.01:2.5, 0.2:0.01:0.8)
    @test (β, γ) == (1.67, 0.44)
    @test e < error2(1.6, 0.44, datos)
end
