a = ArgumentError("mal")
typeof(a)
a.msg
d = DomainError(-2)
d2 = DomainError(-2, "negativo")
k = KeyError("x")
function exige_positivo(x)
    x > 0 || throw(DomainError(x, "tiene que ser positivo"))
    return sqrt(x)
end
exige_positivo(16)
r = try exige_positivo(-3) catch e e end
r.val
s = try error("n = ", 5) catch e e end
s.msg
typeof(s)
throw(ArgumentError("se acabó"))
