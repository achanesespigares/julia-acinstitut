mutable struct Ficha
    nombre::String
    faltas::Int
end
a = Ficha("Ana", 0)
clase = [a, Ficha("Biel", 1), a]
copia = copy(clase)
copia[3].faltas = 4
clase[1]
clase[1] === clase[3]
copia[1] = Ficha("Carla", 0)
clase[1].nombre
