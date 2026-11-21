macro dime(ex)
    return :(println($(string(ex)), " = ", $(esc(ex))))
end
macro doble(ex)
    return :(2 * $(esc(ex)))
end
macro suma(a, b)
    return :($(esc(a)) + $(esc(b)))
end
macro sin_esc(ex)
    return :($ex * 10)
end
x = 4
@dime x^2
@doble x + 1
@suma x 10
@sin_esc x
@macroexpand @doble x + 1
@macroexpand @suma x 10
@macroexpand @sin_esc x
@macroexpand @dime sqrt(x)
for i in 1:2
    @dime i * x
end
function prueba(k)
    @dime k + 1
    return @doble k
end
prueba(5)
