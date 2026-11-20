function agrega!(v, x)
    push!(v, x)
    return nothing
end
notas = [5.0]
agrega!(notas, 7.5)
notas
