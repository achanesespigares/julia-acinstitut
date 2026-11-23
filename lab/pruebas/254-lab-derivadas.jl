deriva(c::Number, x) = 0
deriva(s::Symbol, x) = s == x ? 1 : 0
function deriva(ex::Expr, x)
    op = ex.args[1]
    a = ex.args[2]
    b = ex.args[3]
    if op == :+
        return :($(deriva(a, x)) + $(deriva(b, x)))
    elseif op == :*
        return :($(deriva(a, x)) * $b + $a * $(deriva(b, x)))
    end
    error("no sé derivar $op")
end
deriva(:(3x + 5), :x)
deriva(:(x * x), :x)
