v = [1, 2, 3, 4]
w = view(v, 2:3)
w === view(v, 2:3)
w === view(v, 1:2)
parent(w) === v
w == [2, 3]
copy(w)
typeof(copy(w))
u = w .* 10
v
ismutable(w), ismutable(v), ismutable(u)
