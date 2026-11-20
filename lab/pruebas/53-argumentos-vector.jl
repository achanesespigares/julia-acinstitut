function anade!(v, x)
    push!(v, x)
    return nothing
end
function cambia_nombre(v)
    v = [0]
    return v
end
w = [1, 2]
anade!(w, 3)
r = cambia_nombre(w)
w
nota_final(e, p; peso = 0.6) = peso * e + (1 - peso) * p
a = nota_final(7.0, 9.0)
b = nota_final(7.0, 9.0; peso = 0.8)
nota_final(7.0, 9.0, 0.8)
