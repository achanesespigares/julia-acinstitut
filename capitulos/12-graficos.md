---
title: Gráficos
subtitle: Un gráfico es un objeto: se crea, se cambia y, cuando se muestra, se dibuja
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *Álgebra lineal* resolviste el sistema de los cuadernos y los bolígrafos con una barra: `[2 1; 4 3] \ [5, 11]` da `[2.0, 1.0]`. Cada ecuación de un sistema de dos incógnitas es una recta, y la solución es el punto donde se cortan.

Hasta ahora, todo lo que Julia te ha enseñado eran números y textos en la consola. Este capítulo es el primero que hace dibujos.

## La pregunta

¿Cómo se dibujan en Julia las notas de una alumna, o las dos rectas de un sistema? ¿Y qué es un gráfico para Julia: un dibujo que aparece en la pantalla, o un valor que se guarda en una variable, como un vector?

## La idea

Los gráficos se hacen con el paquete **Plots**. No viene con Julia: se instala una vez, con `using Pkg; Pkg.add("Plots")`, y después se carga con `using Plots`, como LinearAlgebra en el capítulo anterior.

`plot(x, y)` dibuja una **serie**: los puntos `(x[1], y[1])`, `(x[2], y[2])`… unidos por una línea. `scatter(x, y)` dibuja los mismos puntos, sueltos. Lo que se dibuja se ajusta con argumentos con nombre, como los de *Funciones*: `label`, `title`, `xlabel`, `color`…

Lo importante es lo que pasa en la memoria. `plot` crea un valor, un `Plots.Plot`, que guarda las series y cómo dibujarlas. `plot!` le añade una serie a un gráfico que ya existe. Lleva `!` porque cambia el gráfico, como `push!` cambia un vector.

:::{important} Un gráfico es un valor
`p = plot(x, y)` no dibuja nada: crea el gráfico y lo guarda en `p`, como `v = [1, 2]` guarda un vector. Julia lo dibuja cuando lo **muestra**: cuando escribes `p` solo, o cuando una línea que no es una asignación da un gráfico, como `plot(x, y)` o `plot!(p, x, z)`. Mostrar un gráfico es dibujarlo.
:::

## Construcción

### 1 · Del dato al dibujo

:::{tip} Predice
La línea 4 es `plot(examen, ana)`, sin asignar el resultado a ninguna variable. ¿Qué escribirá Julia en la consola?
:::

```{code-cell} julia
using Plots
examen = 1:3
ana = [9.0, 6.5, 7.0]
plot(examen, ana)
p = plot(examen, ana, label = "Ana", title = "Notas de Ana", xlabel = "examen", ylabel = "nota")
p
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/12-graficos-1.json","config":{"etiqueta":"plot","idea":"plot(x, y) une los puntos (x[i], y[i]) con una línea. Crea un gráfico, un valor que se puede guardar en una variable. Julia lo dibuja cuando lo muestra.","titulo":"Las notas de Ana"}}
```

En la consola no aparece nada. La línea 4 da un gráfico, y para Julia mostrar un gráfico es dibujarlo: en el REPL se abre en una ventana; en este libro, en la caja «Gráfico». Son los tres exámenes de Ana, `(1, 9.0)`, `(2, 6.5)` y `(3, 7.0)`, unidos por una línea.

Fíjate en lo que Plots ha decidido por su cuenta. La serie se llama `y1`, porque no le has dado un nombre. Los ejes van un poco más allá de los datos, para que los puntos no queden pegados al borde. Y las marcas del eje x (1.0, 1.5, 2.0…) las ha elegido él, buscando números redondos.

La línea 5 crea otro gráfico, ahora con nombre (`label`), título y nombres para los ejes, y lo guarda en `p`. En la memoria aparece `p`, un `Plots.Plot{Plots.GRBackend}` con una serie, pero no se dibuja: la línea es una asignación. Se dibuja en la línea 6, al escribir `p` solo, igual que escribir un vector solo lo muestra en la consola.

### 2 · Añadir al mismo gráfico

:::{tip} Predice
`q = p` va antes de `plot!`. Después de la línea 7, ¿cuántas series tendrá `q`?
:::

```{code-cell} julia
using Plots
examen = 1:3
ana = [9.0, 6.5, 7.0]
biel = [7.5, 3.0, 8.5]
p = plot(examen, ana, label = "Ana")
q = p
plot!(p, examen, biel, label = "Biel")
r = plot(examen, biel, label = "Biel sola")
p
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/12-graficos-2.json","config":{"etiqueta":"plot!","idea":"plot! añade una serie a un gráfico que ya existe: lo cambia, no hace uno nuevo. Dos nombres pueden ser el mismo gráfico, como dos nombres pueden ser el mismo vector.","titulo":"Ana y Biel"}}
```

`q = p` no copia el gráfico: `q` es **otro nombre** para el mismo objeto, como `b = a` con los vectores de *Vectores y rangos*. Por eso, cuando `plot!(p, examen, biel, …)` le añade la serie de Biel, `q` también la tiene: son el mismo gráfico, con 2 series. Cada serie toma un color de la paleta de Plots, en orden: la primera, azul; la segunda, naranja.

`plot!` devuelve el gráfico cambiado, y como la línea no es una asignación, Julia lo muestra: se dibuja otra vez, ya con las dos líneas.

`r = plot(…)`, sin `!`, crea un gráfico **nuevo** y no toca `p`. Es el convenio de *Funciones*: `sort` da un vector nuevo y `sort!` cambia el que le das; `plot` da un gráfico nuevo y `plot!` cambia el que le das.

### 3 · Puntos sueltos y el gráfico actual

:::{tip} Predice
La línea 5 es `plot!(horas, nota, …)`, sin decir a qué gráfico se añade. ¿Cambiará `g`?
:::

```{code-cell} julia
using Plots
horas = [1, 2, 3, 4, 5, 6]
nota = [4.5, 5.0, 6.5, 6.0, 8.0, 8.5]
g = scatter(horas, nota, label = "alumnas", xlabel = "horas de estudio", ylabel = "nota", markersize = 6)
plot!(horas, nota, color = :gray, linestyle = :dash, label = "")
title!("Más horas, mejor nota")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/12-graficos-3.json","config":{"etiqueta":"scatter · el gráfico actual","idea":"scatter dibuja puntos sueltos. plot! y title! sin un gráfico delante cambian el gráfico actual: el último que se ha hecho o cambiado.","titulo":"Horas de estudio y nota"}}
```

`scatter` dibuja los seis puntos sin unirlos: cada uno es una alumna, con sus horas de estudio y su nota. `markersize = 6` los hace un poco más grandes que el tamaño de siempre, 4.

La línea 5 no nombra ningún gráfico, y aun así cambia `g`. Plots recuerda cuál es el **gráfico actual**, el último que se ha hecho o cambiado, y `plot!` sin un gráfico delante se lo añade a ese. Es cómodo cuando se trabaja con un solo gráfico, pero es memoria escondida: si en medio hubieras hecho otro gráfico, la línea discontinua habría ido a parar a ese otro. Con varios gráficos, mejor nombrar siempre el que se cambia.

`label = ""` deja la línea sin nombre, y por eso no sale en la leyenda. `color = :gray` y `linestyle = :dash` usan símbolos, como las columnas de una tabla en *Tablas de datos*. `title!` también cambia el gráfico actual, y como la línea no es una asignación, Julia vuelve a dibujarlo.

### 4 · Dos ecuaciones, dos rectas

:::{tip} Predice
`r1` y `r2` son las dos ecuaciones del sistema de los cuadernos, despejadas. ¿En qué punto se cortarán las dos rectas?
:::

```{code-cell} julia
using Plots
x = [0, 1, 2, 3]
r1 = 5 .- 2 .* x
r2 = (11 .- 4 .* x) ./ 3
s = [2 1; 4 3] \ [5, 11]
p = plot(x, r1, label = "2x + y = 5")
plot!(p, x, r2, label = "4x + 3y = 11")
scatter!(p, [s[1]], [s[2]], label = "solución", markersize = 7)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/12-graficos-4.json","config":{"etiqueta":"la grieta de Álgebra lineal","idea":"Cada ecuación de un sistema de dos incógnitas es una recta. Para dibujarla, se despeja y y se calcula con el punto para varios valores de x. La solución es el punto donde se cortan.","titulo":"El sistema de los cuadernos, dibujado"}}
```

Para dibujar `2x + y = 5` se despeja `y = 5 − 2x` y se calcula para cada `x` con el punto: `5 .- 2 .* x` da `[5, 3, 1, -1]`. La segunda ecuación, `4x + 3y = 11`, da `y = (11 − 4x) / 3`. Ahí aparecen decimales como `3.6666666666666665`: es `11/3`, redondeado como en *Julia como calculadora*.

`s = [2 1; 4 3] \ [5, 11]` es la solución del capítulo anterior, `[2.0, 1.0]`. `scatter!` la añade al gráfico como un punto suelto, y en el dibujo queda justo donde se cruzan las dos rectas. La barra invertida y el dibujo cuentan lo mismo: el cuaderno cuesta 2 € y el bolígrafo, 1 €.

Dos puntos bastan para una recta, así que cuatro valores de `x` son de sobra. Para una curva, en cambio, hacen falta muchos más.

### 5 · Muchas series a la vez: las columnas

:::{tip} Predice
A `plot` se le da una matriz de dos columnas, `[cuadrado cubo]`. ¿Cuántas líneas dibujará?
:::

```{code-cell} julia
using Plots
x = range(-2, 2, length = 41)
cuadrado = x .^ 2
cubo = x .^ 3
p = plot(x, [cuadrado cubo], label = ["x²" "x³"], linewidth = 2)
ylims!(p, -4, 4)
p
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/12-graficos-5.json","config":{"etiqueta":"una serie por columna","idea":"Una curva son muchos puntos unidos por líneas cortas. Si y es una matriz, plot dibuja una serie por cada columna, y un atributo escrito como fila le da un valor a cada una.","titulo":"La parábola y la cúbica"}}
```

`range(-2, 2, length = 41)` da 41 números de −2 a 2, de 0.1 en 0.1. Con el punto, `x .^ 2` y `x .^ 3` calculan la parábola y la cúbica en todos ellos. Unidos por líneas tan cortas, los 41 puntos parecen una curva: una curva en un gráfico no es más que eso.

`[cuadrado cubo]` es una matriz de 41 × 2, y `plot` dibuja **una serie por columna**: dos líneas. Las etiquetas se escriben como una fila, `["x²" "x³"]`, sin comas, para que cada columna tome la suya. Es la misma idea de *Matrices*: una matriz se guarda y se recorre por columnas.

`ylims!(p, -4, 4)` fija los límites del eje y. La cúbica llega a −8 y a 8, pero ahora se corta en −4 y 4, y la parábola se ve mejor. En el eje y, con los límites fijados, Plots ya no deja el margen de la sección 1.

::::{div}
:class: afondo
### 6 · Quién dibuja: los motores y los archivos

**Plots no dibuja.** Plots es una fachada: describe el gráfico (las series, los colores, los ejes) y le pasa el trabajo a un **motor**. El de serie es GR, que es el que han usado todos los gráficos de este capítulo. Con `plotlyjs()` (y el paquete PlotlyJS instalado) se cambia a PlotlyJS, que hace gráficos interactivos en el navegador, y hay otros, como UnicodePlots, que dibuja con letras en la propia consola. El mismo `plot(x, y)` sirve para todos. Por eso el tipo del gráfico es `Plots.Plot{Plots.GRBackend}`: el motor va entre las llaves.

**Guardar un gráfico.** `savefig(p, "notas.png")` lo guarda como imagen, y el formato sale de la extensión: `.png`, `.svg` o `.pdf`. Los gráficos de este libro son SVG, que se ven nítidos a cualquier tamaño. Con el primer gráfico de la sección 1, en el ordenador donde se escribió este libro, el PNG ocupó 13 753 bytes; el SVG, 24 071, y el PDF, 5 438.

**Dibujar una función.** `plot(sin, 0, 2π)` dibuja la función seno sin calcular tú los puntos: Plots los elige, más juntos donde la curva se dobla más. En el ordenador donde se escribió este libro eligió 103. Es cómodo, pero esconde lo que se dibuja; con `x = range(0, 2π, length = 100)` y `plot(x, sin.(x))` eliges tú los puntos.

**La primera vez tarda.** Instalar Plots descarga y prepara más de cien paquetes: en el ordenador donde se escribió este libro, `Pkg.add("Plots")` tardó unos 3 minutos. Después, `using Plots` tardó 1,7 segundos, el primer gráfico (con su archivo) 0,3 segundos y el segundo, 0,03. Julia compila cada función la primera vez que la usa, y desde entonces va rápida. Lo verás de cerca en *Rendimiento*.

**Cómo elige Plots los ejes.** Toma el valor más pequeño y el más grande de los datos, y deja un margen de un 3 % del recorrido por cada lado. Las marcas las elige con el algoritmo de Wilkinson, que puntúa cada opción: entre 4 y 8 marcas, números redondos (1, 5, 2, 2,5 y 3 por una potencia de 10, por ese orden de preferencia), que no se salgan del eje y, mejor aún, que incluyan el 0. Por eso el eje de los exámenes de Ana tiene marcas de 0,5 en 0,5 (1.0, 1.5, 2.0…): de 1 en 1 solo habría habido tres.

**Una curiosidad.** Plots acepta muchos atajos para las formas de los puntos: `:rect` es un cuadrado, `:diamond` un rombo y `:utriangle` un triángulo. Pero ojo con `marker = :o`: no es un círculo, sino un **octógono**. El círculo es `:circle`.

**Y en el laboratorio.** El laboratorio calcula lo mismo que Plots antes de dibujar: los puntos de cada serie, los colores de la paleta, los límites de los ejes y sus marcas, con el mismo algoritmo. Comprobado con 1 800 gráficos al azar: en los que calculó, coincidió con Julia en todo. El dibujo lo hace el propio laboratorio, así que se parece al de Plots, pero no es idéntico píxel a píxel. Entiende `plot`, `scatter`, `plot!`, `scatter!`, `title!`, `xlabel!`, `ylabel!`, `xlims!` e `ylims!`, con los atributos de este capítulo. Las barras y los histogramas llegan en el capítulo siguiente, *Probabilidad y simulación*. Las funciones dibujadas directamente, los gráficos en 3D, las animaciones y `savefig` están en la nube, que tiene Julia completo.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia (Plots) | Python (matplotlib) | R |
|---|---|---|---|
| Una línea | `plot(x, y)` | `plt.plot(x, y)` | `plot(x, y, type = "l")` |
| Puntos sueltos | `scatter(x, y)` | `plt.scatter(x, y)` | `plot(x, y)` |
| Añadir al mismo gráfico | `plot!(p, x, z)` | `plt.plot(x, z)` otra vez | `lines(x, z)` o `points(x, z)` |
| Título y ejes | `title = "…"`, `xlabel = "…"` | `plt.title("…")`, `plt.xlabel("…")` | `main = "…"`, `xlab = "…"` |
| Guardar | `savefig(p, "a.png")` | `plt.savefig("a.png")` | `png("a.png")`, el gráfico y `dev.off()` |

En matplotlib, `plt.plot` dibuja siempre en la figura actual, como `plot!` sin nombre en Julia: es la misma memoria escondida. En R, `plot` dibuja en el momento, y lo que viene después (`lines`, `points`) se pinta encima; no queda un valor que se pueda cambiar. El paquete ggplot2 de R se parece más a Plots: un gráfico es un objeto, y `+ geom_line()` le añade una capa.
:::

## Conexiones

- Los argumentos con nombre de *Funciones* (`label = "Ana"`) son los atributos de un gráfico. Y el convenio `!` de *Funciones* es el que separa `plot` de `plot!`.
- `q = p` no copia el gráfico, igual que `b = a` no copia un vector en *Vectores y rangos*. Un `Plots.Plot` es un objeto mutable, como los de *Tipos propios*.
- El punto de *Índices, filtros y el punto* calcula una curva entera de una vez: `x .^ 2`.
- Una serie por columna es el orden por columnas de *Matrices*.
- El punto donde se cortan dos rectas es la solución `A \ b` de *Álgebra lineal*.
- Que el primer gráfico tarde y los siguientes no es la compilación de Julia, que verás en *Rendimiento*.

## La grieta

Los datos de este capítulo eran pocos y los escribiste tú: tres exámenes, seis alumnas. ¿Y si fueran mil notas, o los resultados de tirar un dado diez mil veces? Habría que generarlos al azar, y para ver cómo se reparten no basta con unir puntos: hace falta un histograma, que cuenta cuántos caen en cada intervalo. Es el siguiente capítulo, *Probabilidad y simulación*.

## Ejercicios

1. **Las notas de Carla.** Dibuja las notas de Carla, `[10.0, 8.0, 9.5]`, en los exámenes 1, 2 y 3, con su nombre en la leyenda y el título «Notas de Carla». Guarda el gráfico en `p` y muéstralo.

2. **Y las de Dani.** Añade a `p` las notas de Dani, `[5.5, 6.0, 4.0]`, con `plot!`. ¿Cuántas series tiene ahora? ¿Entre qué valores va el eje y?

3. **Sin líneas.** Dibuja las notas de Carla con `scatter` en lugar de `plot`. ¿Qué cambia en el dibujo? ¿Y en la memoria?

4. **Las entradas del cine.** El sistema del ejercicio 1 de *Álgebra lineal* era `4x + 2y = 32` y `x + y = 10`. Despeja `y` en las dos ecuaciones, dibuja las dos rectas para `x = [0, 2, 4, 6, 8, 10]` y marca con `scatter!` el punto donde se cortan.

5. **Rectas paralelas.** Dibuja `2x + y = 5` y `4x + 2y = 6` para `x = [0, 1, 2, 3]`. ¿Se cortan? ¿Qué da `det([2 1; 4 2])`?

6. **Predice.** ¿Qué escriben las dos últimas líneas?

   ```julia
   using Plots
   p = plot([1, 2, 3], [4, 5, 6])
   q = plot!(p, [1, 2, 3], [6, 5, 4])
   q === p
   println(q)
   ```

::::{div}
:class: afondo
7. **Tres archivos.** En la nube o en tu ordenador, guarda el gráfico del ejercicio 1 como `carla.png`, `carla.svg` y `carla.pdf` con `savefig`. Compara lo que ocupan con `filesize`. Amplía mucho las tres imágenes: ¿cuál se ve borrosa?

8. **¿Cuántos puntos?** En la nube o en tu ordenador, dibuja `plot(sin, 0, 2π)` y, al lado, `x = range(0, 2π, length = 5)` y `plot(x, sin.(x))`. ¿Por qué el segundo se ve tan anguloso? ¿Cuántos puntos usa el primero? (Pista: `length(p[1][1][:x])`, con `p` el gráfico.)
::::

## Solucionario

1. `p = plot(1:3, [10.0, 8.0, 9.5], label = "Carla", title = "Notas de Carla")` y, en la línea siguiente, `p`. La línea del `plot` no dibuja nada, porque es una asignación; `p` sola lo dibuja.
2. `plot!(p, 1:3, [5.5, 6.0, 4.0], label = "Dani")`. El gráfico tiene 2 series, y la de Dani sale naranja, el segundo color de la paleta. Los datos van de 4.0 a 10.0, y con el margen del 3 % por cada lado el eje y va de 3.82 a 10.18, con marcas de 1 en 1, del 4 al 10.
3. `scatter(1:3, [10.0, 8.0, 9.5], label = "Carla")` dibuja los tres puntos sin unirlos. En la memoria, el gráfico sigue teniendo una serie, pero ahora es de puntos sueltos: cada punto es un círculo (`:circle`) y la serie no tiene línea.
4. Las rectas son `y = 16 − 2x` y `y = 10 − x`: `a = 16 .- 2 .* x`, `n = 10 .- x`, `p = plot(x, a, label = "4x + 2y = 32")`, `plot!(p, x, n, label = "x + y = 10")` y `scatter!(p, [6], [4], label = "(6, 4)")`. Se cortan en `(6, 4)`: la entrada de adulto cuesta 6 € y la de niño, 4 €, como da `[4 2; 1 1] \ [32, 10]`.
5. Las rectas son `y = 5 − 2x` y `y = 3 − 2x`: tienen la misma pendiente, −2, y nunca se cortan. Por eso el sistema no tiene solución, y `det([2 1; 4 2])` da `0.0`.
6. `q === p` da `true`: `plot!` devuelve el mismo gráfico que ha cambiado, no uno nuevo. `println(q)` escribe `Plot{Plots.GRBackend() n=2}`, el gráfico como texto: un gráfico de GR con 2 series.

::::{div}
:class: afondo
7. Con el primer gráfico de la sección 1, en el ordenador donde se escribió este libro, el PNG ocupó 13 753 bytes, el SVG 24 071 y el PDF 5 438; con el de Carla saldrán cifras parecidas. El PNG es una cuadrícula de píxeles: al ampliarlo, se ve borroso. El SVG y el PDF guardan las líneas y las letras como formas, y se ven nítidos a cualquier tamaño.
8. Con 5 puntos, las líneas que los unen son largas y se notan las esquinas: entre 0 y 2π, el seno se dobla mucho más de lo que cinco puntos pueden contar. `plot(sin, 0, 2π)` eligió 103 puntos en el ordenador donde se escribió este libro, más juntos donde la curva se dobla más. Es lo mismo que en la sección 5: una curva son muchos puntos.
::::
