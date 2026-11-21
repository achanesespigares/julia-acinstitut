ex = Meta.parse("y = 2x + f(z, 1)")
ex.head
ex.args[1] isa Symbol
ex.args[2] isa Expr
ex.args[2].head == :call
ex.args[2].args[2:end]
1 isa Symbol
function cuenta(ex)
    ex isa Symbol && return 1
    ex isa Expr || return 0
    n = 0
    for a in ex.args
        n += cuenta(a)
    end
    return n
end
cuenta(ex)
cuenta(:(a + b * c))
cuenta(42)
