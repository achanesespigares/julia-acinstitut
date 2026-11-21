using Plots
p = bar([3, 1, 4])
q = bar([1, 2, 3], [5, 2, 7], color = :red, label = "ventas")
plot!(q, [1, 2, 3], [1, 2, 3])
r = bar(1:4, [2.5, -1.0, 3.0, 0.5], title = "Saldo", fillcolor = :green, linecolor = :blue)
s = plot([1, 2, 3], [1, 5, 2])
bar!(s, [1, 2, 4], [2, 2, 2])
