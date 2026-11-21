A = [1 2 3; 4 5 6]
col = view(A, :, 2)
fila = view(A, 1, :)
trozo = view(A, 2, 1:2)
col[1] = 20
fila .+= 100
trozo .= 0
A
col
typeof(fila)
sum(col)
