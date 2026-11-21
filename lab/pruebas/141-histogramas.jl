using Plots
h = histogram([1, 2, 2, 3, 3, 3, 4, 4, 5])
h2 = histogram([0.1, 0.25, 0.3, 0.7, 0.71, 0.9, 1.3], bins = 4, label = "datos")
h3 = histogram([1, 2, 3, 4, 5, 6, 6, 6], bins = [0, 3, 6, 9])
h4 = histogram([5.0])
Random.seed!(3)
h5 = histogram(randn(500), xlabel = "z")
h6 = histogram(rand(1:6, 300) .+ rand(1:6, 300), bins = 1.5:1:12.5)
