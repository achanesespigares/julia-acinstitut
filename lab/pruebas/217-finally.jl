function intenta(x)
    try
        println("abro")
        return 10 / x
    catch e
        println("error")
    end
end
intenta(2)
abiertos = 0
for x in [1, 0, 2]
    try
        global abiertos += 1
        x == 0 && error("cero")
        println("bien ", x)
    catch e
        println("mal: ", e.msg)
    finally
        global abiertos -= 1
        println("cierro ", x)
    end
end
abiertos
try
    println("sin error")
finally
    println("finally")
end
try
    sqrt(-1)
finally
    println("finally con error")
end
