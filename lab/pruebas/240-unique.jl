unique([3, 1, 3, 2, 1])
unique(["b", "a", "b"])
unique([:x, :y, :x, :z, :y])
unique(['a', 'b', 'a'])
unique([true, false, true])
unique(Int[])
v = [1, 1]
w = unique(v)
w === v
push!(w, 5)
v
