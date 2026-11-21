using Plots
examen = 1:3
notas = [9.0 7.5 10.0; 6.5 3.0 8.0; 7.0 8.5 9.5]
p = plot(examen, notas, label = ["Ana" "Biel" "Carla"], color = [:red :blue :green])
q = plot(examen, notas, lw = 2)
x = range(-1, 1, length = 21)
x2 = x .^ 2
x3 = x .^ 3
r = plot(x, [x x2 x3], label = ["x" "x²" "x³"], linestyle = [:solid :dash :dot])
scatter!(r, [0], [0], label = "origen")
r
