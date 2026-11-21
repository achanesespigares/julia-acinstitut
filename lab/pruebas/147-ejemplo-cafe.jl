# config: {"columnas":["t","T"],"fila_en":"fin_iteracion"}
k = 0.1
T = 90.0
t = 0.0
h = 2.0
while t < 20
    T = T + h * (-k * (T - 20))
    t += h
end
T
