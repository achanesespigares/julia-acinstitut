function primero_negativo(v)
    for x in v
        x < 0 && return x
    end
    return nothing
end
primero_negativo([3, -1, -5])
primero_negativo([1, 2])
function signo(x)
    x > 0 && return "positivo"
    x < 0 && return "negativo"
    return "cero"
end
signo.([4, -2, 0])
function busca(v, k)
    i = 1
    while i <= length(v)
        v[i] == k && return i
        i += 1
    end
    return 0
end
busca([5, 7, 9], 9)
busca([5, 7, 9], 1)
function vacio(v)
    isempty(v) || return false
    return true
end
vacio(Int[])
vacio([1])
