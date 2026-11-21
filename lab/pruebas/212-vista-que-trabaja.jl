function aprueba!(v)
    for i in eachindex(v)
        v[i] = max(v[i], 5)
    end
    return v
end
notas = [3, 8, 4, 9, 2, 7]
grupo_a = view(notas, 1:3)
aprueba!(grupo_a)
notas
copia = notas[4:6]
aprueba!(copia)
notas
