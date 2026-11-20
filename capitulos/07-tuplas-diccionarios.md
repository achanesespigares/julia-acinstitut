---
title: Tuplas y diccionarios
subtitle: Datos que van juntos, y datos que se buscan por su nombre
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En una agenda no buscas a alguien por su posición, «el contacto número 37», sino por su nombre: vas a la letra B y encuentras a Biel con su teléfono. Y cada ficha agrupa varios datos que van juntos (nombre, teléfono, correo) aunque sean de tipos distintos.

## La pregunta

¿Cómo se guardan juntos unos pocos datos de tipos distintos? ¿Y cómo se guarda una colección en la que cada valor se busca por una **clave**, como la nota de `"Biel"`, en lugar de por su posición?

## La idea

Dos estructuras nuevas:

- una **tupla** junta unos pocos valores, de cualquier tipo, entre paréntesis: `("Ana", 9.0)`. Si sus campos llevan nombre, es una **tupla con nombre**: `(nombre = "Ana", nota = 9.0)`. Las tuplas **no se pueden cambiar**;
- un **diccionario**, `Dict`, guarda parejas **clave => valor**: `Dict("Ana" => 9.0, "Biel" => 4.0)`. Se consulta por la clave, `notas["Biel"]`, y se puede cambiar: añadir parejas, modificarlas o quitarlas.

:::{important} Un diccionario no tiene orden
Un `Dict` guarda cada pareja en el sitio que le indica un cálculo sobre su clave, el **hash**, y no en el orden en que la metiste. Al recorrerlo, las parejas salen en un orden que parece aleatorio, y que puede cambiar al añadir más. Si necesitas un orden, ordena tú: `sort(collect(keys(d)))`.
:::

## Construcción

### 1 · Tuplas: unos pocos valores juntos

:::{tip} Predice
Una tupla se parece a un vector. ¿Qué pasará en la última línea, que intenta cambiar su primer elemento?
:::

```{code-cell} julia
t = ("Ana", 9.0)
nombre = t[1]
nota = t[2]
n, x = t
largo = length(t)
t[1] = "Eva"
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/07-tuplas-diccionarios-1.json","config":{"etiqueta":"tupla","idea":"Una tupla junta valores de tipos distintos: aquí un texto y un número. Se lee con índices, como un vector, y se puede repartir en varias variables. Pero no se puede cambiar.","letras":true,"titulo":"Juntos, pero fijos"}}
```

Una tupla se escribe entre paréntesis, con los valores separados por comas. A diferencia de un vector, cada posición puede tener su tipo: el tipo de `t` es `Tuple{String, Float64}`, que dice qué hay en cada casilla.

Se lee igual que un vector, `t[1]` y `t[2]`, y se puede **repartir** en varias variables con una sola asignación: `n, x = t` deja `"Ana"` en `n` y `9.0` en `x`. Ya lo habías visto sin saberlo: es lo que hace `for (nombre, nota) in zip(…)`, y lo que devolvía `extremos` en el capítulo de funciones.

La última línea falla: ``MethodError: no method matching setindex!(::Tuple{String, Float64}, ::String, ::Int64)``. Una tupla es **inmutable**, como un texto. Eso la hace ligera y rápida, y es la forma natural de devolver varios valores de una función.

### 2 · Tuplas con nombre

:::{tip} Predice
¿Qué es más claro, `alumna[2]` o `alumna.nota`? ¿Qué pasará al pedir un campo que no existe?
:::

```{code-cell} julia
alumna = (nombre = "Ana", nota = 9.0, curso = 2)
n = alumna.nota
c = alumna[3]
aprobada = alumna.nota >= 5
alumna.edad
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/07-tuplas-diccionarios-2.json","config":{"etiqueta":"tupla con nombre","idea":"Una tupla con nombre es una tupla cuyas casillas tienen nombre: se leen con un punto, alumna.nota. Si el campo no existe, Julia dice cuáles hay.","letras":true,"titulo":"Cada dato con su nombre"}}
```

En una tupla con nombre cada valor lleva su etiqueta, y se lee con un punto: `alumna.nota`. El código se explica solo: `alumna.nota >= 5` se entiende sin saber en qué posición estaba la nota. Las posiciones siguen funcionando, `alumna[3]` es el curso, pero ya no hacen falta.

El visualizador la dibuja como una ficha, con cada campo y su valor. Su tipo, `@NamedTuple{nombre::String, nota::Float64, curso::Int64}`, recoge los nombres y los tipos de los tres campos.

La última línea pide `alumna.edad`, que no existe, y Julia lo explica: ``FieldError: type NamedTuple has no field `edad`, available fields: `nombre`, `nota`, `curso` ``. Como la tupla normal, la tupla con nombre no se puede modificar.

### 3 · Diccionarios: buscar por la clave

:::{tip} Predice
`notas["Biel"]` busca la nota de Biel. ¿Qué crees que hará `notas["Dani"] = 6.0`, si Dani no estaba? ¿Y `notas["Eva"]`?
:::

```{code-cell} julia
notas = Dict("Ana" => 9.0, "Biel" => 4.0, "Carla" => 7.5)
b = notas["Biel"]
notas["Dani"] = 6.0
notas["Biel"] = 5.0
hay = haskey(notas, "Eva")
e = get(notas, "Eva", 0.0)
notas["Eva"]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/07-tuplas-diccionarios-3.json","config":{"etiqueta":"Dict · clave => valor","idea":"Un diccionario guarda parejas clave => valor y se consulta por la clave. Asignar a una clave nueva añade una pareja; asignar a una que ya está cambia su valor. Pedir una clave que no está es un error.","letras":true,"titulo":"La nota de Biel"}}
```

`Dict("Ana" => 9.0, …)` crea un diccionario con tres parejas. Cada pareja es un `Pair`, la misma flecha `=>` que usaste con `replace`. El visualizador dibuja el diccionario como una tabla de dos columnas, clave y valor.

`notas["Biel"]` busca por la clave y da `4.0`, sin recorrer nada. Con corchetes también se escribe: `notas["Dani"] = 6.0` **añade** una pareja porque Dani no estaba, y `notas["Biel"] = 5.0` **cambia** el valor de una clave que ya existía. Una clave no puede repetirse.

Para preguntar sin riesgo hay dos funciones: `haskey(notas, "Eva")` dice si la clave está, y `get(notas, "Eva", 0.0)` da su valor o, si no está, el valor que le digas, aquí 0.0. La última línea pide `notas["Eva"]` sin red, y Julia se detiene con ``KeyError: key "Eva" not found``.

Fíjate en el orden de la tabla: Ana, Carla, Biel; y al añadir a Dani, Ana, Dani, Carla, Biel. No es el orden en que se escribieron. El «A fondo» explica de dónde sale.

### 4 · Recorrer un diccionario

```{code-cell} julia
notas = Dict("Ana" => 9.0, "Biel" => 4.0, "Carla" => 7.5, "Dani" => 6.0)
for (nombre, nota) in notas
    println(nombre, ": ", nota)
end
for nombre in sort(collect(keys(notas)))
    println(nombre, ": ", notas[nombre])
end
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/07-tuplas-diccionarios-4.json","config":{"columnas":["nombre","nota"],"etiqueta":"for (k, v) in d","fila_en":"fin_iteracion","idea":"Recorrer un diccionario da una pareja en cada vuelta, en el orden en que Julia lo guarda por dentro. Para un orden concreto, se ordenan las claves y se recorren ellas.","letras":true,"titulo":"En su orden, o en el tuyo"}}
```

`for (nombre, nota) in notas` da una pareja en cada vuelta y la reparte en dos variables, como con `zip`. Pero el primer bucle escribe Ana, Dani, Carla y Biel: el orden interno del diccionario.

El segundo bucle pone el orden. `keys(notas)` da las claves; `collect` las mete en un vector; `sort` lo ordena alfabéticamente. Se recorren las claves ordenadas y, con cada una, se busca su nota. Es la forma de sacar un diccionario en un orden que puedas predecir.

Además de `keys`, `values(notas)` da los valores (`sum(values(notas))` suma todas las notas) y `collect(notas)` da un vector de parejas, que `sort` ordena por la clave.

### 5 · Contar con un diccionario

:::{tip} Predice
¿Cuántas veces aparece cada palabra en `"el gato y el perro y el pez"`?
:::

```{code-cell} julia
texto = "el gato y el perro y el pez"
cuenta = Dict{String, Int}()
for p in split(texto)
    cuenta[p] = get(cuenta, p, 0) + 1
end
cuenta["el"]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/07-tuplas-diccionarios-5.json","config":{"columnas":["p","cuenta[p]"],"etiqueta":"Dict{String, Int}()","fila_en":"fin_iteracion","idea":"Para cada palabra, get(cuenta, p, 0) da las veces que ya se ha visto, o 0 si es nueva. Se le suma 1 y se guarda. Al final, el diccionario tiene una pareja por cada palabra distinta.","letras":true,"titulo":"Un contador por palabra"}}
```

Este es el uso más típico de un diccionario: **contar**. `Dict{String, Int}()` crea un diccionario vacío y le dice de qué tipo serán sus claves (`String`) y sus valores (`Int`). Así Julia sabe qué guardar aunque todavía no haya nada.

Dentro del bucle, `get(cuenta, p, 0)` da cuántas veces se ha visto la palabra, o 0 si es la primera. Se le suma 1 y se guarda. Las claves que da `split` son `SubString`, pero al guardarlas en un `Dict{String, Int}` Julia las convierte en `String`.

Al terminar, `el` aparece 3 veces, `y` 2, y `gato`, `perro` y `pez`, una cada una. Con un vector habría que buscar cada palabra entre las ya vistas; con un diccionario, cada búsqueda es inmediata.

::::{div}
:class: afondo
### 6 · Cómo guarda Julia un diccionario

Un `Dict` es una **tabla hash**. Por dentro tiene una fila de casillas, al principio 16. Para colocar una clave, Julia calcula su **hash**, un número de 64 bits que se obtiene revolviendo los bytes de la clave:

```julia
hash("Ana")    # 1701938670630303911
```

De ese número se quedan los 4 bits de abajo (las casillas son 16 = 2⁴), que dan la casilla: `Base.hashindex("Ana", 16)` da `(8, 0x8b)`, la casilla 8. Biel va a la 15, Carla a la 12 y Dani a la 10. Al recorrer el diccionario, Julia va casilla a casilla, de la 1 a la 16. Por eso sale Ana (8), Dani (10), Carla (12) y Biel (15).

Si una casilla ya está ocupada, la clave va a la siguiente libre. Y cuando la tabla pasa de 2/3 llena, Julia la cambia por otra más grande y recoloca todas las claves: el orden cambia. Buscar una clave es repetir el cálculo e ir directamente a su casilla. Por eso es inmediato, tenga el diccionario 10 parejas o 10 millones.

Esto tiene tres consecuencias:

- **El orden no es fiable.** Depende del hash, que puede cambiar entre versiones de Julia. Si necesitas el orden en que metiste las parejas, el paquete OrderedCollections tiene `OrderedDict`.
- **Las claves no deben cambiar.** Si la clave es un vector y lo modificas, su hash cambia, pero sigue guardado en la casilla vieja. Con `k = [1, 2]`, `d = Dict(k => "x")` y luego `push!(k, 3)`, ya no hay forma de encontrarlo: ni `haskey(d, k)` ni `haskey(d, [1, 2])` dan `true`. Por eso las claves suelen ser textos, números o tuplas, que no cambian.
- **Dos cosas iguales tienen el mismo hash.** Como `1 == 1.0`, `hash(1) == hash(1.0)`, y `Dict(1 => "a")[1.0]` encuentra la pareja.

El laboratorio de este libro reproduce el hash y la tabla de Julia 1.13, para que veas los diccionarios en el mismo orden que Julia.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Tupla | `("Ana", 9.0)` | `("Ana", 9.0)` | `list("Ana", 9.0)` |
| Con nombres | `(nombre = "Ana", nota = 9.0)` | `namedtuple` | `list(nombre = "Ana", nota = 9.0)` |
| Diccionario | `Dict("Ana" => 9.0)` | `{"Ana": 9.0}` | `list(Ana = 9.0)` o un `environment` |
| Leer una clave | `d["Ana"]` | `d["Ana"]` | `d[["Ana"]]` |
| Clave que no está | `KeyError` | `KeyError` | `NULL`, sin error |
| Orden al recorrer | el de la tabla hash | el de inserción | el de inserción |

Python guarda el orden de inserción desde la versión 3.7; Julia, no. Y las listas con nombre de R no son tablas hash: buscar un nombre las recorre de principio a fin.
:::

## Conexiones

- Las parejas `=>` del capítulo de textos son los ladrillos de los diccionarios.
- Una tupla con nombre es casi un **tipo propio**: varios campos con nombre. En *Tipos propios* le pondrás nombre al tipo y podrás definir funciones para él.
- Una tabla de datos es, en el fondo, una tupla con nombre de columnas: `(nombre = [...], nota = [...])`. Lo verás en *Tablas de datos*.
- El hash y la tabla que se reorganiza vuelven en *Rendimiento*, cuando se hable de cuánto cuesta cada operación.

## La grieta

Las notas de un curso caben en un vector y las parejas nombre-nota, en un diccionario. Pero las notas de varios exámenes de todo un curso forman una **tabla**: una fila por alumno y una columna por examen. ¿Cómo se guarda una cuadrícula de números, se suma por filas o por columnas, o se multiplica? Hace falta una estructura con dos índices: la **matriz**, en *Matrices*.

## Ejercicios

1. **Intercambiar.** Con `a, b = 1, 2`, intercambia los valores de `a` y `b` en una sola línea, sin variable auxiliar.

2. **Un punto.** Guarda el punto (3, 4) como tupla con nombre, `punto = (x = 3, y = 4)`, y calcula su distancia al origen con `punto.x` y `punto.y`.

3. **La compra.** Con `precios = Dict("pan" => 1.2, "leche" => 0.95, "huevos" => 2.5)` y `compra = ["pan", "huevos", "pan"]`, calcula cuánto cuesta la compra.

4. **Dar la vuelta.** Con `d = Dict("a" => 1, "b" => 2)`, construye el diccionario al revés, con los valores como claves: `Dict(v => k for (k, v) in d)`. ¿Qué sale?

5. **Contar letras.** Cuenta cuántas veces aparece cada letra de `"banana"` en un `Dict{Char, Int}`.

6. **Predice.** ¿Cuántas parejas tiene `d` al final?

   ```julia
   d = Dict("a" => 1)
   d2 = d
   d2["b"] = 2
   length(d)
   ```

::::{div}
:class: afondo
7. **Predecir el orden.** Calcula `Base.hashindex(k, 16)` para `"Ana"`, `"Biel"`, `"Carla"` y `"Dani"`, y explica con esos números el orden en que sale `Dict("Ana" => 9.0, "Biel" => 4.0, "Carla" => 7.5, "Dani" => 6.0)`.

8. **Una clave que cambia.** Ejecuta `k = [1, 2]`, `d = Dict(k => "x")`, `push!(k, 3)`. ¿Qué dan `haskey(d, k)`, `haskey(d, [1, 2])` y `collect(keys(d))`? ¿Por qué se ha perdido la pareja, si sigue dentro?
::::

## Solucionario

1. `a, b = b, a`. A la derecha se forma la tupla `(2, 1)` y se reparte a la izquierda: `a` vale 2 y `b`, 1.
2. `sqrt(punto.x^2 + punto.y^2)` da `5.0`.
3. `sum(precios[p] for p in compra)` da `4.9`: 1.2 + 2.5 + 1.2.
4. Sale `Dict(2 => "b", 1 => "a")`. Si dos claves tuvieran el mismo valor, al darles la vuelta una pisaría a la otra: una clave no se puede repetir.
5. Con `l = Dict{Char, Int}()` y `for c in "banana"; l[c] = get(l, c, 0) + 1; end`, `l` vale `Dict('b' => 1, 'n' => 2, 'a' => 3)`.
6. 2. `d2 = d` no copia el diccionario: es otro nombre para el mismo, como pasaba con los vectores. Para una copia independiente, `copy(d)`.

::::{div}
:class: afondo
7. Las casillas son Ana 8, Biel 15, Carla 12 y Dani 10. Julia recorre la tabla de la casilla 1 a la 16, así que el orden es Ana, Dani, Carla, Biel.
8. `haskey(d, k)` da `false`, `haskey(d, [1, 2])` da `false` y `collect(keys(d))` da `[[1, 2, 3]]`. La pareja está en la casilla que correspondía al hash de `[1, 2]`. Al buscar `k`, que ahora es `[1, 2, 3]`, Julia va a otra casilla. Al buscar `[1, 2]`, va a la correcta, pero la clave que hay allí ya no es igual a `[1, 2]`.
::::
