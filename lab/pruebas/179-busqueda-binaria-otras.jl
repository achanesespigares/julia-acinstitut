v = [2, 5, 8, 12, 16, 23, 38, 41, 56, 72, 75, 81, 90, 94, 97, 99]
for x in [2, 50, 99, 1]
    izq = 1
    der = length(v)
    pasos = 0
    encontrado = 0
    while izq <= der
        pasos += 1
        m = (izq + der) ÷ 2
        if v[m] == x
            encontrado = m
            break
        elseif v[m] < x
            izq = m + 1
        else
            der = m - 1
        end
    end
    println(x, ": ", pasos, " pasos, posición ", encontrado)
end
