nota = 7.5
for nota in [3.0, 9.5]
    r = nota >= 9 ? "sobre" : nota >= 5 ? "apto" : "no apto"
    println(r)
end
nota
estado = nota > 5 ? (nota > 7 ? 2 : 1) : 0
x = 0
x > 0 && println("positivo")
x >= 0 || println("negativo")
x == 0 && println("cero")
