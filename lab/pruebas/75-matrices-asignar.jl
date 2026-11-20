B = zeros(3, 4)
U = ones(Int, 2, 3)
F = fill(7, 2, 2)
G = fill(0.5, 1, 3)
B[2, 3] = 9
B[1, :] .= 5
B[:, 2] = [1.0, 2.0, 3.0]
B[3, 1:2] = [8, 8]
B[2, 4] += 1.5
B[end, end] = -1
B[6] = 4
B .= 0
U[U .> 0] .= 3
U[2, :] = [7, 8, 9]
C = copy(U)
C[1, 1] = 100
U
F .= [1 2; 3 4]
for i in 1:2
    for j in 1:2
        F[i, j] = 10i + j
    end
end
F
