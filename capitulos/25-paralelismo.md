---
title: Paralelismo
subtitle: Repartir el trabajo entre varios núcleos, y por qué dos hilos que escriben en el mismo sitio se pisan
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

Todos los programas del libro hacen una cosa detrás de otra. Pero tu ordenador tiene varios **núcleos**, y cada uno puede hacer cuentas mientras los demás hacen otras. La grieta de *Cuadernos reactivos con Pluto* lo planteaba con el grafo de un cuaderno: si dos celdas no dependen la una de la otra, nada obliga a calcularlas una detrás de otra. Este capítulo enseña a repartir un trabajo entre varios núcleos, y la trampa que aparece cuando los trozos no son independientes.

## La pregunta

¿Cómo se parte un trabajo para que varios núcleos lo hagan a la vez? Si dos de ellos suman sobre la misma variable, ¿qué puede salir mal? ¿Por qué un fallo así aparece unas veces sí y otras no? ¿Cómo se evita? ¿Y da una suma en paralelo exactamente lo mismo que una suma de las de siempre?

## La idea

Un programa en paralelo reparte su trabajo en **hilos**: secuencias de pasos que el ordenador ejecuta a la vez, cada una en un núcleo. Funciona bien cuando los trozos son **independientes**: cada hilo trabaja con lo suyo, y al final se juntan los resultados.

El peligro llega cuando dos hilos **escriben en el mismo sitio**. Sumar 1 a una variable son dos pasos, leerla y escribirla, y si otro hilo se cuela entre los dos, una de las sumas se pierde. Es una **carrera** (en inglés, *race condition*). El resultado depende del orden en que se intercalan los pasos de los hilos, y ese orden no lo decide tu programa, sino el ordenador, y cambia de una vez a otra.

:::{important} Lo que se ve y lo que no
Los hilos de verdad no se pueden repetir en el visualizador: el orden de sus pasos y lo que tardan cambian cada vez. Así que los visualizadores **simulan dos hilos paso a paso**, con el orden escrito en un vector, `orden`, que tú puedes cambiar. Así se ve, siempre igual, lo que en un ordenador pasa solo a veces. Los hilos de verdad están en el «A fondo», con lo que dieron en el ordenador de pruebas.
:::

## Construcción

### 1 · Repartir el trabajo

:::{tip} Predice
`trozos(100, 4)` parte los números del 1 al 100 en cuatro trozos. ¿Cuánto sumará cada uno? ¿Y qué pasa con `trozos(10, 3)`, si 10 no se puede repartir en tres partes iguales?
:::

```{code-cell} julia
function trozos(n, k)
    t = cld(n, k)
    return [i:min(i + t - 1, n) for i in 1:t:n]
end
partes = trozos(100, 4)
parciales = [sum(r) for r in partes]
sum(parciales)
trozos(10, 3)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/25-paralelismo-1.json","config":{"etiqueta":"trozos · sumas parciales","idea":"Para repartir un trabajo entre varios núcleos, se parte en trozos que no dependen unos de otros. Cada núcleo hace el suyo, y al final se juntan los resultados.","titulo":"Repartir el trabajo"}}
```

`trozos(n, k)` parte los números del 1 al `n` en `k` rangos seguidos. `cld(n, k)` es la división entera **redondeando hacia arriba** (de *ceiling division*): con `cld(100, 4)`, cada trozo tiene 25 números; con `cld(10, 3)`, 4. La comprensión empieza un trozo cada `t` números, `1:t:n`, y `min(i + t - 1, n)` corta el último para que no pase de `n`. Por eso `trozos(10, 3)` da `[1:4, 5:8, 9:10]`: el último trozo es más corto. `partes` es un vector de rangos, `Vector{UnitRange{Int64}}`.

Cada trozo se suma por su cuenta: `parciales` es `[325, 950, 1575, 2200]`, y su suma, `5050`, la de siempre. Lo importante es que ningún trozo necesita a los otros. Con cuatro núcleos, cada uno sumaría su trozo a la vez que los demás, y solo la última línea, juntar los cuatro resultados, tendría que esperar a que terminen todos. Aquí el visualizador los suma uno detrás de otro; en el «A fondo», Julia los reparte de verdad entre dos núcleos.

### 2 · La carrera

:::{tip} Predice
Dos hilos suman 1 a `total`, que empieza en 0. Cada uno da dos pasos: leer `total` y escribir lo que leyó más 1. Si el orden es `[1, 1, 2, 2]`, el hilo 1 da sus dos pasos y luego el 2. ¿Y con `[1, 2, 1, 2]`?
:::

```{code-cell} julia
function ejecuta(orden)
    total = 0
    leido = [0, 0]
    leyo = [false, false]
    for h in orden
        if !leyo[h]
            leido[h] = total
            leyo[h] = true
        else
            total = leido[h] + 1
            leyo[h] = false
        end
    end
    return total
end
ejecuta([1, 1, 2, 2])
ejecuta([1, 2, 1, 2])
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/25-paralelismo-2.json","config":{"etiqueta":"leer · escribir · carrera","idea":"Sumar 1 a una variable son dos pasos: leerla y escribirla. Si dos hilos se intercalan entre esos pasos, uno pisa al otro y se pierde una suma.","titulo":"La carrera"}}
```

`ejecuta` simula dos hilos que hacen lo mismo, `total += 1`, sobre una variable que comparten. Para un procesador, esa línea no es un solo paso: tiene que **leer** `total`, sumarle 1 aparte y **escribir** el resultado. Cada hilo guarda en `leido[h]` lo que leyó, y `leyo[h]` dice si su próximo paso es escribir. `orden` hace de **planificador**, la parte del sistema que decide qué hilo avanza en cada momento: cada vuelta del bucle, el hilo `h` da un paso.

Con `[1, 1, 2, 2]`, el hilo 1 lee 0 y escribe 1, y después el hilo 2 lee 1 y escribe 2: el total es 2, el correcto. Con `[1, 2, 1, 2]`, los dos leen 0 antes de que nadie escriba; el hilo 1 escribe 1, y el hilo 2 escribe **también** 1, porque es lo que calculó con el 0 que leyó. El total es 1: la suma del hilo 1 se ha perdido, pisada por la del 2.

Ninguno de los dos hilos ha hecho nada mal: cada uno ha leído, sumado y escrito. Lo que ha fallado es que compartían `total`. Y el mismo programa da 2 o 1 según el orden, que en un ordenador no lo escribe nadie.

### 3 · Todas las intercalaciones

:::{tip} Predice
Cada hilo da dos pasos. ¿De cuántas formas se pueden intercalar los cuatro? ¿En cuántas se pierde una suma?
:::

```{code-cell} julia
function intercala(a, b)
    a == 0 && return [fill(2, b)]
    b == 0 && return [fill(1, a)]
    con1 = [[1; o] for o in intercala(a - 1, b)]
    con2 = [[2; o] for o in intercala(a, b - 1)]
    return [con1; con2]
end
ordenes = intercala(2, 2)
pierden = count(o -> o[1] != o[2], ordenes)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/25-paralelismo-3.json","config":{"etiqueta":"intercalaciones · recursión","idea":"El resultado depende de cómo se intercalen los pasos, y eso no lo decide el programa. Contándolas todas se ve por qué un fallo así aparece unas veces sí y otras no.","titulo":"Todas las intercalaciones"}}
```

`intercala(a, b)` da todas las formas de intercalar `a` pasos del hilo 1 con `b` pasos del hilo 2, como vectores de unos y doses. Es recursiva. Si a un hilo no le quedan pasos, solo hay una forma: los del otro, seguidos (`fill(2, b)` es un vector de `b` doses). Si no, el primer paso es del hilo 1 o del 2: `con1` pone un 1 delante (`[1; o]`) de cada forma de intercalar lo que queda, y `con2`, un 2. `[con1; con2]` junta las dos listas. Con dos pasos cada uno salen 6 órdenes, de `[1, 1, 2, 2]` a `[2, 2, 1, 1]`.

¿En cuáles se pierde una suma? Los dos primeros pasos de cualquier orden son una lectura, la del hilo que empieza. Si el segundo paso es del **otro** hilo, también es una lectura, y los dos han leído antes de que nadie escriba: se pierde una suma, como con `[1, 2, 1, 2]`. Si es del **mismo** hilo, ese hilo escribe antes de que el otro lea, y todo va bien. `count(o -> o[1] != o[2], ordenes)` cuenta las del primer caso: 4 de 6.

En un ordenador, los órdenes no salen todos con la misma frecuencia. Leer y escribir están a millonésimas de segundo, y casi siempre un hilo los da juntos: el fallo puede aparecer una vez de cada mil, o solo con más núcleos, o solo cuando el ordenador va cargado. Por eso un error de paralelismo es de los más difíciles de encontrar: el programa pasa las pruebas, y falla después. Y los órdenes crecen muy deprisa: con tres pasos por hilo ya son 20, y con dos hilos que suman 1000 veces cada uno, el número de órdenes tiene 1203 cifras. Nadie puede probarlos todos.

### 4 · Cada hilo en su casilla

:::{tip} Predice
Ahora cada hilo suma en su propia casilla, `parcial[h]`, y al final se juntan. ¿Qué da con el orden que antes perdía una suma?
:::

```{code-cell} julia
function ejecuta(orden)
    parcial = [0, 0]
    leido = [0, 0]
    leyo = [false, false]
    for h in orden
        if !leyo[h]
            leido[h] = parcial[h]
            leyo[h] = true
        else
            parcial[h] = leido[h] + 1
            leyo[h] = false
        end
    end
    return sum(parcial)
end
ejecuta([1, 1, 2, 2])
ejecuta([1, 2, 1, 2])
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/25-paralelismo-4.json","config":{"etiqueta":"una casilla por hilo","idea":"Si cada hilo escribe solo en su propia casilla, nadie pisa a nadie: da igual cómo se intercalen. Las casillas se juntan al final, cuando todos han terminado.","titulo":"Cada hilo en su casilla"}}
```

La única diferencia con la sección 2 está en dónde se lee y se escribe: el hilo `h` usa solo `parcial[h]`. Con `[1, 2, 1, 2]`, los dos leen antes de escribir, como antes, pero cada uno lee **su** casilla, y nadie escribe en la casilla del otro. Los dos órdenes dan 2, y también los otros cuatro (es el ejercicio 4).

Es la forma más sencilla y la más rápida de evitar una carrera: **no compartir lo que se escribe**. Es lo mismo que hacía la sección 1: cada trozo tenía su suma parcial, en su propia casilla de `parciales`, y solo al final, con todos los hilos terminados, se juntaban. Cuando no se puede evitar escribir en el mismo sitio, Julia tiene otras dos herramientas, las **operaciones atómicas** y los **cerrojos**, que están en el «A fondo».

### 5 · Los decimales en otro orden

:::{tip} Predice
`v` tiene ocho decimales, de 0.1 a 0.8, que suman 3.6. ¿Dará `sum(v)` exactamente 3.6? ¿Y sumando en dos trozos, o en cuatro?
:::

```{code-cell} julia
function trozos(n, k)
    t = cld(n, k)
    return [i:min(i + t - 1, n) for i in 1:t:n]
end
v = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
sum(v)
for k in [2, 4]
    parciales = [sum(v[r]) for r in trozos(8, k)]
    println(k, " trozos: ", parciales, " → ", sum(parciales))
end
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/25-paralelismo-5.json","config":{"etiqueta":"decimales · orden de la suma","idea":"Con decimales, sumar en otro orden puede cambiar la última cifra. Repartir una suma en trozos es sumar en otro orden.","titulo":"Los decimales en otro orden"}}
```

Con enteros, el orden de una suma no importa nunca: la sección 1 da 5050 se reparta como se reparta. Con decimales, sí. Como en *Julia como calculadora*, `0.1`, `0.2`, `0.3`… no se guardan exactos, y cada suma redondea su resultado al `Float64` más cercano. Sumando de izquierda a derecha, los redondeos se acumulan de una forma, y `sum(v)` da `3.5999999999999996`. En dos trozos, `1.0` y `2.6`, los redondeos son otros, y el total da `3.6`. En cuatro, también `3.6`, aunque el primer trozo, `0.1 + 0.2`, ya es el `0.30000000000000004` de siempre.

Así que una suma de decimales hecha en paralelo puede no dar **exactamente** lo mismo que la de siempre, y ninguna de las dos está mal: las dos están a una millonésima de millonésima de 3.6. Por eso los resultados con decimales se comparan con `≈`, como en *Errores y pruebas*, y no con `==`. Y por eso, como se vio en *Probabilidad y simulación* y en *Datos y estadística*, con 16 decimales o más el propio `sum` de Julia ya no suma de izquierda a derecha: suma en un orden que depende del procesador, para ir más deprisa.

::::{div}
:class: afondo
### 6 · Paralelismo, a fondo

**Arrancar Julia con varios hilos.** Julia empieza con un hilo para tus programas y otro para la consola. En el ordenador de pruebas, con 2 núcleos y Julia 1.13.4, `Threads.nthreads()` dio 1. Para tener más, se arranca con `julia -t 4` (cuatro hilos) o con `julia -t auto`, que elige según los núcleos (aquí, 2). También vale la variable de entorno `JULIA_NUM_THREADS`; si hay las dos, gana `-t`.

**`Threads.@threads`.** Delante de un `for`, reparte las vueltas entre los hilos, como `trozos`, y espera a que terminen todas:

```julia
cuenta = 0
Threads.@threads for i in 1:1_000_000
    global cuenta += 1
end
cuenta
```

Con dos hilos, en cinco ejecuciones, `cuenta` acabó en 502 257, 500 034, 506 013, 596 332 y 500 000: casi la mitad de las sumas, perdidas, y cada vez un número distinto. Es la carrera de la sección 2, de verdad. Con la misma cuenta en una casilla de un vector, `total[1] += 1`, salió bien las cinco veces, porque el compilador juntó por su cuenta las sumas de cada hilo. Pero no hay que fiarse: el manual de Julia avisa de que, con carreras, Julia no es seguro con la memoria. La documentación de `@threads` da la regla: escribir solo en lo que no comparten las vueltas, salvo con un cerrojo o una operación atómica.

**Operaciones atómicas.** `t = Threads.Atomic{Int}(0)` es un entero que se puede cambiar desde varios hilos a la vez sin carreras: `Threads.atomic_add!(t, 1)` lee, suma y escribe en un solo paso que nadie puede interrumpir, y `t[]` da su valor. Con el millón de sumas dio 1 000 000, en 5,6 milésimas de segundo.

**Cerrojos.** Un `ReentrantLock` deja pasar a un hilo cada vez: `lock(l) do … end` espera a que el cerrojo esté libre, lo cierra, hace lo de dentro y lo abre. Sirve para cualquier trozo de código, no solo para sumar. También dio 1 000 000, pero tardó 25 milésimas de segundo, más de cuatro veces más que el atómico: los hilos se pasan el tiempo esperándose.

**Tareas con `Threads.@spawn`.** `Threads.@spawn expresión` empieza a calcular la expresión en otro hilo y devuelve enseguida una **tarea** (un `Task`); `fetch(tarea)` espera a que termine y da su resultado. Con `trozos`, la suma en paralelo es la de la sección 1:

```julia
f(x) = sin(x)^2
function suma_hilos(n, k)
    tareas = [Threads.@spawn sum(f, r) for r in trozos(n, k)]
    return sum(fetch.(tareas))
end
```

Con `n` = 10⁸, `sum(f, 1:n)` tardó 3,18 segundos, y `suma_hilos(n, 2)` con dos hilos, 1,63: 1,95 veces más rápido, casi el máximo con dos núcleos. Y dio lo mismo, `5.000000054266386e7`, aunque eso es suerte: por la sección 5, podría haber cambiado la última cifra. Cuanto más pequeño es el trabajo de cada trozo, menos se gana, porque repartir y juntar también cuesta.

**Varios procesos con `Distributed`.** Los hilos comparten la memoria; los **procesos** no: cada uno es un Julia aparte, y se mandan los datos. Es más lento para hablar entre ellos, pero sirve para repartir el trabajo entre varios ordenadores. `using Distributed; addprocs(2)` arranca dos procesos más (`workers()` dio `[2, 3]`), `@everywhere f(x) = x^2` define `f` en todos, `pmap(f, 1:5)` dio `[1, 4, 9, 16, 25]`, y `@distributed (+) for i in 1:100; i; end`, 5050.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio, con los mismos pasos que en Julia, porque los hilos están simulados. Lo que no sabe hacer te lo dice y te manda a la nube: `Threads`, `@threads`, `@spawn`, `Distributed` y todo lo que dependa de cuántos núcleos tiene el ordenador.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Hilos para calcular | `Threads.@threads`, `Threads.@spawn` | `threading`, pero con el GIL solo calcula uno a la vez | no hay hilos en el código de R |
| Varios procesos | `Distributed`: `addprocs`, `pmap` | `multiprocessing`: `Pool` | `parallel`: `mclapply`, `parLapply` |
| Sumar sin carreras | `Threads.Atomic`, `ReentrantLock` | `threading.Lock` | — (los procesos no comparten memoria) |
| Arrancar | `julia -t auto` | normal | normal |

En el ordenador de pruebas, con la misma suma de `sin(i)^2` para cuatro millones de números: en Python 3.13.18, que tiene el GIL (un cerrojo global que deja ejecutar código de Python a un solo hilo cada vez), un bucle tardó 0,40 segundos, dos hilos 0,41 (nada ganado) y dos procesos con `multiprocessing` 0,33 (arrancar los procesos también cuesta). Hay versiones de Python sin GIL, pero esta no lo es: `sys._is_gil_enabled()` dio `True`. En R 4.3.3, con cuarenta millones de números, `sum(sin(r)^2)` tardó 0,95 segundos y `mclapply` con dos procesos, 0,36; `mclapply` copia el proceso de R, así que en Windows solo funciona con un núcleo.
:::

## Conexiones

- `trozos` y las sumas parciales son la idea de *Cuadernos reactivos con Pluto*: lo que no depende de nada se puede calcular a la vez.
- `cld` es una división entera, como `÷` en *Julia como calculadora*, pero redondeando hacia arriba.
- `intercala` es recursiva y devuelve un vector de vectores, como los grafos de *Cuadernos reactivos con Pluto*, y usa `cond && return x`.
- Que dos hilos escriban en la misma variable es *Memoria: copias y vistas* llevado al extremo: dos nombres, o dos hilos, que tocan las mismas casillas.
- Los decimales que cambian con el orden son los de *Julia como calculadora*, y comparar con `≈`, el consejo de *Errores y pruebas*.
- Medir lo que se gana es *Rendimiento*: en el navegador no se puede, y los tiempos van en el texto.

## La grieta

Con este capítulo se acaba la parte V, y con ella el recorrido por Julia: los números, los vectores y las tablas, el cálculo científico, cómo funciona Julia por dentro y cómo se trabaja con ella de verdad, con pruebas, paquetes, cuadernos y varios núcleos. Pero cada capítulo enseñaba una cosa cada vez, con datos pequeños. Un programa de verdad las junta todas: lee datos de un archivo, los guarda en una tabla, los analiza con funciones probadas, los dibuja, y quizá los reparte entre varios núcleos. Eso es lo que queda: los **proyectos**.

## Ejercicios

1. **Otros trozos.** ¿Qué da `trozos(10, 4)`? ¿Cuánto suma cada trozo? ¿Por qué el último es tan corto?

2. **Más órdenes.** Con la `ejecuta` de la sección 2, ¿qué dan `ejecuta([2, 1, 2, 1])` y `ejecuta([2, 2, 1, 1])`?

3. **Los que pierden.** ¿Cuáles son los 4 órdenes de `intercala(2, 2)` en los que se pierde una suma? Comprueba con la `ejecuta` de la sección 2 que todos dan 1.

4. **Todos los órdenes.** Con la `ejecuta` de la sección 4 y la `intercala` de la sección 3, calcula `[ejecuta(o) for o in intercala(2, 2)]`. ¿Hay alguno que pierda una suma?

5. **Contar órdenes.** ¿Qué dan `intercala(1, 1)` y `length(intercala(3, 3))`?

6. **Tres decimales.** Con `v = [0.1, 0.2, 0.3]`, ¿qué dan `sum(v)` y `0.1 + (0.2 + 0.3)`? ¿Y la suma en `trozos(3, 2)`? ¿Cómo comprobarías que una suma en paralelo de `v` está bien?

::::{div}
:class: afondo
7. **La carrera de verdad.** Arranca Julia con `julia -t auto`, comprueba cuántos hilos tienes con `Threads.nthreads()` y ejecuta el bucle de `cuenta` del «A fondo» varias veces. ¿Qué sale? Arréglalo con un `Threads.Atomic{Int}`.

8. **Medir lo que se gana.** Escribe `suma_hilos` del «A fondo» y mide con `@elapsed` cuánto tarda con `n = 10^8` frente a `sum(f, 1:n)`. ¿Cuántas veces más rápido es con tus núcleos? ¿Y con `n = 1000`?
::::

## Solucionario

1. `[1:3, 4:6, 7:9, 10:10]`, que suman 6, 15, 24 y 10. `cld(10, 4)` es 3, así que cada trozo tiene 3 números, y para el último solo queda el 10. Con hilos, el último terminaría mucho antes que los demás: en un reparto de verdad conviene que los trozos sean parecidos.
2. `ejecuta([2, 1, 2, 1])` da 1: los dos leen 0 antes de que nadie escriba, como `[1, 2, 1, 2]` con los hilos cambiados. `ejecuta([2, 2, 1, 1])` da 2: el hilo 2 termina antes de que empiece el 1.
3. `[1, 2, 1, 2]`, `[1, 2, 2, 1]`, `[2, 1, 1, 2]` y `[2, 1, 2, 1]`: los que tienen el segundo paso de un hilo distinto del primero. Con la `ejecuta` de la sección 2, `[ejecuta(o) for o in intercala(2, 2)]` da `[2, 1, 1, 1, 1, 2]`: solo el primero y el último dan bien.
4. `[2, 2, 2, 2, 2, 2]`: ninguno pierde una suma, porque cada hilo escribe solo en su casilla. Para probarlo en el laboratorio hay que escribir en un mismo programa la `intercala` de la sección 3 y la `ejecuta` de la sección 4.
5. `intercala(1, 1)` es `[[1, 2], [2, 1]]`, y `length(intercala(3, 3))`, 20. En general, con `a` y `b` pasos salen `binomial(a + b, a)` órdenes: de los `a + b` pasos, se eligen cuáles son del hilo 1.
6. `sum(v)` da `0.6000000000000001` y `0.1 + (0.2 + 0.3)`, `0.6`. `trozos(3, 2)` es `[1:2, 3:3]`, con parciales `[0.30000000000000004, 0.3]`, que suman `0.6000000000000001`: aquí coincide con `sum(v)`, porque los trozos suman en el mismo orden. Para comprobarla, `≈`: `sum(v) ≈ 0.6` es `true`, sea cual sea el orden.

::::{div}
:class: afondo
7. Con más de un hilo, cada vez sale un número distinto y menor que 1 000 000 (en el ordenador de pruebas, con 2 hilos, alrededor de 500 000). Con `t = Threads.Atomic{Int}(0)` y `Threads.atomic_add!(t, 1)` dentro del bucle, `t[]` da siempre 1 000 000. Si `Threads.nthreads()` da 1, no hay carrera: hay que arrancar Julia con `-t`.
8. Con 2 núcleos, en el ordenador de pruebas, unas 1,95 veces más rápido (3,18 frente a 1,63 segundos); con más núcleos, más, aunque nunca tantas veces como núcleos, porque repartir y juntar también cuesta. Con `n = 1000`, la versión con hilos es más lenta (en el ordenador de pruebas, 27 millonésimas de segundo frente a 13): el trabajo de cada trozo es tan pequeño que cuesta más crear las tareas que hacer las sumas. Los números concretos dependen de tu ordenador.
::::
