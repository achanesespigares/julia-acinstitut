d = Dict{Int, Int}()
for i in 1:25
    d[i] = i^2
end
d
s = Dict(string(c) => Int(c) for c in "abc")
