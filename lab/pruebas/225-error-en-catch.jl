function f(x)
    try
        return parse(Int, x)
    catch e
        println("convierto mal")
        return parse(Float64, x)
    end
end
f("2")
f("2.5")
f("dos")
