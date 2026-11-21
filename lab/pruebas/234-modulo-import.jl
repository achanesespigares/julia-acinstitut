module Notas
export media
media(v) = round(sum(v) / length(v); digits = 1)
end
module Estadistica
export media, mediana
media(v) = sum(v) / length(v)
mediana(v) = sort(v)[(length(v) + 1) ÷ 2]
end
using .Notas, .Estadistica
using .Notas: media
v = [6.5, 8.0, 4.5]
media(v)
mediana(v)
import .Estadistica: mediana
mediana([3, 1, 2])
