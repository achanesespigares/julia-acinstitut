function nota(t)
    n = tryparse(Float64, t)
    n === nothing && throw(ArgumentError("«$t» no es un número"))
    0 <= n <= 10 || throw(DomainError(n, "la nota va de 0 a 10"))
    return n
end
for t in ["8.5", "once", "12", "6"]
    try
        println(t, " → ", nota(t))
    catch e
        println(t, " → ", typeof(e))
    end
end
nota("diez")
