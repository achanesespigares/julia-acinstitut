---
title: Rendimiento
subtitle: Antes de cronometrar, cuenta; y deja que Julia pueda prever los tipos
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *Despacho múltiple* viste que Julia compila una versión de cada función para cada combinación de tipos, y por eso puede ser tan rápido como un lenguaje compilado. En *Matrices*, que recorrer una matriz por columnas fue unas diez veces más rápido que por filas, y en *El sistema de tipos*, que sumar un `Vector{Real}` costó unas 18 veces más que un `Vector{Float64}`.

## La pregunta

¿Qué hace que un programa sea rápido o lento? ¿Cómo se mide sin engañarse? ¿Por qué la primera llamada a una función tarda más que las siguientes? ¿Y qué puedo cambiar en mi código para que Julia vaya más deprisa?

## La idea

Lo que más pesa es **cuánto trabajo** hace el programa: buscar en un millón de números mirándolos uno a uno o partiendo por la mitad no es cuestión de segundos, sino de miles de veces. Eso se ve contando los pasos, sin reloj.

Después, Julia necesita **poder prever los tipos**. Cuando sabe de antemano que una variable o un campo siempre es un `Float64`, compila código directo; cuando no puede saberlo (un campo de tipo abstracto, una variable global que podría cambiar), tiene que comprobarlo en cada paso. Y conviene **no hacer trabajo de más**: preparar un vector de su tamaño en vez de hacerlo crecer, recordar lo que ya se ha calculado.

:::{important} Primero contar, después medir
Un buen algoritmo gana por miles; un detalle de tipos, por decenas. Por eso este capítulo cuenta pasos en los visualizadores, que dan lo mismo en cualquier ordenador, y deja los tiempos para el texto. Los tiempos se midieron en el ordenador de pruebas (un servidor con un procesador Intel Xeon a 2,1 GHz) con BenchmarkTools 1.8.0, y en el tuyo serán otros: lo que importa es cuánto más rápido es uno que otro.
:::

## Construcción

### 1 · Contar el trabajo

:::{tip} Predice
El vector tiene 16 números ordenados. Mirándolos uno a uno, encontrar el 97 cuesta 15 comparaciones. Partiendo siempre por la mitad, ¿cuántas harán falta?
:::

```{code-cell} julia
v = [2, 5, 8, 12, 16, 23, 38, 41, 56, 72, 75, 81, 90, 94, 97, 99]
x = 97
izq = 1
der = length(v)
pasos = 0
while izq <= der
    pasos += 1
    m = (izq + der) ÷ 2
    if v[m] == x
        break
    elseif v[m] < x
        izq = m + 1
    else
        der = m - 1
    end
end
pasos
findfirst(==(x), v)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/19-rendimiento-1.json","config":{"columnas":["pasos","izq","m","der"],"etiqueta":"búsqueda binaria","fila_en":"fin_iteracion","idea":"En un vector ordenado, mirar el elemento de en medio dice en qué mitad está lo que buscas. Cada paso descarta la mitad de lo que queda: con 16 números bastan 4 pasos, y con un millón, 20.","titulo":"Partir por la mitad"}}
```

Es la **búsqueda binaria**. `izq` y `der` marcan el trozo del vector donde puede estar el 97. En cada vuelta se mira el elemento de en medio, `v[m]`: si es menor que el 97, el 97 tiene que estar a su derecha, y `izq` salta a `m + 1`; si es mayor, a su izquierda. La tabla enseña cómo se estrecha el trozo: de 16 casillas a 8, a 4, a 2, y en el cuarto paso `v[15]` es el 97.

`findfirst(==(x), v)` busca de la otra forma, mirando desde el principio, y lo encuentra en la posición 15: quince comparaciones. Con 16 números la diferencia es pequeña, pero cada paso de la búsqueda binaria **parte por la mitad** lo que queda, así que el número de pasos crece muy despacio: 1024 números necesitan como mucho 11 pasos, y un millón, 20. Mirando uno a uno, un millón de números son un millón de comparaciones.

Medido con un millón de números impares y buscando el último, mirar uno a uno tardó 0,31 milisegundos y partir por la mitad, 24 nanosegundos: unas trece mil veces menos. Ningún truco de tipos da algo así. Por eso lo primero, antes de cronometrar nada, es preguntarse cuánto trabajo hace el programa. Julia trae su propia búsqueda binaria, `searchsortedfirst(v, x)`: da 15 sin tener que escribir el bucle.

### 2 · No repetir el trabajo

:::{tip} Predice
Sin recordar nada, `fib(8)` se llama a sí misma 41 veces. Guardando cada resultado en un diccionario, ¿cuántas llamadas harán falta? ¿Y la segunda vez que se pide `fib(8)`?
:::

```{code-cell} julia
function fib(n, memo)
    if haskey(memo, n)
        return memo[n]
    end
    r = n <= 2 ? 1 : fib(n - 1, memo) + fib(n - 2, memo)
    memo[n] = r
    return r
end
memo = Dict{Int, Int}()
fib(8, memo)
fib(8, memo)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/19-rendimiento-2.json","config":{"etiqueta":"memoización","idea":"Cada número de Fibonacci se calcula una sola vez y se guarda en memo. La próxima vez que haga falta, se lee del diccionario en lugar de calcularlo otra vez. Es la memoización.","titulo":"Recordar lo que ya se ha calculado"}}
```

Cada número de Fibonacci es la suma de los dos anteriores: 1, 1, 2, 3, 5, 8, 13, 21. Escrito tal cual, `fib(n) = n <= 2 ? 1 : fib(n - 1) + fib(n - 2)`, la función calcula lo mismo muchísimas veces: `fib(8)` pide `fib(7)` y `fib(6)`, pero `fib(7)` vuelve a pedir `fib(6)`, y así hacia abajo. Son 41 llamadas para `fib(8)`, y 1 664 079 para `fib(30)`: el trabajo casi se duplica con cada número más.

Esta versión lleva un diccionario, `memo`, donde guarda cada resultado nada más calcularlo. Antes de calcular, mira si ya lo tiene con `haskey`. El visualizador enseña cómo baja la cadena de llamadas hasta `fib(1)` y `fib(2)`, y cómo, al volver, `memo` se va llenando: cuando `fib(4)` necesita `fib(2)`, ya está en el diccionario. En total, 13 llamadas en lugar de 41. Y la segunda vez que se pide `fib(8)`, basta una: el resultado ya estaba guardado.

Guardar resultados para no recalcularlos se llama **memoización**. Con `fib(30)`, la versión sin memoria tardó 2,9 milisegundos y la de `memo`, 0,7 microsegundos, contando el tiempo de crear el diccionario: unas cuatro mil veces menos, con 57 llamadas en lugar de 1 664 079.

### 3 · Preparar el sitio

:::{tip} Predice
Las dos funciones dan el mismo vector. ¿En qué se diferencia lo que hacen con la memoria?
:::

```{code-cell} julia
function cuadrados_push(n)
    v = Int[]
    for i in 1:n
        push!(v, i^2)
    end
    return v
end
function cuadrados_zeros(n)
    v = zeros(Int, n)
    for i in 1:n
        v[i] = i^2
    end
    return v
end
cuadrados_push(5)
cuadrados_zeros(5)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/19-rendimiento-3.json","config":{"etiqueta":"preasignar","idea":"push! hace crecer el vector de uno en uno, y de vez en cuando Julia tiene que buscarle un sitio más grande y copiarlo. zeros(Int, n) prepara desde el principio un vector de su tamaño, y el bucle solo rellena casillas.","titulo":"Un vector que crece y un vector que ya tiene su tamaño"}}
```

Las dos funciones devuelven `[1, 4, 9, 16, 25]`, pero el visualizador enseña la diferencia. `cuadrados_push` empieza con un vector vacío, `Int[]`, que **gana un elemento** en cada vuelta. `cuadrados_zeros` empieza con `zeros(Int, n)`, un vector de cinco ceros, y en cada vuelta **cambia una casilla**: el vector ya tiene su tamaño desde el principio.

Para crecer, un vector necesita sitio en la memoria. Julia reserva algo más del que hace falta, pero cuando se llena tiene que buscar otro trozo más grande y copiar allí todo lo que había. Con un millón de cuadrados, `cuadrados_push` tardó 2,1 milisegundos y pidió memoria 31 veces (29,7 MB en total); `cuadrados_zeros`, 0,52 milisegundos y 3 veces (8 MB, justo el millón de enteros de 8 bytes). Cuando sabes cuántos elementos va a tener un vector, prepáralo de su tamaño. Y una comprensión, `[i^2 for i in 1:n]`, también sabe su tamaño de antemano: es el ejercicio 4.

### 4 · Que Julia pueda prever los tipos

:::{tip} Predice
Las dos cajas guardan un número real. Mirando solo el tipo `CajaReal`, ¿puede Julia saber de qué tipo es `x`? ¿Y con `Caja{Float64}`?
:::

```{code-cell} julia
struct CajaReal
    x::Real
end
struct Caja{T<:Real}
    x::T
end
function suma_cajas(cs)
    s = 0.0
    for c in cs
        s += c.x
    end
    return s
end
cr = [CajaReal(1.5), CajaReal(2)]
cp = [Caja(1.5), Caja(2.5)]
suma_cajas(cr)
suma_cajas(cp)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/19-rendimiento-4.json","config":{"etiqueta":"campos de tipo concreto","idea":"El campo x::Real admite cualquier número real: una caja puede guardar un Float64 y otra un Int64, y el tipo CajaReal no dice cuál. Caja{T} lleva el tipo del campo en su propio tipo: en un Caja{Float64}, x es siempre un Float64.","titulo":"Un campo abstracto y un campo con parámetro"}}
```

`CajaReal` tiene un campo de tipo **abstracto**, `x::Real`, y el visualizador lo enseña: la primera caja guarda un `Float64` y la segunda, un `Int64`, aunque las dos son del mismo tipo, `CajaReal`. Cuando `suma_cajas` recibe un `Vector{CajaReal}`, Julia no puede saber al compilar de qué tipo será cada `c.x`: tiene que mirarlo caja a caja, en cada vuelta.

`Caja{T<:Real}` es como el `Punto{T}` de *El sistema de tipos*: el tipo del campo forma parte del tipo de la caja. `cp` es un `Vector{Caja{Float64}}`, y de ahí Julia sabe que cada `c.x` es un `Float64`, así que compila una suma directa, sin preguntar nada.

Con un millón de cajas, la suma de las `CajaReal` tardó 15,7 milisegundos y la de las `Caja{Float64}`, 0,59: unas 27 veces menos. Además, para sumar las `CajaReal` Julia pidió 16 MB de memoria, y para las otras, nada. El manual de Julia lo dice en sus consejos de rendimiento: evita los campos de tipo abstracto. Es la misma razón por la que un `Vector{Real}` era más lento que un `Vector{Float64}`.

### 5 · Dentro de una función

:::{tip} Predice
El bucle de arriba y la función de abajo hacen la misma suma. ¿Dónde vive `total` en cada caso?
:::

```{code-cell} julia
n = 4
total = 0.0
for i in 1:n
    total += i / 2
end
total
function suma_mitades(n)
    total = 0.0
    for i in 1:n
        total += i / 2
    end
    return total
end
suma_mitades(4)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/19-rendimiento-5.json","config":{"columnas":["i","total"],"etiqueta":"globales y locales","fila_en":"fin_iteracion","idea":"Arriba, total es una variable global: cualquier línea del programa podría cambiarla, incluso de tipo. Dentro de la función, total es local y su tipo no cambia, y Julia puede compilar la función para él.","titulo":"El mismo bucle, fuera y dentro de una función"}}
```

Los dos trozos suman `0.5 + 1.0 + 1.5 + 2.0` y dan `5.0`. Arriba, `total` es una variable **global**, del programa principal, y la tabla la enseña cambiar vuelta a vuelta. Abajo, `total` es **local**: vive en el espacio de la llamada a `suma_mitades` y desaparece al terminar, como en *Funciones*.

Para la máquina, la diferencia es enorme. Una variable global puede cambiar en cualquier momento, desde cualquier sitio, y hasta de tipo: después del bucle podrías escribir `total = "hola"`. Así que Julia no puede compilar el bucle de arriba suponiendo que `total` es un `Float64`, y en cada vuelta tiene que comprobar qué hay dentro. Dentro de la función, `total` empieza siendo `0.0` y solo se le suman decimales, así que Julia compila código directo para decimales.

Con diez millones de vueltas, el bucle global tardó 2,5 segundos y la función, 0,007 segundos: unas 360 veces menos. Es el primer consejo del manual de rendimiento de Julia: el código que tiene que ir deprisa, dentro de una función. Si de verdad necesitas una global, decláralo con `const` o dale un tipo, `total::Float64 = 0.0`, y Julia ya sabrá qué esperar.

::::{div}
:class: afondo
### 6 · Medir sin engañarse

**`@time` y la primera llamada.** `@time f(x)` ejecuta `f(x)` y escribe cuánto ha tardado y cuánta memoria ha pedido. La primera vez que llamas a una función con unos tipos nuevos, Julia la compila, y eso también cuesta. En Julia 1.13, `@time suma_mitades(10^7)` escrito tal cual en el REPL no cuenta la compilación, porque Julia compila la llamada antes de poner en marcha el cronómetro; con `@time @eval suma_mitades(10^7)` sí entra:

```julia
julia> @time @eval suma_mitades(10^7)
  0.021058 seconds (4.65 k allocations: 231.938 KiB, 64.79% compilation time)
2.50000025e13

julia> @time @eval suma_mitades(10^7)
  0.007117 seconds (77 allocations: 3.047 KiB)
2.50000025e13
```

Dos tercios de la primera vez fueron compilar. Por eso una medida que importe nunca se hace con la primera llamada.

**BenchmarkTools.** El paquete BenchmarkTools repite la llamada muchas veces y da el tiempo más corto (`@btime`) o un resumen con la media y la dispersión (`@benchmark`). Las variables de fuera se escriben con `$`, como `@btime busca_binaria($v, $x)`, para que no cuente el coste de leer una global. Así se midieron los tiempos de este capítulo.

**`@code_warntype`: ver lo que Julia sabe.** `@code_warntype suma_mitades(10)` enseña el tipo que Julia ha deducido para cada variable. Si la función empezara con `s = 0` en lugar de `s = 0.0`, `s` sería primero un `Int64` y después un `Float64`, y `@code_warntype` lo marcaría en rojo como `Union{Float64, Int64}`: una variable que cambia de tipo. El manual aconseja evitarlo. En este caso concreto, las dos versiones tardaron lo mismo (0,006 s), porque Julia sabe manejar bien una unión de solo dos tipos; con campos abstractos, contenedores abstractos o globales, en cambio, la diferencia es la de las secciones 4 y 5.

**Otros consejos del manual.** La página *Performance Tips* del manual de Julia recoge estos y algunos más: recorrer las matrices por columnas (*Matrices*), usar vistas en lugar de copias para los trozos de un vector (el capítulo *Memoria: copias y vistas*), fusionar operaciones con el punto (*Índices, filtros y el punto*) y separar una función en métodos para tipos concretos.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio, con los mismos pasos que en Julia. Lo que no hace es medir: `@time`, `@btime`, `@allocated` o `@code_warntype` dependen del ordenador y de cómo compila Julia por dentro, y el laboratorio te dice que los pruebes en la nube o en tu ordenador. El intérprete del laboratorio no compila nada: va línea a línea, y por eso no tiene sentido cronometrarlo.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Cronometrar | `@time`, `@btime` de BenchmarkTools | `time.perf_counter()`, el módulo `timeit` | `system.time()`, paquete `bench` |
| Un bucle de diez millones de sumas | 0,007 s dentro de una función | 0,28 s; con NumPy, sin bucle, 0,066 s | 0,27 s; vectorizado, `sum((1:1e7) / 2)`, 0,11 s |
| El consejo de siempre | escribe el bucle dentro de una función | evita los bucles: usa NumPy | evita los bucles: vectoriza |
| Recordar resultados | un `Dict` a mano, o el paquete Memoize | `functools.lru_cache` | el paquete `memoise` |

Los tiempos son de la misma suma de la sección 5, medidos en el mismo ordenador con Python 3.13 y NumPy 2.5.3, y con R 4.3.3. En Python y en R, el consejo es no escribir bucles y llamar a funciones escritas en C. En Julia, el bucle escrito por ti, dentro de una función, ya es tan rápido como esas funciones: no hace falta cambiar de lenguaje para ir deprisa.
:::

## Conexiones

- El orden de las casillas de *Matrices* (recorrer por columnas, diez veces más rápido) es otro consejo del mismo manual.
- El `Vector{Real}` lento de *El sistema de tipos* y el campo `x::Real` de la sección 4 son el mismo problema: un tipo que Julia no puede prever.
- Las versiones compiladas para cada combinación de tipos de *Despacho múltiple* son la razón de que la primera llamada tarde más.
- `total` global frente a local es el ámbito de *Decidir y repetir* y *Funciones*, visto ahora desde la velocidad.
- `memo` es un diccionario de *Tuplas y diccionarios*: buscar una clave cuesta más o menos lo mismo con 10 claves que con un millón, gracias a la tabla hash.

## La grieta

`@time`, `@btime`, `@eval`, `@code_warntype`… y antes `@show` y `@view`. ¿Qué es esa `@`? No son funciones: una función recibe valores, y `@time` recibe el código mismo, `suma_mitades(10^7)`, y lo rodea de un cronómetro antes de ejecutarlo. Código que escribe código: es la **metaprogramación**, el capítulo siguiente.

## Ejercicios

1. **Otros números.** Cambia `x` en la sección 1 por `2`, por `50` (que no está) y por `99`. ¿Cuántos pasos da la búsqueda binaria en cada caso? ¿Y mirando uno a uno?

2. **Predice.** ¿Cuántos pasos necesita como mucho la búsqueda binaria con 1024 números? ¿Y con un millón? ¿Por qué el vector tiene que estar ordenado?

3. **Contar las llamadas.** Escribe la versión sin memoria, `fib(n) = n <= 2 ? 1 : fib(n - 1) + fib(n - 2)`, y cuenta sus llamadas con una variable global: `llamadas = 0` antes, y `global llamadas += 1` al empezar la función (escrita con `function`). ¿Cuántas llamadas hace `fib(8)`?

4. **Una comprensión.** Escribe `cuadrados(n) = [i^2 for i in 1:n]`. ¿Da lo mismo que las funciones de la sección 3? ¿Cuál de las tres crees que es más rápida con un millón?

5. **Un tipo que cambia.** Define `mitad_o_cero(x) = x > 0 ? x / 2 : 0`. ¿De qué tipo es `mitad_o_cero(4)`? ¿Y `mitad_o_cero(-4)`? Arréglala para que siempre devuelva el mismo tipo.

6. **Una global que cambia.** Escribe `n = 10` y `suma_n() = sum(1:n)`, que usa la global `n` sin recibirla. ¿Qué da `suma_n()`? Escribe después `n = "diez"` y vuelve a llamarla. ¿Qué te dice esto de por qué Julia no puede compilar código rápido con una global?

::::{div}
:class: afondo
7. **La búsqueda de Julia.** Prueba `searchsortedfirst(v, 97)` y `searchsortedfirst(v, 50)` con el vector de la sección 1. ¿Qué devuelve cuando el número no está? Prueba también con un vector desordenado, `[9, 2, 7, 1, 8]`, buscando el 9.

8. **Medir de verdad.** En la nube o en tu ordenador, con `using BenchmarkTools`, mide `@btime busca_binaria($v, $x)` y una búsqueda uno a uno con un vector de un millón de números. ¿Cuántas veces más rápida es la binaria en tu ordenador? ¿Qué pasa si quitas los `$`?
::::

## Solucionario

1. Con `x = 2`, 4 pasos: el trozo se estrecha por la izquierda hasta llegar a `v[1]`; mirando uno a uno, 1 paso, porque está el primero. Con `x = 50`, 4 pasos hasta que `izq` pasa a `der` y el bucle termina sin encontrarlo; uno a uno, 16 comparaciones para saber que no está. Con `x = 99`, 5 pasos; uno a uno, 16. La búsqueda binaria no siempre gana con vectores pequeños, pero nunca da más de 5 pasos con 16 números.
2. Con 1024 números, 11 pasos: cada paso parte por la mitad, y 1024 se queda en 1 tras partirlo 10 veces, más el paso que lo comprueba. Con un millón, 20. El vector tiene que estar ordenado porque la regla «si `v[m]` es menor, está a la derecha» solo es cierta en un vector ordenado; con uno desordenado, la búsqueda descarta mitades donde podría estar el número.
3. Una forma:

   ```julia
   llamadas = 0
   function fib(n)
       global llamadas += 1
       return n <= 2 ? 1 : fib(n - 1) + fib(n - 2)
   end
   fib(8)
   llamadas
   ```

   `fib(8)` da `21`, y `llamadas`, `41`, frente a las 13 de la versión con `memo`.
4. Sí, `cuadrados(5)` da `[1, 4, 9, 16, 25]`. Con un millón, fue la más rápida de las tres en el ordenador de pruebas: 0,31 milisegundos, frente a 0,52 de `cuadrados_zeros` y 2,1 de `cuadrados_push`. Una comprensión sobre `1:n` sabe de antemano cuántos elementos tendrá, y no tiene que rellenar antes el vector con ceros.
5. `mitad_o_cero(4)` da `2.0`, un `Float64`, y `mitad_o_cero(-4)` da `0`, un `Int64`: el tipo depende del valor, no solo del tipo del argumento. Se arregla devolviendo `0.0` en lugar de `0` (o `zero(x / 2)`): `mitad_o_cero(x) = x > 0 ? x / 2 : 0.0`.
6. `suma_n()` da `55`. Con `n = "diez"`, da `MethodError: no method matching (::Colon)(::Int64, ::String)`: `1:n` ya no es un rango. La misma función, sin cambiar, recibe otro tipo, porque la global puede cambiar en cualquier momento. Julia no puede compilar `suma_n` suponiendo que `n` es un entero, y tiene que comprobarlo cada vez.

::::{div}
:class: afondo
7. `searchsortedfirst(v, 97)` da `15`, y `searchsortedfirst(v, 50)` da `9`: la posición donde iría el 50 para que el vector siguiera ordenado (antes del 56). Con `[9, 2, 7, 1, 8]`, buscar el 9 da `6`, como si el 9 fuera detrás de todos, aunque está el primero: Julia supone que el vector está ordenado y no lo comprueba. El laboratorio hace la misma búsqueda paso a paso y da lo mismo.
8. Depende del ordenador. En el de pruebas, con un millón de números impares y buscando el último, la binaria tardó 24 nanosegundos y la búsqueda uno a uno, 0,31 milisegundos: unas trece mil veces más. Sin los `$`, `v` y `x` son globales dentro de la medida, y BenchmarkTools cuenta también el coste de leerlas sin saber su tipo: en el ordenador de pruebas, la búsqueda binaria pasó de 24 a 33 nanosegundos.
::::
