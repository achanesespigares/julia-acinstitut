---
title: "Proyecto 2 · Un derivador para el aula"
subtitle: Un paquete que deriva como en clase, regla a regla, y comprueba si un alumno ha derivado bien
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En clase, derivar es aplicar reglas: la derivada de una suma es la suma de las derivadas, la de un producto sigue la regla del producto, la de `sin(x²)` pide la regla de la cadena. Son reglas mecánicas, y por eso las puede aplicar un programa. Desde el capítulo 20 sabemos que, para Julia, una expresión como `:(x^2 + 3x + 1)` no es un texto sino un árbol (una `Expr`), con una cabeza y unos argumentos que un programa puede recorrer y construir. Y desde el capítulo 18, que una función puede tener un método distinto para cada tipo.

En este proyecto juntamos las dos cosas y construimos, desde cero, un pequeño **paquete** que deriva. Y le damos un uso de aula: comprobar si la derivada que ha escrito un alumno es correcta, la escriba como la escriba.

## La pregunta

¿Cómo deriva un programa? ¿Cómo convierte las reglas de la pizarra en código? Y una vez que sabe derivar, ¿cómo decide si `cos(2x) * 2` y `2 * cos(2x)`, que son árboles distintos, son la misma derivada?

## El plan

Esta vez el proyecto es un **paquete** de Julia (capítulo 23), creado con `Pkg.generate`:

```text
Derivadas/
├─ Project.toml          el nombre, el identificador, la versión y las dependencias
├─ src/
│  └─ Derivadas.jl       el módulo: deriva, simplifica, valor, comprueba
├─ test/
│  └─ runtests.jl        las pruebas, escritas antes que el código
└─ cuaderno.jl           un cuaderno de Pluto para usar en clase
```

Se avanza en cinco pasos: los **dos casos fáciles**, un número y una variable, con dos métodos (capítulos 18 y 20); las **reglas** de la suma, el producto y la potencia, que construyen árboles nuevos; **simplificar** lo que sale; la **regla de la cadena**, con `sin`, `cos`, `exp` y `log`; y **comprobar** la respuesta de un alumno calculando en vez de comparar árboles. En el «A fondo», el paquete de verdad, con las pruebas escritas primero.

:::{important} Un método por cada tipo de nodo
El árbol de una expresión tiene tres tipos de piezas: números (`3`), símbolos (`:x`) y expresiones (`:(3x)`), que a su vez contienen piezas. `deriva` tiene un método para cada tipo, y el de las expresiones se llama a sí mismo con sus piezas. Es la recursión del capítulo 5 y el despacho múltiple del capítulo 18, trabajando juntos sobre el árbol del capítulo 20.
:::

El paquete entero se puede descargar: [Derivadas.zip](https://achanesespigares.github.io/julia-acinstitut/datos/proyectos/Derivadas.zip).

## Construcción

### 1 · Los dos casos fáciles

`:(x^2 + 3x + 1)` es una `Expr` cuyo primer argumento es la operación, `:+`, y los demás son los tres sumandos: `:(x ^ 2)` y `:(3x)`, que son a su vez expresiones, y el número `1`. Las hojas del árbol son números o símbolos, y sus derivadas son las más fáciles: la de un número es 0, y la de un símbolo es 1 si es la variable y 0 si es otra letra.

:::{tip} Predice
¿Qué devolverán `deriva(7, :x)`, `deriva(:x, :x)` y `deriva(:y, :x)`? ¿Qué método elige Julia en cada caso?
:::

```{code-cell} julia
ex = :(x^2 + 3x + 1)
ex.args
deriva(c::Number, x) = 0
deriva(s::Symbol, x) = s == x ? 1 : 0
deriva(7, :x)
deriva(:x, :x)
deriva(:y, :x)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/27-proyecto-derivadas-1.json","config":{"etiqueta":"dos métodos","idea":"ex es un árbol: la cabeza :call, la operación :+ y tres sumandos. deriva tiene un método para los números y otro para los símbolos, y Julia elige uno u otro según el tipo de lo que recibe.","titulo":"Las hojas del árbol"}}
```

`ex.args` es un `Vector{Any}` con cuatro piezas: el símbolo `:+`, dos expresiones y un número. `deriva(7, :x)` usa el método de los números y da 0; `deriva(:x, :x)` usa el de los símbolos y da 1; `deriva(:y, :x)`, también el de los símbolos, da 0, porque para derivar respecto de `x` la `y` es una constante.

Falta el tercer tipo: las expresiones. Ahí está todo el trabajo.

### 2 · Las reglas

Para derivar una expresión, `deriva` mira su operación, `ex.args[1]`, y aplica la regla que toca. Cada regla **construye una expresión nueva** con `:( … )` y `$` (capítulo 20), y llama a `deriva` con las piezas:

- **Suma**: la derivada de `a + b + c` es `a' + b' + c'`.
- **Producto**: la de `a * b` es `a' * b + a * b'`.
- **Potencia** con un exponente fijo: la de `a ^ n` es `n * a ^ (n - 1) * a'`. Ese último `a'` es la regla de la cadena: si `a` es solo `x`, vale 1.

:::{tip} Predice
¿Qué devolverá `deriva(:(x^2 + 3x + 1), :x)`? ¿Será `2x + 3`, tal cual? ¿Y qué pasará con `sin(x)`?
:::

```{code-cell} julia
deriva(c::Number, x) = 0
deriva(s::Symbol, x) = s == x ? 1 : 0
function deriva(ex::Expr, x)
    op = ex.args[1]
    a = ex.args[2]
    if op == :+
        r = deriva(a, x)
        for b in ex.args[3:end]
            r = :($r + $(deriva(b, x)))
        end
        return r
    elseif op == :*
        b = ex.args[3]
        return :($(deriva(a, x)) * $b + $a * $(deriva(b, x)))
    elseif op == :^
        n = ex.args[3]
        return :($n * $a ^ ($n - 1) * $(deriva(a, x)))
    end
    error("no sé derivar $op")
end
d = deriva(:(x^2 + 3x + 1), :x)
deriva(:(sin(x)), :x)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/27-proyecto-derivadas-2.json","config":{"etiqueta":"recursión","idea":"Para la suma, deriva se llama a sí misma con cada sumando: la potencia, el producto y el número. Cada regla construye un árbol nuevo con $. El resultado es correcto, pero está lleno de unos y ceros. Y sin no tiene regla: error.","titulo":"Regla a regla"}}
```

El resultado es `(2 * x ^ (2 - 1) * 1 + (0 * x + 3 * 1)) + 0`. Es **correcto**: si lo simplificas a mano, da `2x + 3`. Pero el programa ha aplicado las reglas al pie de la letra, sin pensar: la derivada de `x` dentro de la potencia (el `* 1`), la del 3 en `3x` (el `0 * x`), la del 1 final (el `+ 0`). Es lo que haría un alumno que aplica las reglas sin mirar el resultado.

Y `sin(x)` da el error que hemos escrito, `no sé derivar sin`: el programa solo sabe las reglas que le hemos enseñado. Las dos cosas se arreglan en las secciones 3 y 4.

### 3 · Simplificar

`simplifica` recorre el árbol desde las hojas hacia arriba, como `deriva`, y en cada nodo quita lo que sobra:

- si todos los argumentos son números, hace la cuenta con `eval` (capítulo 20): `2 - 1` es `1`, y `3 * 1` es `3`;
- en una suma, quita los ceros; en un producto, si hay un cero, todo es cero, y si no, quita los unos;
- `a ^ 1` es `a`;
- una suma o un producto que se queda con un solo argumento es ese argumento.

:::{tip} Predice
Aplicada a la derivada de la sección 2, ¿dará `simplifica` exactamente `2x + 3`? ¿En qué orden irán desapareciendo los unos y los ceros?
:::

```{code-cell} julia
simplifica(e) = e
function simplifica(ex::Expr)
    op = ex.args[1]
    args = [simplifica(a) for a in ex.args[2:end]]
    if all(a -> a isa Number, args)
        return eval(Expr(:call, op, args...))
    end
    if op == :+
        args = filter(a -> a != 0, args)
    elseif op == :*
        if any(a -> a == 0, args)
            return 0
        end
        args = filter(a -> a != 1, args)
    elseif op == :^ && args[2] == 1
        return args[1]
    end
    if (op == :+ || op == :*) && length(args) == 1
        return args[1]
    end
    return Expr(:call, op, args...)
end
d = :((2 * x ^ (2 - 1) * 1 + (0 * x + 3 * 1)) + 0)
simplifica(d)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/27-proyecto-derivadas-3.json","config":{"etiqueta":"simplificar","idea":"simplifica baja primero hasta las hojas, que se quedan como están, y al volver hacia arriba limpia cada nodo: 2 - 1 se calcula, x ^ 1 se queda en x, 0 * x se anula, los unos y los ceros desaparecen. Al final queda 2x + 3.","titulo":"De las hojas a la raíz"}}
```

Sale `2x + 3`. Julia escribe `2x` y no `2 * x` porque así escribe un producto de un número por un símbolo (capítulo 20). `simplifica(e) = e` es el método para todo lo que no es una expresión: los números y los símbolos ya están simplificados.

`simplifica` sabe poco álgebra. No sabe que `x + x` es `2x`, ni que `(1 / x) * x` es 1: la derivada de `2 * x * x` le queda en `2 * (x + x)`. Simplificar del todo es muy difícil, y los programas de cálculo simbólico llevan décadas haciéndolo. Para nuestro uso basta con esto, porque en la sección 5 no compararemos árboles.

### 4 · La regla de la cadena

Para las funciones, la regla es siempre la misma: la derivada de `f(a)` es `f'(a) · a'`. Solo cambia `f'`:

- `sin(a)` → `cos(a) * a'`
- `cos(a)` → `-(sin(a)) * a'`
- `exp(a)` → `exp(a) * a'`
- `log(a)` → `a' / a`

El factor `a'` es la llamada a `deriva` con lo de dentro. Es la regla de la cadena, y es la recursión la que la aplica a cualquier profundidad: `sin(exp(x^2))` funciona sin escribir nada más.

:::{tip} Predice
¿Qué darán, ya simplificadas, las derivadas de `sin(x^2)` y de `exp(3x)`? ¿Dónde aparecerá el `2x`, y dónde el 3?
:::

```{code-cell} julia
deriva(c::Number, x) = 0
deriva(s::Symbol, x) = s == x ? 1 : 0
function deriva(ex::Expr, x)
    op = ex.args[1]
    a = ex.args[2]
    if op == :*
        b = ex.args[3]
        return :($(deriva(a, x)) * $b + $a * $(deriva(b, x)))
    elseif op == :^
        n = ex.args[3]
        return :($n * $a ^ ($n - 1) * $(deriva(a, x)))
    elseif op == :sin
        return :(cos($a) * $(deriva(a, x)))
    elseif op == :cos
        return :(-(sin($a)) * $(deriva(a, x)))
    elseif op == :exp
        return :(exp($a) * $(deriva(a, x)))
    elseif op == :log
        return :($(deriva(a, x)) / $a)
    end
    error("no sé derivar $op")
end
simplifica(e) = e
function simplifica(ex::Expr)
    op = ex.args[1]
    args = [simplifica(a) for a in ex.args[2:end]]
    if all(a -> a isa Number, args)
        return eval(Expr(:call, op, args...))
    end
    if op == :*
        if any(a -> a == 0, args)
            return 0
        end
        args = filter(a -> a != 1, args)
    elseif op == :^ && args[2] == 1
        return args[1]
    end
    if op == :* && length(args) == 1
        return args[1]
    end
    return Expr(:call, op, args...)
end
d = deriva(:(sin(x^2)), :x)
simplifica(d)
simplifica(deriva(:(exp(3x)), :x))
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/27-proyecto-derivadas-4.json","config":{"etiqueta":"regla de la cadena","idea":"Para sin(x ^ 2), deriva escribe cos(x ^ 2) y multiplica por la derivada de lo de dentro, que pide otra llamada: la de la potencia. Después, simplifica limpia el resultado: cos(x ^ 2) * (2x).","titulo":"De fuera hacia dentro"}}
```

La derivada de `sin(x^2)` sale `cos(x ^ 2) * (2 * x ^ (2 - 1) * 1)`, y simplificada, `cos(x ^ 2) * (2x)`. La de `exp(3x)`, `exp(3x) * 3`. Es lo mismo que darían en clase, escrito en otro orden: `2x · cos(x²)` y `3e^(3x)`.

En el paquete, `deriva` junta todas las reglas en un solo método para `Expr`, y añade la resta, la división y el producto de más de dos factores. Lo que no sabe, como `tan`, sigue dando el error `no sé derivar tan`, y hay una prueba que lo comprueba.

### 5 · Comprobar a un alumno

Un alumno deriva `sin(2x)` y escribe `2 * cos(2x)`. Nuestro programa daría `cos(2x) * 2`. ¿Está bien? Como árboles son distintos, y `==` compara árboles. Y no sirve simplificar más: hay infinitas formas correctas de escribir una derivada. La idea es otra: **calcular**. Si dos expresiones valen lo mismo en varios puntos, casi seguro que son la misma función. `valor` calcula cuánto vale una expresión para un valor de `x`, recorriendo el árbol como `deriva`, y `comprueba` compara en tres puntos, 0,5, 1,5 y 2,5, con `≈` (capítulo 22).

:::{tip} Predice
¿Qué dará `:(2 * cos(2x)) == :(cos(2x) * 2)`? ¿Y qué dirá `comprueba` de `2 * cos(2x)` y de `cos(2x)` como derivadas de `sin(2x)`?
:::

```{code-cell} julia
deriva(c::Number, x) = 0
deriva(s::Symbol, x) = s == x ? 1 : 0
function deriva(ex::Expr, x)
    op = ex.args[1]
    a = ex.args[2]
    if op == :*
        b = ex.args[3]
        return :($(deriva(a, x)) * $b + $a * $(deriva(b, x)))
    elseif op == :sin
        return :(cos($a) * $(deriva(a, x)))
    end
    error("no sé derivar $op")
end
valor(c::Number, x, v) = c
valor(s::Symbol, x, v) = s == x ? v : error("no sé cuánto vale $s")
function valor(ex::Expr, x, v)
    op = ex.args[1]
    a = [valor(b, x, v) for b in ex.args[2:end]]
    if op == :+
        return sum(a)
    elseif op == :*
        return prod(a)
    elseif op == :sin
        return sin(a[1])
    elseif op == :cos
        return cos(a[1])
    end
    error("no sé calcular $op")
end
function comprueba(respuesta, ex, x)
    d = deriva(ex, x)
    for v in [0.5, 1.5, 2.5]
        if !(valor(respuesta, x, v) ≈ valor(d, x, v))
            return false
        end
    end
    return true
end
:(2 * cos(2x)) == :(cos(2x) * 2)
comprueba(:(2 * cos(2x)), :(sin(2x)), :x)
comprueba(:(cos(2x)), :(sin(2x)), :x)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/27-proyecto-derivadas-5.json","config":{"etiqueta":"comprobar","idea":"Los dos árboles son distintos, y == lo dice. comprueba calcula la respuesta del alumno y la derivada en tres puntos: 2 * cos(2x) coincide en los tres; cos(2x), al que le falta el 2 de la regla de la cadena, falla en el primero.","titulo":"Calcular en vez de comparar"}}
```

`==` dice `false`: los árboles son distintos. Pero `comprueba` acepta `2 * cos(2x)`, porque vale lo mismo que la derivada en los tres puntos. Y rechaza `cos(2x)` en cuanto calcula el primero: para `x = 0,5`, la respuesta vale `cos(1) ≈ 0,54` y la derivada, `2 cos(1) ≈ 1,08`. Es el error más típico con la regla de la cadena: olvidar la derivada de lo de dentro.

Comprobar en unos pocos puntos no es una demostración. Una respuesta mala que coincidiera con la buena justo en 0,5, 1,5 y 2,5 pasaría. Lo veremos en el ejercicio 8, y por qué en la práctica se usan puntos al azar.

Para usarlo en clase, el cuaderno de Pluto del paquete tiene dos casillas de texto, la función y la derivada del alumno, y dice si es correcta sin enseñar la solución, que se puede ver marcando una casilla. Sus celdas:

```julia
begin
    using PlutoUI
    include(joinpath(@__DIR__, "src", "Derivadas.jl"))
    using .Derivadas
end

md"""Función: $(@bind funcion TextField(default = "sin(2x)"))"""

md"""Tu derivada: $(@bind respuesta TextField(default = "cos(2x)"))"""

ex = Meta.parse(funcion)

if comprueba(Meta.parse(respuesta), ex, :x)
    md"✓ **Correcta.**"
else
    md"✗ **Todavía no.** Revisa la regla de la cadena y los signos."
end

md"""
¿Quieres ver la solución? $(@bind ver CheckBox())
"""

ver ? simplifica(deriva(ex, :x)) : md""
```

`Meta.parse` (capítulo 20) convierte lo que escribe el alumno, un texto, en la expresión que `comprueba` necesita. Cada vez que cambia una casilla, Pluto recalcula solo las celdas que dependen de ella (capítulo 24).

::::{div}
:class: afondo
### 6 · El paquete, a fondo

**Crear el paquete.** `Pkg.generate("Derivadas")` crea la carpeta con dos archivos: un `Project.toml` con el nombre, un identificador único (`uuid`), la versión `0.1.0` y el autor, y un `src/Derivadas.jl` con un módulo de ejemplo (en Julia 1.13, con dos funciones, `hello` y `domath`). Sustituimos el ejemplo por nuestro módulo y añadimos `Test` como dependencia solo para las pruebas:

```toml
name = "Derivadas"
uuid = "5b927f00-379d-4d71-8dd8-7ab8d01f5687"
version = "0.1.0"
authors = ["Antonio Chanes Espigares"]

[compat]
julia = "1.13"

[extras]
Test = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[targets]
test = ["Test"]
```

**Las pruebas, primero.** Antes de escribir `deriva`, escribimos lo que tiene que hacer, en `test/runtests.jl`, con tres `@testset`: `deriva` (seis pruebas, entre ellas `simplifica(deriva(:(x^2 + 3x + 1), :x)) == :(2x + 3)` y `@test_throws ErrorException deriva(:(tan(x)), :x)`), `simplifica` (cuatro) y `comprueba` (cinco, dos de ellas con respuestas que tienen que fallar). Con el módulo de ejemplo, `Pkg.test()` falla, como debe:

```text
Test Summary: | Fail  Error  Total  Time
deriva        |    1      5      6  2.4s
ERROR: Package Derivadas errored during testing
```

Cinco errores, porque `deriva` y `simplifica` no existen (`UndefVarError`), y un fallo, porque `@test_throws` esperaba un `ErrorException` y salió otro error. La primera versión del módulo pasó cinco de las seis de `deriva` y encontró un fallo de verdad: `simplifica(deriva(:(sin(x^2)), :x))` daba `x ^ 2 * (2x)`. Había perdido el `cos`. La regla «una operación con un solo argumento es ese argumento» estaba pensada para una suma o un producto que se quedan sin compañeros, pero también se aplicaba a `cos(x ^ 2)`, que tiene un solo argumento siempre. Arreglada la regla, con `(op == :+ || op == :*)`:

```text
Test Summary: | Pass  Total  Time
deriva        |    6      6  0.5s
Test Summary: | Pass  Total  Time
simplifica    |    4      4  0.0s
Test Summary: | Pass  Total  Time
comprueba     |    5      5  0.5s
     Testing Derivadas tests passed
```

Sin la prueba, ese fallo habría llegado al aula.

**Usarlo.** Desde la carpeta del paquete, `julia --project=.` y `using Derivadas` lo cargan. Desde otro proyecto, `Pkg.develop(path = "ruta/a/Derivadas")` lo añade como dependencia sin publicarlo. Para que cualquiera pudiera escribir `Pkg.add("Derivadas")`, habría que subirlo a GitHub y registrarlo en el registro General (capítulo 23), que pide, entre otras cosas, que el nombre no se confunda con otro paquete.

**Los paquetes de verdad.** Symbolics.jl deriva expresiones con `expand_derivatives(Differential(x)(sin(x^2)))` y sabe mucho más álgebra que `simplifica`. Y para derivar numéricamente, sin árboles, ForwardDiff (capítulo 14) usa **números duales**: un número que lleva su valor y su derivada a la vez, y un método de `+`, `*`, `sin`… para ellos. Otra vez despacho múltiple: el mismo código de la función, con otro tipo de número, calcula la derivada.

**Lo que no hace.** `simplifica` no junta términos (`x + x`), no saca factor común y no sabe que `(1 / x) * x` es 1. `deriva` no sabe derivar `x ^ x`, donde el exponente también depende de `x`, ni `tan`. Y `valor` no puede calcular expresiones con otras letras, como `a * x`. Cada cosa es un ejercicio.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso

Derivar `sin(x²)`, `x² + 3x + 1` y `x + x`, comprobado en los tres lenguajes:

| | Julia (Symbolics 7.49) | Python (SymPy 1.14) | R (`D`, de serie) |
|---|---|---|---|
| Cómo | `expand_derivatives(Differential(x)(sin(x^2)))` | `diff(sin(x**2), x)` | `D(quote(sin(x^2)), "x")` |
| `sin(x²)` | `2cos(x^2)*x` | `2*x*cos(x**2)` | `cos(x^2) * (2 * x)` |
| `x² + 3x + 1` | `3 + 2x` | `2*x + 3` | `2 * x + 3` |
| `x + x` | `2` | `2` | `1 + 1` |

R trae un derivador simbólico de serie, `D`, que trabaja con el árbol de una expresión, como el nuestro, y tampoco junta términos: la derivada de `x + x` le sale `1 + 1`. SymPy y Symbolics simplifican al construir: `x + x` ya es `2*x` (o `2x`) antes de derivar. Lo que hemos escrito nosotros se parece más a `D` que a SymPy, y lo interesante es que cabe en unas cien líneas porque Julia guarda su propio código como árboles que un programa puede recorrer.
:::

## Conexiones

- **Expresiones** (capítulo 20): `deriva` recibe y construye `Expr` con `:( … )` y `$`, y `simplifica` hace cuentas con `eval`.
- **Despacho múltiple** (capítulo 18): un método por tipo de nodo, `Number`, `Symbol` y `Expr`, para `deriva`, `simplifica` y `valor`.
- **Funciones y recursión** (capítulo 5): las tres funciones se llaman a sí mismas con las piezas del árbol.
- **Errores y pruebas** (capítulo 22): `error("no sé derivar …")`, las pruebas escritas primero y la prueba que encontró el fallo del `cos`.
- **Paquetes y cuadernos** (capítulos 23 y 24): un paquete con su `Project.toml` y sus pruebas, y un cuaderno para el aula.
- **Ecuaciones y optimización** (capítulo 14): Newton necesitaba la derivada; ahora la podemos calcular, y no solo comprobar.

## Y ahora

Con estos dos proyectos se acaba el libro. Hemos ido de `1 + 1` a un modelo epidemiológico ajustado a datos reales y a un programa que deriva, pasando por todo lo que hay entre medias. Y en cada paso, con el visualizador, hemos mirado lo que hace Julia por dentro.

A partir de aquí, el camino es tuyo. Puedes mejorar los dos proyectos con los ejercicios y con lo que dejamos fuera, o empezar uno propio: unos datos que te interesen, un modelo que quieras entender, una herramienta que te ahorre trabajo. Para escribir y ejecutar tus propios programas, el [laboratorio](laboratorio.md) sigue abierto, con su intérprete en el navegador, el enlace a la nube y las instrucciones para instalar Julia en tu ordenador.

## Ejercicios

1. **A mano y a máquina.** Deriva a mano `x^3`, `x * sin(x)` y `(x + 1)^2`. Después pásalas por `deriva` y `simplifica` del paquete y compara. ¿Coinciden? ¿Están escritas igual?
2. **Lo que no simplifica.** ¿Qué da `simplifica(deriva(:(2 * x * x), :x))`? ¿Es correcto? ¿Qué le falta a `simplifica` para llegar a `4x`?
3. **La derivada de x − x.** `deriva(:(x - x), :x)` da `1 - 1`, y `simplifica` lo deja en 0. Pero `simplifica(:(x - x))` deja `x - x`. ¿Por qué una cosa sí y la otra no?
4. **Una regla nueva.** Añade a `deriva` la regla de la raíz: la derivada de `sqrt(a)` es `a' / (2 * sqrt(a))`. Y a `valor`, el cálculo de `sqrt`. Comprueba que `comprueba(:(1 / (2 * sqrt(x))), :(sqrt(x)), :x)` da `true`.
5. **Corrige a un alumno.** Un alumno dice que la derivada de `exp(x^2)` es `exp(x^2)` y otro, que es `2x * exp(x^2)`. Comprueba las dos respuestas con `comprueba`.
6. **Una prueba más.** Escribe una prueba que compruebe que la derivada de `log(x)` es `1 / x`, primero comparando árboles con `==` y después con `comprueba`. ¿Cuál pasa? ¿Por qué?

::::{div}
:class: afondo
7. **El producto de más de dos.** En el paquete, `deriva` trata `a * b * c` como `a * (b * c)`. Deriva `:(2 * x * x)` paso a paso, como lo hace el programa, y comprueba que sale lo mismo que en el ejercicio 2.
8. **Engañar a comprueba.** La respuesta `2x + 3 + sin(2π · x)` no es la derivada de `x^2 + 3x + 1`. Escríbela con `3.141592653589793` en lugar de π y pásala por `comprueba`. ¿Qué pasa, y por qué? ¿Cómo lo arreglarías?
::::

## Solucionario

1. A mano: `3x²`, `sin(x) + x·cos(x)` y `2(x + 1)`. El paquete da `3 * x ^ 2`, `sin(x) + x * cos(x)` y `2 * (x + 1)`: lo mismo, escrito como lo escribe Julia.
2. `2 * (x + x)`. Es correcto, porque `2(x + x) = 4x`, pero `simplifica` no sabe juntar términos iguales: tendría que reconocer que los dos sumandos son el mismo árbol y convertirlos en `2 * x`, y después multiplicar los números.
3. `1 - 1` solo tiene números, y `simplifica` hace las cuentas de los nodos con todos sus argumentos numéricos, con `eval`. `x - x` tiene símbolos, y `simplifica` no sabe que dos símbolos iguales restados dan 0: no tiene esa regla.
4. En `deriva`, `elseif op == :sqrt` y `return :($(deriva(a, x)) / (2 * sqrt($a)))`; en `valor`, `elseif op == :sqrt` y `return sqrt(a[1])`. `comprueba` da `true`, porque la respuesta vale lo mismo que la derivada en los tres puntos.
5. `comprueba(:(exp(x^2)), :(exp(x^2)), :x)` da `false`: falta la derivada de lo de dentro. `comprueba(:(2x * exp(x^2)), :(exp(x^2)), :x)` da `true`.
6. `@test simplifica(deriva(:(log(x)), :x)) == :(1 / x)` pasa, porque la regla escribe exactamente `1 / x`. Con `@test comprueba(:(1 / x), :(log(x)), :x)` también pasa. Pero si el alumno escribiera `x ^ -1`, solo pasaría la segunda: la prueba con `==` depende de cómo esté escrito el árbol, y la de `comprueba`, de lo que vale.

::::{div}
:class: afondo
7. `deriva(2 * (x * x)) = 0 * (x * x) + 2 * deriva(x * x)`, y `deriva(x * x) = 1x + x * 1`. Todo junto, `0 * (x * x) + 2 * (1x + x * 1)`, y simplificado, `2 * (x + x)`, como en el ejercicio 2.
8. `comprueba` da `true`. En 0,5, 1,5 y 2,5, `sin(2π · x)` vale prácticamente 0 (seno de π, 3π y 5π), así que la respuesta falsa coincide con la buena justo en los tres puntos que mira. Se arregla comprobando en puntos al azar, con `rand()`, que cambian cada vez: es casi imposible que una respuesta equivocada acierte en puntos que no conoce de antemano. Los programas de corrección automática hacen eso, con más puntos.
::::
