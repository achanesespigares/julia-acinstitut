try
    parse(Int, "12")
catch
    0
end
try
    parse(Int, "doce")
catch
    0
end
x = try
    sqrt(-1)
catch
    -1.0
end
total = 0
for t in ["1", "a", "3"]
    try
        global total += parse(Int, t)
    catch
        println("salto ", t)
    end
end
total
try
    try
        error("dentro")
    catch
        println("primer catch")
        error("otra vez")
    end
catch
    println("segundo catch")
end
