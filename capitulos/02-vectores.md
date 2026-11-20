---
title: Vectores y rangos
subtitle: Muchos valores con un solo nombre, y el punto que opera con todos
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

Tienes las notas de un examen: 9, 6.5, 4 y 7.5. Quieres saber la media, cuántos han aprobado y cómo quedaría cada nota si subieras medio punto a todo el mundo. Con lo del capítulo anterior harían falta cuatro variables, `nota1`, `nota2`, `nota3` y `nota4`, y cuatro sumas. Con treinta alumnos, treinta.

## La pregunta

¿Cómo se guardan muchos valores con un solo nombre? ¿Y cómo se hace la misma operación con todos a la vez, sin repetirla a mano?

## La idea

Un **vector** es una fila de casillas numeradas desde 1, todas del mismo tipo. Se escribe entre corchetes: `notas = [9.0, 6.5, 4.0, 7.5]`. `notas[1]` es la primera casilla y `notas[end]`, la última.

Para operar con todas las casillas a la vez, Julia usa **el punto**. `notas .+ 0.5` suma medio punto a cada nota, y `sqrt.(notas)` calcula la raíz de cada una. El punto delante de un operador, o detrás del nombre de una función, se lee «a cada elemento».

:::{important} El punto dice «a cada uno»
En Julia, `notas + 0.5` da un error: sumar un número a un vector no está definido en matemáticas. `notas .+ 0.5` sí funciona, porque pide sumar 0.5 **a cada** nota. El punto hace explícito lo que en R pasa sin avisar.
:::

## Construcción

### 1 · Crear un vector y mirar dentro

:::{tip} Predice
`[1, 2.5, 3]` mezcla enteros y un decimal, y un vector solo admite un tipo. ¿De qué tipo será?
:::

```{code-cell} julia
notas = [9.0, 6.5, 4.0, 7.5]
length(notas)
notas[1]
notas[end]
mezcla = [1, 2.5, 3]
notas[2] = 6.8
notas[5]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/02-vectores-1.json","config":{"etiqueta":"vector · índices","foco":"notas","idea":"Cada casilla lleva su número, empezando por 1. end es la última. Al mezclar enteros y decimales, Julia convierte todo a decimales. Y no deja leer una casilla que no existe.","titulo":"Un nombre, muchas casillas"}}
```

Las casillas se numeran **desde 1**, como en R y como en matemáticas: el primer elemento de un vector $v$ es $v_1$. `end` dentro de los corchetes significa «la última», así que `notas[end]` funciona sea cual sea la longitud.

`mezcla` sale como `Vector{Float64}`: los enteros 1 y 3 se han convertido en `1.0` y `3.0`. Julia busca un tipo en el que quepan todos los valores sin perder nada, y lo usa para el vector entero. Si no lo hay, como en `[1, "dos"]`, el vector es un `Vector{Any}`, donde cabe cualquier cosa. Funciona, pero es mucho más lento.

Las casillas se pueden cambiar: `notas[2] = 6.8` cambia la segunda. Lo que no se puede es leer una casilla que no existe. `notas[5]` da un `BoundsError`, un error de «fuera de los límites». Julia no inventa un valor para la casilla quinta: se detiene.

### 2 · El punto: operar con todos

:::{tip} Predice
`notas .+ 0.5` sube medio punto a cada nota. ¿Qué crees que dará `notas .>= 5`?
:::

```{code-cell} julia
notas = [9.0, 6.5, 4.0, 7.5]
subida = notas .+ 0.5
dobles = 2 .* notas
aprobado = notas .>= 5
sum(aprobado)
media = sum(notas) / length(notas)
notas + 0.5
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/02-vectores-2.json","config":{"etiqueta":"broadcasting · .+ .>=","foco":"notas","idea":"Con el punto, la operación se hace casilla a casilla y sale otro vector. Una comparación con punto da un vector de true y false. Sin el punto, sumar un número a un vector es un error.","titulo":"El punto, a cada uno"}}
```

Cada operación con punto devuelve **un vector nuevo** del mismo tamaño. `subida` y `dobles` son vectores de decimales. `aprobado` es un vector de `true` y `false`, una respuesta por nota.

Su tipo es `BitVector`, una versión de `Vector{Bool}` que guarda cada respuesta en un solo bit. En la consola, Julia escribe sus elementos como `1` y `0`. Y como `true` cuenta como 1 al sumar, `sum(aprobado)` dice cuántos han aprobado: 3.

`sum`, `length`, `maximum` y `minimum` trabajan con el vector entero y no llevan punto: devuelven un solo número.

Al final, `notas + 0.5` da un error. Merece la pena leerlo: *no method matching +(::Vector{Float64}, ::Float64)*. Julia no sabe sumar un vector y un número, y en la línea siguiente propone usar `.+`.

El punto funciona con cualquier operador (`.-`, `.*`, `./`, `.^`, `.==`…) y con cualquier función, también con las tuyas: `sqrt.(v)`, `round.(v)`, `abs.(v)`. Y se puede encadenar: `2 .* v .+ 1` hace las dos cuentas casilla a casilla de una sola pasada.

:::{note} ¿Y dos vectores?
Entre dos vectores del **mismo tamaño**, `+` y `-` sí funcionan sin punto, porque la suma de vectores existe en matemáticas: `[1, 2] + [3, 4]` da `[4, 6]`. Con tamaños distintos, Julia da un error (`DimensionMismatch`), con punto o sin él. R, en cambio, repetiría el vector corto sin preguntar.
:::

### 3 · Los rangos

Muchas veces el vector que hace falta es una progresión: del 1 al 10, de 0 a 1 de 0,25 en 0,25… Para eso están los **rangos**, que se escriben `inicio:fin` o `inicio:paso:fin`.

```{code-cell} julia
r = 1:5
pares = 2:2:10
cuartos = 0:0.25:1
v = collect(r)
sum(1:100)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/02-vectores-3.json","config":{"etiqueta":"rangos · inicio:paso:fin","idea":"1:5 se comporta como el vector [1, 2, 3, 4, 5], pero solo guarda dónde empieza, dónde acaba y el paso. collect() lo convierte en un vector de verdad.","titulo":"Un rango no guarda las casillas"}}
```

Un rango se usa como un vector: tiene longitud, se puede indexar (`r[2]` da 2) y se puede sumar. Pero **no guarda sus casillas**: solo recuerda dónde empieza, dónde acaba y de cuánto en cuánto va, y calcula cada elemento cuando se le pide. Por eso `1:1000000` ocupa lo mismo que `1:5`. Las casillas de los rangos se ven punteadas en el visualizador.

`collect()` convierte un rango en un vector con todas sus casillas. Hace falta cuando quieres cambiar alguna. Y `sum(1:100)` da `5050`, la suma que, según la anécdota, Gauss resolvió de niño sin hacerla término a término.

Si sabes cuántos puntos quieres y no el paso, usa `range()`: `range(0, 1, length = 5)` da `0.0:0.25:1.0`. Para que el rango vaya hacia atrás, el paso es negativo: `10:-3:1` da 10, 7, 4, 1.

### 4 · Hacer crecer un vector

Un vector puede empezar vacío y crecer. `push!` añade un elemento al final y `append!` añade varios. Al crear un vector vacío hay que decir de qué tipo serán sus casillas: `Float64[]` es un vector de decimales sin ningún elemento.

```{code-cell} julia
notas = Float64[]
push!(notas, 8.0)
push!(notas, 5.5)
append!(notas, [7.0, 9.5])
push!(notas, "diez")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/02-vectores-4.json","config":{"etiqueta":"push! · append!","foco":"notas","idea":"Cada push! añade una casilla al final del mismo vector. El tipo de las casillas no cambia: en un Vector{Float64} no cabe un texto.","titulo":"push!: el vector crece"}}
```

Fíjate en el signo de exclamación. En Julia, una función cuyo nombre termina en `!` **modifica** lo que recibe: `push!(notas, 8.0)` no crea un vector nuevo, cambia `notas`. Es un convenio, no una regla del lenguaje, pero lo sigue todo el mundo, y así se sabe de un vistazo qué funciones tocan tus datos. `sort(v)` devuelve una copia ordenada; `sort!(v)` ordena `v`.

El último `push!` falla porque el vector es de `Float64`, y un texto no se puede convertir en un decimal. El tipo de las casillas se decide al crear el vector y no cambia.

### 5 · Dos nombres, un mismo vector

:::{tip} Predice
`b = a` y después `b[1] = 100`. ¿Cambia también `a`?
:::

```{code-cell} julia
a = [1, 2, 3]
b = a
b[1] = 100
a
c = copy(a)
c[1] = 0
a
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/02-vectores-5.json","config":{"etiqueta":"alias · copy","idea":"b = a da un segundo nombre al mismo vector: lo que cambies con b se ve en a. copy(a) crea un vector nuevo, independiente.","titulo":"b = a no copia"}}
```

Sí: `a` también vale `[100, 2, 3]`. `b = a` **no copia** el vector: le pone un segundo nombre. `a` y `b` son dos etiquetas pegadas al mismo vector, y el visualizador las marca con «↔ el mismo vector que». Por eso, cambiar una casilla a través de `b` cambia lo que ves a través de `a`.

Si quieres un vector independiente, pídelo: `c = copy(a)` crea una copia, y cambiar `c` ya no toca `a`.

Con los números no pasa nada parecido. Si `x = 5`, `y = x` e `y = 7`, `x` sigue valiendo 5, porque `y = 7` no cambia el 5: pega la etiqueta `y` a otro valor. La diferencia está en `b[1] = 100`, que no pega una etiqueta nueva, sino que **cambia una casilla** del vector que comparten los dos nombres. En R esto no pasa nunca, porque R copia el vector en cuanto lo modificas.

::::{div}
:class: afondo
### 6 · Por qué un vector tiene un solo tipo

Un `Vector{Float64}` guarda sus números **uno detrás de otro** en la memoria, 8 bytes cada uno, sin nada en medio. `sizeof([1.0, 2.0, 3.0])` da `24`: tres números de 8 bytes. Para leer la casilla `i`, el ordenador no busca nada: sabe que está 8 × (i − 1) bytes después de la primera. Y como todas las casillas son del mismo tipo, Julia compila una sola vez el código que las suma, específico para `Float64`, y lo aplica a todas. Esa es buena parte de su velocidad.

Un `Vector{Any}` es otra cosa. Cada casilla guarda la dirección de un valor que vive en otro sitio de la memoria, y Julia tiene que mirar el tipo de cada valor antes de operar con él. Funciona, pero es mucho más lento.

El `BitVector` lleva la misma idea al extremo: guarda 64 respuestas `true`/`false` en un solo número de 64 bits. `Base.summarysize(trues(64))` da 72 bytes; el mismo contenido en un `Vector{Bool}`, `Base.summarysize(fill(true, 64))`, ocupa 104.

¿Y el punto? Detrás de `2 .* v .+ 1` no hay dos vectores intermedios. Julia **fusiona** todas las operaciones con punto de una expresión en un solo recorrido: para cada casilla calcula `2 * v[i] + 1` y lo escribe en el resultado. Se llama *broadcasting* y es una de las ideas más elegantes del lenguaje. En el capítulo de rendimiento verás cuánto se nota.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
Subir medio punto a todas las notas y copiar un vector:

| | Julia | Python (NumPy) | R |
|---|---|---|---|
| Crear | `v = [9.0, 6.5, 4.0]` | `v = np.array([9.0, 6.5, 4.0])` | `v <- c(9, 6.5, 4)` |
| A cada uno | `v .+ 0.5` | `v + 0.5` | `v + 0.5` |
| Primer elemento | `v[1]` | `v[0]` | `v[1]` |
| Último elemento | `v[end]` | `v[-1]` | `v[length(v)]` |
| ¿`b = v` copia? | no: `copy(v)` | no: `v.copy()` | sí, al modificar |

Julia y NumPy comparten vectores entre nombres; R los copia. Julia y R cuentan desde 1; Python, desde 0. Y solo Julia pide el punto para operar casilla a casilla.
:::

## Conexiones

- El punto es la primera muestra de una idea que atraviesa Julia: la misma operación se adapta al tipo de lo que recibe. En la parte IV, con el despacho múltiple, verás cómo funciona por dentro.
- Los vectores de `true` y `false` serán la base de los **filtros** del capítulo siguiente: `notas[notas .>= 5]` deja solo las notas aprobadas.
- Que `b = a` comparta el vector, y que las funciones con `!` modifiquen lo que reciben, volverá en el capítulo de funciones y en el de memoria.

## La grieta

Ya sabes sacar la casilla 2 y saber qué notas aprueban. Pero ¿cómo se saca un trozo del vector, o solo las notas aprobadas, o las casillas que cumplen dos condiciones a la vez? Lo verás en [Índices, filtros y el punto](03-indices-filtros.md).

## Ejercicios

1. **Mirar dentro.** Con `v = [3, 8, 1, 9, 4]`, ¿qué dan `v[2]`, `v[end]`, `v[end - 1]` y `length(v)`?

2. **El tipo del vector.** Predice el tipo de `[1, 2, 3]`, `[1, 2.0, 3]`, `[true, false]` y `["a", "b"]`, y compruébalo con `typeof()`.

3. **Con punto y sin punto.** Con `v = [1, 2, 3]`, ¿cuáles de estas expresiones funcionan y qué dan? `v .* 2`, `v * 2`, `v .+ 1`, `v + 1`, `v .^ 2`, `v ^ 2`.

4. **Contar aprobados.** Con `notas = [4.5, 7.0, 5.0, 3.2, 8.8]`, calcula con una sola expresión cuántas notas son de 5 o más.

5. **Rangos.** Escribe un rango para cada progresión y comprueba su longitud: los múltiplos de 5 entre 5 y 50; de 1 a 0 de 0,1 en 0,1; los impares entre 1 y 99.

6. **¿Quién ha cambiado?** ¿Qué valen `x` y `y` al final?

   ```julia
   x = [1, 2, 3]
   y = x
   push!(y, 4)
   x
   ```

::::{div}
:class: afondo
7. **Lo que ocupa un rango.** Compara `sizeof(1:1000)` con `sizeof(collect(1:1000))`. ¿Por qué tanta diferencia?

8. **La suma de Gauss.** Comprueba con un rango que la suma de los $n$ primeros naturales es $n(n+1)/2$ para $n = 100$ y $n = 1000$. ¿Por qué es mejor escribir `n * (n + 1) ÷ 2` que `n * (n + 1) / 2`?
::::

## Solucionario

1. `8`, `4`, `9` y `5`. `end - 1` es la penúltima casilla.
2. `Vector{Int64}`, `Vector{Float64}` (el 2.0 obliga a pasar todo a decimales), `Vector{Bool}` y `Vector{String}`.
3. `v .* 2` da `[2, 4, 6]` y `v * 2` también: multiplicar un vector por un número existe en matemáticas. `v .+ 1` da `[2, 3, 4]`, pero `v + 1` da un error, porque sumar un número a un vector no está definido. `v .^ 2` da `[1, 4, 9]`, y `v ^ 2` da un error: elevar un vector al cuadrado no tiene sentido como operación matemática.
4. `sum(notas .>= 5)`, que da `3`.
5. `5:5:50` (10 elementos), `1:-0.1:0` (11 elementos) y `1:2:99` (50 elementos).
6. Los dos valen `[1, 2, 3, 4]`. `y = x` no copia: `x` y `y` son el mismo vector, y `push!` lo modifica.

::::{div}
:class: afondo
7. `sizeof(1:1000)` da `16`: el rango solo guarda el inicio y el final, dos enteros de 8 bytes. `sizeof(collect(1:1000))` da `8000`: mil enteros de 8 bytes. El rango calcula cada elemento cuando se le pide.
8. `sum(1:100) == 100 * 101 ÷ 2` da `true` (5050), y `sum(1:1000) == 1000 * 1001 ÷ 2` también (500500). Con `÷` el resultado es un entero, como la suma; con `/` sale un decimal, `5050.0`. La comparación con `==` daría `true` igualmente, pero el resultado no sería del mismo tipo que la suma.
::::
