using LinearAlgebra
ana = [9.0, 6.5, 7.0]
pesos = [0.25, 0.25, 0.5]
dot(ana, pesos)
ana' * pesos
dot([1, 2, 3], [4, 5, 6])
dot([1.0, 2.0], [3, 4])
dot([1//2, 1], [2, 4])
dot(Int[], Int[])
carla = [10.0, 8.0, 9.5]
norm(carla - ana)
norm([3, 4])
norm([3.0, 4.0])
norm([3, 4], 1)
norm([3, -4], Inf)
norm(Float64[])
norm([1 2; 2 4])
norm([1//2, 1//2])
norm(-3)
cross([1, 0, 0], [0, 1, 0])
cross([1.0, 2.0, 3.0], [4.0, 5.0, 6.0])
normalize([3.0, 4.0])
tr([2 1; 4 3])
tr([1.5 2; 3 4])
diag([1 2; 3 4])
parecido = dot(ana, carla) / (norm(ana) * norm(carla))
A = [1.0 2; 3 4]
A'
typeof(A')
