v = [3, 1, 2]
string(v...)
t = (1, 2)
+(t...)
Expr(:call, :+, [:x, 1]...)
w = [x > 1 ? x : 1.5 for x in [1, 2, 3]]
typeof(w)
sum(w)
prod(w)
m = [a for a in Any[:x, 2, :y]]
typeof(m)
e = :(x + 1)
p = [isa(a, Symbol) ? a : 0 for a in e.args]
filter(a -> a != 0, p)
