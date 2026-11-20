A = [1 2 3; 4 5 6]
B = [10 20 30; 40 50 60]
A + B
B - A
2A
A * 3
A / 2
-A
A .* B
A .+ 10
A .+ [100, 200]
A .+ [1000 2000 3000]
A .^ 2
A .> 2
sum(A)
sum(A; dims=1)
sum(A; dims=2)
maximum(A)
maximum(A; dims=1)
minimum(A, dims=2)
prod(A; dims=1)
A == [1 2 3; 4 5 6]
A == B
M = [1 2; 3 4]
N = [0 1; 1 0]
M * N
N * M
M * [1, 1]
notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5]
pesos = [0.25, 0.25, 0.5]
finales = notas * pesos
fila = pesos'
fila * pesos
[1, 2]' * [3, 4]
media = sum(notas; dims=1) / 3
notas .* pesos'
sqrt.([4.0 9.0; 16.0 25.0])
abs.([-1 2; -3 4])
round.(notas)
