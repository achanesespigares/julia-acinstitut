function c(x)
    y = x - 1
    return log(y)
end
function b(x)
    z = c(x)
    return z * 2
end
function a(x)
    try
        return b(x)
    catch e
        println("a atrapa: ", typeof(e))
        return NaN
    end
end
a(3)
a(0)
b(0)
