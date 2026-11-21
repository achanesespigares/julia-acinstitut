---
title: Álgebra lineal
subtitle: Sistemas de ecuaciones con una barra, y la diferencia entre decimales y fracciones
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *Matrices* calculaste la nota final de cada alumna multiplicando la matriz de notas por el vector de pesos: `notas * pesos`. Cada nota final es una suma, `0.25 · examen 1 + 0.25 · examen 2 + 0.5 · examen 3`, y una matriz por un vector hace todas esas sumas de una vez.

Esa cuenta va en un sentido: de los pesos a las notas finales. El álgebra lineal estudia también el camino de vuelta.

## La pregunta

La secretaría tiene las notas de los tres exámenes de Ana, Biel y Carla, y sus tres notas finales. Lo que ha perdido son los pesos de cada examen. ¿Se pueden recuperar a partir de esos datos? ¿Y cómo se le pide a Julia?

## La idea

Si los pesos son `w₁`, `w₂` y `w₃`, cada alumna da una ecuación: sus tres notas por los tres pesos suman su nota final. Tres alumnas, tres ecuaciones y tres incógnitas. Escrito con matrices, es `A * w = b`: la matriz de notas `A` por el vector desconocido `w` da el vector de notas finales `b`. Es un **sistema de ecuaciones lineales**.

En Julia, un sistema se resuelve con la **barra invertida**:

```julia
w = A \ b
```

Se lee «`A` dividiendo por la izquierda a `b`»: el vector que, multiplicado por `A`, da `b`. Julia no calcula la inversa de `A` para eso. Reordena las ecuaciones y las va despejando, como se hace a mano, con un método que se llama factorización LU.

`\` e `inv` están siempre disponibles. El resto de herramientas (el determinante `det`, el producto escalar `dot`, la longitud de un vector `norm` y la matriz identidad `I`) están en el paquete LinearAlgebra. Viene con Julia, así que no hay que instalarlo, pero sí cargarlo con `using LinearAlgebra`.

:::{important} Decimales o fracciones
Con decimales, Julia resuelve los sistemas con LAPACK, una biblioteca muy rápida que redondea en cada paso: la última cifra del resultado puede salir torcida, y puede cambiar de un ordenador a otro. Con fracciones (`//`), las cuentas son exactas: `A \ b` da la solución exacta, sin redondeo.
:::

## Construcción

### 1 · El producto escalar y la norma

:::{tip} Predice
`dot(ana, pesos)` multiplica cada nota de Ana por su peso y lo suma todo. ¿Qué número saldrá? Lo calculaste en *Matrices*.
:::

```{code-cell} julia
using LinearAlgebra
ana = [9.0, 6.5, 7.0]
pesos = [0.25, 0.25, 0.5]
final = dot(ana, pesos)
igual = ana' * pesos
carla = [10.0, 8.0, 9.5]
d = norm(carla - ana)
largo = norm([3, 4])
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/11-algebra-lineal-1.json","config":{"etiqueta":"dot · norm","idea":"El producto escalar multiplica dos vectores casilla a casilla y suma: dot(u, v), o u' * v. La norma es la longitud de un vector: la raíz cuadrada de la suma de los cuadrados.","titulo":"La nota final, otra vez"}}
```

`using LinearAlgebra` carga el paquete. `dot(ana, pesos)` es el **producto escalar**: `9.0 · 0.25 + 6.5 · 0.25 + 7.0 · 0.5`, que da 7.375, la nota final de Ana. `ana' * pesos` es lo mismo escrito como en *Matrices*: `ana'` es una fila, y una fila por una columna da un solo número.

`norm(v)` es la **norma** de un vector, su longitud: la raíz cuadrada de la suma de los cuadrados de sus casillas. `norm([3, 4])` da 5.0, como la hipotenusa de un triángulo de lados 3 y 4. Aunque las casillas sean enteras, la norma es un `Float64`, porque lleva una raíz.

`norm(carla - ana)` mide lo lejos que están las notas de Carla de las de Ana. La resta es `[1.0, 1.5, 2.5]` y su norma, la raíz de 9.5, unos 3.08 puntos. Es la distancia entre los dos puntos en un espacio de tres dimensiones, una por examen.

### 2 · Dos ecuaciones, una barra

Antes de los pesos, un sistema pequeño. Dos cuadernos y un bolígrafo cuestan 5 €; cuatro cuadernos y tres bolígrafos, 11 €. ¿Cuánto cuesta cada cosa?

:::{tip} Predice
Todos los datos son enteros: la matriz `A` y el vector `b`. ¿De qué tipo será la solución `x`?
:::

```{code-cell} julia
A = [2 1; 4 3]
b = [5, 11]
x = A \ b
A * x
A * x == b
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/11-algebra-lineal-2.json","config":{"etiqueta":"A \\ b","idea":"Un sistema de ecuaciones es una matriz por un vector desconocido: A * x = b. Se resuelve con la barra invertida, x = A \\ b. Para comprobarlo, se multiplica A por la solución.","titulo":"Cuadernos y bolígrafos"}}
```

Cada fila de `A` es una ecuación: `2x₁ + x₂ = 5` y `4x₁ + 3x₂ = 11`, con `x₁` el precio de un cuaderno y `x₂` el de un bolígrafo. `A \ b` da `[2.0, 1.0]`: el cuaderno cuesta 2 € y el bolígrafo, 1 €.

La solución es un `Vector{Float64}`, aunque todos los datos sean enteros. Para despejar hay que dividir, y Julia convierte la matriz a decimales antes de empezar. Por eso `A * x` da `[5.0, 11.0]`, con decimales, y aun así `A * x == b` da `true`: `5.0 == 5` es cierto en Julia, como viste en *Julia como calculadora*.

### 3 · Los pesos de los exámenes, exactos

Ahora sí, la pregunta del capítulo. Las notas son las de *Matrices*, y las notas finales salieron con los pesos 0.25, 0.25 y 0.5. ¿Los recupera Julia?

:::{tip} Predice
`Rational.(notas)` convierte cada nota en una fracción exacta: 6.5 pasa a ser `13//2`. ¿Cómo crees que escribirá Julia los pesos?
:::

```{code-cell} julia
notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5]
finales = [7.375, 6.875, 9.25]
A = Rational.(notas)
b = Rational.(finales)
w = A \ b
Float64.(w)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/11-algebra-lineal-3.json","config":{"etiqueta":"fracciones","idea":"Rational.(x) convierte cada decimal en la fracción exacta que guarda. Con una matriz de fracciones, A \\ b hace todas las cuentas sin redondear y da la solución exacta.","titulo":"Los pesos perdidos"}}
```

`Rational.(notas)` aplica `Rational` a cada casilla, con el punto de *Índices, filtros y el punto*. Un decimal acabado en .5 o en .25 se guarda exacto en binario, así que su fracción también es exacta: 6.5 es `13//2` y 7.375 es `59//8`. La matriz `A` es de tipo `Matrix{Rational{Int64}}`.

Con fracciones, Julia resuelve el sistema con sumas, restas, productos y divisiones exactas, como en un papel. `w` sale `[1//4, 1//4, 1//2]`: los pesos de siempre, sin ningún error. `Float64.(w)` los pasa a decimales, `[0.25, 0.25, 0.5]`.

¿Por qué no resolverlo directamente con decimales? Se puede, y en este caso también daría `[0.25, 0.25, 0.5]`. Pero con decimales Julia redondea en cada paso, y en otras cuentas con la misma matriz la última cifra sale torcida. Lo verás en el «A fondo».

### 4 · ¿Siempre hay solución?

:::{tip} Predice
En la matriz `B`, la primera fila es el doble de la segunda. ¿Qué crees que pasará al resolver `B \ [1, 2]`?
:::

```{code-cell} julia
using LinearAlgebra
A = [2 1; 4 3]
dA = det(A)
B = [2 4; 1 2]
dB = det(B)
x = B \ [1, 2]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/11-algebra-lineal-4.json","config":{"etiqueta":"det","idea":"El determinante dice si un sistema cuadrado tiene una única solución: la tiene si det(A) no es 0. Si es 0, A \\ b no puede despejar y da SingularException.","titulo":"Dos rectas paralelas"}}
```

`det(A)` es el **determinante** de `A`. En una matriz de 2 × 2 es `2 · 3 − 1 · 4 = 2`. Si no es 0, el sistema tiene una única solución, y `A \ b` la encuentra.

En `B`, la primera ecuación es `2x₁ + 4x₂ = 1` y la segunda, `x₁ + 2x₂ = 2`. Si se multiplica la segunda por 2, queda `2x₁ + 4x₂ = 4`: el mismo lado izquierdo que la primera, pero con otro resultado. No hay ningún par de números que cumpla las dos. Dibujadas, son dos rectas paralelas, que no se cortan. `det(B)` vale 0.0.

`B \ [1, 2]` lo intenta, y al despejar se encuentra un 0 en el sitio por el que tendría que dividir. Julia se detiene con ``SingularException: matrix is singular; factorization failed. Zero pivot found at index 2``. Una matriz **singular** es una matriz cuadrada con determinante 0.

### 5 · La identidad y la inversa

:::{tip} Predice
La inversa de `A` es la matriz que, multiplicada por `A`, da la identidad. ¿Dará lo mismo `inv(A) * b` que `A \ b`?
:::

```{code-cell} julia
using LinearAlgebra
A = [2//1 1; 4 3]
Ainv = inv(A)
A * Ainv == I
I
x = Ainv * [5, 11]
y = A \ [5, 11]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/11-algebra-lineal-5.json","config":{"etiqueta":"inv · I","idea":"inv(A) es la inversa: A * inv(A) es la identidad I, la matriz con unos en la diagonal. inv(A) * b resuelve el sistema, pero A \\ b lo hace sin calcular la inversa.","titulo":"La inversa de los cuadernos"}}
```

`A = [2//1 1; 4 3]` es la matriz de los cuadernos, pero con fracciones: basta con que una casilla sea una fracción para que Julia las convierta todas. `inv(A)` es su **inversa**, con las casillas `3//2`, `-1//2`, `-2//1` y `1//1`. Si la escribieras en la consola, Julia la mostraría como `[3//2 -1//2; -2 1]`: dentro de una matriz de fracciones, se ahorra el `//1`.

`A * Ainv == I` da `true`. `I` es la **matriz identidad**: unos en la diagonal y ceros fuera. Es para las matrices lo que el 1 para los números, porque `A * I` es `A`. Julia la escribe `true*I` porque no tiene un tamaño fijo: toma el de la matriz con la que se opera.

`Ainv * [5, 11]` y `A \ [5, 11]` dan lo mismo, `2//1` y `1//1`: el precio del cuaderno y el del bolígrafo, ahora como fracciones. Pero la barra no calcula la inversa: despeja directamente, y con decimales es más rápida y más precisa. Lo normal es usar `\` y dejar `inv` para cuando de verdad se necesita la matriz inversa.

::::{div}
:class: afondo
### 6 · La última cifra

Los pesos del apartado 3 también se pueden buscar con decimales, sin pasar por fracciones. En el ordenador donde se escribió este libro, Julia 1.13 da:

```julia
using LinearAlgebra
notas = [9.0 6.5 7.0; 7.5 3.0 8.5; 10.0 8.0 9.5]
notas \ [7.375, 6.875, 9.25]   # [0.25, 0.25, 0.5]
det(notas)                     # -56.12500000000001
notas * inv(notas) == I        # false
notas * inv(notas) ≈ I         # true
```

Los pesos salen bien, pero el determinante debería ser exactamente −56.125 (con fracciones, `det(Rational.(notas))` da `-449//8`). Y `notas * inv(notas)` no es exactamente la identidad: una casilla vale `0.9999999999999996` y otra, `-1.1102230246251565e-16`. Es el redondeo de *Julia como calculadora*, que se acumula paso a paso. NumPy, con la misma matriz, da otro determinante: `-56.12500000000005`. Por eso, para comparar resultados con decimales se usa `≈` (`isapprox`), que admite una diferencia muy pequeña.

**Qué hace `\` por dentro.** Julia factoriza `A` en dos matrices triangulares, `L` y `U`, y despeja con ellas, de arriba abajo y de abajo arriba. Para no dividir entre números pequeños, que agrandan los errores, reordena las filas y divide siempre entre el número más grande de la columna: es el **pivote parcial**. Se puede ver con `lu`:

```julia
F = lu([2.0 1; 4 3])
F.L    # [1.0 0.0; 0.5 1.0]
F.U    # [4.0 3.0; 0.0 -0.5]
F.p    # [2, 1]: primero la fila 2, que empieza por 4
```

**Más ecuaciones que incógnitas.** Con las cuatro alumnas de *Matrices* hay cuatro ecuaciones y tres pesos. `A \ b` con una matriz de 4 × 3 no da error: busca los pesos que mejor cumplen las cuatro ecuaciones, por **mínimos cuadrados**, con otra factorización, la QR. Con las cuatro notas finales exactas, da `[0.25000000000000056, 0.24999999999999983, 0.4999999999999996]`.

**`\` mejor que `inv`.** Con una matriz aleatoria de 1000 × 1000, en el ordenador donde se escribió este libro, `inv(A) * b` tardó unas dos veces lo que `A \ b`, y su error (`norm(A * x - b)`) fue el doble. Calcular la inversa entera es más trabajo que despejar una sola solución.

**Las fracciones también tienen un límite.** Una `Rational{Int64}` guarda el numerador y el denominador en enteros de 64 bits, y en cuentas largas pueden crecer mucho. La inversa de la matriz de Hilbert de 15 × 15 (`[1//(i + j - 1) for i in 1:15, j in 1:15]`) ya da `OverflowError`. Con `big(1)//(i + j - 1)`, las fracciones usan `BigInt` y no tienen límite, a cambio de ir más despacio.

**Y en el laboratorio.** Como LAPACK suma en un orden que cambia de un ordenador a otro, el laboratorio solo resuelve sistemas, determinantes e inversas de decimales cuando todas las cuentas son exactas en cualquier orden: por ejemplo, cuando los números entre los que hay que dividir son potencias de dos, como en los cuadernos y bolígrafos. Con fracciones lo resuelve siempre, mientras los números no crezcan tanto como para que Julia pudiera dar un `OverflowError`. Para el resto, y para `lu`, `qr`, `rank` o los valores propios, la nube tiene Julia completo.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python (NumPy) | R |
|---|---|---|---|
| Resolver `A x = b` | `A \ b` | `np.linalg.solve(A, b)` | `solve(A, b)` |
| Determinante | `det(A)` | `np.linalg.det(A)` | `det(A)` |
| Inversa | `inv(A)` | `np.linalg.inv(A)` | `solve(A)` |
| Producto escalar | `dot(u, v)` o `u' * v` | `u @ v` | `sum(u * v)` |
| Norma | `norm(v)` | `np.linalg.norm(v)` | `norm(v, "2")` |
| Fracciones exactas | `Rational.(A) \ Rational.(b)` | otro paquete (SymPy) | no las tiene |

Los tres usan LAPACK por dentro con los decimales, así que dan los mismos resultados salvo en la última cifra. Python tiene fracciones exactas (`fractions.Fraction`), pero NumPy no resuelve sistemas con ellas. Y en R, `MASS::fractions` solo escribe un decimal como la fracción más parecida: `fractions(1/3 + 1e-10)` da `1/3`, aunque el número no lo sea.
:::

## Conexiones

- El producto de una matriz por un vector, de *Matrices*, es el lado izquierdo de un sistema. `A \ b` hace el camino de vuelta.
- `ana'` es la vista traspuesta de *Matrices*: una fila. Una fila por una columna es el producto escalar.
- Las fracciones de *Julia como calculadora* (`1//3`) son las que hacen exactas las cuentas de este capítulo. El redondeo de `0.1 + 0.2` es el mismo que tuerce la última cifra de `det`.
- `I` es un valor de un tipo propio de LinearAlgebra, `UniformScaling`, como los de *Tipos propios*. Su método de `*` hace que `A * I` dé `A`.
- La velocidad de `\` frente a `inv`, y por qué importa el orden de las cuentas, volverán en *Rendimiento*.

## La grieta

Un sistema de dos ecuaciones son dos rectas. La solución es el punto donde se cortan; si son paralelas, no hay solución; si son la misma recta, hay infinitas. El determinante lo dice con un número, pero un dibujo lo dice de un vistazo. ¿Cómo se dibuja una recta en Julia, o los puntos de una tabla, o una función? Es el siguiente capítulo, *Gráficos*.

## Ejercicios

1. **Las entradas del cine.** Cuatro entradas de adulto y dos de niño cuestan 32 €, y una de adulto y una de niño, 10 €. Plantea el sistema como `A * x = b` y resuélvelo con `\`.

2. **Comprobar.** Multiplica la matriz del ejercicio 1 por la solución. ¿Da `b`? ¿Qué da `A * x == b`?

3. **Biel y Dani.** Las notas de Biel son `[7.5, 3.0, 8.5]` y las de Dani, `[5.5, 6.0, 4.0]`. ¿Cuál es la nota final de Biel con los pesos `[0.25, 0.25, 0.5]`? ¿Qué distancia hay entre las notas de los dos, con `norm`?

4. **¿Para qué valor?** ¿Para qué valor de `k` no tiene una única solución el sistema con la matriz `[2 1; 4 k]`? Compruébalo con `det`.

5. **La inversa con fracciones.** Calcula la inversa de `M = [4//1 2; 1 1]`. ¿Da `M * inv(M) == I`? ¿Qué da `inv(M) * [32, 10]`?

6. **Predice.** ¿Qué escribe cada línea?

   ```julia
   using LinearAlgebra
   A = [1 0; 0 2]
   A \ [3, 4]
   det(A)
   A * I == A
   ```

::::{div}
:class: afondo
7. **Más alumnas que exámenes.** Con la matriz de 4 × 3 de *Matrices* y las cuatro notas finales `[7.375, 6.875, 9.25, 4.875]`, calcula `w = notas \ finales` en la nube o en tu ordenador. ¿Salen los pesos exactos? ¿Qué da `round.(w, digits = 2)`?

8. **La matriz de Hilbert.** `H = [1//(i + j - 1) for i in 1:4, j in 1:4]` es una matriz famosa por lo mal que se lleva con los decimales. Calcula `inv(H)`. Después, en la nube o en tu ordenador, calcula `inv(Float64.(H))`. ¿Son iguales?
::::

## Solucionario

1. Con `x₁` el precio de la entrada de adulto y `x₂` el de la de niño: `A = [4 2; 1 1]`, `b = [32, 10]` y `A \ b` da `[6.0, 4.0]`. La entrada de adulto cuesta 6 € y la de niño, 4 €.
2. `A * x` da `[32.0, 10.0]`, con decimales, y `A * x == b` da `true`: Julia compara los valores, no los tipos.
3. `dot([7.5, 3.0, 8.5], [0.25, 0.25, 0.5])` da `6.875`, la nota final de Biel. `norm([7.5, 3.0, 8.5] - [5.5, 6.0, 4.0])` es la norma de `[2.0, -3.0, 4.5]`, la raíz de 33.25: `5.766281297335398`.
4. El determinante es `2k − 4`, que vale 0 cuando `k = 2`: `det([2 1; 4 2])` da `0.0`. La segunda ecuación es entonces el doble de la primera (si el resultado también es el doble, hay infinitas soluciones; si no, ninguna). Con cualquier otro `k` hay una única solución; por ejemplo, `det([2 1; 4 3])` da `2.0`.
5. `inv(M)` es `[1//2 -1; -1//2 2]`. `M * inv(M) == I` da `true`, y `inv(M) * [32, 10]` da `[6, 4]` (Julia escribe `Rational{Int64}[6, 4]`): los precios del ejercicio 1, exactos.
6. `A \ [3, 4]` da `[3.0, 2.0]`: como la matriz es diagonal, cada ecuación tiene una sola incógnita y Julia solo divide. `det(A)` da `2.0`, el producto de la diagonal. `A * I == A` da `true`.

::::{div}
:class: afondo
7. `w` sale `[0.25000000000000056, 0.24999999999999983, 0.4999999999999996]` en el ordenador donde se escribió este libro (las últimas cifras pueden cambiar en el tuyo). Con cuatro ecuaciones, Julia busca la mejor solución por mínimos cuadrados con la factorización QR, y el redondeo deja su rastro. `round.(w, digits = 2)` da `[0.25, 0.25, 0.5]`.
8. `inv(H)` es exacta y tiene todas las casillas enteras: `[16 -120 240 -140; -120 1200 -2700 1680; 240 -2700 6480 -4200; -140 1680 -4200 2800]`. Con decimales, las casillas se acercan pero no coinciden: en el ordenador donde se escribió este libro, la casilla `[2, 2]` sale `1199.999999999904` en lugar de 1200, e `inv(Float64.(H)) == inv(H)` da `false`. Con la matriz de 8 × 8, la diferencia ya llega a más de 8 en alguna casilla.
::::
