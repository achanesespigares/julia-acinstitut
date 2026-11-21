x = 3
eval(:(x + 1))
eval(:x)
eval(5)
eval(:(y = x * 10))
y
eval(:(cubo(n) = n^3))
cubo(4)
function interior()
    x = 100
    return eval(:(x + 1))
end
interior()
e = :(x * 2)
e.args[3] = 7
e
eval(e)
eval(:(zzz + 1))
