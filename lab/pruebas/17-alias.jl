a = [1, 2, 3]
b = a
push!(b, 4)
c = a
c[2] = 20
a
d = copy(a)
d[1] = -1
a
