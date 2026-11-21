doble(x) = 2x
module Notas
export triple
triple(x) = doble(x) + x
end
using .Notas
triple(3)
