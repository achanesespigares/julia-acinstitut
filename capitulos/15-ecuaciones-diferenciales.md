---
title: Ecuaciones diferenciales
subtitle: Si sabes cómo cambia algo ahora, puedes adivinar dónde estará dentro de un momento
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *Ecuaciones y optimización* buscaste un número: el `x` que hace `f(x) = 0`, o el que hace más grande el volumen de una caja. Lo encontraste con bucles que se acercan vuelta a vuelta, con una tolerancia para saber cuándo parar.

En *Gráficos* aprendiste a dibujar una lista de puntos con `plot`, y a añadir otra encima con `plot!`.

## La pregunta

Un café recién servido está a 90 °C en una habitación a 20 °C. Se enfría más deprisa cuanto más caliente está. ¿A qué temperatura estará dentro de diez minutos? ¿Y cómo lo calcula Julia, si lo único que sabemos es **cómo cambia** la temperatura?

## La idea

Una **ecuación diferencial** dice cómo cambia una cantidad. La del café es la **ley de enfriamiento de Newton**: la temperatura baja a una velocidad proporcional a la diferencia con la de la habitación,

$$T'(t) = -k\,(T - T_\text{amb}).$$

Aquí la incógnita no es un número, sino una función entera: la temperatura en cada instante, `T(t)`.

Para unas pocas ecuaciones hay una fórmula. Para casi todas, no. Lo que sí se puede hacer siempre es avanzar a pasitos: si ahora la temperatura es `T` y baja a una velocidad `T'`, dentro de un ratito `h` será, más o menos, `T + h · T'`. Desde ese punto nuevo se vuelve a calcular la velocidad, y se da otro paso. Es el **método de Euler**, y es un bucle como los de *Decidir y repetir*.

Este capítulo construye Euler a mano, lo convierte en una función que sirve para cualquier ecuación, lo dibuja, lo aplica a dos ecuaciones a la vez (un muelle que oscila) y descubre que ahí falla. Termina con **Runge–Kutta**, el método que arregla el fallo. El paquete que usan los profesionales, DifferentialEquations, está en el «A fondo».

:::{important} Una ecuación diferencial se resuelve a pasos
Resolver una ecuación diferencial con el ordenador es avanzar a pasos de tamaño `h`: desde lo que vale la función ahora y cómo cambia, se calcula lo que valdrá un poco después. Cada paso comete un pequeño error, y los errores se acumulan. Con pasos más pequeños, el error baja, pero hacen falta más pasos. Un método mejor no da pasos más pequeños: da pasos más listos.
:::

## Construcción

### 1 · El café, minuto a minuto

:::{tip} Predice
Euler usa, para todo un minuto, la velocidad de enfriamiento del principio de ese minuto. ¿Su café estará más frío o más caliente que el de verdad?
:::

```{code-cell} julia
k = 0.1
Tamb = 20.0
T = 90.0
h = 1.0
t = 0.0
while t < 10
    T = T + h * (-k * (T - Tamb))
    t += h
end
exacta = Tamb + (90 - Tamb) * exp(-k * 10)
exacta - T
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/15-ecuaciones-diferenciales-1.json","config":{"columnas":["t","T"],"etiqueta":"método de Euler","fila_en":"fin_iteracion","idea":"Cada vuelta calcula a qué velocidad se enfría el café ahora, −k(T − Tamb), y supone que esa velocidad se mantiene durante un minuto: T + h · T'. Luego avanza el reloj y repite.","titulo":"El café, minuto a minuto"}}
```

`k = 0.1` dice lo deprisa que se enfría este café: cada minuto pierde, más o menos, un 10 % de la diferencia con la habitación. Al principio esa diferencia es de 70 °C, así que baja unos 7 °C; cuando esté a 30 °C, solo bajará 1 °C por minuto.

Cada vuelta del bucle es un paso de Euler: la velocidad de ahora, `-k * (T - Tamb)`, por el tiempo `h`, se suma a la temperatura. En la tabla se ve el café pasar de 90 a 83, a 76,7, a 71,03… y llegar a `44.407490807` en el minuto 10. Algunos valores salen con colas como `61.334300000000006`: es el redondeo de los decimales de *Julia como calculadora*.

Esta ecuación sí tiene fórmula: `T(t) = Tamb + 70 · e^(−kt)`, que se saca con cálculo. Da `45.75156088200096` grados, así que Euler se equivoca en `1.344…` grados: su café está **más frío**. Cada paso usa la velocidad del principio del minuto, cuando el café estaba más caliente y se enfriaba más deprisa que al final.

### 2 · Una función para cualquier ecuación

:::{tip} Predice
Con 10 pasos, Euler se equivoca en unas 120 bacterias. Con 100 pasos, diez veces más cortos, ¿el error se dividirá entre 10 o entre 100?
:::

```{code-cell} julia
function euler(f, y0, t0, tf, n)
    h = (tf - t0) / n
    t = t0
    y = y0
    for i in 1:n
        y = y + h * f(t, y)
        t = t + h
    end
    return y
end
crece(t, y) = 0.5 * y
euler(crece, 100.0, 0.0, 4.0, 10)
euler(crece, 100.0, 0.0, 4.0, 100)
100 * exp(0.5 * 4)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/15-ecuaciones-diferenciales-2.json","config":{"etiqueta":"funciones que reciben funciones","idea":"euler recibe la ecuación como una función f(t, y), que dice cómo cambia y en el instante t. Va de t0 a tf en n pasos de tamaño h = (tf − t0)/n y devuelve dónde ha llegado.","titulo":"Una función para cualquier ecuación"}}
```

`euler` recibe la ecuación como una función, `f(t, y)`, igual que `biseccion` recibía la suya en *Ecuaciones y optimización*. Lleva `t` aunque `crece` no la use, porque hay ecuaciones en las que la velocidad depende de la hora: la temperatura de una habitación que se calienta al sol, por ejemplo.

`crece(t, y) = 0.5 * y` es una población que crece en proporción a su tamaño: una colonia de bacterias, por ejemplo. Empieza con 100 y, a las 4 horas, la fórmula da `100 · e²`, `738.905609893065`. Con 10 pasos, Euler da `619.17364224`, y se queda corto en unas 120 bacterias: cada paso usa el ritmo del principio, cuando la colonia era más pequeña.

Con 100 pasos da `724.4646118252336`, con 14,4 de error. Y si pruebas con 1000, da `737.4312390354604`, con 1,47. Cada vez que los pasos son diez veces más cortos, el error se divide, más o menos, entre diez, no entre cien. Euler es un método de **primer orden**: su error es proporcional a `h`. Para ganar una cifra hay que dar diez veces más pasos.

### 3 · La solución, en un gráfico

:::{tip} Predice
Ahora Euler da pasos de 5 minutos. ¿Su línea irá por encima o por debajo de la exacta?
:::

```{code-cell} julia
using Plots
function euler(f, y0, t0, tf, n)
    h = (tf - t0) / n
    ts = [t0]
    ys = [y0]
    for i in 1:n
        push!(ys, ys[end] + h * f(ts[end], ys[end]))
        push!(ts, ts[end] + h)
    end
    return ts, ys
end
cafe(t, T) = -0.1 * (T - 20)
ts, Ts = euler(cafe, 90.0, 0.0, 30.0, 6)
exacta = [20 + 70 * exp(-0.1 * t) for t in 0:30]
plot(0:30, exacta, label = "exacta", xlabel = "minutos", ylabel = "°C")
plot!(ts, Ts, label = "Euler, 6 pasos", marker = :o)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/15-ecuaciones-diferenciales-3.json","config":{"etiqueta":"push! · plot!","idea":"Esta euler guarda cada instante y cada temperatura con push!, y devuelve los dos vectores. Así se puede dibujar el camino entero, no solo dónde acaba, y compararlo con la fórmula.","titulo":"El café, en un gráfico"}}
```

La solución de una ecuación diferencial es una función, y lo natural es dibujarla. Para eso, esta `euler` no devuelve solo el final: guarda cada instante en `ts` y cada temperatura en `ys` con `push!`, y devuelve los dos vectores. `ys[end]` es el último valor guardado, el punto desde el que se da el paso siguiente. Y `ts, Ts = euler(…)` reparte los dos vectores en dos variables, como las tuplas de *Tuplas y diccionarios*.

`exacta` es la fórmula, calculada minuto a minuto con una comprensión. La primera línea, `plot`, dibuja la curva exacta; `plot!` le añade los siete puntos de Euler, unidos por rectas.

Con pasos de 5 minutos, el primer paso baja de 90 a 55 de golpe, porque supone que el café se enfría 7 °C por minuto durante cinco minutos enteros. A los 5 minutos, el café de verdad está a 62,5 °C. La línea de Euler va siempre **por debajo**, y llega a 30 minutos con `21.09375` °C en lugar de 23,49. Se ve en el gráfico: los segmentos de Euler son las tangentes de la curva, y la curva se dobla hacia arriba, separándose de ellas.

### 4 · Dos ecuaciones a la vez

:::{tip} Predice
Un muelle sin rozamiento oscila siempre igual. Tras 63 pasos de 0,1 segundos, casi una oscilación completa, ¿volverá `u` a `[1.0, 0.0]`?
:::

```{code-cell} julia
f(u) = [u[2], -u[1]]
u = [1.0, 0.0]
h = 0.1
for paso in 1:63
    u = u + h * f(u)
end
u
u[1]^2 + u[2]^2
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/15-ecuaciones-diferenciales-4.json","config":{"etiqueta":"un sistema con vectores","idea":"u guarda la posición y la velocidad del muelle. f(u) dice cómo cambian las dos: la posición cambia con la velocidad, y la velocidad, al revés que la posición. Un paso de Euler con vectores es la misma línea que con números.","titulo":"Un muelle que gana energía"}}
```

Una masa colgada de un muelle tiene dos cantidades que cambian a la vez: su posición `x` y su velocidad `v`. La posición cambia según la velocidad (`x' = v`), y la velocidad, según la fuerza del muelle, que empuja hacia el centro (`v' = −x`). Son dos ecuaciones, un **sistema**, y se resuelven juntas guardando las dos cantidades en un vector, `u = [x, v]`.

`f(u)` devuelve el vector de los dos cambios, y el paso de Euler se escribe igual que con números: `u + h * f(u)`. El producto de un número por un vector y la suma de vectores son los de *Vectores y rangos*. Cada vuelta, `u` pasa a ser un vector nuevo.

La solución exacta es `x = cos t`, `v = −sin t`: una oscilación completa dura `2π ≈ 6,28` segundos y vuelve a `[1, 0]`. Pero Euler acaba en `[1.3681058326266464, 0.005554814149177023]`: el muelle se ha **estirado** más que al soltarlo. Y `x² + v²`, que mide la energía del muelle y debería valer 1 siempre, vale `1.8717444252272815`. Euler le ha regalado un 87 % de energía en una sola oscilación. Con más vueltas, el muelle oscilaría cada vez más, sin parar.

### 5 · Un método mejor: Runge–Kutta

:::{tip} Predice
Runge–Kutta calcula `f` cuatro veces en cada paso, y Euler una. Con pasos tres veces más largos que los de Euler, 21 pasos de 0,3 segundos, ¿se equivocará más o menos que Euler en la energía del muelle?
:::

```{code-cell} julia
f(u) = [u[2], -u[1]]
function rk4(f, u, h)
    k1 = f(u)
    k2 = f(u + h / 2 * k1)
    k3 = f(u + h / 2 * k2)
    k4 = f(u + h * k3)
    return u + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
end
u = [1.0, 0.0]
for paso in 1:21
    u = rk4(f, u, 0.3)
end
u
u[1]^2 + u[2]^2
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/15-ecuaciones-diferenciales-5.json","config":{"etiqueta":"Runge–Kutta de orden 4","idea":"En lugar de una sola pendiente, rk4 calcula cuatro: al principio del paso, dos en el medio y una al final, y avanza con una media que pesa más las del medio.","titulo":"El muelle, con Runge–Kutta"}}
```

El defecto de Euler es que usa la pendiente del principio del paso para todo el paso. **Runge–Kutta** (de orden 4, el clásico) mira mejor antes de saltar. `k1` es la pendiente al principio, como Euler. Con ella da medio paso de prueba y calcula ahí la pendiente, `k2`. Con `k2` vuelve a dar medio paso desde el principio y calcula `k3`. Con `k3` da un paso entero de prueba y calcula `k4`. Y avanza con la media `(k1 + 2k2 + 2k3 + k4) / 6`, que pesa el doble las pendientes del medio.

El resultado: `u` acaba en `[0.9997603759745886, -0.016400570346332077]`, y la fórmula da `cos(6.3) = 0.99985863638…` y `−sin(6.3) = −0.01681390…`: se equivoca en menos de una milésima. La energía, `0.9997897880765356`, se ha movido un 0,02 %. Euler, con pasos de 0,1, se equivocaba en un 87 %.

Y el trabajo es casi el mismo: 21 pasos de cuatro llamadas a `f` son 84 llamadas, y Euler hizo 63. Con 63 pasos de 0,1, Runge–Kutta acierta la energía en menos de una millonésima (`0.9999991260941256`). Para acercarse a eso, Euler necesitaría decenas de millones de pasos.

::::{div}
:class: afondo
### 6 · Por qué Euler falla, y lo que usan los profesionales

**El orden de un método.** El error de Euler es proporcional a `h`: con el doble de pasos, la mitad de error. El de Runge–Kutta es proporcional a `h⁴`: con el doble de pasos, **dieciséis** veces menos. Con las bacterias de la sección 2, pasar de 100 a 200 pasos baja el error de Euler de 14,4 a 7,3 bacterias, y el de Runge–Kutta, de `1.9378544493520167e-6` a `1.2212944966449868e-7`: 15,9 veces menos. Por eso se dice que Runge–Kutta es de **orden 4**.

**La energía del muelle.** Un paso de Euler lleva `[x, v]` a `[x + hv, v − hx]`, y si se hacen las cuentas, `(x + hv)² + (v − hx)² = (1 + h²)(x² + v²)`. Cada paso multiplica la energía por `1 + h² = 1.01`, exactamente. Tras 63 pasos, `1.01^63 = 1.8717…`, que es lo que salió en la sección 4. No es mala suerte: Euler **siempre** añade energía a una oscilación. Hay métodos, llamados simplécticos, que la conservan a la larga; los usan las simulaciones de planetas.

**Ecuaciones rígidas.** Si el café se enfriara mucho más deprisa, con `k = 25`, y Euler diera pasos de 0,1 minutos, cada paso multiplicaría la diferencia con la habitación por `1 − 2,5 = −1,5`. Tras 10 pasos, el café estaría a `4056.552734375` grados, oscilando arriba y abajo cada vez más. Con pasos de 0,01 llega bien a 20 °C. Euler solo funciona si `h < 2/k`. Las ecuaciones con cambios muy rápidos y muy lentos a la vez se llaman **rígidas** y piden métodos **implícitos**, que calculan el paso resolviendo una ecuación, con la bisección o con Newton de *Ecuaciones y optimización*.

**Lo que usan los profesionales.** El paquete **DifferentialEquations** (o su parte de ecuaciones ordinarias, **OrdinaryDiffEq**) tiene cientos de métodos. Para el café:

```julia
using OrdinaryDiffEq
cafe(T, p, t) = -0.1 * (T - 20)
prob = ODEProblem(cafe, 90.0, (0.0, 30.0))
sol = solve(prob, Tsit5())
sol(10)
```

`Tsit5` es un Runge–Kutta de orden 5 que elige solo el tamaño de cada paso: lo agranda donde la solución cambia poco y lo encoge donde cambia mucho. Aquí hizo 9 pasos, el primero de 0,17 minutos y el más largo de casi 6,4, y llamó 57 veces a `cafe`. `sol(10)` da `45.751465078275494`: aunque el minuto 10 no es uno de sus pasos, `sol` es una función que rellena lo de en medio. Con la tolerancia por defecto acierta cuatro decimales; con `solve(prob, Tsit5(), reltol = 1e-8, abstol = 1e-8)` da `45.75156087255496`, en 38 pasos. Y si no le dices el método, `solve(prob)` elige uno solo, que cambia a un método implícito si detecta que la ecuación es rígida. Comprobado con OrdinaryDiffEq 7.8.1; instalarlo y compilarlo la primera vez tardó 12 minutos en el ordenador de pruebas, y `using OrdinaryDiffEq`, unos 3 segundos.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio con los mismos números que Julia: solo usan sumas, productos y `exp`, que el laboratorio calcula con el algoritmo de Julia. DifferentialEquations es un paquete grande; está en la nube y en tu ordenador, tras instalarlo con `] add OrdinaryDiffEq`.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia (OrdinaryDiffEq) | Python (SciPy) | R (deSolve) |
|---|---|---|---|
| La ecuación | `cafe(T, p, t) = -0.1 * (T - 20)` | `def cafe(t, T): return -0.1 * (T - 20)` | `cafe <- function(t, y, p) list(-0.1 * (y - 20))` |
| Resolverla | `solve(ODEProblem(cafe, 90.0, (0.0, 30.0)), Tsit5())` | `solve_ivp(cafe, (0, 30), [90.0])` | `ode(c(T = 90), seq(0, 30), cafe, NULL)` |
| Método | el que pidas; `Tsit5()` es Runge–Kutta de orden 5 | `RK45` por defecto, un Runge–Kutta de orden 5 | `lsoda` por defecto, que cambia a implícito si la ecuación es rígida |
| El valor en `t = 10` | `sol(10)` | con `dense_output = True`, `sol.sol(10)` | la fila de `t = 10` |

Ojo con el orden de los argumentos de la ecuación: Julia pone el valor primero (`T, p, t`), SciPy el tiempo (`t, T`), y R el tiempo, el valor y los parámetros (`t, y, p`). Y con las tolerancias por defecto: en el minuto 10, SciPy da `45.76169975400321`, con un error de una centésima, y R da `45.751578392635146`, con dos millonésimas. Comprobado con SciPy 1.18.1 y deSolve 1.40.
:::

## Conexiones

- Euler es un bucle con un acumulador, como los de *Decidir y repetir*: cada vuelta suma a `T` un poquito.
- `euler(f, y0, t0, tf, n)` recibe la ecuación como una función, como `biseccion(f, a, b)` en *Ecuaciones y optimización*.
- `push!` y `ys[end]` son los de *Vectores y rangos*; `ts, Ts = euler(…)` reparte una tupla, como en *Tuplas y diccionarios*.
- `plot` y `plot!` dibujan la solución y la comparan con la fórmula, como en *Gráficos*.
- El sistema del muelle avanza con sumas de vectores y productos por un número, los de *Vectores y rangos*.
- Las colas como `61.334300000000006` son la coma flotante de *Julia como calculadora*.

## La grieta

En todo el capítulo, `k = 0.1` venía dado. Pero ¿de dónde sale? Nadie lo sabe de antemano: hay que **medirlo**. Se toma la temperatura del café cada minuto y se busca el `k` con el que la ecuación pasa más cerca de las medidas. Y las medidas tienen errores: el termómetro baila, la habitación no está siempre a 20 °C. Sacar conclusiones de datos que tienen ruido es el siguiente capítulo, *Datos y estadística*.

## Ejercicios

1. **Pasos de medio minuto.** Repite la sección 1 con `h = 0.5`. ¿A qué temperatura llega el café a los 10 minutos? ¿Cuánto ha bajado el error respecto a los pasos de un minuto?

2. **Predice.** Con la `euler` de la sección 2, ¿qué da `euler(crece, 100.0, 0.0, 4.0, 1)`? Hazlo de cabeza antes de ejecutarlo.

3. **Un café con hielo.** Un café con hielo está a 5 °C en la misma habitación. Usa la `euler` de la sección 2 con `cafe(t, T) = -0.1 * (T - 20)` y 100 pasos para saber a qué temperatura estará a los 10 minutos. ¿Sube o baja? ¿Y si empieza justo a 20 °C?

4. **Una población con techo.** Una colonia no puede crecer sin fin: se queda sin espacio. La ecuación **logística** `y' = 0.5 · y · (1 − y/1000)` crece casi como la de la sección 2 cuando `y` es pequeña, y deja de crecer al llegar a 1000. Empieza con 100 y avanza 20 horas en 200 pasos. ¿Dónde llega? ¿Y a las 5 horas, con 50 pasos?

5. **El muelle con pasos más cortos.** Repite la sección 4 con `h = 0.01` y 630 pasos. Antes de ejecutarlo, usa el «A fondo» para predecir cuánto valdrá `u[1]^2 + u[2]^2`.

6. **Una piedra que cae en el aire.** Al caer, una piedra acelera por la gravedad y frena por el rozamiento: `v' = 9.8 − 0.5 · v`, con `v` en m/s y empezando en 0. Usa `euler` con 200 pasos para calcular su velocidad a los 20 segundos. ¿Hacia qué número tiende? ¿Por qué? (Pista: ¿cuándo vale 0 la aceleración?)

::::{div}
:class: afondo
7. **Un café que explota.** Con `k = 25`, repite la sección 1 durante un minuto con tres pasos distintos: `h = 0.1` (10 pasos), `h = 0.08` (12 pasos) y `h = 0.05` (20 pasos). Escribe las cuatro primeras temperaturas de cada uno. ¿Qué pasa con cada `h`? Relaciónalo con la condición `h < 2/k` del «A fondo».

8. **Un método de orden 2.** El método de **Heun** está a medio camino entre Euler y Runge–Kutta: calcula la pendiente al principio, `k1 = f(t, y)`, da un paso de prueba con ella, calcula la pendiente al final, `k2 = f(t + h, y + h * k1)`, y avanza con la media: `y + h / 2 * (k1 + k2)`. Escribe `heun(f, y0, t0, tf, n)` como la `euler` de la sección 2 y prueba con las bacterias con 100 y 200 pasos. ¿Entre cuánto se divide el error al doblar los pasos?
::::

## Solucionario

1. Con 20 pasos de medio minuto llega a `45.094014568597956` grados. La fórmula da 45,7516, así que el error es de 0,658 grados, la mitad que con pasos de un minuto (1,344). Es lo que dice el orden 1 de Euler: pasos la mitad de largos, error la mitad.
2. `300.0`. Con un solo paso, `h = 4`, y Euler hace `100 + 4 · crece(0, 100) = 100 + 4 · 50 = 300`. La fórmula da 738,9: un solo paso para cuatro horas es demasiado largo.
3. `euler(cafe, 5.0, 0.0, 10.0, 100)` da `14.509514880901557`: el café con hielo **se calienta**, porque `T − 20` es negativo y `-0.1 * (T - 20)` es positivo. La fórmula, `20 − 15 · e^(−1)`, da 14,4818. Si empieza a 20 °C, la velocidad es 0 desde el principio y se queda en `20.0` exactamente: es el **equilibrio**.
4. A las 20 horas llega a `999.6446891704732`, casi al techo de 1000 (la fórmula de la logística da 999,5916). A las 5 horas, con 50 pasos, va por `568.9687669393712`; la fórmula da 575,12. Al principio crece casi como `100 · e^(0.5t)`, pero frena cuando se acerca a 1000.
5. Cada paso multiplica la energía por `1 + h² = 1.0001`, así que tras 630 pasos debería valer `1.0001^630 ≈ 1.0650`. Julia da `1.0650234846256847` (y `1.0001^630` da `1.0650234846256765`: la diferencia está en la última cifra, por el redondeo de cada paso). Con pasos diez veces más cortos, Euler sigue regalando energía, un 6,5 %.
6. A los 20 segundos va a `19.599312967741525` m/s. Tiende a 19,6, la **velocidad límite**: cuando `v = 9.8 / 0.5 = 19.6`, la aceleración `9.8 − 0.5 · v` vale 0, el rozamiento frena tanto como acelera la gravedad, y la velocidad deja de cambiar. Como el café a 20 °C del ejercicio 3, es un equilibrio.

::::{div}
:class: afondo
7. Con `h = 0.1`, cada paso multiplica la diferencia con 20 °C por `1 − 2.5 = −1.5`: el café va a `-85.0`, `177.5`, `-216.25`, `374.375`… y acaba en `4056.552734375`. Con `h = 0.08 = 2/k`, el factor es exactamente −1: salta entre `-50.0` y `90.0` para siempre. Con `h = 0.05`, el factor es −0,25: el primer paso baja a `2.5` (por debajo de la habitación, que no tiene sentido físico), pero después oscila cada vez menos, `24.375`, `18.90625`, `20.2734375`, y acaba en `20.000000000063665`. Euler es estable solo si `|1 − hk| < 1`, es decir, si `h < 2/k`; y para que no oscile, `h < 1/k`.
8. Con 100 pasos, Heun da `738.8085615092286`, con un error de `0.0970483838364089`; con 200, `738.8811640979804`, con `0.02444579508460265`. El error se divide entre 3,97, casi 4 = 2²: Heun es de **orden 2**. Euler lo dividía entre 2 y Runge–Kutta, entre 16.
::::
