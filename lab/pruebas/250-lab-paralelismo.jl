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
ejecuta([1, 1, 2, 2])
ejecuta([2, 1, 1, 2])
