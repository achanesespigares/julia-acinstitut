notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5; 5.5 6.0 4.0]
size(notas)
f, c = size(notas)
size(notas, 1)
ndims(notas)
length(notas)
notas[2, 3]
notas[end, 1]
notas[2, :]
notas[:, 1]
notas[1:2, 2:3]
notas[end, end-1:end]
notas[5]
notas[:]
typeof(notas)
enteros = [1 2 3; 4 5 6]
fila = [1 2 3]
columna = [1.5; 2.5; 3.5]
una = reshape([1.5, 2.5], 2, 1)
signos = [1 -2; -3 4]
espacios = [1 - 2  3]
raros = [0.1+0.2 1/3; 123456789.0 1e-10]
grandes = [1 100; -5 20]
bools = [true false; false true]
textos = ["a" "bb"; "ccc" "d"]
mezcla = [1 2.5; 3 4]
println(enteros)
println(columna)
println(una)
println(bools)
s = "matriz: $(enteros)"
