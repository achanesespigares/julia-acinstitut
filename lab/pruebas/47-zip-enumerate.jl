# config: {"columnas":["i","x","y"],"fila_en":"fin_iteracion"}
a = [1, 2, 3, 4]
b = [10.0, 20.0, 30.0]
t = 0.0
for (x, y) in zip(a, b)
    t += x * y
end
for (i, x) in enumerate(2:2:6)
    println(i, " -> ", x)
end
for (i, (x, y)) in enumerate(zip("ab", a))
    println(i, x, y)
end
t
