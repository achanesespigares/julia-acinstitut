linea = "Ana,9.0,Biel,4.0"
partes = split(linea, ",")
nombres = partes[1:2:end]
notas = parse.(Float64, partes[2:2:end])
juntos = join(nombres, " y ")
pos = findfirst(',', linea)
frase = "  El gato   come  "
limpia = strip(frase)
palabras = split(frase)
n = length(palabras)
largos = length.(palabras)
grandes = uppercase.(palabras)
vacios = split("a,,b", ",")
num = join([1, 2, 3], ", ")
mezcla = ["a", palabras[1]]
corta = chop("hola")
partes[1]
palabras
