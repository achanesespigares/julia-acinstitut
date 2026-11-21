using Plots
x = [1, 2, 3, 4]
a = plot(x, [2.0, 4.0, 3.0, 5.0], color = :red, lw = 3, ls = :dash, title = "Rojo", xlabel = "x", ylabel = "y")
b = plot(x, [1, 2, 3, 4], c = :teal, linestyle = :dot, marker = :circle, ms = 6, legend = :topleft, label = false)
c = scatter(x, [4, 3, 2, 1], markershape = :o, markercolor = :orange, legend = false)
d = scatter(x, [0.5, 1.5, 1.0, 2.0], m = :rect, mc = :navy, linecolor = :gray, lab = "cuadrados")
plot!(d, x, [1, 1, 1, 1], linewidth = 0.5, linecolor = :black, style = :dashdot, label = "uno")
title!(d, "Formas")
xlabel!("tiempo")
ylabel!(d, "valor")
xlims!(0, 5)
ylims!(d, -1, 3)
e = plot(x, [3, 1, 4, 1], legend = :bottomright, seriestype = :scatter, marker = :diamond)
f = plot(x, [3, 1, 4, 1], xlims = (0, 10), ylims = (0.5, 4.5), legend = true, markershape = :utriangle)
d
