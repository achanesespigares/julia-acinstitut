using LinearAlgebra
I
J = 2I
-I
[1 2; 3 4] + I
[1.5 2; 3 4] - I
I - [1 2; 3 4]
I * [1, 2]
[1 2; 3 4] * I
3I == 3I
I == [1 0; 0 1]
[1 0; 0 2] == I
[1 0 0; 0 1 0] == I
M = [2//1 1; 4 3]
M * inv(M) == I
inv(I)
typeof(I)
K = I
