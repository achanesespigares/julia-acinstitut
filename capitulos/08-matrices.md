---
title: Matrices
subtitle: Tablas de números con dos índices, y cómo las guarda Julia
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En el cuaderno de un profesor, las notas no están en una lista: están en una cuadrícula. Cada fila es un alumno y cada columna, un examen. Para encontrar la nota de Biel en el tercer examen no cuentas posiciones: vas a su fila y bajas hasta la tercera columna.

Con una cuadrícula se hacen cosas que con una lista no se pueden: sumar cada columna para la media de un examen, sumar cada fila para el total de un alumno, o ponderar los exámenes para sacar la nota final.

## La pregunta

¿Cómo se guarda en Julia una tabla de números, con filas y columnas? ¿Cómo se lee una casilla, una fila entera o una columna? ¿Y cómo se suma por filas, por columnas, o se multiplica?

## La idea

Una **matriz** es una tabla de valores del mismo tipo, con **dos índices**: `A[i, j]` es la casilla de la fila `i` y la columna `j`. Se escribe entre corchetes, con espacios entre las columnas y punto y coma entre las filas:

```julia
notas = [9.0 6.5 7.0; 7.5 3.0 8.5]     # 2 filas y 3 columnas
```

Los dos puntos solos, `:`, quieren decir «todo»: `notas[2, :]` es la fila 2 entera y `notas[:, 1]`, la columna 1. Casi todo lo que sabes de vectores sirve aquí: los rangos, las máscaras y el punto.

:::{important} Julia guarda las matrices por columnas
En la memoria, una matriz es una sola fila de casillas: primero la columna 1, de arriba abajo, después la columna 2, y así hasta la última. Por eso `vec(A)` da los valores columna a columna, y `A[5]` es la quinta casilla en ese orden. R y Fortran hacen lo mismo; NumPy y C, al revés: guardan por filas.
:::

## Construcción

### 1 · Una tabla de notas

:::{tip} Predice
`notas` tiene 4 alumnos y 3 exámenes. ¿Qué dará `notas[2, 3]`? ¿Y `notas[2, :]`: un número, un vector o una matriz?
:::

```{code-cell} julia
notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5; 5.5 6.0 4.0]
f, c = size(notas)
biel = notas[2, 3]
fila2 = notas[2, :]
examen1 = notas[:, 1]
trozo = notas[1:2, 2:3]
notas[5, 1]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/08-matrices-1.json","config":{"etiqueta":"A[fila, columna]","idea":"Una matriz se lee con dos índices: primero la fila y después la columna. Con dos números sale una casilla; con : y un número, una fila o una columna entera; con dos rangos, un trozo de la tabla. Un índice que se sale de la tabla es un error.","titulo":"Las notas de la clase"}}
```

Las filas son Ana, Biel, Carla y Dani, y las columnas, sus tres exámenes. La matriz se escribe fila a fila: los valores de una fila van separados por espacios y las filas, por punto y coma. Su tipo es `Matrix{Float64}`, una matriz de decimales, y el visualizador la dibuja como una tabla con el nombre de cada fila y de cada columna.

`size(notas)` da la tupla `(4, 3)`: 4 filas y 3 columnas. Como es una tupla, se reparte en dos variables, `f` y `c`. Para una sola dimensión, `size(notas, 1)` da las filas y `size(notas, 2)`, las columnas.

Con dos números sale una casilla: `notas[2, 3]` es la fila de Biel y la columna del tercer examen, `8.5`. Con los dos puntos sale una línea entera. `notas[2, :]` es la fila 2 y `notas[:, 1]` es la columna 1, y las dos son **vectores**: ya no tienen dos dimensiones.

Con dos rangos, `notas[1:2, 2:3]`, sale un trozo de la tabla que sigue siendo una matriz, de 2 × 2. Como al indexar un vector con un rango, es una **copia**: cambiarla no cambia `notas`.

La última línea pide la fila 5, que no existe, y Julia se detiene con ``BoundsError: attempt to access 4×3 Matrix{Float64} at index [5, 1]``. El mensaje da el tamaño de la matriz y los dos índices.

### 2 · Cambiar casillas, filas y columnas

:::{tip} Predice
`notas[:, 3] .+= 0.5` sube medio punto el tercer examen a toda la clase. ¿Qué pasará en la última línea, que intenta poner un 10 en toda la fila 1 con un `=` sin punto?
:::

```{code-cell} julia
notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5; 5.5 6.0 4.0]
notas[2, 2] = 5.0
notas[:, 3] .+= 0.5
notas[4, :] = [6.0, 6.5, 5.0]
notas[1, :] = 10.0
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/08-matrices-2.json","config":{"etiqueta":"= frente a .=","idea":"Una casilla se cambia con =. Para una fila o una columna hay dos maneras: darle tantos valores como casillas tiene, o repartir un mismo valor con el punto (.=, .+=). Un valor suelto con = no basta.","titulo":"Corregir las notas"}}
```

`notas[2, 2] = 5.0` cambia una casilla, como en un vector: la revisión del examen de Biel le sube el 3.0 a un 5.0. La matriz es la misma; solo cambia esa casilla.

`notas[:, 3] .+= 0.5` suma 0.5 a cada casilla de la columna 3. El punto hace que la suma se reparta casilla a casilla, y el resultado se guarda en las mismas casillas. Fíjate en la consola: Julia escribe una `view`, una **vista** de las cuatro casillas que acaban de cambiar.

Una fila también se puede cambiar de golpe dándole tantos valores como casillas tiene: `notas[4, :] = [6.0, 6.5, 5.0]` sustituye las tres notas de Dani.

La última línea no funciona. `notas[1, :] = 10.0` intenta meter **un** número en **tres** casillas, y Julia no adivina lo que quieres: ``ArgumentError: indexed assignment with a single value to possibly many locations is not supported; perhaps use broadcasting `.=` instead?`` Lo que querías es `notas[1, :] .= 10.0`, con el punto: repartir el 10 en toda la fila.

### 3 · Sumar por filas o por columnas

:::{tip} Predice
`sum(notas)` suma las doce notas. ¿Qué crees que dará `sum(notas; dims=1)`: un número, un vector o una matriz?
:::

```{code-cell} julia
notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5; 5.5 6.0 4.0]
total = sum(notas)
por_examen = sum(notas; dims=1)
por_alumno = sum(notas; dims=2)
medias = por_examen / 4
mejor = maximum(notas; dims=1)
aprobados = sum(notas .>= 5; dims=1)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/08-matrices-3.json","config":{"etiqueta":"sum(A; dims = 1)","idea":"dims dice qué dimensión se recorre al sumar: dims = 1 baja por las filas y deja una fila con el resultado de cada columna; dims = 2 cruza las columnas y deja una columna con el de cada fila. El resultado sigue siendo una matriz.","titulo":"Medias por examen, totales por alumno"}}
```

Sin más, `sum(notas)` suma todas las casillas: 84.5. Pero lo interesante de una tabla es sumar por partes, y eso lo dice la palabra clave `dims`, la **dimensión** que se recorre.

`dims=1` recorre la primera dimensión, las filas: baja por cada columna y la suma. El resultado, `por_examen`, tiene una sola fila con la suma de cada examen: 32.0, 23.5 y 29.0. `dims=2` recorre las columnas: cruza cada fila y da una sola columna con el total de cada alumno.

Fíjate en el tipo: `por_examen` no es un vector sino una matriz de 1 × 3, y `por_alumno` es una matriz de 4 × 1. Julia conserva las dos dimensiones para que el resultado encaje con la tabla de la que sale. Si quieres un vector, `vec(por_alumno)`.

Las demás reducciones funcionan igual. `por_examen / 4` da las medias: 8.0, 5.875 y 7.25. `maximum(notas; dims=1)` da la mejor nota de cada examen. Y `notas .>= 5` es una matriz de `true` y `false`, una máscara, que al sumarla por columnas cuenta los aprobados: 4, 3 y 3.

### 4 · Ponderar los exámenes: el producto de matrices

:::{tip} Predice
Los tres exámenes cuentan un 25 %, un 25 % y un 50 %. Para la nota final de cada alumno, ¿hay que usar `notas * pesos` o `notas .* pesos`?
:::

```{code-cell} julia
notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5; 5.5 6.0 4.0]
pesos = [0.25, 0.25, 0.5]
finales = notas * pesos
a_mano = notas[1, 1] * pesos[1] + notas[1, 2] * pesos[2] + notas[1, 3] * pesos[3]
cada_una = notas .* pesos'
notas * notas
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/08-matrices-4.json","config":{"etiqueta":"* frente a .*","idea":"El * sin punto es el producto de matrices del álgebra: cada fila se multiplica casilla a casilla por el vector y se suma. Da la nota final de cada alumno. Con el punto, .*, solo se multiplica casilla a casilla, sin sumar.","titulo":"La nota final"}}
```

`notas * pesos` es el **producto de matrices**: para cada fila, Julia multiplica sus casillas por las del vector y suma. La fila de Ana da 9.0 · 0.25 + 6.5 · 0.25 + 7.0 · 0.5 = 7.375, y `a_mano` lo comprueba paso a paso. El resultado, `finales`, es un vector con una nota final por alumno.

Para que se pueda multiplicar, las piezas tienen que **encajar**: cada fila de `notas` tiene 3 casillas y `pesos`, también 3. En general, una matriz de f × n por otra de n × c da una de f × c: el número de columnas de la primera tiene que ser el de filas de la segunda.

`notas .* pesos'` es otra cosa. El apóstrofo convierte `pesos`, una columna, en una fila (es la **traspuesta**), y el punto multiplica casilla a casilla: cada nota por el peso de su examen, sin sumar. `cada_una` es la tabla de 4 × 3 con lo que aporta cada examen a cada alumno. Si sumas cada fila, vuelves a `finales`.

La última línea intenta `notas * notas`: 4 × 3 por 4 × 3. Las filas de la primera tienen 3 casillas y las columnas de la segunda, 4. No encajan, y Julia lo explica: ``DimensionMismatch: incompatible dimensions for matrix multiplication: tried to multiply a matrix of size (4, 3) with a matrix of size (4, 3). The second dimension of the first matrix: 3, does not match the first dimension of the second matrix: 4.``

### 5 · Por columnas: cómo guarda Julia una matriz

:::{tip} Predice
`A` es `[1 2 3; 4 5 6]`. ¿En qué orden saldrán sus números en `vec(A)`? Y si se cambia una casilla de `B`, que sale de `reshape`, ¿cambiará `A`?
:::

```{code-cell} julia
A = [1 2 3; 4 5 6]
v = vec(A)
quinto = A[5]
B = reshape(v, 3, 2)
B[1, 1] = 100
A
P = permutedims(A)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/08-matrices-5.json","config":{"etiqueta":"vec · reshape","idea":"En la memoria, una matriz es una fila de casillas ordenadas por columnas. vec la enseña como vector y reshape la lee con otra forma, sin copiar nada: comparten las casillas con la matriz original. permutedims, en cambio, hace una copia con las filas y las columnas cambiadas.","titulo":"Una fila de casillas, leída por columnas"}}
```

`vec(A)` da los seis números como un vector, y no en el orden en que se leen, 1, 2, 3, 4, 5, 6, sino en el que Julia los guarda: **por columnas**, 1, 4, 2, 5, 3, 6. Primero baja por la columna 1, después por la 2 y después por la 3.

Ese orden explica `A[5]`: con un solo índice, una matriz se lee como esa fila de casillas, y la quinta es el 3. Es el **índice lineal**. Se usa poco, pero cuando ves `A[A .> 8]` en una matriz, el resultado sale en este orden.

`reshape(v, 3, 2)` lee las mismas seis casillas como una matriz de 3 filas y 2 columnas, llenándola también por columnas. Y aquí está la sorpresa: ni `vec` ni `reshape` copian nada. `B`, `v` y `A` son tres objetos distintos que miran las **mismas casillas** de la memoria. Al cambiar `B[1, 1]`, cambian `v[1]` y `A[1, 1]`.

`permutedims(A)` sí hace una matriz nueva: la de 3 × 2 que tiene por filas las columnas de `A`. Es la traspuesta, pero copiada. Cambiar `P` no cambia `A`.

::::{div}
:class: afondo
### 6 · Por qué importa el orden de las casillas

Que la matriz esté guardada por columnas no es un detalle. El procesador no lee la memoria casilla a casilla, sino a trozos de 64 bytes, ocho números `Float64`. Si recorres una matriz por columnas, cada trozo que trae lo aprovechas entero. Si la recorres por filas, saltas de una columna a otra y casi todo el trozo se desperdicia.

```julia
function por_columnas(A)
    s = 0.0
    for j in axes(A, 2), i in axes(A, 1)    # el índice de dentro, i, es el de las filas
        s += A[i, j]
    end
    s
end
```

Con una matriz de 5000 × 5000, en el ordenador en que se escribió este libro, `por_columnas` tardó 0,019 segundos y la misma suma por filas, 0,21: unas diez veces más. El manual de Julia lo resume en una regla: en una matriz guardada por columnas, el primer índice es el que debe cambiar más deprisa. En un bucle doble, el índice de **dentro** debe ser el **primero**, el de las filas.

Tres consecuencias más:

- **`A'` no copia.** El apóstrofo da una **vista**, de tipo `Adjoint`: una forma de leer `A` con las filas y las columnas cambiadas. Si después cambias `A`, la vista lo ve. Con `B = [1 2; 3 4]`, `t = B'` y `B[1, 2] = 20`, `t` pasa a valer `[1 3; 20 4]`. Para una copia independiente, `permutedims(B)` o `collect(B')`.
- **El producto de matrices es caro.** Para dos matrices de n × n hay que hacer n³ multiplicaciones: con n = 1000, mil millones. Julia no las hace con un triple bucle, sino con **BLAS** (OpenBLAS), una biblioteca afinada para cada procesador. Multiplicar dos matrices de 1000 × 1000 le llevó 0,03 segundos; un triple bucle escrito en Julia, 0,9.
- **BLAS suma en su propio orden.** Para ir rápido, reparte las sumas en bloques que dependen del procesador. Con decimales, sumar en otro orden puede cambiar la última cifra, así que `A * B` puede no dar exactamente lo mismo en dos ordenadores. Por eso el laboratorio de este libro solo calcula un producto de decimales cuando el resultado es exacto en cualquier orden, como con notas y pesos de medio punto. Si no lo es, te lo dice y te invita a probarlo en la nube con Julia de verdad.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python (NumPy) | R |
|---|---|---|---|
| Crear | `[1 2; 3 4]` | `np.array([[1, 2], [3, 4]])` | `matrix(c(1, 3, 2, 4), nrow = 2)` |
| Una casilla | `A[1, 2]` | `A[0, 1]` | `A[1, 2]` |
| Una fila | `A[1, :]` | `A[0, :]` | `A[1, ]` |
| Tamaño | `size(A)` | `A.shape` | `dim(A)` |
| Suma de cada columna | `sum(A; dims=1)` | `A.sum(axis=0)` | `colSums(A)` |
| Producto de matrices | `A * B` | `A @ B` | `A %*% B` |
| Casilla a casilla | `A .* B` | `A * B` | `A * B` |
| Orden en la memoria | por columnas | por filas | por columnas |

En NumPy, `*` multiplica casilla a casilla y el producto de matrices es `@`; en Julia es justo al revés, y el punto lo deja siempre a la vista. R cuenta desde 1 y guarda por columnas, como Julia: `matrix(c(1, 3, 2, 4), nrow = 2)` rellena la matriz columna a columna.
:::

## Conexiones

- Los índices, los rangos y las máscaras de *Vectores y rangos* y de *Índices, filtros y el punto* funcionan en cada dimensión de una matriz.
- El punto reparte una operación por las casillas, y con matrices también estira una fila o una columna para que encaje: `notas .* pesos'`.
- `vec` y `reshape` comparten casillas como `b = a` compartía un vector: nombres distintos que miran la misma memoria. Las vistas como `A'` volverán en *Memoria: copias y vistas*.
- En *Álgebra lineal* las matrices se invierten, se resuelven sistemas y se calculan determinantes. En *Tablas de datos* las columnas tendrán nombre y cada una su propio tipo. Y en *Rendimiento* volverá el orden de la memoria.

## La grieta

Una matriz guarda las notas, pero solo las notas: todas sus casillas tienen que ser del mismo tipo, y los nombres de los alumnos no caben. ¿Cómo se guarda una alumna entera, con su nombre, su curso y sus notas, y se le pone nombre al tipo para escribir funciones que trabajen con alumnas? Hace falta un tipo nuevo, tuyo: lo verás en *Tipos propios*.

## Ejercicios

1. **La tabla de multiplicar.** Construye `tabla = [i * j for i in 1:9, j in 1:9]`. ¿Qué hay en `tabla[7, 8]`? ¿Cómo sacas la tabla del 7 entera?

2. **La identidad.** Construye la matriz identidad de 3 × 3, con unos en la diagonal y ceros fuera, con una comprensión y el operador ternario.

3. **Suspensos por alumno.** Con la matriz `notas` del capítulo, cuenta cuántos exámenes ha suspendido cada alumno. ¿Qué forma tiene el resultado?

4. **Traspuesta a mano.** Con `A = [1 2 3; 4 5 6]`, construye su traspuesta con una comprensión, sin usar `permutedims` ni `'`, y comprueba con `==` que coincide con `permutedims(A)`.

5. **El orden importa.** Con `M = [1 2; 3 4]` y `N = [0 1; 1 0]`, calcula `M * N` y `N * M` a mano y después en Julia. ¿Son iguales?

6. **Predice.** ¿Qué vale `A` al final?

   ```julia
   A = [1 2; 3 4]
   v = vec(A)
   v[2] = 30
   A
   ```

::::{div}
:class: afondo
7. **Recorrer por filas.** Escribe `por_filas(A)`, la misma suma que `por_columnas` pero con el bucle de las columnas por dentro. ¿En qué orden visita las casillas de `[1 2 3; 4 5 6]` cada función? Da la lista de índices lineales.

8. **El producto con tres bucles.** Escribe una función `producto(A, B)` que calcule el producto de matrices con tres bucles, sumando en `C[i, j]` los productos `A[i, k] * B[k, j]`, y comprueba que `producto(M, N) == M * N`. ¿Cuántas multiplicaciones hace para dos matrices de n × n?
::::

## Solucionario

1. `tabla[7, 8]` es `56`, fila 7 y columna 8. La tabla del 7 es la fila 7, `tabla[7, :]`: `[7, 14, 21, 28, 35, 42, 49, 56, 63]`. Como la tabla es simétrica, la columna 7, `tabla[:, 7]`, también vale.
2. `[i == j ? 1 : 0 for i in 1:3, j in 1:3]` da `[1 0 0; 0 1 0; 0 0 1]`. Con dos `for` separados por una coma, la comprensión crea una matriz: el primero recorre las filas y el segundo, las columnas.
3. `sum(notas .< 5; dims=2)` da `[0; 1; 0; 1;;]`: Biel ha suspendido uno (el 3.0) y Dani, otro (el 4.0). Es una matriz de 4 × 1, una columna: `dims=2` suma cada fila y deja una casilla por alumno.
4. `[A[j, i] for i in 1:3, j in 1:2]` da una matriz de 3 × 2 en la que la casilla `[i, j]` es la `[j, i]` de `A`. `[A[j, i] for i in 1:3, j in 1:2] == permutedims(A)` da `true`.
5. `M * N` es `[2 1; 4 3]` y `N * M` es `[3 4; 1 2]`. No son iguales: multiplicar por `N` por la derecha intercambia las columnas de `M`, y por la izquierda, sus filas. El producto de matrices no es conmutativo.
6. `A` vale `[1 2; 30 4]`. `vec(A)` no copia: comparte las casillas con `A`, en orden de columnas, así que `v[2]` es `A[2, 1]`, el 3, que pasa a ser 30.

::::{div}
:class: afondo
7. Con `for i in axes(A, 1), j in axes(A, 2)`, `por_filas` visita `A[1, 1]`, `A[1, 2]`, `A[1, 3]`, `A[2, 1]`… que en la memoria son las casillas 1, 3, 5, 2, 4, 6: va saltando. `por_columnas` visita 1, 2, 3, 4, 5, 6, una detrás de otra. Las dos dan la misma suma, 21.0.
8. Con `f, n = size(A)`, `c = size(B, 2)`, `C = zeros(eltype(A), f, c)` y tres bucles, `for j in 1:c, i in 1:f, k in 1:n; C[i, j] += A[i, k] * B[k, j]; end`, la función da `true` al compararla con `M * N`. Hace n multiplicaciones por cada una de las n × n casillas: n³ en total.
::::
