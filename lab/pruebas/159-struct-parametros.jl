struct Punto3{T<:Real}
    x::T
    y::T
    z::T
end
d3(p::Punto3) = sqrt(p.x^2 + p.y^2 + p.z^2)
a = Punto3(1, 2, 2)
d3(a)
b = Punto3{Float64}(1, 2, 2)
typeof(b)
b == Punto3(1.0, 2.0, 2.0)
a isa Punto3, a isa Punto3{Int64}, a isa Punto3{Float64}
struct Pareja{A, B}
    primero::A
    segundo::B
end
p = Pareja(1, "uno")
typeof(p)
q = Pareja(2.5, 'x')
q.segundo
Punto3
typeof(Punto3)
s(p::Punto3{Float64}) = "decimales"
s(p::Punto3) = "otro punto"
s(a), s(b)
Punto3(1, 2.0, 3)
