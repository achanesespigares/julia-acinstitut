v = [3, 8, 1]
n = 0
for i in 1:length(v)
    if v[end] < v[i] && abs(v[i] - 5) <= 3
        n += 1
    end
end
n
