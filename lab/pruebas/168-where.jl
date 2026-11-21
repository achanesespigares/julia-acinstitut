iguales(x::T, y::T) where {T} = "los dos son $T"
iguales(x, y) = "tipos distintos"
iguales(1, 2)
iguales(1, 2.0)
iguales("a", "b")
iguales(1.5, 2.5)
k(x::T, y::T) where {T<:Real} = "reales del mismo tipo"
k(x::Integer, y::Integer) = "enteros"
k(1, 2)
k(1.0, 2.0)
k(true, 2)
k
media(v::Vector{T}) where {T<:Real} = sum(v) / length(v)
media([1, 2, 4])
media([1.5, 2.5])
tipo_de(x::T) where T<:Number = T
tipo_de(3)
tipo_de(2.5)
media(["a"])
