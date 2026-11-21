function recorre(i, hijos, vistos = Int[])
    push!(vistos, i)
    for j in hijos[i]
        recorre(j, hijos, vistos)
    end
    return vistos
end
hijos = [[2, 3], [4], Int[], Int[]]
recorre(1, hijos)
function primero_par(v)
    for x in v
        iseven(x) && return x
    end
    return 0
end
primero_par([1, 4, 5, 6])
primero_par([3, 8])
primero_par([1, 3])
