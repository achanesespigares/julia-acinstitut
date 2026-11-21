llamadas = 0
function fib(n)
    global llamadas += 1
    return n <= 2 ? 1 : fib(n - 1) + fib(n - 2)
end
fib(8)
llamadas
