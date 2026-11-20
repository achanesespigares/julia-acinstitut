---
title: Funciones
subtitle: Ponerle nombre a un trozo de código, darle datos y recibir un resultado
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En una hoja de cálculo no escribes la suma de una columna casilla a casilla: escribes `=PROMEDIO(B2:B30)`. Alguien escribió una vez cómo se calcula una media, le puso un nombre, y desde entonces basta con decir el nombre y qué casillas usar. Si mañana cambias las notas, la fórmula vuelve a calcular sola.

## La pregunta

¿Cómo se le pone nombre a un trozo de código para usarlo tantas veces como haga falta, con datos distintos cada vez? ¿Y qué pasa con las variables que se crean dentro?

## La idea

Una **función** es un trozo de código con nombre que recibe unos datos, los **argumentos**, y devuelve un resultado:

```julia
function calificacion(nota)
    # … el mismo if del capítulo anterior …
end
```

Para usarla, se **llama** con un valor concreto: `calificacion(7.5)`. Dentro, `nota` vale 7.5. Cuando la función termina, devuelve el valor que indica `return`, o el de la última línea que ha ejecutado.

Cada llamada tiene **su propio espacio** para las variables. Lo que se crea dentro de una función no se ve fuera, y desaparece cuando la función termina.

:::{important} Una llamada, un espacio propio
Las variables de una función son **locales**: dos funciones pueden tener una variable `total` cada una sin estorbarse, y ninguna toca la `total` del programa principal. La excepción son los vectores: una función que recibe un vector puede cambiar sus casillas, y el cambio se ve fuera. Por convenio, en Julia esas funciones llevan un `!` al final del nombre, como `push!`.
:::

## Construcción

### 1 · La primera función

:::{tip} Predice
Hay una sola definición de `calificacion` y dos llamadas. ¿Cuántas veces se ejecuta el `if` de dentro?
:::

```{code-cell} julia
function calificacion(nota)
    if nota >= 9
        return "sobresaliente"
    elseif nota >= 7
        return "notable"
    elseif nota >= 5
        return "aprobado"
    else
        return "suspenso"
    end
end
a = calificacion(7.5)
b = calificacion(4.0)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/05-funciones-1.json","config":{"etiqueta":"function · return","idea":"Las líneas 1 a 11 solo guardan la receta: no se ejecuta nada. Cada llamada abre un espacio nuevo, con nota valiendo lo que se le ha pasado, y return devuelve el texto a la línea que llamó.","titulo":"Definir una vez, llamar muchas"}}
```

Las once primeras líneas **definen** la función: Julia guarda la receta con el nombre `calificacion` y no ejecuta nada todavía. El visualizador lo enseña en el primer paso: aparece `calificacion` en la memoria, como una variable más.

En la línea 12 empieza lo interesante. `calificacion(7.5)` salta dentro de la función con un espacio nuevo en el que `nota` vale 7.5. El `if` llega a `return "notable"`, y `return` hace dos cosas a la vez: termina la función en el acto y devuelve ese valor a la línea 12, que lo guarda en `a`. El espacio de la llamada desaparece con su `nota`. En la línea 13 se repite todo con 4.0: un espacio nuevo, otro recorrido por el `if`, otro resultado.

La función tiene **un parámetro**, `nota`, que es el nombre con el que se refiere al dato. En cada llamada, ese nombre recibe un **argumento** distinto: 7.5, 4.0 o el que sea.

### 2 · La forma corta, y argumentos con nombre

:::{tip} Predice
0.6 × 7 + 0.4 × 9 es 7.8. ¿Qué escribirá Julia en `f1`?
:::

```{code-cell} julia
media(v) = sum(v) / length(v)
nota_final(examen, practicas; peso = 0.6) = peso * examen + (1 - peso) * practicas
m = media([9.0, 6.5, 4.0])
f1 = nota_final(7.0, 9.0)
f2 = nota_final(7.0, 9.0; peso = 0.8)
nota_final(7.0, 9.0, 0.8)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/05-funciones-2.json","config":{"etiqueta":"f(x) = … · ; peso = 0.6","idea":"Una función corta se escribe como una fórmula. Los argumentos que van después del punto y coma tienen nombre y un valor por defecto: si no se dicen, valen ese valor. Y solo se pueden dar con su nombre.","titulo":"En una línea"}}
```

Cuando una función cabe en una línea, se escribe como en matemáticas: `media(v) = sum(v) / length(v)`. Es exactamente lo mismo que un `function … end` de una línea.

`nota_final` tiene dos argumentos normales, `examen` y `practicas`, que se dan **por orden**. Después del punto y coma viene `peso = 0.6`, un **argumento con nombre** y con valor por defecto. Si no lo dices, vale 0.6; si quieres otro, lo escribes con su nombre: `peso = 0.8`. El visualizador escribe la llamada como `nota_final(peso = 0.6, examen = 7.0, practicas = 9.0)`, con el peso delante: así es como Julia guarda por dentro los argumentos con nombre, antes que los demás.

`f1` sale `7.800000000000001` y no 7.8. Es el redondeo de los decimales que viste en el primer capítulo: 0.6 y 0.4 no se pueden guardar exactos en binario, y el error se nota en la última cifra.

La última línea da el peso sin su nombre, como un tercer argumento normal, y Julia se queja: `no method matching nota_final(::Float64, ::Float64, ::Float64)`. La función solo sabe recibir dos argumentos por orden. El mensaje completo, en el REPL, sugiere la forma correcta, `nota_final(::Any, ::Any; peso)`: el peso va con nombre.

### 3 · Lo que pasa dentro se queda dentro

:::{tip} Predice
Hay dos variables que se llaman `total`. ¿Cuánto vale la del programa al final?
:::

```{code-cell} julia
total = 100
function suma_notas(v)
    total = 0.0
    for x in v
        total += x
    end
    return total
end
s = suma_notas([9.0, 6.5])
total
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/05-funciones-3.json","config":{"etiqueta":"ámbito local","idea":"La total de dentro de la función es local: nace en la llamada, acumula 15.5 y desaparece al volver. La total del programa principal sigue valiendo 100 todo el rato.","titulo":"Dos total que no se tocan"}}
```

Dentro de `suma_notas`, `total = 0.0` crea una variable **local**, que no tiene nada que ver con la `total = 100` de fuera. El visualizador dibuja las dos a la vez: la del programa, en la memoria principal, y la de la llamada, en el marco de la función. El bucle acumula 9.0 y 6.5 en la de dentro; la de fuera ni se entera. Al volver, la local desaparece y `total` sigue valiendo 100.

Así se arregla el problema del capítulo anterior, el del bucle que fallaba al ejecutarlo desde un archivo. Dentro de una función no hay ninguna ambigüedad: todo lo que asignas es local, tanto en el REPL como en un archivo. Por eso el código serio de Julia vive siempre dentro de funciones. Es uno de los primeros consejos de rendimiento del manual oficial: todo código cuyo rendimiento importe debe estar dentro de una función.

### 4 · Cambiar un vector desde dentro

:::{tip} Predice
Las dos funciones reciben el mismo vector. ¿Cuál de las dos lo cambia de verdad?
:::

```{code-cell} julia
function aprueba_todos!(v)
    for i in eachindex(v)
        if v[i] < 5
            v[i] = 5.0
        end
    end
    return nothing
end
function intenta_cambiar(v)
    v = [0.0, 0.0]
    return v
end
notas = [9.0, 4.0, 3.0]
aprueba_todos!(notas)
r = intenta_cambiar(notas)
notas
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/05-funciones-4.json","config":{"etiqueta":"convenio !","idea":"v[i] = 5.0 cambia una casilla del vector que llegó, que es el mismo que notas. v = [0.0, 0.0] solo hace que el nombre local v apunte a un vector nuevo: notas no se entera.","titulo":"Cambiar las casillas o cambiar el nombre"}}
```

Cuando llamas a `aprueba_todos!(notas)`, Julia no copia el vector: dentro de la función, `v` es **otro nombre para el mismo vector** que `notas`, como `b = a` en el capítulo de vectores. Por eso `v[i] = 5.0` cambia las casillas de `notas`, y al terminar `notas` vale `[9.0, 5.0, 5.0]`.

`intenta_cambiar` hace otra cosa. `v = [0.0, 0.0]` no toca ninguna casilla: crea un vector nuevo y pone la etiqueta local `v` sobre él. `notas` sigue apuntando al vector de antes. La función devuelve el vector nuevo, que acaba en `r`, y `notas` no cambia.

El `!` del nombre no lo exige Julia; es un **convenio** para avisar a quien lea el código: esta función cambia sus argumentos. `push!`, `sort!` o `fill!` lo siguen. `sort(v)` sin `!` devuelve un vector nuevo ordenado y deja `v` como estaba. `aprueba_todos!` devuelve `nothing`, el valor que dice «aquí no hay nada», porque su trabajo es el cambio, no un resultado.

### 5 · Las funciones también son valores

:::{tip} Predice
En el capítulo 2 usaste el punto con `sqrt.(notas)`. ¿Funcionará con una función tuya?
:::

```{code-cell} julia
calificacion(nota) = nota >= 5 ? "apto" : "no apto"
notas = [9.0, 4.0, 7.5]
c = calificacion.(notas)
aprobadas = filter(x -> x >= 5, notas)
n = count(x -> x >= 5, notas)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/05-funciones-5.json","config":{"etiqueta":"f.(v) · x -> …","idea":"calificacion.(notas) llama a la función una vez por casilla y junta los resultados en un vector. x -> x >= 5 es una función sin nombre, escrita en el sitio donde se usa.","titulo":"El punto, también para tus funciones"}}
```

El punto que conociste con `sqrt.(notas)` vale para **cualquier** función, también para las tuyas. `calificacion.(notas)` la llama tres veces, una por casilla, y junta los tres textos en un vector. El visualizador enseña las tres llamadas.

`x -> x >= 5` es una **función anónima**: una función sin nombre, escrita en el sitio donde hace falta. Se lee «la función que a cada `x` le hace corresponder `x >= 5`». `filter` se queda con las casillas para las que la función da `true`, y `count` las cuenta. Es lo mismo que `notas[notas .>= 5]` y `count(notas .>= 5)` del capítulo 3, escrito de otra manera.

Que una función se pueda pasar como argumento a otra función, como cualquier número o vector, es una idea con mucho recorrido. La vas a ver por todas partes: `map`, `sort(v; by = …)`, `findfirst(f, v)`…

::::{div}
:class: afondo
### 6 · Un nombre, muchos métodos

En Julia una función puede tener varias versiones según **el tipo** de sus argumentos. Cada versión se llama **método**:

```julia
describe(x::Int) = "un entero"
describe(x::Float64) = "un decimal"
describe(x) = "otra cosa"

describe(3)       # "un entero"
describe(3.0)     # "un decimal"
describe("a")     # "otra cosa"
```

`x::Int` se lee «`x`, que tiene que ser un `Int`». Al llamar a `describe`, Julia mira el tipo de **todos** los argumentos y elige el método más específico que encaja. A eso se le llama **despacho múltiple**, y es la idea central del lenguaje. `methods(describe)` lista los 3 métodos. `methods(+)` lista los de la suma: en Julia 1.13, 190. Sumar enteros, decimales, fracciones o matrices son métodos distintos de la misma función `+`.

Por eso la función `h(x) = 2x` funciona con `3`, con `1.5` y con `1//2`: Julia **compila una versión especializada** para cada tipo la primera vez que la usas. La primera llamada con un tipo nuevo tarda un poco más, porque compila; las siguientes van a la velocidad del código máquina. Lo verás en *Despacho múltiple* y en *Rendimiento*.

### Devolver varios valores

Una función puede devolver una tupla, y quien llama la puede separar en varias variables:

```julia
extremos(v) = (minimum(v), maximum(v))
mn, mx = extremos([6.5, 9.0, 4.0])     # mn = 4.0, mx = 9.0
```

En el fondo sigue devolviendo **un solo** valor, la tupla `(4.0, 9.0)`; lo que pasa es que la asignación la reparte, como hacía el `for (nombre, nota)` con las parejas de `zip`.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Definir | `function f(x) … end` | `def f(x):` | `f <- function(x) {…}` |
| En una línea | `f(x) = 2x` | `def f(x): return 2*x` | `f <- function(x) 2*x` |
| Anónima | `x -> 2x` | `lambda x: 2*x` | `\(x) 2*x` |
| Sin `return` | devuelve la última línea | devuelve `None` | devuelve la última línea |
| Aplicar a cada casilla | `f.(v)` | `[f(x) for x in v]` | `sapply(v, f)` |
| ¿Cambia el vector de fuera? | sí, si cambias casillas (`!`) | sí, si cambias casillas | no: R copia al modificar |

Julia y Python pasan los vectores igual: la función recibe el mismo vector, no una copia. R hace una copia en cuanto la función modifica el vector, así que el de fuera nunca cambia.
:::

## Conexiones

- Con las funciones se cierra la parte I. Ya tienes las cuatro piezas de cualquier programa: valores, colecciones, decisiones y repeticiones, y nombres para trozos de código.
- Los métodos y el despacho múltiple del «A fondo» son el corazón de la parte IV: *El sistema de tipos* y *Despacho múltiple*.
- Que una función reciba el mismo vector y no una copia volverá en *Memoria: copias y vistas*.

## La grieta

Hasta ahora casi todo han sido números. Pero los nombres de los alumnos son **textos**, y un texto también es una colección: de letras. ¿Cómo se saca la inicial de un nombre, se pone en mayúsculas, se cuenta cuántas veces aparece una letra o se parte una frase en palabras? Empieza la parte II con *Cadenas y caracteres*.

## Ejercicios

1. **Al cuadrado.** Define `cuadrado(x) = x^2` y aplícala a `[1, 2, 3]` con el punto. ¿Qué tipo tiene el resultado?

2. **Contar aprobados.** Escribe una función `aprobado(nota)` que devuelva `true` o `false`. Úsala con `count` para saber cuántas notas de `[9.0, 4.0, 7.5, 3.0]` aprueban.

3. **Los extremos.** Escribe `extremos(v)` que devuelva a la vez el mínimo y el máximo de un vector, y guarda los dos en variables distintas con una sola asignación.

4. **Predice.** ¿Qué valen `y` y `x` al final?

   ```julia
   x = 10
   function f()
       x = 1
       return x + 1
   end
   y = f()
   ```

5. **Predice.** ¿Qué vale `w` al final? ¿Qué devuelve `g!(w)`?

   ```julia
   function g!(v)
       push!(v, 0)
   end
   w = [1, 2]
   g!(w)
   ```

6. **Un saludo por defecto.** Define `saluda(nombre = "mundo")` que devuelva `"Hola, "` seguido del nombre. ¿Qué dan `saluda()` y `saluda("Ana")`? Aquí el valor por defecto va sin punto y coma: es un argumento normal, que se da por orden, pero que se puede omitir.

::::{div}
:class: afondo
7. **Factorial recursivo.** Una función puede llamarse a sí misma. Define `fact(n) = n <= 1 ? 1 : n * fact(n - 1)` y calcula `fact(20)` y `fact(21)`. ¿Qué le pasa al segundo? Compáralo con `factorial(21)`, la función de Julia.

8. **Dos métodos.** Define `area(r) = π * r^2` para un círculo y `area(b, h) = b * h` para un rectángulo. ¿Qué dan `area(1.0)` y `area(2, 3)`? ¿Cuántos métodos lista `methods(area)`? ¿Cómo sabe Julia cuál usar?
::::

## Solucionario

1. `cuadrado.([1, 2, 3])` da `[1, 4, 9]`, un `Vector{Int64}`: enteros al cuadrado siguen siendo enteros.
2. `aprobado(nota) = nota >= 5` y `count(aprobado, [9.0, 4.0, 7.5, 3.0])`, que da `2`. Fíjate en que a `count` se le pasa la función sin paréntesis: el nombre, no una llamada.
3. `extremos(v) = (minimum(v), maximum(v))` y `mn, mx = extremos([6.5, 9.0, 4.0])`: `mn = 4.0` y `mx = 9.0`.
4. `y` vale `2` y `x` sigue valiendo `10`. La `x = 1` de dentro de `f` es local.
5. `w` vale `[1, 2, 0]`: `push!` cambia el vector que llega, que es el mismo que `w`. `g!(w)` devuelve lo que devuelve su última línea, `push!(v, 0)`, que es el propio vector: `[1, 2, 0]`.
6. `saluda(nombre = "mundo") = "Hola, $nombre"`. `saluda()` da `"Hola, mundo"` y `saluda("Ana")`, `"Hola, Ana"`.

::::{div}
:class: afondo
7. `fact(20)` da `2432902008176640000`. `fact(21)` da `-4249290049419214848`: el resultado no cabe en un `Int64` y **da la vuelta**, como en el primer capítulo, sin ningún aviso. `factorial(21)`, en cambio, se niega: `OverflowError: 21 is too large to look up in the table; consider using factorial(big(21)) instead`.
8. `area(1.0)` da `3.141592653589793` y `area(2, 3)` da `6`. `methods(area)` lista 2 métodos. Julia elige por el **número** de argumentos (y, en general, por sus tipos): con uno, el del círculo; con dos, el del rectángulo.
::::
