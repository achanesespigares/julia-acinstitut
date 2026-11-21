d = [[2, 4], [3], [4], Int[]]
typeof(d)
d[1]
a = d[2]
push!(a, 9)
d
a === d[2]
length(d)
push!(d, [7, 8])
d
u = [Symbol[], [:x], [:y], [:x, :z]]
u[4]
:z in u[4]
nombres = [["Ana", "Biel"], ["Carla"]]
nombres[1][2]
e = Vector{Int64}[]
push!(e, [1])
e
f = Vector{Symbol}[[:a], Symbol[]]
s = [findall(x -> x > k, [3, 1, 4, 1, 5]) for k in 0:2]
length.(s)
