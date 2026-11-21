module Notas
export media, aprobado
const MINIMO = 5
redondea(x) = round(x; digits = 1)
media(v) = redondea(sum(v) / length(v))
aprobado(n) = n >= MINIMO
end
using .Notas
notas = [6.5, 8.0, 4.5]
m = media(notas)
aprobado(m)
Notas.redondea(7.26)
Notas.MINIMO
redondea(7.26)
