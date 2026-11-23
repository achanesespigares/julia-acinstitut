module Derivadas

export deriva, simplifica, valor, comprueba

"""
    deriva(ex, x)

La derivada de la expresión `ex` respecto de la variable `x`, como otra expresión.
Sabe derivar números, variables, `+`, `-`, `*`, `/`, `^` (con exponente fijo),
`sin`, `cos`, `exp` y `log`.
"""
deriva(c::Number, x) = 0
deriva(s::Symbol, x) = s == x ? 1 : 0
function deriva(ex::Expr, x)
    op = ex.args[1]
    a = ex.args[2]
    if op == :+
        r = deriva(a, x)
        for b in ex.args[3:end]
            r = :($r + $(deriva(b, x)))
        end
        return r
    elseif op == :- && length(ex.args) == 2
        return :(-$(deriva(a, x)))
    elseif op == :-
        b = ex.args[3]
        return :($(deriva(a, x)) - $(deriva(b, x)))
    elseif op == :* && length(ex.args) > 3
        b = Expr(:call, :*, ex.args[3:end]...)      # a * b * c es a * (b * c)
        return :($(deriva(a, x)) * $b + $a * $(deriva(b, x)))
    elseif op == :*
        b = ex.args[3]
        return :($(deriva(a, x)) * $b + $a * $(deriva(b, x)))
    elseif op == :/
        b = ex.args[3]
        return :(($(deriva(a, x)) * $b - $a * $(deriva(b, x))) / $b ^ 2)
    elseif op == :^
        n = ex.args[3]
        return :($n * $a ^ ($n - 1) * $(deriva(a, x)))
    elseif op == :sin
        return :(cos($a) * $(deriva(a, x)))
    elseif op == :cos
        return :(-(sin($a)) * $(deriva(a, x)))
    elseif op == :exp
        return :(exp($a) * $(deriva(a, x)))
    elseif op == :log
        return :($(deriva(a, x)) / $a)
    end
    error("no sé derivar $op")
end

"""
    simplifica(ex)

Quita lo que sobra de una expresión: sumar 0, multiplicar por 1, multiplicar por 0,
elevar a 1 o a 0, y las cuentas que solo tienen números.
"""
simplifica(e) = e
function simplifica(ex::Expr)
    op = ex.args[1]
    args = [simplifica(a) for a in ex.args[2:end]]
    if all(a -> a isa Number, args)
        return eval(Expr(:call, op, args...))
    end
    if op == :+
        args = filter(a -> a != 0, args)
    elseif op == :*
        if any(a -> a == 0, args)
            return 0
        end
        args = filter(a -> a != 1, args)
    elseif op == :^ && args[2] == 1
        return args[1]
    elseif op == :^ && args[2] == 0
        return 1
    end
    if (op == :+ || op == :*) && length(args) == 1
        return args[1]
    end
    return Expr(:call, op, args...)
end

"""
    valor(ex, x, v)

El número que vale la expresión `ex` cuando la variable `x` vale `v`.
"""
valor(c::Number, x, v) = c
valor(s::Symbol, x, v) = s == x ? v : error("no sé cuánto vale $s")
function valor(ex::Expr, x, v)
    op = ex.args[1]
    a = [valor(b, x, v) for b in ex.args[2:end]]
    if op == :+
        return sum(a)
    elseif op == :*
        return prod(a)
    elseif op == :-
        return length(a) == 1 ? -a[1] : a[1] - a[2]
    elseif op == :/
        return a[1] / a[2]
    elseif op == :^
        return a[1] ^ a[2]
    elseif op == :sin
        return sin(a[1])
    elseif op == :cos
        return cos(a[1])
    elseif op == :exp
        return exp(a[1])
    elseif op == :log
        return log(a[1])
    end
    error("no sé calcular $op")
end

"""
    comprueba(respuesta, ex, x)

¿Es `respuesta` la derivada de `ex` respecto de `x`? Compara sus valores con los de
`deriva(ex, x)` en tres puntos, así que acepta cualquier forma de escribirla.
"""
function comprueba(respuesta, ex, x)
    d = deriva(ex, x)
    for v in [0.5, 1.5, 2.5]
        if !(valor(respuesta, x, v) ≈ valor(d, x, v))
            return false
        end
    end
    return true
end

end # module Derivadas
