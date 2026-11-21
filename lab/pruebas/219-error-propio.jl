struct Vacio <: Exception end
struct Fuera <: Exception
    n::Int
end
mutable struct Contado <: Exception
    veces::Int
end
supertype(Fuera)
Fuera(3) isa Exception
Fuera(3) isa ErrorException
r = try throw(Fuera(12)) catch e e end
r.n
c = try throw(Contado(1)) catch e e end
c.veces += 1
c
Base.showerror(io::IO, e::Fuera) = print(io, "Fuera: ", e.n, " no vale")
try
    throw(Fuera(-1))
catch e
    println("atrapado: ", e.n)
end
throw(Vacio())
