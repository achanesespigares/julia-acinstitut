function afectadas(i, despues, orden = Int[])
    for j in despues[i]
        if !(j in orden)
            afectadas(j, despues, orden)
        end
    end
    pushfirst!(orden, i)
    return orden
end
celdas = ["precio = 20.0", "iva = 0.21 * precio", "total = precio + iva"]
despues = [[2, 3], [3], Int[]]
for c in celdas
    eval(Meta.parse(c))
end
(precio, iva, total)
celdas[1] = "precio = 50.0"
for i in afectadas(1, despues)
    eval(Meta.parse(celdas[i]))
end
(precio, iva, total)
