# config: {"columnas":["n","pasos"],"fila_en":"fin_iteracion"}
n = 27
pasos = 0
while true
    if n == 1
        break
    end
    n = iseven(n) ? n ÷ 2 : 3n + 1
    pasos += 1
    if pasos >= 6
        break
    end
end
encontrado = 0
for i in 1:3
    for j in 1:3
        if i * j == 6
            encontrado = 10i + j
            break
        end
    end
end
(n, pasos, encontrado)
