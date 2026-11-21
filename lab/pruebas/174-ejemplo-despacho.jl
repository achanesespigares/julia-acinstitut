abstract type Jugada end
struct Piedra <: Jugada end
struct Papel <: Jugada end
struct Tijera <: Jugada end
gana(a::Jugada, b::Jugada) = false
gana(a::Piedra, b::Tijera) = true
gana(a::Tijera, b::Papel) = true
gana(a::Papel, b::Piedra) = true
gana(Piedra(), Tijera())
gana(Tijera(), Piedra())
gana(Papel(), Papel())
