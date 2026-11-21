a = 1.0
b = 2.0
while b - a > 0.25
    m = (a + b) / 2
    if m * m - 2 > 0
        b = m
    elseif m - a > 10
        a = 0.0
    else
        a = m
    end
end
println(a, " ", b)
