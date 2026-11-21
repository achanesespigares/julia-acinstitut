celdas = ["a = 3", "b = a^2", "c = b - a"]
for c in celdas
    eval(Meta.parse(c))
end
(a, b, c)
celdas[2] = "b = 10a"
for i in [2, 3]
    eval(Meta.parse(celdas[i]))
end
(a, b, c)
eval(Meta.parse("c = c + 1"))
c
ex = Meta.parse(celdas[3])
ex.args[1]
ex.args[2]
