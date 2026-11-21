---
title: Ecuaciones y optimización
subtitle: Cuando no hay fórmula, se busca: cada vuelta, un poco más cerca
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *Probabilidad y simulación* respondiste preguntas de «¿cuánto?» repitiendo un experimento muchas veces: la proporción de seises, los aprobados de una campana. La simulación da un número aproximado, y con más tiradas se acerca.

En *Álgebra lineal* resolviste sistemas de ecuaciones con una barra, `A \ b`. Pero esas ecuaciones eran rectas. Con una curva, la barra ya no sirve.

## La pregunta

¿Cómo resuelve Julia una ecuación que no tiene fórmula, como `x³ − x − 2 = 0`? ¿Cómo encuentra el valor que hace más grande una cantidad, como el volumen de una caja? ¿Y cómo sabe cuándo ha terminado?

## La idea

Para casi todas las ecuaciones no hay una fórmula que dé la solución. Lo que sí hay son **métodos numéricos**: se parte de una aproximación y, vuelta a vuelta, se mejora. Son bucles como los de *Decidir y repetir*, con una condición que dice cuándo parar.

Este capítulo construye tres. La **bisección** encierra la solución en un intervalo y lo parte por la mitad una y otra vez. El **método de Newton** sigue la tangente de la curva y se acerca mucho más deprisa. Y la **sección áurea** encoge un intervalo alrededor del máximo de una función, que es lo que pregunta un problema de **optimización**.

Los tres son funciones de Julia escritas por ti, con un `while` dentro. Los paquetes que usan los profesionales, Roots y Optim, hacen lo mismo con métodos más afinados; están en el «A fondo».

:::{important} Un método numérico da una aproximación
Un método numérico no da la solución exacta: da una aproximación, tan buena como le pidas y como permitan los `Float64`. Por eso siempre lleva una **tolerancia**, el error que aceptas, y la condición del bucle es «sigue mientras el error pueda ser mayor que la tolerancia». Sin esa condición, el bucle no terminaría nunca.
:::

## Construcción

### 1 · Partir por la mitad

:::{tip} Predice
El intervalo empieza siendo de 1 a 2, de ancho 1, y cada vuelta lo parte por la mitad. ¿Cuántas vueltas hacen falta para que mida menos de 0,001?
:::

```{code-cell} julia
f(x) = x^2 - 2
a = 1.0
b = 2.0
pasos = 0
while b - a > 0.001
    m = (a + b) / 2
    if f(a) * f(m) <= 0
        b = m
    else
        a = m
    end
    pasos += 1
end
println(pasos, " pasos: la raíz está entre ", a, " y ", b)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/14-ecuaciones-optimizacion-1.json","config":{"columnas":["a","b","m"],"etiqueta":"bisección","fila_en":"fin_iteracion","idea":"Si f cambia de signo entre a y b, hay una raíz en medio. Se mira el punto medio m y se queda la mitad donde f sigue cambiando de signo. Cada vuelta, el intervalo mide la mitad.","titulo":"Encerrar la raíz de 2"}}
```

La raíz de `x² − 2 = 0` es `√2`. `f(1)` vale −1 y `f(2)` vale 2: como la función es continua y cambia de signo, tiene que pasar por 0 en algún punto entre 1 y 2. Es el **teorema de Bolzano**.

En cada vuelta, `m` es el punto medio. Si `f(a)` y `f(m)` tienen signos distintos, su producto es negativo y la raíz está entre `a` y `m`: el intervalo se queda con esa mitad (`b = m`). Si no, está en la otra (`a = m`). En la tabla se ve cómo `a` y `b` se acercan desde los dos lados.

Han hecho falta 10 vueltas, porque 2¹⁰ = 1024: cada vuelta divide el error entre dos, y diez divisiones lo bajan de 1 a menos de una milésima. La raíz está entre `1.4140625` y `1.4150390625`; `√2` vale 1,41421356…

### 2 · Una función que resuelve ecuaciones

:::{tip} Predice
Entre 2 y 3, `g(x) = x³ − x − 2` vale 4 y 22: no cambia de signo. ¿Qué hará `biseccion(g, 2, 3)`?
:::

```{code-cell} julia
function biseccion(f, a, b; tol = 0.0001)
    f(a) * f(b) <= 0 || error("f no cambia de signo entre $a y $b")
    while b - a > tol
        m = (a + b) / 2
        if f(a) * f(m) <= 0
            b = m
        else
            a = m
        end
    end
    return (a + b) / 2
end
g(x) = x^3 - x - 2
r = biseccion(g, 1, 2)
g(r)
biseccion(g, 2, 3)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/14-ecuaciones-optimizacion-2.json","config":{"etiqueta":"funciones que reciben funciones","idea":"biseccion recibe la función f como un argumento más, como count o filter en Funciones. La tolerancia es un argumento con nombre. Si f no cambia de signo, error() para el programa con un mensaje.","titulo":"Una función que resuelve ecuaciones"}}
```

`biseccion` recibe la función de la ecuación, `f`, como un argumento más, igual que `count` o `filter` en *Funciones*. Por eso sirve para cualquier ecuación: la del capítulo es `x³ − x − 2 = 0`, que no tiene una fórmula sencilla.

La primera línea comprueba que `f` cambia de signo. `condición || error(…)` es el «o» corto de *Decidir y repetir*: si la condición es `true`, no hace nada más; si es `false`, ejecuta `error`, que para el programa con un `ErrorException` y el mensaje que le das. Es mejor un error claro que una respuesta sin sentido.

Con la tolerancia de 0,0001, `biseccion(g, 1, 2)` da `1.521392822265625` tras 14 vueltas. `g(r)` no es 0, sino `7.795631350404619e-5`: `r` es una aproximación, a menos de una diezmilésima de la raíz. Y `biseccion(g, 2, 3)` no busca nada: entre 2 y 3, `g` no cambia de signo, y el error lo dice.

### 3 · Newton: seguir la tangente

:::{tip} Predice
Newton empieza en `x = 1.0`. Después de 5 vueltas, ¿cuántas cifras de `√2` tendrá bien?
:::

```{code-cell} julia
f(x) = x^2 - 2
df(x) = 2x
x = 1.0
for paso in 1:5
    x = x - f(x) / df(x)
    println(paso, ": ", x)
end
x == sqrt(2)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/14-ecuaciones-optimizacion-3.json","config":{"columnas":["paso","x"],"etiqueta":"método de Newton","fila_en":"fin_iteracion","idea":"Newton cambia la curva por su tangente en x y salta al punto donde la tangente corta el eje: x − f(x)/f'(x). Cerca de la raíz, las cifras correctas se doblan en cada vuelta.","titulo":"La raíz de 2, a la manera de Newton"}}
```

La idea de Newton es cambiar la curva por su tangente, que es una recta, y resolver la recta. La tangente en `x` corta el eje en `x − f(x)/f'(x)`, y ese punto suele estar mucho más cerca de la raíz. Por eso hace falta la derivada: `df(x) = 2x` es la de `x² − 2`.

Las cifras correctas van 1, 2 (`1.4166…`), 5 (`1.41421568…`), 11 (`1.41421356237468…`) y, en la quinta vuelta, todas: `1.4142135623730951`. Cerca de la raíz, cada vuelta **dobla** las cifras correctas. La bisección gana una cifra cada tres vueltas y pico.

La última línea compara con `sqrt(2)` y da `true`: cinco vueltas de Newton dan exactamente el mismo `Float64` que la raíz cuadrada de Julia. No hay nada mejor que encontrar: es el `Float64` más cercano a `√2`.

### 4 · El máximo, mirando una tabla

:::{tip} Predice
De una cartulina de 20 × 20 cm se cortan cuatro cuadrados de lado `x` en las esquinas y se doblan los lados para hacer una caja. ¿Con qué `x` de la tabla sale la caja más grande?
:::

```{code-cell} julia
V(x) = x * (20 - 2x)^2
xs = 0:0.5:10
vol = V.(xs)
mejor, i = findmax(vol)
xs[i]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/14-ecuaciones-optimizacion-4.json","config":{"etiqueta":"findmax","idea":"Con el punto, V.(xs) calcula el volumen para cada x de la tabla. findmax da el mayor valor y su posición, y con la posición se lee el x que lo da.","titulo":"La caja más grande, en una tabla"}}
```

La caja tiene altura `x` y una base de `20 − 2x` de lado, así que su volumen es `V(x) = x · (20 − 2x)²`. Si `x` es pequeño, la caja es plana; si es casi 10, la base desaparece. En medio hay un máximo, y eso es un problema de **optimización**: encontrar el `x` que hace `V` lo más grande posible.

`V.(xs)` calcula el volumen para cada `x` de 0 a 10, de medio en medio: 21 valores. `findmax(vol)` da dos cosas, el mayor valor y su posición, `(591.5, 8)`, y `mejor, i = …` las reparte en dos variables, como las tuplas de *Tuplas y diccionarios*. La posición 8 de `xs` es `3.5`.

Pero 3,5 es solo el mejor de la tabla. El máximo de verdad está en `x = 10/3 ≈ 3,333`, con un volumen de 16 000/27 ≈ 592,59 cm³, entre dos puntos de la tabla. Una tabla más fina se acercaría más, pero calcularía muchísimos volúmenes que no hacen falta.

### 5 · El máximo, acercándose

:::{tip} Predice
La sección áurea acaba con `x` cerca de 10/3. ¿Qué estará más cerca de su valor exacto: `x` o el volumen `V(x)`?
:::

```{code-cell} julia
V(x) = x * (20 - 2x)^2
function maximo_aureo(f, a, b; tol = 0.0001)
    r = (sqrt(5) - 1) / 2
    while b - a > tol
        c = b - r * (b - a)
        d = a + r * (b - a)
        if f(c) > f(d)
            b = d
        else
            a = c
        end
    end
    return (a + b) / 2
end
x = maximo_aureo(V, 0, 10)
V(x)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/14-ecuaciones-optimizacion-5.json","config":{"etiqueta":"sección áurea","idea":"Se miran dos puntos interiores, c y d. Si f(c) es mayor, el máximo no puede estar a la derecha de d, y ese trozo se descarta; si no, se descarta el de la izquierda de c. Cada vuelta, el intervalo se queda en 0,618 veces lo que medía.","titulo":"La caja más grande, de verdad"}}
```

La sección áurea hace con el máximo lo que la bisección hacía con la raíz: encerrarlo en un intervalo cada vez más pequeño. Mira dos puntos de dentro, `c` y `d`. Si `f(c) > f(d)`, el máximo no puede estar a la derecha de `d` (la función subiría y bajaría y volvería a subir), así que ese trozo se descarta. Si no, se descarta el de la izquierda de `c`.

`r = (√5 − 1)/2 ≈ 0,618` es la proporción áurea, la de los rectángulos «bonitos». Cada vuelta, el intervalo se queda en 0,618 veces lo que medía: de 10 a menos de 0,0001 hacen falta 24 vueltas. El resultado es `x = 3.3333494081261312`.

`x` acierta 4 cifras de 10/3. Pero `V(x)`, `592.5925925822567`, acierta 10 del volumen exacto, 592,5925925925926. Cerca del máximo, la curva es casi plana: moverse un poco a un lado o a otro apenas cambia el volumen. Por eso el máximo de `V` se encuentra con mucha precisión, y el `x` que lo da, con mucha menos.

::::{div}
:class: afondo
### 6 · Hasta dónde se puede afinar

**El límite de los `Float64`.** Si en la sección 1 pides una tolerancia de `1e-20`, el bucle no termina nunca. Cerca de 1,41, dos `Float64` seguidos están a 2,2 · 10⁻¹⁶: `a` y `b` llegan a ser vecinos, el punto medio `(a + b) / 2` es otra vez `a` o `b`, y el intervalo ya no encoge. Una bisección segura para cuando eso pasa (`m == a || m == b`). Llevada hasta el final, la del capítulo hace 52 vueltas y acaba entre `1.414213562373095` y `1.4142135623730951`, dos `Float64` vecinos. Más precisión no existe.

**Newton puede fallar.** Con `h(x) = x³ − 2x + 2` y empezando en `x = 0`, Newton salta a 1, después a 0, otra vez a 1… y no sale nunca de ahí. Y si la derivada vale 0, divide entre cero. La bisección, en cambio, siempre llega si hay un cambio de signo; solo es más lenta. Por eso los buenos métodos combinan los dos: Newton (o algo parecido) cuando va bien, bisección cuando no.

**Por qué 0,618.** La sección áurea de verdad calcula un solo punto nuevo en cada vuelta, no dos. Con la proporción `r`, que cumple `r² = 1 − r`, uno de los puntos de la vuelta anterior cae justo donde toca el punto de la vuelta siguiente, y su valor se aprovecha. La del capítulo calcula los dos para que se lea mejor: 48 llamadas a `V` en lugar de unas 25.

**Lo que usan los profesionales.** El paquete **Roots** resuelve ecuaciones: `find_zero(g, (1, 2))` da `1.5213797068045676`, con `g(r) == 0.0` exactamente, y `find_zero(g, 1.5)` hace lo mismo empezando en un punto. El paquete **Optim** busca mínimos: para el máximo de la caja, se minimiza `-V`, con `optimize(x -> -V(x), 0, 10)`. Usa el método de Brent, que mezcla la sección áurea con parábolas, y encontró `3.333333308782097` en 10 vueltas y 11 llamadas a la función. Comprobado con Roots 3.0.14 y Optim 2.3.2.

**La derivada, sin escribirla.** Newton necesita `f'(x)`, y escribirla a mano es fácil equivocarse. El paquete **ForwardDiff** la calcula sola, exacta y sin redondeos de más: `ForwardDiff.derivative(g, 1.5)` da `5.75`, que es `3 · 1.5² − 1`. Con ella, Newton llega a la raíz de `g` en 4 vueltas.

**Y en el laboratorio.** Las cinco construcciones de este capítulo funcionan en el laboratorio, con los mismos números, porque solo usan sumas, restas, productos, divisiones y `sqrt`, que dan el mismo resultado en cualquier ordenador. Para `exp`, `log`, `sin`, `cos` y las potencias, el laboratorio lleva copiados los algoritmos de Julia, para no inventar el último dígito: con las funciones del navegador, `exp` difería de Julia una vez de cada diez. `tan`, `sinh`, `asin` y compañía aún no, y te manda a la nube. Roots, Optim y ForwardDiff están en la nube, que tiene Julia completo.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python (SciPy) | R |
|---|---|---|---|
| Raíz en un intervalo | `find_zero(f, (1, 2))` (Roots) | `brentq(f, 1, 2)` | `uniroot(f, c(1, 2))$root` |
| Raíz con Newton | `find_zero((f, df), 1.5, Roots.Newton())` | `newton(f, 1.5, fprime = df)` | (no viene de serie) |
| Mínimo en un intervalo | `optimize(f, 0, 10)` (Optim) | `minimize_scalar(f, bounds = (0, 10), method = "bounded")` | `optimize(f, c(0, 10))` |
| Máximo | minimizar `-f` | minimizar `-f` | `optimize(f, c(0, 10), maximum = TRUE)` |

Ojo con las tolerancias por defecto: la de `uniroot` en R es de una diezmilésima, más o menos (`.Machine$double.eps^0.25`). Con la ecuación de la sección 2, `uniroot(f, c(1, 2))$root` da `1.5213860590522479`, con solo cinco cifras buenas, si no le pides otra cosa. `find_zero` de Julia llega al límite de los `Float64`, y `brentq` de SciPy, a unas doce cifras decimales (`xtol = 2e-12`).
:::

## Conexiones

- Los métodos son bucles `while` con una condición de parada, como los de *Decidir y repetir*, y la tabla de cada vuelta es la misma que allí.
- `biseccion(f, a, b)` recibe una función como argumento, como `count(f, v)` en *Funciones*; `tol = 0.0001` es un argumento con nombre.
- `mejor, i = findmax(vol)` reparte una tupla en dos variables, como en *Tuplas y diccionarios*.
- `V.(xs)` es el punto de *Índices, filtros y el punto*, aplicado a una función tuya.
- El límite de la bisección, dos `Float64` vecinos, es la coma flotante de *Julia como calculadora*.
- Resolver `A \ b` en *Álgebra lineal* era encontrar el punto donde se cortan rectas; aquí, el punto donde una curva corta el eje.

## La grieta

Todas las ecuaciones de este capítulo buscaban un **número**: el `x` que hace `f(x) = 0`. Pero muchas leyes de la física y de la biología dicen cómo **cambia** algo: el café se enfría más deprisa cuanto más caliente está; una población crece en proporción a su tamaño. Ahí la incógnita no es un número, sino una función entera, la temperatura en cada instante. Es el siguiente capítulo, *Ecuaciones diferenciales*.

## Ejercicios

1. **La raíz de 3.** Adapta la sección 1 para encontrar `√3` con la bisección, empezando entre 1 y 2. ¿Cuántas vueltas hacen falta para una tolerancia de 0,001? ¿Por qué son las mismas que para `√2`?

2. **Otra ecuación.** Usa `biseccion` para resolver `x³ = 10`, es decir, `x³ − 10 = 0`, entre 2 y 3. Compara el resultado con `cbrt(10)`.

3. **Newton para la raíz de 5.** Adapta la sección 3 a `f(x) = x² − 5`. Empieza en `x = 2.0`. ¿En qué vuelta coincide con `sqrt(5)`?

4. **Predice.** ¿Qué escribe la última línea?

   ```julia
   function biseccion(f, a, b; tol = 0.0001)
       f(a) * f(b) <= 0 || error("f no cambia de signo entre $a y $b")
       return "hay cambio de signo"
   end
   biseccion(x -> x^2 - 2, -2, 2)
   ```

5. **La caja de 30 cm.** Repite las secciones 4 y 5 con una cartulina de 30 × 30 cm: `V(x) = x * (30 - 2x)^2`, con `x` entre 0 y 15. ¿Dónde está el máximo? ¿Ves alguna relación con el de 20 cm?

6. **El número de oro.** La ecuación `x² = x + 1` tiene una raíz positiva entre 1 y 2. Encuéntrala con la bisección y compárala con `(1 + sqrt(5)) / 2`. ¿Qué relación tiene con el `r` de la sección 5?

::::{div}
:class: afondo
7. **Hasta el final.** Escribe una bisección que pare cuando el punto medio sea igual a `a` o a `b`, y cuenta las vueltas para `x² − 2` entre 1 y 2. ¿Qué tienen de especial `a` y `b` al final? (Pista: `nextfloat(a) == b`.)

8. **Newton que no llega.** En la nube o en tu ordenador, aplica Newton a `h(x) = x³ − 2x + 2`, con `dh(x) = 3x^2 - 2`, empezando en `x = 0.0`, y escribe las seis primeras vueltas. Después empieza en `x = -2.0`. ¿Qué cambia? Comprueba la raíz con `find_zero(h, (-2, -1))` del paquete Roots.
::::

## Solucionario

1. Basta con cambiar `f(x) = x^2 - 3`. Hacen falta otra vez 10 vueltas: la bisección no mira la función para decidir cuántas, solo el ancho del intervalo, que empieza en 1 y se parte por la mitad hasta bajar de 0,001. La raíz queda entre `1.7314453125` y `1.732421875`; `√3` vale 1,7320508…
2. `biseccion(x -> x^3 - 10, 2, 3)` da `2.154449462890625`, y `cbrt(10)` es `2.154434690031884`. La diferencia, 0,000015, es menor que la tolerancia de 0,0001, que es lo único que la bisección promete.
3. Las vueltas dan `2.25`, `2.236111111111111`, `2.236067977915804`, `2.23606797749979` y `2.23606797749979`. Desde la cuarta vuelta, `x == sqrt(5)` da `true`: empezar en 2, más cerca de la raíz que el 1 de la sección 3, ahorra una vuelta.
4. No llega a escribir nada: salta el error `f no cambia de signo entre -2 y 2`. `f(-2)` y `f(2)` valen los dos 2, y su producto, 4, no es menor o igual que 0. Ojo: la ecuación sí tiene raíces entre −2 y 2 (`±√2`), pero son dos, y los dos cambios de signo se compensan. La bisección necesita que `f(a)` y `f(b)` tengan signos distintos, y aquí no los tienen.
5. En la tabla de 0 a 15, de medio en medio, gana `x = 5.0`, con 2000 cm³ (`findmax` da `(2000.0, 11)`), que esta vez es el máximo exacto. La sección áurea da `x = 4.999996482079008` y `V(x) = 1999.9999999992572`: otra vez, el volumen mucho más cerca de su valor exacto que `x`. En los dos casos, el máximo está en un sexto del lado de la cartulina: 20/6 = 10/3 y 30/6 = 5.
6. `biseccion(x -> x^2 - x - 1, 1, 2)` da `1.618011474609375`, cerca de `(1 + sqrt(5)) / 2 = 1.618033988749895`, el número de oro φ. El `r` de la sección 5 es `φ − 1 = 1/φ ≈ 0,618`: es la misma proporción.

::::{div}
:class: afondo
7. Hace 52 vueltas y acaba con `a = 1.414213562373095` y `b = 1.4142135623730951`. Son dos `Float64` vecinos: `nextfloat(a) == b` da `true`, y entre ellos no hay ningún otro número que Julia pueda guardar. `sqrt(2)` es `b`.
8. Empezando en 0, las vueltas dan `1.0`, `0.0`, `1.0`, `0.0`, `1.0`, `0.0`: Newton salta entre 0 y 1 para siempre. Empezando en −2, en cambio, da `-1.8`, `-1.7699481865284974`, `-1.769292662905941`… y en la quinta vuelta llega a `-1.7692923542386314`, la misma raíz que da `find_zero(h, (-2, -1))`. El punto de partida lo decide todo.
::::
