struct Punto{T<:Real}
    x::T
    y::T
end
p = Punto(1, 2)
p + p
