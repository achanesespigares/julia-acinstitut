notas = Dict("Ana" => 9.0, "Biel" => 4.0, "Carla" => 7.5)
b = notas["Biel"]
notas["Dani"] = 6.0
notas["Biel"] = 5
n = length(notas)
hay = haskey(notas, "Eva")
e = get(notas, "Eva", 0.0)
notas
ks = keys(notas)
vs = values(notas)
orden = sort(collect(keys(notas)))
total = sum(values(notas))
mejor = maximum(values(notas))
lista = collect(notas)
ordenada = sort(collect(notas))
p = first(notas)
dentro = ("Ana" => 9.0) in notas
clave = "Ana" in keys(notas)
delete!(notas, "Ana")
x = pop!(notas, "Biel")
notas["Eva"]
