function heun(f, y0, t0, tf, n)
    h = (tf - t0) / n
    t = t0
    y = y0
    for i in 1:n
        k1 = f(t, y)
        k2 = f(t + h, y + h * k1)
        y = y + h / 2 * (k1 + k2)
        t = t + h
    end
    return y
end
crece(t, y) = 0.5 * y
e1 = 100 * exp(2) - heun(crece, 100.0, 0.0, 4.0, 20)
e2 = 100 * exp(2) - heun(crece, 100.0, 0.0, 4.0, 40)
e1 / e2
T = 90.0
for i in 1:10
    T = T + 0.1 * (-25 * (T - 20))
    println(T)
end
T = 90.0
for i in 1:6
    T = T + 0.08 * (-25 * (T - 20))
end
T
