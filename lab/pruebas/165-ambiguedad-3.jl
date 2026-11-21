abstract type Jugada end
struct Piedra <: Jugada end
struct Papel <: Jugada end
j(a::Piedra, b::Jugada) = "primero piedra"
j(a::Jugada, b::Piedra) = "segundo piedra"
j(Piedra(), Papel())
j(Papel(), Piedra())
t(x::Integer, y, z) = 1
t(x, y::Integer, z) = 2
t(1, "a", "b")
t(1, 2, 3)
