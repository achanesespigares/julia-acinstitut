using Plots, Random
Random.seed!(7)
d1 = rand(1:6, 1000)
d2 = rand(1:6, 1000)
suma = d1 .+ d2
sietes = count(==(7), suma)
histogram(suma, bins = 1.5:1:12.5, label = "suma de dos dados")
es6 = ==(6)
es6(4)
