texto = "el gato y el perro y el pez"
cuenta = Dict{String, Int}()
for p in split(texto)
    cuenta[p] = get(cuenta, p, 0) + 1
end
cuenta
letras = Dict{Char, Int}()
for c in "banana"
    letras[c] = get!(letras, c, 0) + 1
end
letras
num = Dict(1 => "uno", 2 => "dos", 10 => "diez", -3 => "menos tres")
vacio = Dict()
vacio["a"] = 1
vacio[2] = "b"
vacio
mezcla = Dict("a" => 1, "b" => 2.5)
z = Dict(zip(["x", "y", "z"], [1, 2, 3]))
m = merge(num, Dict(5 => "cinco"))
c = copy(num)
c[100] = "cien"
num
