# config: {"columnas":["k","suma"],"fila_en":"cada_linea"}
k = 0
suma = 0
while k < 10
    k += 1
    if k % 2 == 0
        continue
    end
    if k > 7
        break
    end
    suma += k
end
suma
