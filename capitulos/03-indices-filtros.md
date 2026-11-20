---
title: Índices, filtros y el punto
subtitle: Trozos, máscaras de true y false, y condiciones casilla a casilla
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En una hoja de cálculo, para quedarte con los aprobados no borras filas a mano: pones un **filtro** en la columna de notas, eliges «mayor o igual que 5» y la hoja esconde el resto. Y si quieres solo las tres primeras filas, las seleccionas arrastrando el ratón.

## La pregunta

¿Cómo se saca un trozo de un vector, o solo las casillas que cumplen una condición, sin recorrerlo a mano? ¿Y cómo se combinan dos condiciones?

## La idea

Dentro de los corchetes no solo cabe un número. Caben tres cosas:

- **un número**, `notas[2]`: la casilla 2;
- **un rango o un vector de números**, `notas[2:4]` o `notas[[1, 3]]`: esas casillas, en ese orden;
- **un vector de `true` y `false`** del mismo tamaño, una *máscara*: las casillas donde hay un `true`.

Como `notas .>= 5` es justo una máscara, `notas[notas .>= 5]` se lee «las notas que son mayores o iguales que 5».

:::{important} Con vectores, `.&` y paréntesis
Para combinar dos condiciones casilla a casilla se usa `.&` («y») o `.|` («o»), y cada condición va **entre paréntesis**: `(notas .>= 5) .& (notas .< 9)`. Sin paréntesis, Julia agrupa el `.&` antes que las comparaciones y la expresión deja de significar lo que parece.
:::

## Construcción

### 1 · Trozos de un vector

:::{tip} Predice
`a = notas[2:4]` y después `a[1] = 0.0`. ¿Cambia también `notas`?
:::

```{code-cell} julia
notas = [9.0, 6.5, 4.0, 7.5, 3.0, 8.0]
a = notas[2:4]
b = notas[end-1:end]
c = notas[1:2:end]
d = notas[[3, 1, 3]]
a[1] = 0.0
notas
notas[7:8]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/03-indices-filtros-1.json","config":{"etiqueta":"índices · trozos","idea":"Un rango dentro de los corchetes saca esas casillas, en orden, y forma con ellas un vector nuevo. Cambiar el trozo no cambia el original. Y pedir casillas que no existen es un error.","titulo":"Un trozo es un vector nuevo"}}
```

`notas[2:4]` son las casillas 2, 3 y 4. Con `end` se cuenta desde el final: `notas[end-1:end]` son las dos últimas. Con un paso, `notas[1:2:end]`, salen las casillas impares. Y con un vector de números, las que pidas y en el orden que quieras, incluso repetidas: `notas[[3, 1, 3]]` da `[4.0, 9.0, 4.0]`. Fíjate en los dobles corchetes. Los de fuera son los del índice y los de dentro forman el vector `[3, 1, 3]`.

Cada trozo es un **vector nuevo**: Julia copia las casillas elegidas. Por eso `a[1] = 0.0` cambia `a`, y `notas` se queda como estaba. El visualizador no marca a `a` como «el mismo vector que» `notas`. Es justo lo contrario de lo que pasaba con `b = a` en el capítulo anterior.

La última línea pide las casillas 7 y 8 de un vector de 6, y Julia se detiene con un `BoundsError`. Un rango vacío, en cambio, no es un error: `notas[4:3]` da `Float64[]`, un vector sin casillas.

### 2 · Filtrar con una máscara

:::{tip} Predice
`aprobado = notas .>= 5` es un vector de `true` y `false`. ¿Qué crees que da `notas[aprobado]`?
:::

```{code-cell} julia
notas = [9.0, 6.5, 4.0, 7.5, 3.0, 8.0]
aprobado = notas .>= 5
buenas = notas[aprobado]
media = sum(buenas) / length(buenas)
count(aprobado)
findall(aprobado)
suspensos = notas[.!aprobado]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/03-indices-filtros-2.json","config":{"etiqueta":"filtros · máscaras","idea":"aprobado tiene un true o un false por cada nota. Usado como índice, deja pasar las casillas con true. .! le da la vuelta a cada casilla: los suspensos.","titulo":"La máscara elige"}}
```

`aprobado` y `notas` tienen el mismo tamaño, 6, y van casilla a casilla: el primer `true` de `aprobado` dice que la primera nota pasa el filtro. `notas[aprobado]` recoge las notas con `true`, en su orden: `[9.0, 6.5, 7.5, 8.0]`. Con eso, la media de los aprobados es una sola línea, 7.75.

Hay dos funciones que trabajan directamente con la máscara:

- `count(aprobado)` cuenta los `true`: 4.
- `findall(aprobado)` dice **dónde** están: `[1, 2, 4, 6]`. Es el vector de posiciones que corresponde a la máscara: `notas[[1, 2, 4, 6]]` da lo mismo que `notas[aprobado]`.

Para darle la vuelta a una máscara se usa `.!`, el «no» casilla a casilla: `.!aprobado` tiene `true` donde había `false`. Por eso `notas[.!aprobado]` son los suspensos.

Normalmente no hace falta guardar la máscara con un nombre: `notas[notas .>= 5]` filtra en una sola línea. Si ninguna nota pasa el filtro, el resultado es un vector vacío, no un error.

### 3 · Dos condiciones a la vez

:::{tip} Predice
La última línea es como la quinta, pero sin paréntesis. ¿Dará el mismo resultado?
:::

```{code-cell} julia
notas = [9.0, 6.5, 4.0, 7.5, 3.0, 8.0]
entre = (notas .>= 5) .& (notas .< 9)
extremos = (notas .< 5) .| (notas .>= 9)
notas[entre]
dos = notas[notas .> 2 .&& notas .< 7]
notas .>= 5 .& notas .< 9
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/03-indices-filtros-3.json","config":{"etiqueta":".& · .| · .&&","idea":".& y .| combinan dos máscaras casilla a casilla. Sin paréntesis, Julia hace primero el .& (5 .& notas) y la expresión falla: el «y» no se puede aplicar a un número entero y a un decimal.","titulo":"Y, o, casilla a casilla"}}
```

`(notas .>= 5) .& (notas .< 9)` da `true` en las casillas donde se cumplen las dos condiciones: el aprobado sin sobresaliente. `(notas .< 5) .| (notas .>= 9)` da `true` donde se cumple al menos una: los extremos.

En la última línea faltan los paréntesis, y Julia la lee de otra manera. El `.&` va antes que las comparaciones, igual que la multiplicación va antes que la suma. Así que Julia calcula primero `5 .& notas`, «5 y cada nota», y eso no tiene sentido: no existe el «y» entre un entero y un decimal. El error lo dice, `no method matching &(::Int64, ::Float64)`. La regla práctica es **poner siempre los paréntesis**.

La línea 6 enseña la alternativa: `.&&` y `.||` van después de las comparaciones, como `&&` y `||`, así que no necesitan paréntesis. `notas .> 2 .&& notas .< 7` funciona tal cual.

:::{note} `&&` o `.&`
`&&` y `||` (sin punto) son para **un solo** valor `true` o `false`, como en `x > 2 && x < 9`. Con vectores dan un error, porque un vector no es ni verdadero ni falso. Para vectores, `.&`, `.|` o `.&&` y `.||`.
:::

### 4 · Cambiar las casillas elegidas

Un índice también sirve a la izquierda del igual, para cambiar casillas. Aquí el punto vuelve a marcar la diferencia.

```{code-cell} julia
v = [9.0, 6.5, 4.0, 7.5]
v[v .< 5] .= 5.0
w = [1, 2, 3, 4]
w[2:3] = [20, 30]
w[[1, 4]] .= 0
w[2:3] = 0
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/03-indices-filtros-4.json","config":{"etiqueta":"índices · .=","foco":"w","idea":"Con .= se pone el mismo valor en todas las casillas elegidas. Con = hace falta un vector del mismo tamaño que el trozo. Y = con un solo número es un error que Julia explica.","titulo":"Asignar a un trozo"}}
```

`v[v .< 5] .= 5.0` sube a 5 los suspensos. Se lee «en cada casilla que elige la máscara, pon 5.0». Esta vez no sale un vector nuevo: las casillas cambian dentro de `v`.

Con `=` hacen falta tantos valores como casillas: `w[2:3] = [20, 30]` pone 20 en la casilla 2 y 30 en la 3. Para poner el mismo número en varias casillas hace falta el punto, `w[[1, 4]] .= 0`.

La última línea intenta `w[2:3] = 0` sin punto, y Julia lo explica en el propio error: *perhaps use broadcasting `.=` instead?*, «¿quizá querías usar `.=`?».

::::{div}
:class: afondo
### 5 · Copias y vistas

Que `notas[2:4]` sea una copia es una decisión de Julia, no una obligación. Copiar tiene ventajas: el trozo es independiente y puedes cambiarlo sin miedo. También tiene un coste: memoria y tiempo, que se notan con vectores de millones de casillas.

Para no copiar, Julia tiene las **vistas**. `@view notas[2:4]` no crea casillas nuevas: es una ventana a las casillas 2, 3 y 4 del vector original. Cambiar la vista cambia el original:

```julia
w = @view notas[2:4]      # una SubArray, no un Vector
w[1] = 100.0               # notas[2] pasa a valer 100.0
```

Su tipo lo cuenta: `SubArray{Float64, 1, Vector{Float64}, Tuple{UnitRange{Int64}}, true}`, «un trozo de un `Vector{Float64}` elegido con un rango».

¿Y cuando se escribe `v[v .< 5] .= 5.0`? Ahí Julia no hace una copia que luego tiraría: a la izquierda de un `.=`, un trozo es automáticamente una vista. Por eso la asignación cambia `v`.

Una cosa más sobre las máscaras. Julia no recorre una máscara buscando los `true` cada vez que la usas: `notas[aprobado]` calcula primero cuántas casillas pasan (`count`) para reservar el resultado de una vez, y después las copia. Volverás a las vistas, con números de tiempo y memoria, en el capítulo *Memoria: copias y vistas*. Por ahora, el visualizador del laboratorio aún no sabe dibujar vistas.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
Quedarse con las notas entre 5 y 9, y con un trozo:

| | Julia | Python (NumPy) | R |
|---|---|---|---|
| Filtro | `v[v .>= 5]` | `v[v >= 5]` | `v[v >= 5]` |
| Dos condiciones | `v[(v .>= 5) .& (v .< 9)]` | `v[(v >= 5) & (v < 9)]` | `v[v >= 5 & v < 9]` |
| Negar | `v[.!m]` | `v[~m]` | `v[!m]` |
| Casillas 2 a 4 | `v[2:4]` | `v[1:4]` | `v[2:4]` |
| Posiciones de los `true` | `findall(m)` | `np.flatnonzero(m)` | `which(m)` |

NumPy necesita los paréntesis por la misma razón que Julia: su `&` también va antes que las comparaciones. En R no hacen falta. Y el trozo de Python cuenta desde 0 y no incluye el final: `v[1:4]` son las casillas 1, 2 y 3, es decir, la segunda, la tercera y la cuarta.
:::

## Conexiones

- Las máscaras son la forma de trabajar con datos. En la parte III, filtrar una tabla de datos será exactamente esto: una condición que da `true` o `false` por cada fila.
- `findall`, `count` y `filter` aceptan también una función en lugar de una máscara. Lo verás bien en el capítulo de funciones: `filter(x -> x >= 5, notas)` hace lo mismo que `notas[notas .>= 5]`.
- Que un trozo sea una copia y que a la izquierda de `.=` sea una vista volverá en *Memoria: copias y vistas*, en la parte IV.

## La grieta

Un filtro aplica la misma regla a todas las casillas. Pero a veces lo que hay que hacer con cada nota depende de la nota: escribir «sobresaliente», «notable» o «suspenso», o parar en cuanto aparece un suspenso. Hace falta un programa que **decida** y que **repita**: el capítulo siguiente.

## Ejercicios

1. **Trozos.** Con `v = [10, 20, 30, 40, 50, 60]`, escribe el índice que da: las tres primeras casillas; las dos últimas; las casillas pares; el vector al revés (pista: un rango con paso negativo).

2. **Contar y localizar.** Con `t = [12.5, 18.0, 21.3, 25.8, 19.9, 30.1]`, las temperaturas de una semana, calcula cuántos días pasaron de 20 grados y cuáles fueron (sus posiciones).

3. **La media de los aprobados.** Con `notas = [4.5, 7.0, 5.0, 3.2, 8.8]`, calcula en una sola línea la media de las notas aprobadas.

4. **Paréntesis.** Con `x = [-3, 5, 12, 7]`, ¿qué da cada una de estas líneas? ¿Cuál hace lo que parece? `x[x .> 0 .& x .< 10]` y `x[(x .> 0) .& (x .< 10)]`.

5. **Subir los suspensos.** Con `notas = [4.5, 7.0, 5.0, 3.2, 8.8]`, escribe una línea que ponga un 5.0 en todas las notas por debajo de 5. ¿Por qué hace falta el punto en `.=`?

6. **Predice.** ¿Qué valen `a` y `notas` al final?

   ```julia
   notas = [6.0, 9.5, 4.0]
   a = notas[notas .> 5]
   a[1] = 0.0
   ```

::::{div}
:class: afondo
7. **Dos maneras de elegir.** Comprueba que `notas[notas .>= 5] == notas[findall(notas .>= 5)]` con cualquier vector `notas`. ¿Qué ventaja tiene guardar `findall(...)` si vas a usar el filtro varias veces sobre vectores distintos del mismo tamaño?

8. **Una vista que cambia.** Con `v = [1, 2, 3, 4, 5]` y `w = @view v[2:4]`, ¿qué vale `v` después de `w .= 0`? ¿Y si en lugar de `@view` hubieras escrito `w = v[2:4]`?
::::

## Solucionario

1. `v[1:3]` (`[10, 20, 30]`), `v[end-1:end]` (`[50, 60]`), `v[2:2:end]` (`[20, 40, 60]`) y `v[end:-1:1]` (`[60, 50, 40, 30, 20, 10]`). También existe `reverse(v)`.
2. `count(t .> 20)` da `3` y `findall(t .> 20)` da `[3, 4, 6]`.
3. `sum(notas[notas .>= 5]) / length(notas[notas .>= 5])`, que da `6.933333333333334` (las notas aprobadas son 7.0, 5.0 y 8.8).
4. Las dos funcionan, y eso es lo peligroso. La segunda da `[5, 7]`, lo que se buscaba. La primera da `[5, 12, 7]`: el 12 se cuela. Julia la lee como `x .> (0 .& x) .< 10`. Entre enteros, el `&` sí existe (opera bit a bit) y `0 & n` vale 0 para cualquier `n`, así que lo que queda es `x .> 0`: solo comprueba que el número sea positivo. Con notas decimales Julia avisa con un error; con enteros, no avisa. Por eso, paréntesis siempre.
5. `notas[notas .< 5] .= 5.0`. El punto dice «en cada casilla elegida»: sin él, `notas[notas .< 5] = 5.0` da el error de asignar un solo valor a varias casillas.
6. `a` vale `[0.0, 9.5]` y `notas` sigue valiendo `[6.0, 9.5, 4.0]`. Un trozo, también el de una máscara, es un vector nuevo.

::::{div}
:class: afondo
7. Dan lo mismo: la máscara elige las casillas con `true`, y `findall` da sus posiciones. Guardar las posiciones permite reutilizarlas: `idx = findall(notas .>= 5)` y después `nombres[idx]`, `notas[idx]`, `edades[idx]`… sin volver a comparar.
8. `v` vale `[1, 0, 0, 0, 5]`: la vista es una ventana a las casillas 2 a 4 de `v`. Con `w = v[2:4]`, `w` es una copia, y `w .= 0` cambia `w` pero deja `v` como estaba.
::::
