notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5]
A = Rational.(notas)
b = Rational.([7.375, 6.875, 9.25])
w = A \ b
Float64.(w)
Rational(0.1)
Rational(2)
Rational(3, 6)
M = [2//1 1; 4 3]
M \ [5, 11]
M \ [5 1; 11 2]
[1//2 0; 0 1//3] \ [1, 1]
[2//1 1; 0 3] \ [1, 1]
[1//1 0; 2 4] \ [1//2, 1]
H = [1//(i + j - 1) for i in 1:4, j in 1:4]
inv(H)
H * inv(H)
