function duplica!(x)
    for i in eachindex(x)
        x[i] *= 2
    end
    return x
end
v = [1, 2, 3, 4, 5]
duplica!(view(v, 2:4))
v
duplica!(v[1:2])
v
w = view(v, 4:5)
fill!(w, 9)
v
