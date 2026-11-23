# Las pruebas del paquete: using Pkg; Pkg.test("Derivadas"), o ] test
using Derivadas
using Test

@testset "deriva" begin
    @test deriva(7, :x) == 0
    @test deriva(:x, :x) == 1
    @test deriva(:y, :x) == 0
    @test simplifica(deriva(:(x^2 + 3x + 1), :x)) == :(2x + 3)
    @test simplifica(deriva(:(sin(x^2)), :x)) == :(cos(x ^ 2) * (2x))
    @test_throws ErrorException deriva(:(tan(x)), :x)
end

@testset "simplifica" begin
    @test simplifica(:(0 + x)) == :x
    @test simplifica(:(1 * x * 1)) == :x
    @test simplifica(:(0 * sin(x))) == 0
    @test simplifica(:(x ^ (2 - 1))) == :x
end

@testset "comprueba" begin
    @test comprueba(:(2x + 3), :(x^2 + 3x + 1), :x)
    @test comprueba(:(3 + 2x), :(x^2 + 3x + 1), :x)         # en otro orden, también vale
    @test comprueba(:(2 * cos(2x)), :(sin(2x)), :x)
    @test !comprueba(:(cos(2x)), :(sin(2x)), :x)            # falta la regla de la cadena
    @test !comprueba(:(2x), :(x^2 + 3x + 1), :x)
end
