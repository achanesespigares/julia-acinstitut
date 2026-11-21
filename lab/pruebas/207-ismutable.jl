struct P
    x::Int
end
mutable struct Q
    x::Int
end
ismutable(1), ismutable(2.5), ismutable('a'), ismutable("hola")
ismutable(:s), ismutable((1, 2)), ismutable(1:3), ismutable(nothing)
ismutable([1]), ismutable(Dict(1 => 2)), ismutable(P(1)), ismutable(Q(1))
ismutable(Int), ismutable(sin), ismutable([1 2; 3 4])
