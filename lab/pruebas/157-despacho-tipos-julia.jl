que_es(x::Integer) = "un entero"
que_es(x::AbstractFloat) = "un decimal"
que_es(x::Number) = "otro número"
que_es(x) = "no es un número"
que_es(x::Bool) = "un lógico"
que_es(true)
que_es(7)
que_es('c')
doble(x::Number) = 2 * x
doble(true)
doble(3//4)
signo(x::Signed) = x < 0 ? "negativo" : "no negativo"
signo(-3)
suma2(v::Vector{<:Real}) = sum(v)
suma2([1, 2])
suma2([1.5, 2.0])
suma(v::Vector{Real}) = sum(v)
suma(Real[1, 2.5])
suma([1, 2])
