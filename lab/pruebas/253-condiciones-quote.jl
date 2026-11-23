op = :+
if op == :+
    println("suma")
end
args = Any[0, :x, 1]
if any(a -> a == 0, args)
    println("hay un cero")
end
a = 5
if all(a -> a isa Number, [1, 2.5])
    println("números")
end
ex = :(x ^ 2)
if ex.args[1] == :^ && ex.args[3] == 2
    println("cuadrado")
end
for b in ex.args
    if b == :x
        println("la variable")
    end
end
