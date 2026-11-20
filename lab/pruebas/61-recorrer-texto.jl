# config: {"columnas":["c","vocales"],"fila_en":"fin_iteracion"}
frase = "El niño"
vocales = 0
for c in lowercase(frase)
    if c in "aeiouáéíóú"
        vocales += 1
    end
end
letras = [c for c in "año"]
codigos = [Int(c) for c in "año"]
cesar = join([c + 3 for c in "hola"])
vocales
