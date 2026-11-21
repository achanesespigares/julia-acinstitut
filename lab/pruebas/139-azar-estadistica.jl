using Statistics
datos = [2, 4, 4, 4, 5, 5, 7, 9]
println(mean(datos))
println(var(datos))
println(std(datos))
Random.seed!(1)
d = rand(1:6, 12)
println(var(d))
x = [1.5, 2.5, 4.0]
println(std(x))
