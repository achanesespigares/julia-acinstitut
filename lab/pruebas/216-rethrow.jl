function busca(d, k)
    try
        return d[k]
    catch e
        if e isa KeyError
            return 0
        end
        rethrow()
    end
end
d = Dict("a" => 1)
busca(d, "a")
busca(d, "b")
function raiz(x)
    try
        return sqrt(x)
    catch e
        e isa KeyError && return 0.0
        rethrow()
    end
end
raiz(4)
raiz(-4)
