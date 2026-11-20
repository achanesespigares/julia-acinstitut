# config: {"columnas":["i","j","p"],"fila_en":"fin_iteracion"}
p = 0
for i in 1:3
    for j in 1:i
        p += i * j
    end
end
p
