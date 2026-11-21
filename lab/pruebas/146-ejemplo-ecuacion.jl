function biseccion(f, a, b; tol = 0.001)
    while b - a > tol
        m = (a + b) / 2
        if f(a) * f(m) <= 0
            b = m
        else
            a = m
        end
    end
    return (a + b) / 2
end

g(x) = x^3 - x - 2
r = biseccion(g, 1, 2)
