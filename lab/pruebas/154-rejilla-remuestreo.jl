using Statistics, Random
t = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
T = [89.7, 76.7, 67.4, 57.8, 51.6, 45.2, 40.0, 36.3, 33.6, 32.7, 29.9]
function sc(k)
    e = exp.(-k .* t)
    A = sum(e .* (T .- 20)) / sum(e .^ 2)
    return sum((T .- 20 .- A .* e) .^ 2)
end
ks = 0.090:0.0005:0.110
v = [sc(k) for k in ks]
m, i = findmin(v)
ks[i]
Random.seed!(7)
med = 45.75 .+ 0.5 .* randn(10)
Random.seed!(1)
ms = Float64[]
for vuelta in 1:30
    j = rand(1:10, 10)
    push!(ms, mean(med[j]))
end
o = sort(ms)
o[1], o[30]
