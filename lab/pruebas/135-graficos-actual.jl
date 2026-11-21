using Plots
plot!([1, 2, 3], [3, 1, 2], label = "sin gráfico antes")
a = plot([1, 2], [1, 2], label = "a")
b = plot([1, 2], [2, 1], label = "b")
plot!(a, [1, 2], [1.5, 1.5], label = "en a")
plot!([1, 2], [0.5, 0.5], label = "también en a")
title!("Título de a")
b
