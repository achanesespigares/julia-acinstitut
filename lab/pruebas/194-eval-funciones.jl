function base(x)
    return x + 1
end
for (nombre, k) in [:mas_uno => 1, :mas_dos => 2]
    @eval $nombre(x) = base(x) + $k - 1
end
mas_uno(1)
mas_dos(1)
@eval cuadrado(x) = x^2
cuadrado(3)
nombre = :triple
@eval $nombre(x) = 3x
triple(2)
triple
