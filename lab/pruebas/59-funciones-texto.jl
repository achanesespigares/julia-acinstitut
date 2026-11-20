nombre = "ana"
apellido = "pérez"
completo = titlecase(nombre * " " * apellido)
saludo = "Hola, $completo. Tienes $(length(nombre)) letras."
grito = uppercase(saludo)
bajo = lowercase("ÑU")
corregido = replace(completo, "é" => "e")
doble = replace("canción", "ó" => "o", "c" => "k")
r = reverse("canción")
pr = uppercasefirst("ana")
ok1 = occursin("Pé", completo)
ok2 = startswith(completo, "An")
ok3 = endswith(completo, 'z')
f1 = findfirst('a', "banana")
f2 = findfirst("ón", "canción")
f3 = findlast('a', "banana")
f4 = findfirst('z', "hola")
f5 = findnext('a', "banana", 3)
pareja = "a" => "b"
tiene = 'a' in "banana"
cuenta = count(isletter, "a1b2ñ")
solo = filter(isletter, "¡Hola, mundo!")
mayus = map(uppercase, "hola")
pri = first("canción", 3)
ult = last("canción", 3)
