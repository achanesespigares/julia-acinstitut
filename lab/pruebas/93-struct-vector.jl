struct Expediente
    nombre::String
    notas::Vector{Float64}
end
notas = [9.0, 6.5]
e = Expediente("Ana", notas)
e.notas[1] = 10.0
notas
push!(e.notas, 7.0)
e
otro = Expediente("Ana", [10.0, 6.5, 7.0])
iguales = e == otro
enteros = Expediente("Biel", [4, 5])
enteros.notas
media(x::Expediente) = sum(x.notas) / length(x.notas)
m = media(e)
