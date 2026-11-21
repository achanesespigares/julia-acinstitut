function vacia!(v)
    empty!(v)
    return nothing
end
function vacia(v)
    v = Int[]
    return v
end
a = [1, 2, 3]
vacia(a)
a
vacia!(a)
a
b = [4, 5]
c = b
b = [6]
c
d = c
d[1] = 0
c
