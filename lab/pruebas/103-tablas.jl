using DataFrames
clase = DataFrame(nombre = ["Ana", "Biel", "Carla", "Dani"], curso = [2, 1, 2, 1], nota = [9.0, 4.5, 7.5, 6.0])
clase
f, c = size(clase)
n = nrow(clase)
columnas = names(clase)
notas = clase.nota
igual = clase[!, :nota] === clase.nota
copia = clase[:, :nota]
biel = clase[2, :nota]
fila = clase[2, :]
fila.nombre
aprobados = clase[clase.nota .>= 5, :]
segundo = filter(:curso => c -> c == 2, clase)
ranking = sort(clase, :nota, rev = true)
primeros = first(ranking, 2)
dos = clase[:, [:nombre, :nota]]
clase.aprobada = clase.nota .>= 5
clase[2, :nota] = 5.0
clase
for r in eachrow(clase)
    println(r.nombre, " ", r.nota)
end
vacia = clase[clase.nota .> 10, :]
typeof(clase)
