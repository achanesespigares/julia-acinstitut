mezcla(x::Integer, y::Number) = "el entero va primero"
mezcla(x::Number, y::Integer) = "el entero va segundo"
mezcla(x::Integer, y::Integer) = "dos enteros"
mezcla(1, 2)
mezcla(1, 2.5)
mezcla(true, false)
mezcla
