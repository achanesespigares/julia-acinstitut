doble(x) = 2x
aprobado(nota) = nota >= 5
v = [9.0, 4.0, 7.5, 3.0]
d = doble.(v)
n = count(aprobado, v)
m = map(doble, [1, 2, 3])
f = filter(aprobado, v)
extremos(w) = (minimum(w), maximum(w))
mn, mx = extremos(v)
saluda(nombre = "mundo") = "Hola, $nombre"
h1 = saluda()
h2 = saluda("Ana")
fact(k) = k <= 1 ? 1 : k * fact(k - 1)
grande = fact(21)
