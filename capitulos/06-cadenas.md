---
title: Cadenas y caracteres
subtitle: Lo que hay dentro de un texto, letra a letra y byte a byte
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

Llevas usando textos desde el primer capítulo: `println("La media es ", media)`, `"aprobado"`, `"Ana"`. Pero hasta ahora un texto era un bloque: se guardaba, se escribía y poco más. En una ficha de alumnos, en cambio, hay que sacar la inicial de cada nombre, poner los apellidos en mayúsculas, contar letras o partir una línea `Ana,9.0` en sus dos datos.

## La pregunta

¿Qué es un texto por dentro? ¿Cómo se saca una letra, se recorre un texto letra a letra, se cambia o se parte en trozos?

## La idea

Un texto, un **`String`**, es una fila de **caracteres**. Cada carácter es un valor de tipo **`Char`** y se escribe entre comillas simples: `'a'`, `'ñ'`, `'7'`. El texto va entre comillas dobles: `"año"`.

Por dentro, Julia guarda el texto en **bytes**, con la codificación **UTF-8**: las letras sin tilde ocupan 1 byte; la `ñ`, la `á` o la `ó`, 2; un emoji, 4. Y los índices de un texto **cuentan bytes, no letras**. En `"hola"` da igual, porque cada letra es un byte. En `"canción"` no: la `ó` ocupa los bytes 6 y 7, así que `s[6]` es `'ó'`, `s[7]` no es una posición válida y `s[8]` es la `n`.

:::{important} Recorre el texto, no cuentes posiciones a mano
`length(s)` cuenta letras y `ncodeunits(s)` cuenta bytes. Con acentos no coinciden. Para ir letra a letra, usa `for c in s`, `collect(s)` o `eachindex(s)`, que dan las posiciones válidas, y no `1:length(s)`. Y recuerda que un texto **no se puede cambiar**: `s[1] = 'X'` da un error. Para cambiarlo, se construye un texto nuevo.
:::

## Construcción

### 1 · Un texto es una fila de caracteres

:::{tip} Predice
`s[1]` es la primera letra de `"hola"`. ¿Qué tipo tiene: `String` o `Char`? ¿Y qué será `primera + 1`?
:::

```{code-cell} julia
s = "hola"
primera = s[1]
ultima = s[end]
n = length(s)
codigo = Int(primera)
siguiente = primera + 1
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/06-cadenas-1.json","config":{"etiqueta":"String · Char","idea":"Un texto es una fila de caracteres, cada uno con su índice. s[1] no es un texto de una letra: es un Char, un carácter suelto, que por dentro es un número.","letras":true,"titulo":"Letras con número"}}
```

El visualizador dibuja `s` como una fila de casillas, igual que un vector, con el índice debajo de cada letra. `s[1]` es `'h'`, entre comillas simples: no es el texto `"h"`, sino un **carácter**, un valor de tipo `Char`. `s[end]` es la última letra, y `length(s)`, cuántas hay.

Por dentro, cada carácter es un número: su código en la tabla **Unicode**. `Int('h')` da 104. Por eso tiene sentido `'h' + 1`: es el carácter siguiente de la tabla, `'i'`. Y `'d' - 'a'` da 3, la distancia entre las dos letras. El visualizador escribe el código al lado de cada `Char`.

### 2 · Las letras con tilde ocupan más

:::{tip} Predice
`"canción"` tiene 7 letras. ¿Qué dará `s[7]`?
:::

```{code-cell} julia
s = "canción"
n = length(s)
b = ncodeunits(s)
o = s[6]
i = nextind(s, 6)
s[7]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/06-cadenas-2.json","config":{"etiqueta":"UTF-8 · índices","idea":"Los índices de un texto cuentan bytes. La ó empieza en el byte 6 y ocupa también el 7, así que el 7 no es un índice válido: después de la ó viene la n, en el 8.","letras":true,"titulo":"La ó ocupa dos bytes"}}
```

`length(s)` da 7 letras, pero `ncodeunits(s)` da 8 bytes: la `ó` ocupa dos. En el visualizador, su casilla es más ancha, lleva la marca «2 bytes» y debajo tiene dos números: el 6, que es su índice, y un 7 tachado.

`s[6]` es `'ó'`. Para saber dónde empieza la letra siguiente, `nextind(s, 6)` da 8. Y `s[7]` se detiene con un error que lo explica todo: ``StringIndexError: invalid index [7], valid nearby indices [6]=>'ó', [8]=>'n'``. El 7 cae en medio de la `ó`, y Julia te dice cuáles son las posiciones válidas de alrededor.

¿Por qué no cuenta Julia en letras, como R o Python? Porque con bytes, ir a la posición `i` es inmediato: Julia salta directamente a ese byte. Contando letras tendría que recorrer el texto desde el principio, porque no sabe cuántas letras de varios bytes hay antes. Lo verás en el «A fondo».

### 3 · Recorrer un texto

:::{tip} Predice
¿Cuántas vocales tiene `"El niño"`? ¿Se cuenta la `E` mayúscula?
:::

```{code-cell} julia
frase = "El niño"
vocales = 0
for c in lowercase(frase)
    if c in "aeiouáéíóú"
        vocales += 1
    end
end
vocales
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/06-cadenas-3.json","config":{"columnas":["c","vocales"],"etiqueta":"for c in s","fila_en":"fin_iteracion","idea":"for c in s da una vuelta por cada letra, sea de uno o de dos bytes. c in \"aeiouáéíóú\" pregunta si la letra está en ese texto.","letras":true,"titulo":"Letra a letra"}}
```

`for c in texto` da una vuelta **por cada letra**, no por cada byte: la `ñ` es una sola vuelta, aunque ocupe dos bytes. Así no hay que pensar en índices. Antes, `lowercase(frase)` pasa el texto a minúsculas, para que la `E` cuente como `e`.

`c in "aeiouáéíóú"` pregunta si el carácter `c` está entre las letras de ese texto. La tabla enseña cada letra y la cuenta: 3 vocales, la `e`, la `i` y la `o`.

Si necesitas también la posición, `eachindex(frase)` da los índices válidos, saltándose los bytes de en medio: para `"El niño"`, 1, 2, 3, 4, 5, 6 y 8.

### 4 · Construir textos nuevos

:::{tip} Predice
Las variables `nombre` y `apellido` están en minúsculas. ¿Cómo quedará `completo`? ¿Y qué pasará en la última línea?
:::

```{code-cell} julia
nombre = "ana"
apellido = "pérez"
completo = titlecase(nombre * " " * apellido)
saludo = "Hola, $completo. Tu nombre tiene $(length(nombre)) letras."
grito = uppercase(saludo)
sin_tilde = replace(completo, "é" => "e")
completo[1] = 'X'
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/06-cadenas-4.json","config":{"etiqueta":"* · $ · replace","idea":"Cada función devuelve un texto nuevo y deja el original como estaba. Y un texto no se puede modificar casilla a casilla: s[1] = 'X' da un error.","letras":true,"titulo":"Textos nuevos a partir de otros"}}
```

En Julia los textos se **juntan con `*`**, no con `+`: `nombre * " " * apellido` da `"ana pérez"`. Puede parecer raro, pero en matemáticas `*` es la operación que no tiene por qué ser conmutativa, como juntar textos: `"ab"` no es `"ba"`. Por la misma razón, `"ja"^3` es `"jajaja"`. `titlecase` pone en mayúscula la primera letra de cada palabra.

Dentro de un texto, `$completo` pone el valor de la variable, y `$(length(nombre))` el de cualquier expresión. Es la **interpolación**, la forma más cómoda de escribir un texto con datos.

`uppercase` lo pasa todo a mayúsculas, también la `é`. `replace(completo, "é" => "e")` cambia cada `"é"` por una `"e"`. La flecha `=>` forma una **pareja**, «esto se convierte en esto». Se pueden dar varias: `replace(s, "á" => "a", "é" => "e")`.

Ninguna de estas funciones cambia el texto original: todas devuelven uno nuevo. Y es que un `String` **no se puede modificar**. La última línea lo intenta, y Julia responde que no existe `setindex!` para un `String`: no hay forma de cambiar la casilla 1 de un texto.

### 5 · Partir y juntar

:::{tip} Predice
`split` parte un texto en trozos. ¿De qué tipo serán los trozos?
:::

```{code-cell} julia
linea = "Ana,9.0,Biel,4.0"
partes = split(linea, ",")
nombres = partes[1:2:end]
notas = parse.(Float64, partes[2:2:end])
juntos = join(nombres, " y ")
pos = findfirst(',', linea)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/06-cadenas-5.json","config":{"etiqueta":"split · join · parse","idea":"split corta el texto por cada coma y da un vector de trozos. parse convierte un trozo de texto en número. join hace lo contrario que split: pega los trozos con lo que le digas en medio.","letras":true,"titulo":"De una línea a datos"}}
```

`split(linea, ",")` corta por cada coma y da un vector con los cuatro trozos. Su tipo no es `Vector{String}` sino `Vector{SubString{String}}`. Un **`SubString`** es un trozo que no copia las letras: recuerda de qué texto sale y entre qué bytes está. Se usa como cualquier texto.

Los trozos impares son nombres y los pares, notas. Las notas son todavía texto: `"9.0"` no es el número 9.0. `parse(Float64, "9.0")` lo convierte, y con el punto, `parse.(Float64, …)`, se convierten todas a la vez. El `Float64` del principio no lleva punto: es el mismo para todas.

`join(nombres, " y ")` hace lo contrario que `split`: pega los trozos con `" y "` en medio. Y `findfirst(',', linea)` dice en qué índice está la primera coma: 4. Si no la encuentra, devuelve `nothing`.

::::{div}
:class: afondo
### 6 · UTF-8, byte a byte

`codeunits(s)` enseña los bytes de verdad. Para la `ñ`, `codeunits("ñ")` da `UInt8[0xc3, 0xb1]`: dos bytes. En binario:

```text
0xc3 = 110 00011       el 110 dice: «esta letra ocupa 2 bytes»
0xb1 = 10 110001       el 10 dice: «soy la continuación de una letra»
```

Quitando las marcas queda `00011 110001`, que es 241: `Int('ñ')`. Así funciona UTF-8. Una letra de un byte empieza por 0, igual que en el viejo ASCII, así que todo texto ASCII es también UTF-8 válido. Las de 2, 3 y 4 bytes llevan delante `110`, `1110` o `11110`, y sus bytes de continuación empiezan por `10`.

Por eso Julia puede reconocer un índice que cae en medio de una letra: el byte 7 de `"canción"` empieza por `10`. Y por eso sus índices son de bytes: ir al byte `i` es inmediato, mientras que encontrar la letra número `i` obliga a recorrer el texto desde el principio. Si quieres la letra número `k`, puedes escribir `collect(s)[k]`, o pedir el índice a Julia con `nextind(s, 0, k)`.

### SubString: trozos sin copia

`split`, `strip` o `chop` devuelven `SubString`. Un `SubString` guarda solo tres cosas: el texto original, dónde empieza y cuántos bytes ocupa. Para `w = split("hola mundo")[1]`, `parent(w)` es el texto entero, sin copiar. Partir un texto de un millón de palabras no copia ni una letra.

### Lo que una persona ve como una letra

`length` cuenta caracteres Unicode, pero no siempre coinciden con lo que vemos. `"👍🏽"` (el pulgar con un tono de piel) da `length` 2 y ocupa 8 bytes: son dos caracteres, el pulgar y el tono, que se dibujan juntos. Para contar lo que una persona ve como una letra hay que usar `graphemes`, del módulo `Unicode`: `length(graphemes("👍🏽"))` da 1.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Primera letra | `s[1]` | `s[0]` | `substr(s, 1, 1)` |
| ¿Tipo propio para un carácter? | sí, `Char` (`'a'`) | no: un texto de una letra | no: un texto de una letra |
| Los índices cuentan | bytes | letras | letras |
| `"canción"`, posición 6 | `s[6]` da `'ó'` | `s[5]` da `'ó'` | `substr(s, 6, 6)` da `"ó"` |
| Número de letras | `length(s)` | `len(s)` | `nchar(s)` |
| Juntar | `a * b` | `a + b` | `paste0(a, b)` |
| Con datos dentro | `"Tienes $n"` | `f"Tienes {n}"` | `paste0("Tienes ", n)` |
| Partir | `split(s, ",")` | `s.split(",")` | `strsplit(s, ",")[[1]]` |

Los tres guardan textos inmutables. Python y R esconden los bytes: cuentan siempre en letras, a costa de que ir a la letra `i` pueda ser más lento.
:::

## Conexiones

- Un texto se recorre como un vector, con `for` y comprensiones, y muchas funciones de vectores sirven también para textos: `length`, `collect`, `reverse`, `filter`, `count`, `findfirst`.
- La pareja `"é" => "e"` es un `Pair`, el ladrillo de los **diccionarios** del capítulo siguiente: `Dict("Ana" => 9.0, "Biel" => 4.0)`.
- Partir líneas de texto en datos es justo lo que hace un lector de archivos CSV. Lo verás en *Tablas de datos*.

## La grieta

Con `split` has convertido `"Ana,9.0,Biel,4.0"` en nombres y notas. Pero han quedado en dos vectores separados, y para saber la nota de Biel hay que buscar en qué posición está su nombre y mirar esa posición en el otro vector. ¿No se podría preguntar directamente por la nota de `"Biel"`? Hace falta una estructura que guarde **parejas** nombre-nota: el diccionario, en [Tuplas y diccionarios](07-tuplas-diccionarios.md).

## Ejercicios

1. **Iniciales.** Con `nombre = "Ana Pérez"`, consigue el texto `"AP"`. Pista: `split` y `first`.

2. **Contar letras.** ¿Cuántas letras hay en `"¡Hola, mundo!"`, sin contar los signos ni el espacio? Usa `count` con `isletter`.

3. **Palíndromos.** Escribe una función `es_palindromo(s)` que diga si un texto se lee igual al revés, sin tener en cuenta espacios ni mayúsculas. Pruébala con `"Anita lava la tina"`. Pista: `filter(isletter, s)`, `lowercase` y `reverse`.

4. **Predice.** Con `s = "añadir"`, ¿qué dan `length(s)`, `ncodeunits(s)`, `s[3]` y `s[4]`?

5. **Cifrado César.** Julio César cifraba sus mensajes cambiando cada letra por la que está tres puestos más allá. Cifra `"hola"` con `join([c + 3 for c in "hola"])`. ¿Qué sale? ¿Cómo lo descifrarías?

6. **Contar palabras.** ¿Cuántas palabras tiene `"  El gato   come  pescado "`? ¿Qué pasa si usas `split(s, " ")` en lugar de `split(s)`?

::::{div}
:class: afondo
7. **Los bits de la ñ.** Comprueba que `codeunits("ñ")` da `0xc3` y `0xb1`. Escribe los dos bytes en binario con `bitstring`, quita las marcas de UTF-8 y comprueba que lo que queda es `Int('ñ')`.

8. **Letras que no son una.** ¿Qué dan `length`, `ncodeunits` y `length(graphemes(…))` para `"👍🏽"`? (Para `graphemes` hace falta `using Unicode`.) ¿Por qué no coinciden los tres?
::::

## Solucionario

1. `join(first.(split(nombre)))` da `"AP"`. `split(nombre)` da `["Ana", "Pérez"]`, `first.(…)` saca la primera letra de cada trozo, `['A', 'P']`, y `join` los junta.
2. `count(isletter, "¡Hola, mundo!")` da `9`.
3. Una solución:

   ```julia
   function es_palindromo(s)
       t = lowercase(filter(isletter, s))
       return t == reverse(t)
   end
   ```

   `es_palindromo("Anita lava la tina")` da `true`. Con tildes hay que tener cuidado: en `"Dábale arroz a la zorra el abad"`, la `á` no es igual que la `a` y la función da `false`. Se arregla quitando las tildes antes con `replace`.
4. `length(s)` da 6 y `ncodeunits(s)`, 7: la `ñ` ocupa 2 bytes. `s[3]` es `'ñ'`, y `s[4]` da un `StringIndexError`: el byte 4 es la segunda mitad de la `ñ`.
5. Sale `"krod"`. Para descifrar, se resta: `join([c - 3 for c in "krod"])` da `"hola"`.
6. `length(split(s))` da 4: sin separador, `split` corta por los espacios y descarta los trozos vacíos. Con `split(s, " ")` aparecen trozos vacíos `""` entre los espacios seguidos.

::::{div}
:class: afondo
7. `bitstring(0xc3)` es `"11000011"` y `bitstring(0xb1)` es `"10110001"`. Sin las marcas `110` y `10` quedan `00011` y `110001`; juntos, `00011110001`, que es 241, igual que `Int('ñ')`.
8. `length("👍🏽")` da 2, `ncodeunits` da 8 y `length(graphemes("👍🏽"))` da 1. Son dos caracteres Unicode de 4 bytes cada uno (el pulgar y el modificador de tono) que se dibujan como uno solo.
::::
