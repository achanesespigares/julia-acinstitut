v = [3, 8, 15, 21, 30, 42, 57, 64, 77, 88]
x = 64
izq = 1
der = length(v)
pasos = 0
while izq <= der
    pasos += 1
    m = (izq + der) ÷ 2
    if v[m] == x
        break
    elseif v[m] < x
        izq = m + 1
    else
        der = m - 1
    end
end
pasos
