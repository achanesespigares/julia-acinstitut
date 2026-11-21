module Tienda
export precio
const IVA = 0.21
precio(base) = round(base * (1 + IVA); digits = 2)
end
using .Tienda
precios = precio.([10.0, 4.5, 20.0])
Tienda.IVA
v"1.10.0" > v"1.9.0"
