# config: {"foco":"v"}
v = Int[]
for i in 1:4
    push!(v, i^2)
end
w = copy(v)
pop!(w)
v
w
sort([3, 1, 2], rev = true)
reverse(v)
first(v), last(v)
