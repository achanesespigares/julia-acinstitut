function lee(t)
    try
        parse(Int, t)
    catch
        -1
    end
end
lee("5")
lee("cinco")
function lee2(t)
    n = try
        parse(Int, t)
    catch
        0
    end
    return n + 1
end
lee2("7")
lee2("?")
function primero(v)
    for x in v
        try
            return parse(Int, x)
        catch
            println("no: ", x)
        end
    end
    return nothing
end
primero(["a", "b", "3", "4"])
