notas = [9.0, 6.5, 4.0, 7.5, 3.0, 8.0]
aprobado = notas .>= 5
buenas = notas[aprobado]
media = sum(buenas) / length(buenas)
entre = (notas .>= 5) .& (notas .< 9)
extremos = (notas .< 5) .| (notas .>= 9)
suspensos = notas[.!aprobado]
donde = findall(entre)
dos = notas[notas .> 2 .&& notas .< 7]
cadena = 4 .< notas .< 9
notas .>= 5 .& notas .< 9
