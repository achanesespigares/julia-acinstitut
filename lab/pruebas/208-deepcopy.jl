mutable struct Caja
    n::Int
end
c = Caja(1)
v = [c, c, Caja(5)]
d = deepcopy(v)
d[1].n = 99
d[2].n
v[1].n
d[1] === d[2], d[1] === v[1]
u = [1, 2]
t = (u, u)
dt = deepcopy(t)
dt[1] === dt[2], dt[1] === u
push!(dt[1], 3)
dt
t
