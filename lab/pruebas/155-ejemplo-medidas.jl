using Statistics, Random
Random.seed!(3)
medidas = 20.0 .+ 0.5 .* randn(8)
media = mean(medidas)
desviacion = std(medidas)
margen = desviacion / sqrt(8)
