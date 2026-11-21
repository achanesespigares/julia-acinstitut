struct Punto
    x::Float64
    y::Float64
end
struct Segmento
    a::Punto
    b::Punto
end
Punto(x) = Punto(x, 0.0)
p = Punto(3)
s = Segmento(Punto(0, 0), Punto(3, 4))
s
largo = sqrt((s.b.x - s.a.x)^2 + (s.b.y - s.a.y)^2)
abstract type Animal end
struct Perro <: Animal
    nombre::String
end
struct Gato <: Animal
    nombre::String
end
sonido(a::Animal) = "..."
sonido(p::Perro) = "guau"
animales = Animal[]
push!(animales, Perro("Toby"))
push!(animales, Gato("Misi"))
for a in animales
    println(a.nombre, " dice ", sonido(a))
end
es = animales[2] isa Animal
no = animales[2] isa Perro
sonido
d = Dict("Toby" => Perro("Toby"))
d["Toby"]
mutable struct Caja
    contenido
end
c = Caja(1)
c.contenido = "texto"
c
c.contenido = [1, 2]
c
cajas = [Caja(i) for i in 1:3]
