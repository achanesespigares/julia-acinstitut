struct Alumna
    nombre::String
    curso::Int
    nota::Float64
end
a = Alumna("Ana", 2, 9)
a
n = a.nombre
aprobada = a.nota >= 5
t = typeof(a)
Alumna
campos = fieldnames(Alumna)
es = a isa Alumna
b = Alumna("Ana", 2, 9.0)
iguales = a == b
mismo = a === b
v = [a, Alumna("Biel", 1, 4.5)]
v
v[2].nota
notas = [x.nota for x in v]
for x in v
    println(x.nombre, ": ", x.nota)
end
println(a)
s = "La alumna es $(a)"
c = Alumna[]
push!(c, a)
c
