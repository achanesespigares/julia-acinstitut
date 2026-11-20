function saluda(nombre, signo = "!")
    return "Hola, " * nombre * signo
end
a = saluda("Ana")
b = saluda("Ana", "?")
function potencia(x; n = 2)
    x^n
end
c = potencia(3)
d = potencia(3, n = 3)
saluda
