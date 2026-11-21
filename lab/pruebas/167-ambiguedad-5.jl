abstract type Jugada end
struct Piedra <: Jugada end
j(a::Piedra, b::Jugada) = 1
j(a::Jugada, b::Piedra) = 2
j(Piedra(), Piedra())
