# config: {"foco":"notas","puntero":"i","columnas":["i","notas[i]","total"],"fila_en":"fin_iteracion"}
notas = [9.0, 6.5, 4.0, 7.5]
total = 0.0
for i in eachindex(notas)
    if notas[i] >= 5
        total += notas[i]
    end
end
total
