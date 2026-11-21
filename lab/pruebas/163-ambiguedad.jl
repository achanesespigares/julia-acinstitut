k(x::Integer, y::Any) = 1
k(x::Any, y::Integer) = 2
k(x::Real, y::Real) = 3
k(1, 2.5)
k(2.5, 1.5)
k(1.0, 2)
