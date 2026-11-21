v = [3.5, 9.0, 1.0, 9.0, 2.0]
m, i = findmax(v)
argmax(v)
findmin(v)
argmin([4, 2, 8, 2])
function raiz(x)
    x >= 0 || error("no hay raíz de $x")
    return sqrt(x)
end
raiz(16)
raiz(-4)
