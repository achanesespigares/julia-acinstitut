a = :(0 + 1)
b = :($a + 2)
a.args[1] = :*
b
eval(b)
k = 2
e1 = :(k * 10)
e2 = :($k * 10)
k = 5
eval(e1), eval(e2)
ex = :(2x + 3y)
ex.args[2]
length(ex.args)
