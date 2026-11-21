for t in ["4", "x"]
    try
        n = parse(Int, t)
    catch
        println("no es entero: ", t)
    else
        println("entero: ", n)
    end
end
