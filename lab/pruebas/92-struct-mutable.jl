mutable struct Ficha
    nombre::String
    faltas::Int
end
f = Ficha("Biel", 0)
f.faltas += 1
f.faltas = 3
g = f
g.faltas = 5
f
h = Ficha("Biel", 5)
iguales = f == h
mismo = f == g
f.faltas = 2.0
f
fichas = [Ficha("Ana", 0), Ficha("Carla", 2)]
for x in fichas
    x.faltas += 1
end
fichas
