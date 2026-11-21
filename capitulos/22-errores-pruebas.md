---
title: Errores y pruebas
subtitle: Atrapar un error, lanzar uno propio y comprobar con un programa que otro hace lo que debe
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

Los errores han salido en casi todos los capítulos, siempre como final: el `BoundsError` de *Índices, filtros y el punto*, el `KeyError` de *Tuplas y diccionarios*, el `MethodError` de *Despacho múltiple*, el `InexactError` de *Tipos propios*. En *Ecuaciones y optimización* hasta escribiste uno: `condición || error("…")`. Cada vez, Julia se detenía en la línea del error y lo que venía detrás no se ejecutaba. Y la grieta de *Memoria* dejaba la pregunta: ¿se puede seguir?

## La pregunta

¿Se puede **atrapar** un error y seguir? ¿Qué es un error para Julia: un mensaje, o algo más? ¿Cómo lanza una función un error propio, con un texto que diga qué ha ido mal? Y, si un programa puede fallar, ¿cómo se comprueba, con otro programa, que hace lo que debe?

## La idea

Un error es un **valor**, como un número o un vector: tiene un tipo (`ArgumentError`, `KeyError`, `DomainError`…), unos campos con lo que pasó y un texto. Cuando algo sale mal, Julia lo **lanza**: deja lo que estaba haciendo, cierra las llamadas en curso una a una y, si nadie lo atrapa, se detiene y escribe el texto. Un bloque `try … catch` es una red: si el error cae dentro, el `catch` lo atrapa y el programa sigue.

Una función también puede lanzar sus errores, con `throw` o `error`, para avisar de que algo no tiene sentido. Y las **pruebas** usan esa misma maquinaria al revés: `@test` comprueba que algo es verdad y, si no lo es, avisa.

:::{important} El error viaja hacia fuera
Un error sale de la línea donde se produce y atraviesa, de dentro hacia fuera, todas las llamadas en curso, hasta que un `catch` lo atrapa o llega al programa principal y lo detiene. Los visualizadores marcan con borde discontinuo la línea donde saltó el error y enseñan, en un recuadro, el error que ha atrapado cada `catch`.
:::

## Construcción

### 1 · Atrapar un error

:::{tip} Predice
`parse(Float64, "siete")` da un error. ¿Se detendrá el bucle en la tercera vuelta? ¿Cuántas notas habrá al final?
:::

```{code-cell} julia
entrada = ["7.5", "9", "siete", "6"]
notas = Float64[]
for t in entrada
    try
        push!(notas, parse(Float64, t))
    catch
        println("No es un número: ", t)
    end
end
notas
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/22-errores-pruebas-1.json","config":{"etiqueta":"try · catch","idea":"Lo que va entre try y catch se intenta. Si una línea da un error, Julia no se detiene: salta al catch y sigue desde allí. Lo que quedaba del try no se ejecuta.","titulo":"Atrapar un error"}}
```

`parse(Float64, t)` convierte un texto en un número, y con `"siete"` no puede: lanza un `ArgumentError`. Sin el `try`, el programa se detendría ahí, como en los capítulos anteriores. Con él, Julia **intenta** lo que va entre `try` y `catch` y, cuando salta el error, va directa al bloque del `catch`: escribe el aviso y la vuelta termina. El `push!` de esa vuelta no llega a ejecutarse, así que `"siete"` no entra en `notas`. Después, el bucle sigue como si nada: `notas` acaba con tres números.

El visualizador marca con borde discontinuo la línea donde saltó el error (la 5) y enseña el error que ha atrapado el `catch` en un recuadro, con su texto. Fíjate en que el `try` atrapa el error de **cualquier** línea de su bloque: por eso conviene que sea pequeño, solo alrededor de lo que puede fallar.

### 2 · El error es un valor

:::{tip} Predice
`nota_de("Carla")` pide al diccionario una clave que no tiene. ¿Qué crees que guarda `e`? ¿Y `r`, después del último `try`?
:::

```{code-cell} julia
notas = Dict("Ana" => 9.0, "Biel" => 4.5)
function nota_de(nombre)
    try
        return notas[nombre]
    catch e
        if e isa KeyError
            println("No conozco a ", e.key)
            return missing
        end
        rethrow()
    end
end
nota_de("Ana")
nota_de("Carla")
r = try
    sqrt(-4)
catch e
    e
end
typeof(r)
r.val
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/22-errores-pruebas-2.json","config":{"etiqueta":"catch e · isa","idea":"Con catch e, el error queda guardado en e: un valor con su tipo (KeyError, DomainError…) y sus campos. Se puede mirar qué error ha sido y decidir; si no es el esperado, rethrow lo deja seguir.","titulo":"El error es un valor"}}
```

Con `catch e`, el error queda guardado en la variable `e`, una local del `catch`. No es un texto: es un **valor**, un `KeyError`, con un campo, `e.key`, que dice qué clave faltaba. La función lo mira con `isa`: si es un `KeyError`, escribe un aviso y devuelve `missing`, el dato que falta de *Julia como calculadora*. Si fuera otro error, `rethrow()` lo dejaría seguir su camino, como si el `catch` no estuviera: atrapar un error que no esperas esconde los fallos en lugar de arreglarlos.

Fíjate también en la llamada: el error salta dentro de `nota_de`, pero el `try` también está dentro, así que la función sigue y devuelve `missing` con normalidad.

El último `try` se usa como un valor: si `sqrt(-4)` no diera error, `r` valdría la raíz; como lo da, vale lo que da el `catch`, que es el propio error. `typeof(r)` es `DomainError`, el error de pedir algo fuera del dominio de una función, y `r.val` es el número que no se podía usar, `-4.0`. Cada tipo de error tiene sus campos: `ArgumentError` y `ErrorException` tienen `msg`, el texto; `KeyError`, `key`; `DomainError`, `val` y `msg`.

### 3 · Lanzar tus propios errores

:::{tip} Predice
`media(Int[])` y `aprobado(12)` lanzan un error. ¿Cuál de los dos detendrá el programa, y por qué el otro no?
:::

```{code-cell} julia
function media(v)
    if isempty(v)
        throw(ArgumentError("no se puede hacer la media de un vector vacío"))
    end
    return sum(v) / length(v)
end
function aprobado(n)
    0 <= n <= 10 || error("la nota $n no está entre 0 y 10")
    return n >= 5
end
media([6, 8, 10])
try
    media(Int[])
catch e
    println("Aviso: ", e.msg)
end
aprobado(7.5)
aprobado(12)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/22-errores-pruebas-3.json","config":{"etiqueta":"throw · error","idea":"Una función puede lanzar su propio error, con throw y un tipo de error de Julia, o con error y un texto. Quien la llama decide: atraparlo o dejar que detenga el programa.","titulo":"Lanzar tus propios errores"}}
```

`media` no puede hacer la media de un vector vacío (sería `0 / 0`), así que lo dice: `throw(ArgumentError("…"))` crea un error de tipo `ArgumentError`, el de los argumentos que no valen, y lo **lanza**. La función se interrumpe ahí, como con cualquier error de Julia. Como la llamada está dentro de un `try`, el `catch` lo atrapa y escribe el texto, `e.msg`.

`aprobado` usa la forma corta de *Ecuaciones y optimización*: `condición || error("…")`. Si la nota está entre 0 y 10, el `||` no mira lo de la derecha; si no, `error` lanza un `ErrorException` con el texto. Con 7.5 todo va bien; con 12 salta el error, y como esa llamada no está dentro de ningún `try`, el error llega al programa principal y lo detiene: el visualizador enseña la llamada `aprobado(n = 12)`, donde ocurrió.

¿Cuál elegir? `error("…")` es lo más rápido de escribir. `throw` con un tipo de error dice además **qué clase** de problema es: `ArgumentError` para un argumento que no vale, `DomainError` para un número fuera de lo que la función acepta, `KeyError` para una clave que no está. Quien atrapa el error puede preguntar por el tipo, como en la sección 2, y tratar cada caso a su manera.

### 4 · Un tipo de error propio

:::{tip} Predice
La nota 11.0 no vale. ¿Qué se escribirá en esa vuelta, y en qué orden? ¿Se escribirá «Revisada: 11.0»?
:::

```{code-cell} julia
struct NotaFuera <: Exception
    nota::Float64
end
Base.showerror(io::IO, e::NotaFuera) = print(io, "NotaFuera: ", e.nota, " no está entre 0 y 10")
function registra!(notas, n)
    0 <= n <= 10 || throw(NotaFuera(n))
    push!(notas, n)
    return nothing
end
notas = Float64[]
for n in [7.5, 11.0, 9.0]
    try
        registra!(notas, n)
    catch e
        println("Descartada: ", e.nota)
    finally
        println("Revisada: ", n)
    end
end
notas
registra!(notas, -1.0)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/22-errores-pruebas-4.json","config":{"etiqueta":"<: Exception · finally","idea":"Un tipo propio que es subtipo de Exception se puede lanzar como un error, con sus campos y su forma de escribirse. El bloque finally se ejecuta siempre, haya error o no.","titulo":"Un tipo de error propio"}}
```

`NotaFuera` es un tipo propio, como los de *Tipos propios*, pero con `<: Exception`: es un subtipo de `Exception`, el tipo abstracto del que cuelgan todos los errores de Julia (*El sistema de tipos*). Eso es lo que permite lanzarlo con `throw`. Guarda en su campo la nota que no valía, para que quien lo atrape sepa cuál fue: `e.nota`.

La línea de `Base.showerror` le dice a Julia cómo **escribir** ese error. Es un método nuevo para una función de Julia, como los métodos de `+` de *Despacho múltiple*, y el programa nunca lo llama: lo llama Julia cuando tiene que enseñar el error. Sin él, Julia escribiría `NotaFuera(-1.0)`.

El bloque `finally` se ejecuta **siempre** al salir del `try`: con 7.5, después del `try`; con 11.0, después del `catch`; y se ejecutaría también si el error siguiera su camino. Por eso «Revisada» sale en las tres vueltas, y la de 11.0 después de «Descartada». Sirve para dejar las cosas en orden pase lo que pase: cerrar un archivo, apagar un aparato, devolver algo que se tomó prestado.

La última línea no tiene `try`: el error `NotaFuera` detiene el programa, y Julia lo escribe con el texto de `showerror`.

### 5 · Pruebas que comprueban por ti

:::{tip} Predice
Las cuatro pruebas parecen correctas. ¿Pasarán todas? Piensa en la última: ¿cuánto da `(0.1 + 0.2) / 2` en un ordenador?
:::

```{code-cell} julia
using Test
function media(v)
    isempty(v) && throw(ArgumentError("vector vacío"))
    return sum(v) / length(v)
end
@test media([6, 8, 10]) == 8
@test media([7]) == 7
@test_throws ArgumentError media(Int[])
@test media([0.1, 0.2]) == 0.15
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/22-errores-pruebas-5.json","config":{"etiqueta":"@test · @test_throws","idea":"@test comprueba que algo es verdad, y @test_throws que algo lanza un error. Si todo va bien, Julia escribe «Test Passed»; si no, explica qué ha fallado y se detiene.","titulo":"Pruebas que comprueban por ti"}}
```

`using Test` carga la biblioteca de pruebas de Julia, que viene con el lenguaje. `@test` es una macro (*Metaprogramación*): recibe el código `media([6, 8, 10]) == 8`, lo ejecuta y comprueba que da `true`. Si es así, escribe `Test Passed` y el programa sigue. `@test_throws ArgumentError media(Int[])` comprueba lo contrario: que la llamada **lanza** un error, y de ese tipo. La prueba pasa porque el error salta, y Julia escribe debajo el tipo que se lanzó (`Thrown`).

La última prueba falla, y no por un error del programa: `0.1 + 0.2` no es exactamente `0.3` en un ordenador (*Julia como calculadora*), y la media sale `0.15000000000000002`. Como `@test` es una macro, tiene el código además del resultado, y por eso puede explicar el fallo: escribe la expresión (`Expression`) y, debajo, los valores con los que se calculó (`Evaluated`). Después lanza un error, `There was an error during testing`, que detiene el programa. Para comparar decimales, la prueba buena es `≈`, que admite una diferencia muy pequeña: `@test media([0.1, 0.2]) ≈ 0.15` pasa.

Una prueba es un programa que comprueba otro programa. Escritas una vez, se pueden ejecutar cada vez que cambias algo: si un arreglo estropea otra cosa, una prueba lo dirá enseguida, sin tener que acordarte de comprobarlo a mano.

::::{div}
:class: afondo
### 6 · Errores y pruebas, a fondo

**El árbol de los errores.** Todos los errores de Julia son subtipos de `Exception`: con Julia 1.13 y `Test` cargado, `subtypes(Exception)` (de `InteractiveUtils`) da 63. Un `catch e` sin preguntar por el tipo los atrapa todos, también los que no esperabas, como un nombre mal escrito (`UndefVarError`). Por eso es buena costumbre mirar el tipo y usar `rethrow()` para los demás.

**`@assert`.** `@assert condición "mensaje"` lanza un `AssertionError` si la condición es falsa: `@assert 1 == 2` da `AssertionError: 1 == 2`. Sirve para comprobar algo que *debería* ser cierto siempre, no para validar lo que escribe el usuario: el manual avisa de que, en algunos modos, Julia puede no ejecutarlos. Para validar, `throw` o `error`.

**Un error cuesta.** Lanzar y atrapar un error es lento comparado con un `if`. En el ordenador de pruebas, convertir 100 000 veces el texto `"x"` con `parse` dentro de un `try` tardó 0,42 s; con `tryparse`, que devuelve `nothing` en lugar de lanzar un error, 0,0014 s, unas 300 veces menos. Si fallar es lo normal (leer lo que escribe alguien, por ejemplo), mejor una función que avise con un valor: `tryparse(Int, "doce")` da `nothing`.

**Dónde pasó.** Fuera del visualizador, Julia escribe tras el error el **camino de llamadas** (*stacktrace*): la línea donde falló y cada llamada que llevó hasta ella, de dentro hacia fuera. Dentro de un `catch`, `catch_backtrace()` lo da como un valor.

**`@testset`.** Las pruebas de verdad se agrupan en un `@testset "nombre" begin … end`. Dentro, una prueba que falla no detiene las demás: al final, Julia escribe un resumen (`Test Summary: | Pass  Fail  Total`, con `2  1  3`) y solo entonces lanza el error `Some tests did not pass: 2 passed, 1 failed, 0 errored, 0 broken.`. El resumen lleva además el tiempo que tardaron las pruebas (con `showtiming = false` no lo escribe). `@test x ≈ y atol = 0.001` fija cuánta diferencia se admite.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio, con los mismos pasos que en Julia: `try`, `catch` con y sin variable, `else`, `finally`, `throw`, `error`, `rethrow`, los errores de Julia como valores (`ArgumentError`, `ErrorException`, `KeyError`, `DomainError`, `OverflowError`, `DimensionMismatch`, `DivideError`, con sus campos), los tipos de error propios con su `Base.showerror`, y `@test` y `@test_throws`. Lo que no sabe hacer te lo dice y te manda a la nube: guardar en una variable un error que aún no sabe convertir en valor (un `BoundsError`, un `MethodError`…), un `return` o un `break` dentro de un `try` con `finally`, `@testset`, `@assert`, y las pruebas cuyo informe lleva el camino de llamadas (una prueba que da un error, o un `@test_throws` que recibe otro tipo de error).
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Atrapar | `try … catch e … end` | `try: … except ValueError as e: …` | `tryCatch(…, error = function(e) …)` |
| Siempre al salir | `finally` | `finally:` | `finally = …` |
| Lanzar | `throw(ArgumentError("…"))`, `error("…")` | `raise ValueError("…")` | `stop("…")` |
| El texto | `e.msg` | `str(e)` | `conditionMessage(e)` |
| Un error propio | `struct NotaFuera <: Exception … end` | `class NotaFuera(Exception): …` | `structure(class = c("notaFuera", "error", "condition"), …)` |
| `"siete"` como número | `parse(Float64, "siete")`: `ArgumentError` | `float("siete")`: `ValueError` | `as.numeric("siete")`: `NA` y un aviso |
| Pruebas | `@test`, `@test_throws` (Test) | `assert`, `pytest`, `unittest` | `expect_equal`, `expect_error` (testthat) |

Python funciona casi igual, con otras palabras: `except` en lugar de `catch` y `raise` en lugar de `throw`, y la elección del tipo va en la misma línea (`except ValueError`). R separa los errores de los **avisos**: convertir `"siete"` no detiene el programa, da `NA` y escribe «NAs introduced by coercion». Comprobado con Python 3.13, R 4.3.3 y testthat 3.2.1.
:::

## Conexiones

- Los errores de capítulos anteriores, como el `BoundsError` de *Índices*, el `KeyError` de *Tuplas y diccionarios* o el `DomainError` de `sqrt`, son valores con su tipo, que un `catch` puede atrapar y mirar.
- `condición || error("…")`, de *Ecuaciones y optimización*, es la forma más corta de lanzar un error.
- Los tipos de error cuelgan de `Exception` en el árbol de *El sistema de tipos*, y un tipo de error propio es un `struct` de *Tipos propios*.
- `Base.showerror` es un método nuevo para una función de Julia, como los de `+` en *Despacho múltiple*.
- `@test` es una macro de *Metaprogramación*: tiene el código, y por eso puede escribir la expresión que ha fallado.
- `0.1 + 0.2`, de *Julia como calculadora*, es la razón de comparar decimales con `≈` en las pruebas.

## La grieta

`using Test` ha cargado una biblioteca que viene con Julia. Las de los otros capítulos, `DataFrames` o `Plots`, había que instalarlas antes. ¿Dónde se instalan los paquetes, y cómo sabe Julia qué versión de cada uno usar? Si compartes un programa, ¿cómo se asegura quien lo recibe de tener los mismos paquetes, en las mismas versiones? Y las pruebas de un paquete, ¿dónde viven y quién las ejecuta? Es el capítulo siguiente: *Entornos y paquetes*.

## Ejercicios

1. **Dos intentos.** ¿Qué escribe Julia con `try sqrt(-1) catch; 0.0 end`? ¿Y con `try sqrt(4) catch; 0.0 end`? ¿Por qué no dan lo mismo?

2. **Mirar el error.** Escribe `r = try parse(Int, "3.5") catch e e end`. ¿De qué tipo es `r`? ¿Qué dice `r.msg`?

3. **Tu primer throw.** Escribe una función `raiz(x)` que lance `DomainError(x, "no hay raíz real")` si `x` es negativo y devuelva `sqrt(x)` si no. ¿Qué texto escribe Julia con `raiz(-9)`?

4. **Predice.** ¿Qué escribe este programa, y en qué orden?

   ```julia
   try
       println("a")
       error("b")
       println("c")
   catch e
       println(e.msg)
   finally
       println("d")
   end
   ```

5. **Sin tiza.** Define un tipo de error `SinStock <: Exception` con un campo `producto::String`, y un `Base.showerror` que escriba `SinStock: no queda` seguido del producto. ¿Qué escribe Julia con `throw(SinStock("tiza"))`?

6. **Arregla la prueba.** Cambia la última prueba de la sección 5 para que pase sin tocar la función `media`.

::::{div}
:class: afondo
7. **Sin try.** Reescribe la sección 1 sin `try`, con `tryparse`: `tryparse(Float64, t)` da el número o `nothing`. ¿Qué queda en `notas`? ¿Por qué esta versión es mejor cuando fallar es lo normal?

8. **Un conjunto de pruebas.** En la nube o en tu ordenador, junta las pruebas de la sección 5 (sin `@test_throws`) en un `@testset "media" showtiming = false begin … end`. ¿Qué escribe Julia? ¿Se ejecutan todas las pruebas, aunque una falle?
::::

## Solucionario

1. La primera da `0.0` y la segunda `2.0`. Un `try` usado como valor da lo que da su bloque si todo va bien, y lo que da el `catch` si salta un error: `sqrt(-1)` lanza un `DomainError` y vale lo del `catch`; `sqrt(4)` no, y vale la raíz.
2. `r` es un `ArgumentError`, y `r.msg` es `invalid base 10 digit '.' in "3.5"`: `parse(Int, …)` no acepta el punto, porque un entero no tiene decimales.
3. Una forma:

   ```julia
   function raiz(x)
       x < 0 && throw(DomainError(x, "no hay raíz real"))
       return sqrt(x)
   end
   ```

   Con `raiz(-9)`, Julia escribe `DomainError with -9:` y, en la línea siguiente, `no hay raíz real`.
4. `a`, `b` y `d`, en ese orden. `error("b")` interrumpe el `try`, así que `c` no se escribe; el `catch` escribe el texto del error, `b`, y el `finally` se ejecuta al final, como siempre.
5. Una forma:

   ```julia
   struct SinStock <: Exception
       producto::String
   end
   Base.showerror(io::IO, e::SinStock) = print(io, "SinStock: no queda ", e.producto)
   ```

   `throw(SinStock("tiza"))` detiene el programa con `SinStock: no queda tiza`.
6. `@test media([0.1, 0.2]) ≈ 0.15`. `≈` compara admitiendo una diferencia muy pequeña, la que dejan los decimales del ordenador, y la prueba pasa.

::::{div}
:class: afondo
7. Una forma:

   ```julia
   entrada = ["7.5", "9", "siete", "6"]
   notas = Float64[]
   for t in entrada
       n = tryparse(Float64, t)
       if n === nothing
           println("No es un número: ", t)
       else
           push!(notas, n)
       end
   end
   notas
   ```

   `notas` queda igual, `[7.5, 9.0, 6.0]`. Es mejor porque no lanza ni atrapa ningún error, que es lento (unas 300 veces más en el ordenador de pruebas), y porque deja claro qué es lo que se espera que falle.
8. Julia escribe el fallo de la tercera prueba (con su `Expression` y su `Evaluated`), después el resumen, `Test Summary: | Pass  Fail  Total` con `media | 2  1  3`, y lanza el error `Some tests did not pass: 2 passed, 1 failed, 0 errored, 0 broken.`. Sí: dentro de un `@testset`, una prueba que falla no detiene las demás, que se ejecutan todas; el error llega al final, con la cuenta.
::::
