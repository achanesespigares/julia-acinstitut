N = 763
S = 762.0
I = 1.0
for dia in 1:8
    contagios = 1.67 * S * I / N
    curas = 0.44 * I
    S = S - contagios
    I = I + contagios - curas
end
I
