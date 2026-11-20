A = [1 2 3; 4 5 6]
v = vec(A)
v[1] = 100
A
R = reshape(v, 3, 2)
R[3, 2] = -6
A
P = permutedims(A)
P[1, 1] = 0
A
t = A'
size(t)
A[2, 1] = 40
t
t[1, 2]
s = transpose(A)
original = (A')'
original === A
t === A'
H = hcat([1, 2], [3, 4])
V2 = vcat([1 2], [3 4])
x = [1, 2, 3]
y = [4, 5, 6]
juntos = [x y]
apilados = [A; A]
lado = [A A]
tabla = [i * j for i in 1:3, j in 1:4]
for e in [1 2; 3 4]
    println(e)
end
k = collect(t)
w = [1, 2, 3]
fw = w'
fw[2]
