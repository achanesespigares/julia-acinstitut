struct Punto{T<:Real}
    x::T
    y::T
end
Base.:+(a::Punto, b::Punto) = Punto(a.x + b.x, a.y + b.y)
-Punto(1, 2)
