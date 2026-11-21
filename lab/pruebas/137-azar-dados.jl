Random.seed!(2026)
tiradas = rand(1:6, 10000)
seises = count(==(6), tiradas)
println(seises / 10000)
monedas = rand(["cara", "cruz"], 20)
println(count(==("cara"), monedas))
suma = rand(1:6, 1000) .+ rand(1:6, 1000)
println(count(==(7), suma))
println(maximum(suma), " ", minimum(suma))
x = rand()
if x < 0.5
    println("bajo")
else
    println("alto")
end
