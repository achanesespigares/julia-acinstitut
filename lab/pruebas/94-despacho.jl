abstract type Figura end
struct Circulo <: Figura
    r::Float64
end
struct Rectangulo <: Figura
    base::Float64
    altura::Float64
end
area(c::Circulo) = π * c.r^2
area(r::Rectangulo) = r.base * r.altura
nombre(f::Figura) = "una figura"
nombre(c::Circulo) = "un círculo"
figuras = [Circulo(1), Rectangulo(2, 3)]
areas = area.(figuras)
total = sum(areas)
for f in figuras
    println(nombre(f), ": ", area(f))
end
area
es = Circulo <: Figura
sup = supertype(Circulo)
mezcla = [1, Circulo(2.0)]
function describe(f::Figura)
    a = area(f)
    return nombre(f) * " de área " * string(a)
end
d = describe(Rectangulo(1, 2))
