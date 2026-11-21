using Statistics, Random
Random.seed!(7)
m4 = 45.75 .+ 0.5 .* randn(4)
mean(m4), std(m4) / sqrt(4)
Random.seed!(7)
m15 = 45.75 .+ 0.5 .* randn(15)
mean(m15)
std(m15) / sqrt(15)
