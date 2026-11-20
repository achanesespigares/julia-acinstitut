# config: {"columnas":["nombre","nota"],"fila_en":"fin_iteracion"}
notas = Dict("Ana" => 9.0, "Biel" => 4.0, "Carla" => 7.5, "Dani" => 6.0)
for (nombre, nota) in notas
    println(nombre, ": ", nota)
end
for nombre in sort(collect(keys(notas)))
    println(nombre, " -> ", notas[nombre])
end
for p in notas
    println(p.first)
end
