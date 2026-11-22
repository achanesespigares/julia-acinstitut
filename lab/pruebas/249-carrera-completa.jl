function ejecuta(orden)
    total = 0
    leido = [0, 0]
    leyo = [false, false]
    for h in orden
        if !leyo[h]
            leido[h] = total
            leyo[h] = true
        else
            total = leido[h] + 1
            leyo[h] = false
        end
    end
    return total
end
function intercala(a, b)
    a == 0 && return [fill(2, b)]
    b == 0 && return [fill(1, a)]
    con1 = [[1; o] for o in intercala(a - 1, b)]
    con2 = [[2; o] for o in intercala(a, b - 1)]
    return [con1; con2]
end
[ejecuta(o) for o in intercala(2, 2)]
intercala(1, 1)
length(intercala(2, 3))
