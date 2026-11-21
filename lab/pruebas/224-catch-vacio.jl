n = 0
try
    n = parse(Int, "x")
catch
end
n
try
    error("uno")
catch e
end
for i in 1:3
    try
        i == 2 && error("dos")
        println(i)
    catch
    end
end
