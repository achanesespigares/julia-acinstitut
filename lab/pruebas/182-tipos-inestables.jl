mitad_o_cero(x) = x > 0 ? x / 2 : 0
mitad_o_cero(4)
mitad_o_cero(-4)
typeof(mitad_o_cero(-4))
mitad_o_cero_estable(x) = x > 0 ? x / 2 : 0.0
mitad_o_cero_estable(-4)
function suma_mitades(n)
    s = 0
    for i in 1:n
        s += i / 2
    end
    return s
end
suma_mitades(3)
suma_mitades(0)
struct CajaReal
    x::Real
end
c = CajaReal(2)
typeof(c.x)
c2 = CajaReal(2//3)
typeof(c2)
CajaReal("dos")
