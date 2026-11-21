using Test
struct Raro <: Exception end
f(x) = x < 0 ? throw(Raro()) : 2x
@test f(3) == 6
@test f(1) != 3
@test 0.1 + 0.2 ≈ 0.3
@test f(2) > 3
@test isempty(Int[])
@test_throws Raro f(-1)
@test_throws Exception f(-1)
@test_throws DomainError sqrt(-1)
x = 4
@test x * 2 == 8
@test_throws ArgumentError f(5)
