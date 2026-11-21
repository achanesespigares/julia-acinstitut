v = [1, 2, 3]
e = view(v, 2:1)
length(e)
e
w = view(v, 2:3)
sort!(view(v, 1:3); rev = true)
v
