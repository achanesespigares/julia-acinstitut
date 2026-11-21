using Plots
notas = [9.0, 6.5, 7.0]
plot(notas)
p = plot(1:3, notas, label = "Ana")
q = p
plot!(p, 1:3, [7.5, 3.0, 8.5], label = "Biel")
s = scatter([1, 2, 3], [10.0, 8.0, 9.5], label = "Carla")
scatter!([2], [4.0], label = "Dani")
plot!(p, [1, 3], [5, 5], label = "aprobado")
display(p)
println(p)
n = length(notas)
r = plot!(s, [1, 2, 3], [1.0, 2.0, 3.0])
r === s
