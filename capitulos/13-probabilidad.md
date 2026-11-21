---
title: Probabilidad y simulación
subtitle: El azar de un ordenador se calcula, y por eso se puede repetir
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *Gráficos* dibujaste datos que escribías tú: tres exámenes, seis alumnas. Para mil notas, o para un dado tirado diez mil veces, nadie escribe los datos a mano. Se generan.

Ya sabes casi todo lo que hace falta: un vector se crea de una vez, `count` cuenta, un `for` repite y `plot` dibuja. Falta la pieza que tira el dado.

## La pregunta

¿Cómo tira Julia un dado? Si de verdad es azar, ¿cómo puede este libro decirte qué números te van a salir? ¿Y cuántas veces hay que tirar el dado para que los seises salgan, más o menos, una vez de cada seis?

## La idea

`rand()` da un decimal al azar entre 0 y 1. `rand(1:6)` es un dado: elige un entero de 1 a 6, todos con la misma probabilidad. `rand(1:6, 1000)` tira el dado mil veces y da un vector con los resultados. Y `randn()` saca un número de la **campana de Gauss**: alrededor de 0, casi siempre entre −2 y 2. `rand` y `randn` están siempre en Julia, sin cargar nada.

Pero esos números no son azar de verdad. Julia los **calcula**: guarda un estado escondido, y cada vez que pides un número lo saca de ese estado y lo cambia. A esos números se les llama *pseudoaleatorios*. Parecen azar, pero si el estado de partida es el mismo, la lista de números también lo es.

El estado de partida se fija con una **semilla**: `Random.seed!(42)`. `Random` viene con Julia, como `LinearAlgebra`, y se carga con `using Random`.

:::{important} La misma semilla, los mismos números
Después de `Random.seed!(42)`, el primer `rand()` vale siempre `0.6293451231426089`, en cualquier ordenador con Julia 1.13. Sin semilla, Julia empieza cada sesión con un estado distinto, sacado del sistema operativo, y cada vez salen otros números. En este libro y en el laboratorio, cada programa empieza con la semilla `1`, así que, si no la cambias, siempre verás los mismos números. En tu ordenador no: si quieres repetir un resultado, escribe `Random.seed!` al principio.
:::

## Construcción

### 1 · Números que se repiten

:::{tip} Predice
La línea 6 vuelve a poner la semilla 42. ¿Valdrá `c` lo mismo que `a`, lo mismo que `b` o ninguna de las dos cosas?
:::

```{code-cell} julia
using Random
Random.seed!(42)
a = rand()
b = rand()
dado = rand(1:6)
Random.seed!(42)
c = rand()
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/13-probabilidad-1.json","config":{"etiqueta":"rand · Random.seed!","idea":"rand() da un decimal entre 0 y 1, y rand(1:6) un entero de 1 a 6. Cada número cambia el estado escondido del generador. Volver a poner la misma semilla vuelve a empezar la misma lista.","titulo":"El azar que se repite"}}
```

`Random.seed!(42)` no es una asignación, así que Julia muestra lo que devuelve: el generador de números al azar, que se escribe `TaskLocalRNG()`. Es el que usan `rand` y `randn` cuando no les das otro.

`a` y `b` son distintos: cada `rand()` saca un número y cambia el estado, y el siguiente sale del estado nuevo. Lo mismo `dado`, un 3. Pero en la línea 6 la semilla vuelve a ser 42, el estado vuelve a ser el de la línea 2, y `c` sale igual que `a`, hasta el último decimal: `0.6293451231426089`.

`rand()` puede dar 0, pero nunca 1: sus números están en el intervalo `[0, 1)`, y cualquier trozo de ese intervalo tiene la misma probabilidad que otro del mismo tamaño. Que `a` caiga por encima de 0,5 es tan probable como que caiga por debajo.

### 2 · Muchas tiradas de una vez

:::{tip} Predice
`tiradas` son 12 tiradas de un dado. ¿Cuántos seises esperas? ¿Te sorprendería que salieran 3?
:::

```{code-cell} julia
using Random
Random.seed!(2026)
tiradas = rand(1:6, 12)
seises = count(==(6), tiradas)
moneda = rand(["cara", "cruz"], 5)
caras = count(==("cara"), moneda)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/13-probabilidad-2.json","config":{"etiqueta":"rand(1:6, n) · count","idea":"rand(1:6, 12) repite 12 veces la tirada y da un vector. rand de un vector elige uno de sus elementos al azar. ==(6) es una función que pregunta «¿es igual a 6?», y count cuenta cuántos dicen que sí.","titulo":"Doce tiradas y cinco monedas"}}
```

`rand(1:6, 12)` hace las 12 tiradas de una vez y las guarda en un vector: `[4, 2, 4, 4, 1, 2, 5, 6, 3, 6, 2, 6]`. Cada tirada es independiente de las anteriores: el dado no recuerda lo que ha salido.

`==(6)` es `==` con un solo lado escrito: una función que recibe un número y responde si es igual a 6. `count` se la aplica a cada casilla y cuenta los `true`. Es lo mismo que `count(tiradas .== 6)` de *Índices, filtros y el punto*, sin construir la máscara.

Con 12 tiradas, lo esperado son 2 seises, uno de cada seis. Han salido 3. No es un error ni un dado trucado: con tan pocas tiradas, 3 seises salen casi una vez de cada cinco. Lo esperado es un promedio, no lo que sale cada vez.

`rand` también elige de un vector cualquiera: `rand(["cara", "cruz"], 5)` echa cinco monedas. Han salido 3 caras y 2 cruces.

### 3 · Cuantas más tiradas, más cerca

:::{tip} Predice
El bucle tira el dado 10, 100, 1000 y 10 000 veces. ¿En cuál quedará la proporción de seises más cerca de 1/6 ≈ 0,1667?
:::

```{code-cell} julia
using Random
Random.seed!(1)
for n in [10, 100, 1000, 10000]
    tiradas = rand(1:6, n)
    proporcion = count(==(6), tiradas) / n
    println(n, " tiradas: ", proporcion)
end
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/13-probabilidad-3.json","config":{"columnas":["n","proporcion"],"etiqueta":"la ley de los grandes números","fila_en":"fin_iteracion","idea":"Con pocas tiradas, la proporción de seises baila mucho. Con muchas, se acerca a 1/6. Es la ley de los grandes números: lo que pasa a la larga se puede prever, aunque cada tirada no.","titulo":"La proporción de seises"}}
```

Con 10 tiradas sale 0.1; con 100, 0.2, más lejos todavía. Con 1000 ya es 0.157, y con 10 000, 0.1652, a una milésima y media de 1/6. Es la **ley de los grandes números**: la proporción de veces que pasa algo se acerca a su probabilidad cuando se repite muchas veces.

No se acerca de forma ordenada: de 10 a 100 tiradas, la proporción se alejó. Lo que dice la ley es que los saltos son cada vez más pequeños. Como regla aproximada, para tener la mitad de error hacen falta cuatro veces más tiradas.

Así se hace una **simulación**: en lugar de calcular una probabilidad, se repite el experimento muchas veces y se cuenta. Las 10 000 tiradas de la última vuelta tardaron 0,05 milisegundos en el ordenador donde se escribió este libro.

### 4 · La suma de dos dados

:::{tip} Predice
Se tiran dos dados mil veces y se cuenta cada suma, del 2 al 12. ¿Qué suma saldrá más veces?
:::

```{code-cell} julia
using Plots, Random
Random.seed!(7)
d1 = rand(1:6, 1000)
d2 = rand(1:6, 1000)
suma = d1 .+ d2
veces = [count(==(k), suma) for k in 2:12]
bar(2:12, veces, label = "1000 tiradas", xlabel = "suma", ylabel = "veces")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/13-probabilidad-4.json","config":{"etiqueta":"bar","idea":"bar(x, y) dibuja una barra por dato, centrada en x y con la altura de y. La suma 7 sale más que ninguna porque hay más maneras de sacarla: 1 + 6, 2 + 5, 3 + 4, 4 + 3, 5 + 2 y 6 + 1.","titulo":"La suma de dos dados"}}
```

`d1 .+ d2` suma las tiradas casilla a casilla: cada casilla es una tirada de los dos dados. `[count(==(k), suma) for k in 2:12]` es una **comprensión**, como el cifrado César de *Cadenas y caracteres*: recorre las sumas posibles, del 2 al 12, cuenta cuántas veces ha salido cada una y junta los resultados en un vector. `veces` es `[29, 43, 78, 119, 144, 179, 132, 107, 91, 56, 22]`.

`bar(2:12, veces)` dibuja una **barra** por suma, centrada en su valor y tan alta como sus veces. Plots las hace de ancho 0,8, para que quede un hueco entre una y otra, y el eje y empieza en 0, donde nacen las barras.

La que más sale es el 7: 179 veces. No es casualidad. De las 36 parejas posibles de dos dados, 6 suman 7 y solo una suma 2 (1 + 1) o 12 (6 + 6). Con mil tiradas, se esperan 1000 · 6/36 ≈ 167 sietes y unos 28 doses. Los datos cuentan lo mismo, con su pequeño baile.

### 5 · Una campana de notas

:::{tip} Predice
`notas` son 300 notas al azar, alrededor de 6. ¿Cuántas, más o menos, serán aprobados (5 o más)?
:::

```{code-cell} julia
using Plots, Random
Random.seed!(3)
notas = 6 .+ 1.5 .* randn(300)
aprobados = count(>=(5), notas)
h = histogram(notas, bins = 0:11, label = "300 notas", xlabel = "nota")
h
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/13-probabilidad-5.json","config":{"etiqueta":"randn · histogram","idea":"randn saca números de la campana de Gauss. Multiplicar por 1.5 la ensancha y sumar 6 la mueve. histogram reparte los valores en intervalos y dibuja una barra por intervalo, tan alta como los valores que caen en él.","titulo":"300 notas en campana"}}
```

`randn(300)` da 300 números de la campana de Gauss: su centro es 0 y la mayoría están entre −1 y 1. `1.5 .* randn(300)` la ensancha, y `6 .+ …` la mueve hasta el 6. Las notas quedan alrededor de 6, y dos de cada tres, más o menos, entre 4,5 y 7,5.

`histogram(notas, bins = 0:11)` hace lo que hiciste a mano en la sección 4, pero con decimales: corta el eje en intervalos, de 0 a 1, de 1 a 2…, y **cuenta** cuántas notas caen en cada uno. Cada intervalo incluye su borde izquierdo, pero no el derecho: un 5.0 cuenta en el de 5 a 6. Las barras se tocan, porque los intervalos no dejan huecos entre ellos.

Han aprobado 226 de 300, un 75 %. La campana da para este caso un 74,8 %, unos 224 aprobados. Pero mira la última barra: hay 2 notas entre 10 y 11. La campana no sabe que las notas acaban en 10; un modelo es una aproximación, y aquí se le ven las costuras.

::::{div}
:class: afondo
### 6 · Por dentro del azar

**El generador.** El de Julia se llama **Xoshiro256++**. Su estado son cuatro números de 64 bits, 256 bits en total, y cada número nuevo sale de mezclarlos con sumas, desplazamientos y rotaciones de bits. La lista no se repite hasta después de 2²⁵⁶ − 1 números, un número de 78 cifras. `Random.seed!(42)` no pone el 42 en el estado: lo pasa antes por SHA-256, la función que usan los navegadores para comprobar los certificados de las webs, para que dos semillas parecidas den listas que no se parezcan en nada.

**De 64 bits a lo que pides.** Cada vez, el generador da 64 bits. `rand()` se queda con 53, los que caben en un `Float64`, y los divide por 2⁵³: por eso puede salir 0 y nunca 1. `rand(1:6)` no es `x % 6 + 1`, que daría un poquito más de probabilidad a los primeros números; usa el método de Lemire, que descarta los pocos valores que causarían ese desequilibrio. Y `randn` usa el **zigurat**: tapa la campana con 256 rectángulos y, casi siempre, el número cae en uno a la primera.

**`rand(10)` no son diez `rand()`.** Con la semilla 1, el primer `rand()` vale `0.07336635446929285`, pero `rand(10)` empieza por `0.0491718221481211`. Para llenar un vector de 8 decimales o más, Julia saca del generador 8 generadores hijos y los hace avanzar a la vez, con las instrucciones SIMD del procesador: es más rápido, y da otros números. `rand(3)` sí coincide con tres `rand()`. Son igual de aleatorios; solo cambia cuáles salen.

**Una semilla no es para siempre.** La documentación de Julia avisa de que una versión nueva (de 1.12 a 1.13, por ejemplo) puede cambiar los números de una semilla, por un arreglo o por una mejora de velocidad, como el cambio de generador de Julia 1.7. Lo que sí garantiza es la distribución: un dado seguirá siendo un dado. Todos los números de este capítulo son de Julia 1.13.

**No sirve para contraseñas.** Xoshiro está pensado para ser rápido y repartir bien los números, no para resistir a quien intente adivinar los siguientes a partir de unos cuantos. Para claves y sorteos que importen, está `RandomDevice()`, que pide los números al sistema operativo: `rand(RandomDevice(), 1:6)`.

**Y en el laboratorio.** El laboratorio lleva el mismo generador y los mismos algoritmos que Julia, así que da los mismos números con la misma semilla. Comprobado con 120 programas al azar con `rand`, `randn` y `Random.seed!`, y con 270 histogramas, uno a uno contra Julia: todos iguales. Entiende `rand` y `randn` con las formas de este capítulo, `Random.seed!` con un entero, `bar`, `histogram` (con `bins` automático, un número de barras o los bordes), `var` y `std`. Hay una limitación: Julia suma 16 decimales o más en un orden que depende del procesador, y el laboratorio solo da esas sumas (y `mean`, `var` y `std`, que suman) cuando son exactas en cualquier orden; si no, te manda a la nube. Por eso este capítulo cuenta en lugar de promediar. `shuffle`, `randperm`, los generadores propios como `Xoshiro(42)` y las distribuciones del paquete Distributions están en la nube, que tiene Julia completo.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python (NumPy) | R |
|---|---|---|---|
| Un decimal entre 0 y 1 | `rand()` | `rng.random()` | `runif(1)` |
| Un dado | `rand(1:6)` | `rng.integers(1, 7)` | `sample(1:6, 1)` |
| Mil tiradas | `rand(1:6, 1000)` | `rng.integers(1, 7, 1000)` | `sample(1:6, 1000, replace = TRUE)` |
| La campana de Gauss | `randn(300)` | `rng.standard_normal(300)` | `rnorm(300)` |
| La semilla | `Random.seed!(42)` | `rng = np.random.default_rng(42)` | `set.seed(42)` |
| Un histograma | `histogram(x)` | `plt.hist(x)` | `hist(x)` |

Cuidado con los extremos: en NumPy, `rng.integers(1, 7)` no incluye el 7, y en R, `sample` sin `replace = TRUE` no repite valores, así que no sirve para un dado. Y la misma semilla no da los mismos números en los tres lenguajes: cada uno usa su generador (NumPy, PCG64; R, Mersenne Twister).
:::

## Conexiones

- `rand(1:6, 1000)` crea un vector de una vez, como `zeros` y los rangos de *Vectores y rangos*. Y `d1 .+ d2` es el punto de *Índices, filtros y el punto*.
- `count(==(6), tiradas)` es el `count(tiradas .== 6)` de las máscaras, con una función en lugar de una máscara.
- La simulación de la sección 3 es un `for` con un acumulador, como los de *Decidir y repetir*.
- `==(6)` es una función, como las de *Funciones*: se puede guardar en una variable, `es6 = ==(6)`, y llamar, `es6(4)`.
- `bar` y `histogram` hacen un gráfico, un valor que se guarda y se muestra, como `plot` en *Gráficos*.
- Que un número «al azar» sea un cálculo que se repite es la misma idea que la coma flotante de *Julia como calculadora*: el ordenador no guarda lo que parece, sino una aproximación muy bien hecha.

## La grieta

La simulación responde a preguntas de «¿cuánto?» con un número aproximado: la proporción de seises, los aprobados que salen. Pero muchas preguntas son de «¿para qué valor?»: ¿a qué precio se gana más?, ¿en qué punto se cortan dos curvas que no son rectas? Probar valores al azar hasta acertar sería lento y nunca exacto. Hace falta buscar con método, y es el siguiente capítulo, *Ecuaciones y optimización*.

## Ejercicios

1. **Veinte monedas.** Con la semilla 10, echa 20 monedas con `rand(["cara", "cruz"], 20)` y cuenta las caras. ¿Cuántas esperabas?

2. **Un dado trucado.** `rand([1, 2, 3, 4, 5, 6, 6], 7000)` es un dado con dos seises en sus siete caras. Con la semilla 11, ¿qué proporción de seises sale? ¿Y de unos? ¿Qué proporciones esperabas?

3. **Sietes.** Con las mil tiradas de la sección 4, calcula la proporción de sumas que son 7 y compárala con 6/36.

4. **Predice.** ¿Qué escribe la última línea?

   ```julia
   using Random
   Random.seed!(5)
   x = rand(1:6)
   Random.seed!(5)
   y = rand(1:6)
   x == y
   ```

5. **Las notas altas.** Con las 300 notas de la sección 5, ¿cuántas pasan de 9? ¿Y cuántas son suspensos? Comprueba que aprobados y suspensos suman 300.

6. **π con dardos.** Lanza 10 000 dardos a un cuadrado de lado 1: `x = rand(10000)` e `y = rand(10000)`, con la semilla 5. Un dardo cae dentro del cuarto de círculo de radio 1 si `x^2 + y^2 <= 1`. Cuenta los de dentro con `count(x .^ 2 .+ y .^ 2 .<= 1)` y multiplica su proporción por 4. ¿Qué número sale? ¿Por qué?

::::{div}
:class: afondo
7. **Diez de golpe.** En la nube o en tu ordenador, con `Random.seed!(1)`, compara `rand(10)` con `[rand() for i in 1:10]` (poniendo la semilla antes de cada uno). ¿Son iguales? ¿Y `rand(3)` con `[rand() for i in 1:3]`?

8. **Sin semilla.** En tu ordenador, abre Julia dos veces y escribe `rand()` nada más empezar. ¿Sale lo mismo? Repite con `using Random; Random.seed!(1); rand()`. ¿Qué tiene de especial este libro, que siempre da los mismos números?
::::

## Solucionario

1. `using Random`, `Random.seed!(10)`, `m = rand(["cara", "cruz"], 20)` y `count(==("cara"), m)` dan 11 caras. Se esperaban 10, la mitad, pero 11 es de lo más normal: con 20 monedas, salen entre 7 y 13 caras casi nueve veces de cada diez.
2. `t = rand([1, 2, 3, 4, 5, 6, 6], 7000)` y `count(==(6), t) / 7000` dan `0.28314285714285714`, cerca de 2/7 ≈ 0,286: el 6 está en dos de las siete casillas. La de unos, `count(==(1), t) / 7000`, da `0.1467142857142857`, cerca de 1/7 ≈ 0,143. `rand` elige una casilla al azar, no un valor: un valor repetido sale más.
3. `count(==(7), suma) / 1000` da `0.179`, y `6/36` es `0.16666666666666666`. La diferencia, algo más de una centésima, es el baile normal de mil tiradas; con un millón, quedaría mucho más cerca.
4. Escribe `true`: las dos veces se pone la misma semilla, así que `x` e `y` son la primera tirada de la misma lista. Las dos valen 6.
5. `count(>(9), notas)` da 8, y `count(<(5), notas)` da 74 suspensos. Con los 226 aprobados de la sección, `226 + 74` son 300. `>=(5)` y `<(5)` no se solapan ni dejan nada fuera.
6. Sale `3.1348`, cerca de π. El cuarto de círculo tiene área π/4 y el cuadrado, 1, así que la proporción de dardos que caen dentro se acerca a π/4, y por 4, a π. Es el **método de Montecarlo**: calcular un número con una simulación. Para ganar una cifra más de π harían falta unas cien veces más dardos.

::::{div}
:class: afondo
7. No son iguales: con la semilla 1, `rand(10)` empieza por `0.0491718221481211` y `[rand() for i in 1:10]` por `0.07336635446929285`. Para vectores de 8 decimales o más, Julia llena el vector con 8 generadores hijos a la vez. `rand(3)` y `[rand() for i in 1:3]` sí son iguales, porque un vector tan corto se llena número a número.
8. Sin semilla, cada sesión empieza con un estado distinto, sacado del sistema operativo, y `rand()` da otro número cada vez. Con `Random.seed!(1)`, el primer `rand()` es siempre `0.07336635446929285` en Julia 1.13. Este libro, y el laboratorio, ponen esa semilla al principio de cada programa: por eso sus números no cambian.
::::
