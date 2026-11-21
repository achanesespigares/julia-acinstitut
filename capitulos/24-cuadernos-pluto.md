---
title: Cuadernos reactivos con Pluto
subtitle: Un cuaderno que sabe qué celda depende de cuál, y que al cambiar una recalcula solo lo que la usa
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

Cada programa del libro se ejecuta de arriba abajo, una línea detrás de otra, y si cambias una línea del principio hay que volver a ejecutarlo entero. La grieta de *Entornos y paquetes* proponía otra forma de trabajar: un programa que sabe qué depende de qué, y que al cambiar una línea recalcula solo lo que la usa. Es lo que hace **Pluto**, un cuaderno para Julia. Para construirlo hace falta algo que ya sabes de *Metaprogramación*: el código se puede leer como un dato, un árbol de expresiones, sin ejecutarlo.

## La pregunta

Un cuaderno es una lista de trozos de código, las **celdas**, que se ejecutan cuando quieres. ¿Qué pasa si cambias una celda y no vuelves a ejecutar las demás? ¿Cómo puede saber un programa, sin ejecutar nada, qué celdas usan lo que define otra? ¿En qué orden hay que recalcularlas? ¿Y qué reglas hacen falta para que la respuesta sea siempre la misma?

## La idea

Cada celda **define** un nombre y **usa** otros. Leyendo su código como un árbol se sabe cuáles, sin ejecutarla. Si una celda usa un nombre que otra define, depende de ella: esas dependencias son flechas entre celdas, y todas juntas forman el **grafo** del cuaderno.

Con el grafo, un cuaderno se vuelve **reactivo**. Cuando cambias una celda, se recalculan ella y todas las que dependen de ella, cada una después de las que usa. Lo que ves en la pantalla siempre corresponde al código que hay escrito.

:::{important} Lo que se ve y lo que no
Pluto se abre en el navegador de tu ordenador y no se puede ejecutar dentro del visualizador. Así que los visualizadores construyen **un Pluto pequeño**, en Julia, con las mismas ideas: leer las celdas, hacer el grafo, recalcular en orden y comprobar sus reglas. Pluto de verdad está en el «A fondo», con lo que dio en el ordenador de pruebas.
:::

## Construcción

### 1 · Un cuaderno de arriba abajo

:::{tip} Predice
Las tres celdas se ejecutan en orden. Después, la primera cambia a `x = 5` y se ejecuta **solo ella**. ¿Qué valdrán `y` y `z`?
:::

```{code-cell} julia
celdas = ["x = 2", "y = x + 1", "z = 10 * y"]
for c in celdas
    eval(Meta.parse(c))
end
(x, y, z)
celdas[1] = "x = 5"
eval(Meta.parse(celdas[1]))
(x, y, z)
for c in celdas
    eval(Meta.parse(c))
end
(x, y, z)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/24-cuadernos-pluto-1.json","config":{"etiqueta":"celdas · eval · estado escondido","idea":"Un cuaderno es una lista de celdas. Si cambias una y la ejecutas sola, las que dependían de ella se quedan con sus valores viejos: es el estado escondido.","titulo":"Un cuaderno de arriba abajo"}}
```

El cuaderno es un vector de textos, uno por celda. Ejecutar una celda es lo que viste en *Metaprogramación*: `Meta.parse` convierte el texto en una expresión y `eval` la ejecuta. La primera vez, el bucle las ejecuta todas en orden, y `(x, y, z)` es `(2, 3, 30)`.

Luego la primera celda cambia, y se ejecuta solo esa. `x` pasa a valer 5, pero `y` y `z` siguen valiendo 3 y 30: se calcularon con el `x` de antes, y nadie las ha vuelto a ejecutar. El cuaderno enseña tres resultados que no corresponden a su código: con `x = 5`, `y` debería ser 6. Es el **estado escondido**: lo que hay en la memoria depende de qué celdas ejecutaste y en qué orden, y eso no se ve en la pantalla.

La salida fácil es la del final: volver a ejecutar todas las celdas, de arriba abajo. Con tres celdas no cuesta nada; con un cuaderno que tarda minutos en cada celda, sí. Lo que haría falta es saber qué celdas usan `x`, para ejecutar solo esas.

### 2 · Qué define y qué usa cada celda

:::{tip} Predice
`lee("w = sqrt(x^2 + x * y)")` dice qué nombre define la celda y qué nombres usa. ¿Saldrán en la lista `sqrt` y `+`? ¿Cuántas veces saldrá `x`?
:::

```{code-cell} julia
function usa!(nombres, ex)
    if ex isa Symbol
        push!(nombres, ex)
    elseif ex isa Expr
        desde = ex.head == :call ? 2 : 1
        for a in ex.args[desde:end]
            usa!(nombres, a)
        end
    end
    return nombres
end
function lee(celda)
    ex = Meta.parse(celda)
    return ex.args[1], unique(usa!(Symbol[], ex.args[2]))
end
lee("x = 2")
lee("y = x + 1")
lee("w = sqrt(x^2 + x * y)")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/24-cuadernos-pluto-2.json","config":{"etiqueta":"Meta.parse · Expr · recursión","idea":"Una celda es código, y el código es un árbol. Recorriéndolo se sabe qué nombre define la celda y qué nombres usa, sin ejecutarla.","titulo":"Qué define y qué usa cada celda"}}
```

Una celda como `y = x + 1` es, para Julia, una expresión con cabeza `:(=)` y dos argumentos: lo de la izquierda, el símbolo `:y`, que es lo que la celda **define**, y lo de la derecha, la expresión `x + 1`, donde están los nombres que **usa**. `lee` separa las dos partes; para encontrar los nombres de la derecha, `usa!` recorre su árbol.

`usa!` es **recursiva**, como el árbol. Si lo que recibe es un símbolo, es un nombre, y lo apunta. Si es una expresión, mira cada uno de sus argumentos con la misma función. Si es cualquier otra cosa, como el número `1`, no hace nada. En una llamada, como `x + 1`, que es `+(x, 1)`, el primer argumento es la función, `:+`, y `usa!` se lo salta: empieza por el segundo. Por eso en `w = sqrt(x^2 + x * y)` no salen `sqrt`, `+`, `^` ni `*`, solo `x` y `y`.

`x` sale dos veces en el árbol, en `x^2` y en `x * y`, y `unique` deja cada nombre una vez, en el orden en que aparece. Para `x = 2`, la lista es `Symbol[]`: un vector vacío de símbolos, porque la celda no usa nada.

Nada de esto ejecuta la celda: `lee` sabe que `y = x + 1` usa `x` sin necesitar que `x` exista. Pluto hace lo mismo con todas sus celdas antes de ejecutar ninguna.

### 3 · El grafo de dependencias

:::{tip} Predice
La celda 1 define `x`. ¿Qué celdas usan `x` y habrá que recalcular cuando cambie? ¿Y cuando cambie la celda 4?
:::

```{code-cell} julia
celdas = ["x = 2", "y = x + 1", "z = 10 * y", "w = x + z"]
define = [:x, :y, :z, :w]
usa = [Symbol[], [:x], [:y], [:x, :z]]
despues = [findall(u -> d in u, usa) for d in define]
for i in eachindex(celdas)
    println(define[i], " → ", despues[i])
end
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/24-cuadernos-pluto-3.json","config":{"etiqueta":"define · usa · grafo","idea":"Si una celda usa un nombre que otra define, depende de ella. Esas flechas forman el grafo del cuaderno: dicen qué hay que recalcular cuando cambia cada celda.","titulo":"El grafo de dependencias"}}
```

El cuaderno tiene ahora cuatro celdas. `define` y `usa` son lo que `lee` daría con cada una: el nombre que define y la lista de los que usa. `usa` es un **vector de vectores**: cada casilla es otro vector, de símbolos.

Para cada nombre `d`, `findall(u -> d in u, usa)` busca las celdas cuya lista de nombres lo contiene. Son las celdas que **dependen** de la que define `d`: las que habrá que recalcular cuando cambie. La comprensión hace esa búsqueda con los cuatro nombres, y `despues` guarda las cuatro respuestas, otro vector de vectores:

- la celda 1, que define `x`, tiene detrás la 2 y la 4;
- la 2, que define `y`, tiene detrás la 3;
- la 3, que define `z`, la 4;
- y la 4, ninguna: `Int64[]`, porque nadie usa `w`.

Cada pareja «la celda 1 va antes que la 2» es una flecha, de la celda que define a la que usa. Con todas las flechas, el cuaderno es un **grafo**: puntos (las celdas) unidos por flechas (las dependencias). `despues` es la forma de guardarlo que más se usa en programación, una **lista de adyacencia**: para cada punto, la lista de puntos a los que llegan sus flechas.

### 4 · Reaccionar

:::{tip} Predice
Cambia la celda 1 a `x = 5`. ¿En qué orden habrá que recalcular las demás? ¿Puede ir la celda 4 antes que la 3?
:::

```{code-cell} julia
function afectadas(i, despues, orden = Int[])
    for j in despues[i]
        if !(j in orden)
            afectadas(j, despues, orden)
        end
    end
    pushfirst!(orden, i)
    return orden
end
celdas = ["x = 2", "y = x + 1", "z = 10 * y", "w = x + z"]
despues = [[2, 4], [3], [4], Int[]]
for c in celdas
    eval(Meta.parse(c))
end
(x, y, z, w)
celdas[1] = "x = 5"
orden = afectadas(1, despues)
for i in orden
    eval(Meta.parse(celdas[i]))
end
(x, y, z, w)
afectadas(3, despues)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/24-cuadernos-pluto-4.json","config":{"etiqueta":"recorrido en profundidad · orden","idea":"Al cambiar una celda, se recalculan ella y todas las que dependen de ella, directa o indirectamente, cada una después de las que usa. El cuaderno se pone al día solo.","titulo":"Reaccionar"}}
```

Cuando cambia la celda 1, no basta con recalcular las que la usan directamente, la 2 y la 4: la 3 usa `y`, que sale de la 2, así que también cambia. Y el orden importa. La celda 4 usa `x` y `z`, y si se recalculara antes que la 3 usaría el `z` viejo: tiene que ir **después de todas las que usa**.

`afectadas` encuentra las dos cosas a la vez con un **recorrido en profundidad**, una forma de recorrer un grafo que sigue cada flecha hasta el final antes de volver. Para la celda `i`, primero llama a `afectadas` con cada celda de detrás que aún no esté en `orden`; cuando ya se han apuntado todas ellas, con las suyas, pone `i` **delante** de la lista, con `pushfirst!`. Así, cada celda queda antes que todas las que dependen de ella. Desde la 1, la llamada baja a la 2, de ahí a la 3 y a la 4, que no tiene nada detrás y se apunta la primera; luego, al volver, se apuntan delante la 3, la 2 y la 1: `[1, 2, 3, 4]`. Cuando la 1 mira su otra flecha, la que va a la 4, la 4 ya está en `orden` y no se repite. Una lista así, en la que cada punto va antes que todos los que salen de él, es un **orden topológico** del grafo.

Recalcular en ese orden pone al día el cuaderno entero: `(5, 6, 60, 65)`, lo mismo que si se hubiera ejecutado todo de arriba abajo con `x = 5`. Pero solo se ha recalculado lo que dependía de la celda cambiada: `afectadas(3, despues)` es `[3, 4]`, porque las celdas 1 y 2 no usan `z`. Es lo que hace Pluto cada vez que cambias una celda.

`orden = Int[]`, el argumento por defecto, crea un vector nuevo en cada llamada que no lo da. Las llamadas de dentro sí lo dan, `afectadas(j, despues, orden)`: así todas trabajan sobre el mismo vector, el de la llamada de fuera, y lo van llenando entre todas (como en *Memoria: copias y vistas*).

### 5 · Las dos reglas de Pluto

:::{tip} Predice
Las celdas 3 y 4 definen las dos `z`. Las celdas 1 y 2 usan cada una lo que define la otra. ¿Qué valor debería tener `z`? ¿Y por cuál de las dos primeras se empieza?
:::

```{code-cell} julia
function llega(i, meta, despues, vistas = Int[])
    for j in despues[i]
        j == meta && return true
        if !(j in vistas)
            push!(vistas, j)
            llega(j, meta, despues, vistas) && return true
        end
    end
    return false
end
celdas = ["x = y + 1", "y = 2x", "z = 3", "z = 4"]
define = [:x, :y, :z, :z]
usa = [[:y], [:x], Symbol[], Symbol[]]
for d in unique(define)
    count(==(d), define) > 1 && println("Multiple definitions for ", d)
end
despues = [findall(u -> d in u, usa) for d in define]
ciclo = [i for i in eachindex(celdas) if llega(i, i, despues)]
println("Cyclic references among ", join(define[ciclo], " and "))
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/24-cuadernos-pluto-5.json","config":{"etiqueta":"una definición por nombre · sin ciclos","idea":"Para que el grafo diga siempre qué valor tiene cada nombre, Pluto pone dos reglas: cada nombre se define en una sola celda, y ninguna celda puede depender, por un camino de flechas, de sí misma.","titulo":"Las dos reglas de Pluto"}}
```

Este cuaderno rompe las dos reglas que hacen funcionar a Pluto.

**Cada nombre, en una sola celda.** Si dos celdas definen `z`, el valor de `z` dependería de cuál se ejecutó la última, y eso es justo el estado escondido de la sección 1. Pluto no lo permite. El bucle cuenta cuántas veces sale cada nombre en `define`, con el `count(==(d), …)` de *Probabilidad y simulación*, y avisa con el mismo mensaje que Pluto: `Multiple definitions for z`.

**Sin ciclos.** `x` usa `y`, y `y` usa `x`: siguiendo las flechas, de la celda 1 se llega a la 2, y de la 2 otra vez a la 1. Un camino que vuelve al principio es un **ciclo**, y con él no hay un orden posible: ninguna de las dos puede ir antes que la otra. `llega(i, meta, despues)` busca un camino de flechas de la celda `i` a la celda `meta`, con otro recorrido en profundidad; `vistas` apunta las celdas ya visitadas, para no dar vueltas sin fin. `llega(i, i, despues)` pregunta si de una celda se puede volver a ella misma. Las celdas 1 y 2 están en el ciclo; la 3 y la 4, no.

`j == meta && return true` es la forma corta de *Errores y pruebas* (`condición && throw(…)`), ahora con `return`: si la condición es cierta, la función termina ahí y devuelve `true`; si no, sigue.

En Pluto, las dos cosas son errores que se ven en las celdas implicadas, con el mismo texto que escribe este programa (en el ordenador de pruebas, `Cyclic references among y and x`: el orden de los nombres no importa). Y con los dos mensajes Pluto propone el mismo arreglo: juntar las definiciones en una sola celda, con un bloque `begin … end`.

::::{div}
:class: afondo
### 6 · Pluto, a fondo

**Instalarlo y abrirlo.** Pluto es un paquete, como los de *Entornos y paquetes*: `import Pkg; Pkg.add("Pluto")`, y después `import Pluto; Pluto.run()`. Julia escribe `Go to http://localhost:1234/?secret=… in your browser to start writing ~ have fun!` y abre el navegador: el cuaderno es una página web, servida por tu propio ordenador, y las celdas se ejecutan en el Julia de esa ventana del terminal (`Ctrl+C` lo para). En el ordenador de pruebas, el 22 de noviembre de 2026, se instalaron Pluto 1.1.0 y PlutoUI 0.7.84 con Julia 1.13.4.

**Pluto reacciona como el de la sección 4.** Con las cuatro celdas de la sección 4 cargadas en Pluto, sus resultados fueron `2`, `3`, `30` y `32`. Al cambiar la primera a `x = 5` y ejecutar **solo esa**, Pluto recalculó las demás: `5`, `6`, `60` y `65`. Con las celdas escritas al revés en la página (`z = 10 * y` arriba, `x = 2` abajo) dio `30`, `3` y `2`: el orden de la página no importa, solo el grafo. Con dos celdas `z = 3` y `z = 4`, las dos dieron `Multiple definitions for z`, seguido de `Combine all definitions into a single reactive cell using a begin ... end block.`; y una tercera, `z + 1`, dio `UndefVarError`, porque `z` no llegó a existir.

**Una celda, una cosa.** Por esas reglas, una celda de Pluto suele ser una sola línea, con una sola definición. Si necesitas varias líneas, las juntas con `begin … end`, y la celda define todos los nombres que tenga dentro. Con `let … end`, en cambio, los nombres de dentro son locales (como en *Decidir y repetir*) y la celda solo da su valor.

**Lo que Pluto no ve.** Pluto reacciona a lo que una celda **define** con `=`, no a lo que **cambia** por dentro. Con `v = [1, 2, 3]`, `s = sum(v)` y una tercera celda `push!(v, 4)`, el vector acabó siendo `[1, 2, 3, 4]` pero `s` se quedó en `6`: `push!` usa `v`, pero no lo define, así que la celda de `s` no se recalcula. Es el estado escondido otra vez, por la puerta de atrás. La regla: crea un valor nuevo en vez de cambiar uno viejo, `v2 = [v; 4]`, o haz los cambios en la misma celda que lo define.

**Las funciones también cuentan.** El Pluto de verdad lee las celdas con su propio paquete, ExpressionExplorer, y no se salta los nombres de funciones, como `usa!`. Para `w = sqrt(x^2 + x * y)`, encontró que la celda define `w` y usa `x`, `y`, `sqrt`, `+`, `^` y `*`. Las funciones de Julia no las define ninguna celda, así que no añaden flechas. Pero si una celda define `f(x) = 2x`, las celdas que llaman a `f` dependen de ella, y se recalculan si la cambias.

**Un deslizador.** El paquete PlutoUI trae controles para la página: `@bind n Slider(1:10)` dibuja un deslizador, y cada vez que lo mueves, `n` cambia y se recalculan las celdas que usan `n`, por ejemplo `cuadrado = n^2`. El grafo de la sección 4 hace eso mismo, cada vez que mueves el control.

**El archivo del cuaderno.** Un cuaderno de Pluto se guarda como un programa de Julia normal, `cuaderno.jl`. Empieza por `### A Pluto.jl notebook ###` y `# v1.1.0`, y cada celda va precedida de una línea `# ╔═╡` con su identificador. Las celdas se guardan en el orden del grafo, no en el de la página: `x = 2`, `y = x + 1` y `z = 10 * y`, aunque en la página estén al revés. El orden de la página va al final, en una lista, `# ╔═╡ Cell order:`. Por eso `julia cuaderno.jl` ejecuta el cuaderno como un programa, de arriba abajo, sin Pluto. Y con un `@bind` dentro, el archivo trae una versión de prueba de `@bind` que da a la variable el valor inicial del control.

**Su entorno, dentro.** Al escribir `using PlutoUI` en una celda, Pluto instala el paquete, y guarda en el propio archivo dos celdas más: `PLUTO_PROJECT_TOML_CONTENTS`, con el `Project.toml` del cuaderno (`PlutoUI = "~0.7.84"` en su `[compat]`: con `~`, Pkg admite de la 0.7.84 a la 0.8.0, sin llegar), y `PLUTO_MANIFEST_TOML_CONTENTS`, con su `Manifest.toml` entero (44 paquetes, contando los que PlutoUI usa por dentro). Quien abra el archivo en Pluto tendrá las mismas versiones, sin instalar nada a mano: es el `Pkg.instantiate()` de *Entornos y paquetes*, hecho solo.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio, con los mismos pasos que en Julia: los vectores de vectores (de enteros, de símbolos y de textos), `unique`, `ex isa Symbol` y `ex isa Expr`, `cond && return x`, y `eval(Meta.parse(…))` en un bucle. Lo que no sabe hacer te lo dice y te manda a la nube: Pluto, PlutoUI y `@bind`, y vectores de vectores de otros tipos, como `[[1.5], [2.5]]`.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Un cuaderno clásico | Jupyter (IJulia) | Jupyter | Jupyter, o un `.Rmd` en RStudio |
| Cada celda se ejecuta | cuando la ejecutas tú | cuando la ejecutas tú | cuando la ejecutas tú |
| Un cuaderno reactivo | Pluto | marimo | Shiny (una aplicación, no un cuaderno) |
| Un nombre en dos celdas | `Multiple definitions for z` | `MultipleDefinitionError` | — |
| Celdas en ciclo | `Cyclic references among y and x` | `CycleError` | — |
| El archivo | `cuaderno.jl`, un programa de Julia | `cuaderno.py`, un programa de Python | `.Rmd` o `.qmd`, que se renderiza |

marimo hace en Python lo mismo que Pluto: lee qué define y qué usa cada celda, y las ordena por el grafo. Con dos celdas `z = 3` y `z = 4`, marimo 0.25.2 no ejecutó el cuaderno y dio `This app can't be run because it has multiple definitions of the name z`; con dos celdas en ciclo, `This app can't be run because it has cycles`; y con `z = 10 * y` arriba y `x = 2` abajo, escribió `z = 30`. En Jupyter, cada celda se ejecuta cuando le das tú, y el número que lleva al lado, `[3]`, dice en qué orden: el estado escondido de la sección 1. En R, Shiny reacciona como Pluto, pero para hacer aplicaciones, no cuadernos.
:::

## Conexiones

- Leer una celda sin ejecutarla es *Metaprogramación*: `Meta.parse`, la cabeza y los argumentos de una `Expr`, y `eval`.
- `usa!`, `afectadas` y `llega` son funciones recursivas, como `fact` en *Funciones*, y `usa!` termina en `!` porque cambia el vector que recibe.
- `orden` y `vistas` son un mismo vector compartido por todas las llamadas, como en *Memoria: copias y vistas*.
- `cond && return true` es la forma corta de `condición && throw(…)`, de *Errores y pruebas*.
- El cuaderno de Pluto guarda su `Project.toml` y su `Manifest.toml`, los de *Entornos y paquetes*.
- `findall` y `count(==(d), …)` usan funciones como valores, como en *Funciones* y *Probabilidad y simulación*.

## La grieta

En el grafo del cuaderno, a veces dos celdas no dependen la una de la otra: si `a = f(x)` y `b = g(x)` usan las dos `x`, pero ninguna usa la otra, da igual cuál se calcule primero. Y entonces, ¿por qué no calcularlas a la vez? Tu ordenador tiene varios núcleos, y cada uno puede hacer una cuenta mientras otro hace otra. Pero repartir el trabajo tiene sus trampas: dos núcleos que escriben en el mismo vector, o que suman sobre la misma variable, pueden pisarse. Es el último capítulo de esta parte: *Paralelismo*.

## Ejercicios

1. **Más estado escondido.** En la sección 1, después de cambiar la primera celda a `x = 5` y ejecutarla sola, ejecuta también **solo la tercera**, `z = 10 * y`. ¿Qué vale `(x, y, z)`? ¿Ha arreglado algo?

2. **Leer celdas.** ¿Qué dan `lee("area = base * altura / 2")` y `lee("n = length(v) + v[1]")`? ¿Por qué no sale `length`?

3. **Una celda más.** Añade al cuaderno de la sección 3 una quinta celda, `u = y * w`. Escribe sus `define` y `usa` y calcula `despues`. ¿Qué celdas tiene ahora detrás la celda 2?

4. **Cambia la segunda.** Con el cuaderno de la sección 4, ya con `x = 5`, cambia la celda 2 a `y = x - 1`. ¿Qué da `afectadas(2, despues)`? ¿Qué vale después `(x, y, z, w)`?

5. **El orden de la página.** Escribe las celdas de la sección 4 al revés: `["w = x + z", "z = 10 * y", "y = x + 1", "x = 2"]`. Calcula `despues` (`x` es ahora la celda 4) y `afectadas(4, despues)`. ¿En qué orden se ejecutan las celdas?

6. **Una celda que cambia un vector.** ¿Qué da `lee("push!(v, 4)")`? ¿Qué está mal en lo que dice que define la celda?

::::{div}
:class: afondo
7. **Tu primer cuaderno.** Instala Pluto, ábrelo con `Pluto.run()` y escribe tres celdas: `x = 2`, `y = x + 1` y `z = 10 * y`. Cambia la primera a `x = 5`. ¿Qué celdas se recalculan? Añade después una cuarta celda, `x = 3`. ¿Qué pasa?

8. **Dentro del archivo.** Guarda el cuaderno del ejercicio 7, con la celda de `z` arriba del todo, y abre el archivo `.jl` con un editor de texto. ¿En qué orden están las celdas? ¿Dónde está el orden de la página? ¿Qué pasa si lo ejecutas con `julia cuaderno.jl`?
::::

## Solucionario

1. `(5, 3, 30)`. La tercera celda se ha vuelto a ejecutar, pero con el `y` de siempre, 3, que se calculó con `x = 2`: `z` sigue siendo 30. Para arreglarlo hay que ejecutar la celda 2 antes que la 3, que es justo lo que decide el grafo.
2. `(:area, [:base, :altura])` y `(:n, [:v])`. En `base * altura / 2`, `*` y `/` son funciones, y el `2` no es un nombre. En `length(v) + v[1]`, `length` es la función de una llamada y `usa!` se la salta; `v` sale dos veces en el árbol, en `length(v)` y en `v[1]`, pero `unique` la deja una. El `1` de `v[1]` es un número.
3. `define = [:x, :y, :z, :w, :u]` y `usa = [Symbol[], [:x], [:y], [:x, :z], [:y, :w]]`. `despues` es `[[2, 4], [3, 5], [4], [5], Int64[]]`: la celda 2 tiene ahora detrás la 3 y la 5, porque `u` usa `y`.
4. `[2, 3, 4]`: la celda 1 no usa `y` y no se recalcula. Después, `(x, y, z, w)` es `(5, 4, 40, 45)`.
5. `define = [:w, :z, :y, :x]` y `usa = [[:x, :z], [:y], [:x], Symbol[]]`, así que `despues = [Int64[], [1], [2], [1, 3]]`. `afectadas(4, despues)` es `[4, 3, 2, 1]`: primero `x = 2`, luego `y`, luego `z` y por último `w`. Las celdas están al revés en la página, pero se ejecutan en el orden del grafo, como en Pluto.
6. `(:push!, [:v])`. `lee` toma como nombre definido el primer argumento de la expresión, y aquí la expresión no es una asignación, sino la llamada `push!(v, 4)`: su primer argumento es la función, `:push!`. La celda no define nada; **cambia** `v` por dentro. Pluto lo lee bien (define nada, usa `push!` y `v`), pero por eso mismo no recalcula las celdas que usan `v` cuando esta cambia el vector: es lo que no ve Pluto, en el «A fondo». Para arreglar `lee`, habría que mirar antes si `ex.head == :(=)`.

::::{div}
:class: afondo
7. Al cambiar `x`, Pluto recalcula las tres celdas: `x`, y después `y` y `z`, que dependen de ella. Con la cuarta celda, `x = 3`, Pluto marca las dos celdas que definen `x` con `Multiple definitions for x` y la propuesta de juntarlas en un `begin … end`; `y` y `z` dan `UndefVarError`, porque `x` deja de existir hasta que quites una de las dos.
8. Las celdas están en el orden del grafo, `x = 2`, `y = x + 1` y `z = 10 * y`, cada una detrás de una línea `# ╔═╡` con su identificador. El orden de la página está al final, en la lista `# ╔═╡ Cell order:`, donde la celda de `z` va la primera. `julia cuaderno.jl` ejecuta el archivo como un programa normal, de arriba abajo, sin errores: por eso Pluto guarda las celdas en el orden del grafo. No escribe nada, porque un programa solo escribe lo que imprime.
::::
