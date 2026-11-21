struct Punto{T<:Real}
    x::T
    y::T
end
Base.:+(a::Punto, b::Punto) = Punto(a.x + b.x, a.y + b.y)
Base.:-(a::Punto, b::Punto) = Punto(a.x - b.x, a.y - b.y)
Base.:-(a::Punto) = Punto(-a.x, -a.y)
Base.:*(k::Real, a::Punto) = Punto(k * a.x, k * a.y)
Base.:*(a::Punto, k::Real) = k * a
Base.:(==)(a::Punto, b::Punto) = a.x == b.x && a.y == b.y
p = Punto(1, 2)
q = Punto(3, 4)
r = q - p
s = -p
p * 3
3 * p
p == Punto(1, 2)
p == q
p + q == Punto(4, 6)
v = [p, q, r]
sum(v)
sum([p])
2.5 * p
p + Punto(0.5, 0.5)
function centro(ps)
    t = ps[1]
    for k in 2:length(ps)
        t = t + ps[k]
    end
    return t
end
centro(v)
p / 2
