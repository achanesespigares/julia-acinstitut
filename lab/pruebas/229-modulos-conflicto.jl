module Notas
export media
media(v) = round(sum(v) / length(v); digits = 1)
end
module Estadistica
export media
media(v) = sum(v) / length(v)
end
using .Notas
using .Estadistica
v = [6.5, 8.0, 4.5]
Notas.media(v)
Estadistica.media(v)
media(v)
