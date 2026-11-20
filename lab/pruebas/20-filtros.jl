notas = [4.5, 7.0, 5.0, 3.2, 8.8]
aprobado = notas .>= 5
buenas = notas[aprobado]
cuantas = count(aprobado)
donde = findall(aprobado)
altas = filter(x -> x > 6, notas)
dobles = map(x -> 2x, notas)
trozo = notas[2:4]
maximum(notas), minimum(notas)
