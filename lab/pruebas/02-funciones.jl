function media(v)
    s = 0.0
    for x in v
        s += x
    end
    return s / length(v)
end
area(r) = π * r^2
m = media([2, 4, 9])
a = area(2)
doble(x) = 2x
println(doble(doble(3)))
