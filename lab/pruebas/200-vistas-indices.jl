v = [10, 20, 30, 40, 50, 60]
a = view(v, :)
b = view(v, 1:2:5)
c = view(v, [6, 1, 1])
d = view(v, v .> 35)
a[6] = 0
b[3] = -1
c[1] = 7
v
d
length(b), size(c), eltype(d)
typeof(b)
typeof(c)
