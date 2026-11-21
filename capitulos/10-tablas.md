---
title: Tablas de datos
subtitle: Columnas con nombre para filtrar, ordenar y resumir, con DataFrames
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

Las notas de una clase acaban casi siempre en una hoja de cálculo: una fila por alumno y una columna por dato, con su nombre arriba. En la columna de nombres hay textos; en la de cursos, números enteros; en la de notas, decimales. Y lo que se hace con esa hoja siempre se parece: quedarse con los aprobados, ordenar por nota o sacar la media de cada curso.

## La pregunta

Una matriz obliga a que todas las casillas sean del mismo tipo, y un vector de `Alumna` obliga a escribir un bucle para cada pregunta. ¿Hay una estructura que sea como la hoja de cálculo, con columnas con nombre y cada una de su tipo? ¿Y cómo se filtra, se ordena y se resume?

## La idea

Una **tabla de datos** es un `DataFrame`, del paquete DataFrames.jl. Se carga con `using DataFrames` y se crea dando un vector para cada columna:

```julia
clase = DataFrame(nombre = ["Ana", "Biel"], nota = [9.0, 4.5])
```

Cada columna es un vector con su nombre y su tipo. Una columna entera se lee con un punto, `clase.nota`, y una casilla, con la fila y el nombre de la columna escrito con dos puntos delante: `clase[2, :nota]`. Para filtrar se usan las máscaras de siempre; para ordenar, `sort`, y para resumir por grupos, `groupby` y `combine`.

:::{important} Una tabla se guarda por columnas
Un `DataFrame` no es una lista de filas: es un grupo de columnas, cada una un vector de Julia con el mismo número de casillas. Por eso las operaciones con una columna entera (sumarla, compararla con un número) son rápidas, y por eso `clase.nota` es **el mismo vector** que guarda la tabla, no una copia.
:::

## Construcción

### 1 · Una tabla con un nombre en cada columna

:::{tip} Predice
La tabla tiene 4 alumnos y 3 columnas. ¿Qué dará `size(clase)`? ¿Y qué tipo tendrá `clase.nota`?
:::

```{code-cell} julia
using DataFrames
clase = DataFrame(nombre = ["Ana", "Biel", "Carla", "Dani"],
                  curso = [2, 1, 2, 1],
                  nota = [9.0, 4.5, 7.5, 6.0])
f, c = size(clase)
notas = clase.nota
biel = clase[2, :nota]
clase[2, :]
clase.edad
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/10-tablas-1.json","config":{"etiqueta":"DataFrame","idea":"Una tabla de datos tiene columnas con nombre, cada una con su tipo. Una columna entera se lee con un punto; una casilla, con la fila y el nombre de la columna; una fila, con la fila y dos puntos.","titulo":"La tabla de la clase"}}
```

`using DataFrames` carga el paquete: hasta esa línea, Julia no sabe qué es un `DataFrame`. La tabla se crea dando un vector a cada columna, con el mismo número de casillas. La sentencia ocupa tres líneas, pero es una sola: Julia sigue leyendo hasta que se cierra el paréntesis.

El visualizador la dibuja como una hoja de cálculo. Arriba, el nombre de cada columna y, debajo, su tipo: `String`, `Int64` y `Float64`. A diferencia de una matriz, cada columna tiene su tipo. `size(clase)` da `(4, 3)`: 4 filas y 3 columnas.

`clase.nota` es la columna de notas, un `Vector{Float64}` como cualquier otro. Una casilla se pide con la fila y el nombre de la columna, `clase[2, :nota]`, que da 4.5. El nombre se escribe `:nota`, con dos puntos delante: es un **símbolo**, un nombre que Julia guarda tal cual, sin buscar ninguna variable que se llame así.

`clase[2, :]` es la fila 2 entera, y la consola la escribe como DataFrames escribe sus tablas: el título, los nombres y los tipos de las columnas, y la fila con su número. La última línea pide una columna que no existe, y Julia se detiene con ``ArgumentError: column name :edad not found in the data frame``.

### 2 · Filtrar y ordenar

:::{tip} Predice
`clase.nota .>= 5` es una máscara de 4 casillas. ¿Qué crees que da `clase[clase.nota .>= 5, :]`?
:::

```{code-cell} julia
using DataFrames
clase = DataFrame(nombre = ["Ana", "Biel", "Carla", "Dani"],
                  curso = [2, 1, 2, 1],
                  nota = [9.0, 4.5, 7.5, 6.0])
aprobados = clase[clase.nota .>= 5, :]
segundo = filter(:curso => c -> c == 2, clase)
ranking = sort(clase, :nota, rev = true)
podio = first(ranking, 2)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/10-tablas-2.json","config":{"etiqueta":"filtrar · ordenar","idea":"Una máscara elige filas como en un vector: df[máscara, :]. filter se queda con las filas en que una columna cumple una condición, y sort ordena las filas por una columna. Cada una da una tabla nueva.","titulo":"Aprobados, segundo curso y ranking"}}
```

`clase.nota .>= 5` es la máscara `[true, false, true, true]`, y `clase[máscara, :]` se queda con las filas marcadas y con todas las columnas (los dos puntos). Es lo mismo que en *Índices, filtros y el punto*, pero con filas enteras: `aprobados` es una tabla nueva de 3 filas, sin Biel.

`filter(:curso => c -> c == 2, clase)` hace lo mismo de otra forma: para cada fila, toma el valor de la columna `curso` y se lo pasa a la función `c -> c == 2`. Se queda con las filas en las que da `true`. La flecha `=>` dice qué columna va a qué función.

`sort(clase, :nota, rev = true)` ordena las filas por la nota, de mayor a menor. Las filas se mueven enteras: cada nombre sigue con su curso y su nota. Y `first(ranking, 2)` se queda con las dos primeras.

Ninguna de estas operaciones cambia `clase`: cada una crea una tabla nueva, como `sort` con un vector.

### 3 · Columnas nuevas y casillas que cambian

:::{tip} Predice
Después de añadir la columna `aprobada`, se cambia la nota de Biel a 5.0. ¿Se actualizará sola la columna `aprobada`?
:::

```{code-cell} julia
using DataFrames
clase = DataFrame(nombre = ["Ana", "Biel", "Carla", "Dani"],
                  curso = [2, 1, 2, 1],
                  nota = [9.0, 4.5, 7.5, 6.0])
clase.aprobada = clase.nota .>= 5
clase[2, :nota] = 5.0
clase.aprobada = clase.nota .>= 5
clase
clase.extra = [1, 2]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/10-tablas-3.json","config":{"etiqueta":"df.col = …","idea":"Asignar a una columna que no existe la añade al final; a una que existe, la sustituye. Una casilla se cambia con df[fila, :columna] = valor. Una columna calculada no se recalcula sola: hay que volver a calcularla.","titulo":"La revisión de Biel"}}
```

`clase.aprobada = clase.nota .>= 5` añade una columna al final de la tabla, de tipo `Bool`. La tabla es la misma; solo crece.

`clase[2, :nota] = 5.0` cambia una casilla: la revisión le sube la nota a Biel. Pero la columna `aprobada` no cambia, porque se calculó antes. Una tabla no es una hoja de cálculo con fórmulas: guarda valores. Para actualizarla hay que volver a calcularla, y eso hace la línea siguiente, que sustituye la columna entera.

Escribir `clase` muestra la tabla en la consola, con sus cuatro columnas. La última línea intenta añadir una columna de 2 casillas a una tabla de 4 filas, y Julia no lo permite: ``ArgumentError: New columns must have the same length as old columns``.

### 4 · Agrupar y resumir

:::{tip} Predice
Hay tres alumnos de primero y tres de segundo. ¿Cuántas filas tendrá `por_curso`? ¿Y cuántas columnas?
:::

```{code-cell} julia
using DataFrames, Statistics
clase = DataFrame(nombre = ["Ana", "Biel", "Carla", "Dani", "Eva", "Fran"],
                  curso = [2, 1, 2, 1, 1, 2],
                  nota = [9.0, 4.5, 7.5, 6.0, 8.0, 5.5])
media_clase = mean(clase.nota)
por_curso = combine(groupby(clase, :curso), :nota => mean => :media, nrow => :alumnos)
mejores = combine(groupby(clase, :curso), :nota => maximum => :mejor)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/10-tablas-4.json","config":{"etiqueta":"groupby · combine","idea":"groupby reparte las filas en grupos según una columna, y combine resume cada grupo en una fila: :nota => mean => :media aplica mean a las notas de cada grupo y llama :media a la columna del resultado.","titulo":"La media de cada curso"}}
```

`mean` es la media. No está en Julia sin más: viene en el paquete Statistics, que se carga en la misma línea que DataFrames. La de toda la clase es 6.75.

Para la media de cada curso hacen falta dos pasos. `groupby(clase, :curso)` reparte las filas en grupos, uno por cada curso. `combine` resume cada grupo en una sola fila. Cada resumen se escribe como una cadena de flechas: `:nota => mean => :media` quiere decir «toma la columna `nota`, aplícale `mean` y llama `media` al resultado». `nrow => :alumnos` cuenta las filas de cada grupo.

`por_curso` tiene una fila por curso y una columna por cada cosa que se pidió: el curso, la media y el número de alumnos. Los de primero tienen de media 6.166666666666667 y los de segundo, 7.333333333333333. Con `maximum` en lugar de `mean` sale la mejor nota de cada curso.

Es la pregunta que en el capítulo anterior pedía un bucle, aquí en una línea: agrupar, aplicar una función y combinar los resultados.

### 5 · Una columna es un vector

:::{tip} Predice
La tabla se crea con la variable `notas`. Si después se cambia `notas[2]`, ¿cambiará la tabla? ¿Y si se cambia `col`, que sale de `clase.nota`?
:::

```{code-cell} julia
using DataFrames
notas = [9.0, 4.5, 7.5]
clase = DataFrame(nombre = ["Ana", "Biel", "Carla"], nota = notas)
notas[2] = 10.0
col = clase.nota
col[1] = 0.0
copia = clase[:, :nota]
copia[3] = 1.0
clase
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/10-tablas-5.json","config":{"etiqueta":"copias y columnas","idea":"Al crear la tabla, DataFrame copia los vectores. Pero clase.nota da la columna misma, sin copiarla: cambiarla cambia la tabla. clase[:, :nota] sí da una copia.","titulo":"¿Copia o la misma columna?"}}
```

`DataFrame(…)` **copia** los vectores que recibe. Por eso, al cambiar `notas[2]`, la tabla no cambia: su columna `nota` es otro vector, con los mismos valores del principio.

`clase.nota`, en cambio, da la columna **misma**. `col` y `clase.nota` son el mismo vector, y el visualizador lo marca con «↔». Al cambiar `col[1]`, cambia la nota de Ana en la tabla.

Si quieres una copia para trabajar sin tocar la tabla, `clase[:, :nota]`: los dos puntos en las filas quieren decir «todas las filas, copiadas». `copia[3] = 1.0` no cambia la tabla. Hay una tercera forma, `clase[!, :nota]`, con un signo de exclamación: es como `clase.nota`, la columna sin copiar. Al final, la tabla tiene la nota de Ana cambiada y las demás, como al crearla.

::::{div}
:class: afondo
### 6 · Las tablas por dentro

Un `DataFrame` guarda una lista de columnas y un índice con sus nombres. Cada columna es un vector normal de Julia, con su tipo. Esto tiene dos consecuencias:

- **Lo rápido es trabajar por columnas.** `mean(clase.nota)` recorre un `Vector{Float64}` seguido en la memoria, como en *Matrices*. Recorrer fila a fila (`for fila in eachrow(clase)`) es cómodo, pero más lento: cada fila salta de una columna a otra.
- **El tipo `DataFrame` no dice qué hay dentro.** `typeof(clase)` es solo `DataFrame`: cuando una función recibe la tabla, Julia no sabe de antemano de qué tipo son sus columnas. Para cálculos pesados, la documentación de DataFrames aconseja una «barrera de funciones»: pasar las columnas a una función, `media_ponderada(clase.nota, clase.peso)`, que sí sabe que recibe dos `Vector{Float64}`.

Los datos de verdad no se escriben a mano. Con el paquete CSV.jl, una tabla se guarda y se lee de un archivo de texto con una fila por línea y las columnas separadas por comas:

```julia
using CSV, DataFrames
CSV.write("clase.csv", clase)
otra = CSV.read("clase.csv", DataFrame)
```

`CSV.read` deduce el tipo de cada columna leyendo los valores: los cursos vuelven como `Int64` y las notas, como `Float64`.

DataFrames tiene mucho más: `select` y `transform` para elegir y calcular columnas, `innerjoin` para cruzar dos tablas por una columna común, `describe(clase)` para un resumen de cada columna, `stack` y `unstack` para cambiar la forma de una tabla. El laboratorio de este libro reproduce la parte que usa este capítulo (crear, leer, filtrar, ordenar, `groupby` y `combine`, y el display de las tablas); para el resto, la nube tiene DataFrames completo.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia (DataFrames) | Python (pandas) | R |
|---|---|---|---|
| Crear | `DataFrame(nota = [9.0, 4.5])` | `pd.DataFrame({"nota": [9.0, 4.5]})` | `data.frame(nota = c(9.0, 4.5))` |
| Una columna | `clase.nota` | `clase["nota"]` | `clase$nota` |
| Filtrar | `clase[clase.nota .>= 5, :]` | `clase[clase["nota"] >= 5]` | `clase[clase$nota >= 5, ]` |
| Ordenar | `sort(clase, :nota, rev = true)` | `clase.sort_values("nota", ascending=False)` | `clase[order(-clase$nota), ]` |
| Media por grupo | `combine(groupby(clase, :curso), :nota => mean)` | `clase.groupby("curso")["nota"].mean()` | `aggregate(nota ~ curso, clase, mean)` |
| Primera fila | 1 | 0 | 1 |

Las tres guardan las tablas por columnas. En R, el `data.frame` viene con el lenguaje; en Python y en Julia es un paquete, pandas y DataFrames. Y en Julia la máscara lleva el punto, `.>=`, como siempre que se compara casilla a casilla.
:::

## Conexiones

- Las máscaras de *Índices, filtros y el punto* eligen filas de una tabla igual que casillas de un vector.
- Una tabla es como una matriz en la que cada columna tiene su tipo y su nombre, y se guarda, como las matrices, por columnas.
- Una columna que se comparte (`col = clase.nota`) es lo mismo que `b = a` con un vector; una copia, `clase[:, :nota]`, como `copy`.
- Un vector de `Alumna`, del capítulo anterior, guarda la clase **por filas**; un `DataFrame`, **por columnas**. En *Rendimiento* verás por qué la segunda forma suele ser más rápida.
- En la parte III, *Datos y estadística* y *Gráficos* trabajarán con tablas como esta.

## La grieta

Con esta tabla termina la parte II: ya sabes guardar textos, diccionarios, matrices, tipos propios y tablas. En *Matrices* multiplicaste las notas por los pesos para sacar la nota final. Pero ¿y al revés? Si conoces las notas finales de varios alumnos y sus notas de cada examen, ¿se pueden averiguar los pesos? Eso es resolver un sistema de ecuaciones, y en Julia se escribe con una sola barra: `A \ b`. Es el comienzo de la parte III, en *Álgebra lineal*.

## Ejercicios

1. **Tu tabla.** Crea una tabla `ciudades` con tres ciudades, su provincia y sus habitantes (inventados). ¿Qué dan `nrow(ciudades)` y `names(ciudades)`?

2. **Dos condiciones.** Con la tabla de seis alumnos del apartado 4, quédate con los aprobados de primero. Recuerda los paréntesis y el `.&` de *Índices, filtros y el punto*.

3. **Ordenar por dos columnas.** ¿Qué hace `sort(clase, [:curso, :nota])` con la tabla de seis alumnos? ¿En qué orden salen?

4. **Redondear.** Añade a la tabla de cuatro alumnos una columna `redondeada = round.(clase.nota)`. ¿Qué valor sale para Biel, que tiene un 4.5? ¿Y para Carla, con 7.5?

5. **Aprobados por curso.** Con la tabla de seis alumnos, cuenta los aprobados de cada curso con `combine`, `groupby` y una función anónima que use `count`.

6. **Predice.** ¿Qué valen `clase[1, :nota]` y `clase[2, :nota]` al final?

   ```julia
   clase = DataFrame(nombre = ["Ana", "Biel"], nota = [9.0, 4.5])
   v = clase.nota
   w = clase[:, :nota]
   v[1] = 0.0
   w[2] = 10.0
   ```

::::{div}
:class: afondo
7. **Fila a fila.** Escribe un bucle `for fila in eachrow(clase)` que escriba `Ana: 9.0`, `Biel: 4.5`… usando `fila.nombre` y `fila.nota`. ¿Por qué para sumar las notas es mejor `sum(clase.nota)` que un bucle por filas?

8. **Ida y vuelta.** Si tienes Julia en tu ordenador o en la nube, instala CSV.jl, guarda la tabla de seis alumnos con `CSV.write` y vuelve a leerla con `CSV.read`. ¿Da `true` la comparación `otra == clase`? ¿Qué tipo tiene cada columna?
::::

## Solucionario

1. Por ejemplo, `ciudades = DataFrame(ciudad = ["Lleida", "Girona", "Tarragona"], provincia = ["Lleida", "Girona", "Tarragona"], habitantes = [140000, 105000, 138000])`. `nrow(ciudades)` da `3` y `names(ciudades)`, el vector `["ciudad", "provincia", "habitantes"]`: los nombres de las columnas, como textos.
2. `clase[(clase.curso .== 1) .& (clase.nota .>= 5), :]` da una tabla de dos filas, Dani (6.0) y Eva (8.0). Sin los paréntesis, el `.&` se haría antes que las comparaciones.
3. Ordena por curso y, dentro de cada curso, por nota: Biel (1, 4.5), Dani (1, 6.0), Eva (1, 8.0), Fran (2, 5.5), Carla (2, 7.5) y Ana (2, 9.0).
4. La columna vale `[9.0, 4.0, 8.0, 6.0]`. Biel tiene un 4.0 y Carla un 8.0: `round` redondea los empates (las notas acabadas en .5) al número **par** más cercano, y no siempre hacia arriba. Para redondear siempre hacia arriba en los empates, `round.(clase.nota, RoundNearestTiesUp)`.
5. `combine(groupby(clase, :curso), :nota => (n -> count(n .>= 5)) => :aprobados)` da 2 aprobados en primero (Dani y Eva) y 3 en segundo (Ana, Carla y Fran).
6. `clase[1, :nota]` vale `0.0` y `clase[2, :nota]` vale `4.5`. `v` es la columna misma, así que cambiarla cambia la tabla. `w` es una copia, y cambiarla no la toca.

::::{div}
:class: afondo
7. `for fila in eachrow(clase); println(fila.nombre, ": ", fila.nota); end`. Para sumar, `sum(clase.nota)` recorre un solo vector de decimales seguido en la memoria. El bucle por filas va de columna en columna en cada vuelta, y Julia no sabe de antemano de qué tipo es cada casilla de una fila.
8. Sí: `otra == clase` da `true`. Los cursos vuelven como `Int64` y las notas como `Float64`; la columna de nombres usa un tipo de texto propio de CSV.jl, que se compara igual que un `String`. El archivo tiene una línea de cabecera, `nombre,curso,nota`, y una línea por alumno.
::::
