using Statistics
function recta(x, y)
    mx = mean(x)
    my = mean(y)
    b = sum((x .- mx) .* (y .- my)) / sum((x .- mx) .^ 2)
    return my - b * mx, b
end
h = [1, 2, 3, 4, 5, 6]
nn = [4.5, 5.0, 6.5, 6.0, 7.5, 8.5]
a, b = recta(h, nn)
a + b * 7
t = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
T = [89.7, 76.7, 67.4, 57.8, 51.6, 45.2, 40.0, 36.3, 33.6, 32.7, 29.9]
y = log.(T .- 20)
a, b = recta(t, y)
r = y .- (a .+ b .* t)
sum(r)
findmax(abs.(r))
a10, b10 = recta(t[1:10], y[1:10])
-b10, exp(a10)
