[1, true]
[1, 2//3]
[1.5, 2//3]
promote(1, 2.5)
promote(true, 3)
promote(1, 2//3)
promote_type(Int64, Float64)
promote_type(Bool, Rational{Int64})
r = Real[1, 2.5, true, 3//4]
eltype(r)
push!(r, 7)
eltype([1.0, 2.0]), eltype("hola"), eltype(1:3)
v = Int64[]
push!(v, 2.0)
push!(v, "dos")
