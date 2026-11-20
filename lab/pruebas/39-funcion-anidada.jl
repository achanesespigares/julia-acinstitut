function externa(n)
    total = 0
    for k in 1:n
        total += interna(k)
    end
    return total
end
interna(k) = k^2
externa(3)
