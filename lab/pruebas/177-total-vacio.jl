function total(v)
    s = v[1]
    for x in v[2:end]
        s = s + x
    end
    return s
end
total([])
