junta(x::Integer, y::Integer) = "dos enteros"
junta(x::Integer, y::AbstractFloat) = "entero y decimal"
junta(x::AbstractFloat, y::Integer) = "decimal y entero"
junta(x, y) = "otra cosa"
junta(true, 2)
junta(true, 2.0)
junta(2//3, 1)
junta('a', 1)
tres(x::Number, y, z) = "número primero"
tres(x, y::Number, z::String) = "número y texto"
tres(x, y, z) = "cualquiera"
tres(1, "a", "b")
tres("a", 1, "b")
tres("a", "b", "c")
cuenta(x::Integer, y::Integer = 1) = x + y
cuenta(x) = "uno"
cuenta(5)
cuenta(5, 2)
junta(x::Integer, y::Integer) = "otra vez dos enteros"
junta(3, 4)
junta
