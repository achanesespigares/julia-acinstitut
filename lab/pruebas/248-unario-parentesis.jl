v = [3, 1, 2]
hecho = [false, true]
i = 1
while !isempty(v)
    pop!(v)
end
if !hecho[i]
    println("pendiente")
end
x = 5
if -x < 0 && !hecho[2] == false
    println("sí")
end
w = [2, -4]
if -w[2] > 3
    println("mayor")
end
while !(i > 2)
    global i += 1
end
i
