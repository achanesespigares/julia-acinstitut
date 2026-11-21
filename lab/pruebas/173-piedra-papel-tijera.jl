abstract type Jugada end
struct Piedra <: Jugada end
struct Papel <: Jugada end
struct Tijera <: Jugada end
gana(::Jugada, ::Jugada) = false
gana(::Piedra, ::Tijera) = true
gana(::Tijera, ::Papel) = true
gana(::Papel, ::Piedra) = true
function resultado(a::Jugada, b::Jugada)
    if gana(a, b)
        return "gana"
    elseif gana(b, a)
        return "pierde"
    else
        return "empate"
    end
end
resultado(Piedra(), Tijera())
resultado(Piedra(), Papel())
resultado(Tijera(), Tijera())
jugadas = [Piedra(), Papel(), Tijera()]
victorias = 0
for a in jugadas, b in jugadas
    if gana(a, b)
        victorias += 1
    end
end
victorias
Piedra() === Piedra()
typeof(Piedra())
gana(Piedra(), "tijera")
