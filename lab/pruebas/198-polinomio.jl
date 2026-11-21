# config: {"columnas":["k","c","p"]}
coefs = [1, -3, 2]
p = :(0)
for (k, c) in enumerate(coefs)
    p = :($p + $c * x ^ $(k - 1))
end
p
x = 2
eval(p)
x = 0.5
eval(p)
