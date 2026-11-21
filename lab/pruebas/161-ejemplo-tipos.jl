struct Punto{T<:Real}
    x::T
    y::T
end
que_es(p::Punto{Int64}) = "un punto de enteros"
que_es(p::Punto) = "un punto de otro tipo"
p = Punto(3, 4)
q = Punto(1.5, 2.0)
que_es(p)
que_es(q)
typeof(q)
