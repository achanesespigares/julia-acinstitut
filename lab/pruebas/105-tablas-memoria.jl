using DataFrames
notas = [9.0, 4.5, 7.5]
clase = DataFrame(nombre = ["Ana", "Biel", "Carla"], nota = notas)
notas[2] = 10.0
clase.nota
col = clase.nota
col[1] = 0.0
clase
copia = clase[:, :nota]
copia[3] = 1.0
clase
nuevas = [1.0, 2.0, 3.0]
clase.nota = nuevas
nuevas[1] = 99.0
clase
clase.curso = 1:3
clase.x = [true, false, true]
d = DataFrame(a = [1.5, 10.25, -3.0], b = ["x", "yy", "zzz"], c = [true, false, true], e = [1//2, 3//4, 1//1], f = ['a', 'b', 'c'], g = [0.1 + 0.2, 1/3, 1e10])
d
DataFrame(s = ["una cadena larguísima que no cabe en la columna nunca", "a"])
DataFrame(a = 1:3, b = 0)
DataFrame()
