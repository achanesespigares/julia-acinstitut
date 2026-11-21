function euler(f, y0, t0, tf, n)
    h = (tf - t0) / n
    ts = [t0]
    ys = [y0]
    for i in 1:n
        push!(ys, ys[end] + h * f(ts[end], ys[end]))
        push!(ts, ts[end] + h)
    end
    return ts, ys
end
logis(t, y) = 0.5 * y * (1 - y / 1000)
ts, ys = euler(logis, 100.0, 0.0, 5.0, 10)
ys[end]
caida(t, v) = 9.8 - 0.5 * v
ts2, vs = euler(caida, 0.0, 0.0, 2.0, 4)
exacta = [20 + 70 * exp(-0.1 * t) for t in 0:5:30]
diferencias = exacta - [90.0, 55.0, 37.5, 28.75, 24.375, 22.1875, 21.09375]
maximum(diferencias)
