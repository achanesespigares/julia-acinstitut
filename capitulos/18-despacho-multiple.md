---
title: Despacho múltiple
subtitle: Julia elige qué hacer mirando los tipos de todos los argumentos a la vez
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *El sistema de tipos* viste que una función puede tener varios métodos, `que_es(x::Integer)`, `que_es(x::AbstractFloat)`…, y que en cada llamada Julia elige el más específico que encaja con el tipo del argumento. Y en *Tipos propios* definiste `area(c::Circulo)` y `area(r::Rectangulo)`. Siempre con un solo argumento.

## La pregunta

¿Cómo elige Julia cuando hay dos argumentos, o tres? ¿Por qué `1 + 2.5` y `2.5 + 1` funcionan los dos? ¿Qué pasa si dos métodos encajan igual de bien? ¿Y puedo enseñar a `+` a sumar cosas que no son números?

## La idea

Julia elige el método mirando los tipos de **todos** los argumentos a la vez. Es el **despacho múltiple**: un método para un entero y un decimal, otro para un decimal y un entero, otro para dos puntos… Gana el más específico, el que encaja con los tipos más bajos del árbol en todas las posiciones.

Si ninguno es más específico que todos los demás, Julia no elige al azar: da un error de **ambigüedad** y dice qué método falta. Y como los operadores, `+`, `*` o `==`, son funciones con métodos, puedes añadirles métodos para tus propios tipos. A partir de ahí, todo el código que use `+`, también el que ya existía, sabe trabajar con ellos.

:::{important} Una función es una familia de métodos
`+` no es un trozo de código: es un nombre con cientos de métodos, uno para cada combinación de tipos. Julia los elige mirando todos los argumentos, y tú puedes añadir los tuyos. Por eso una función escrita una vez, como `total` en la sección 5, sirve para enteros, fracciones y puntos sin cambiar nada.
:::

## Construcción

### 1 · Mirar los dos argumentos

:::{tip} Predice
Hay un método para dos enteros, uno para un entero y un decimal, otro para un decimal y un entero, y uno para cualquier cosa. ¿Qué dirá `junta(2.5, 3.5)`, con dos decimales?
:::

```{code-cell} julia
junta(x::Integer, y::Integer) = "dos enteros"
junta(x::Integer, y::AbstractFloat) = "un entero y un decimal"
junta(x::AbstractFloat, y::Integer) = "un decimal y un entero"
junta(x, y) = "otra cosa"
junta(1, 2)
junta(1, 2.5)
junta(2.5, 1)
junta(2.5, 3.5)
junta(1, "dos")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/18-despacho-multiple-1.json","config":{"etiqueta":"dos argumentos","idea":"Con varios argumentos, Julia mira el tipo de cada uno y elige el método que encaja en todas las posiciones con los tipos más específicos. El orden importa: un entero y un decimal no es lo mismo que un decimal y un entero.","titulo":"Un método para cada pareja de tipos"}}
```

Las cuatro líneas crean una función, `junta`, con cuatro métodos, y cada uno pone un tipo a **cada** argumento. En cada llamada, Julia mira los dos: `junta(1, 2.5)` es un `Int64` y un `Float64`, y el único método que encaja con ese par, aparte del general, es `junta(x::Integer, y::AbstractFloat)`. `junta(2.5, 1)` tiene los mismos tipos al revés, y va a otro método. El orden de los argumentos cuenta.

`junta(2.5, 3.5)` son dos decimales, y no hay ningún método para dos `AbstractFloat`: el único que encaja es `junta(x, y)`, que sin tipos acepta cualquier cosa, y dice «otra cosa». Lo mismo con `junta(1, "dos")`, porque un texto no es ni entero ni decimal.

Siempre que encajan varios, gana el más específico. Con `junta(1, 2)` encajan `junta(x::Integer, y::Integer)` y `junta(x, y)`, y gana el primero, porque `Integer` está por debajo de `Any` en las dos posiciones. El visualizador te dice en cada llamada qué método ha elegido Julia.

### 2 · Piedra, papel o tijera

:::{tip} Predice
Solo hay tres métodos que digan `true`. De las nueve parejas posibles, ¿cuántas veces dirá `gana` que sí?
:::

```{code-cell} julia
abstract type Jugada end
struct Piedra <: Jugada end
struct Papel <: Jugada end
struct Tijera <: Jugada end
gana(a::Jugada, b::Jugada) = false
gana(a::Piedra, b::Tijera) = true
gana(a::Tijera, b::Papel) = true
gana(a::Papel, b::Piedra) = true
jugadas = [Piedra(), Papel(), Tijera()]
for a in jugadas, b in jugadas
    g = gana(a, b)
end
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/18-despacho-multiple-2.json","config":{"columnas":["a","b","g"],"etiqueta":"despacho por parejas","fila_en":"fin_iteracion","idea":"Cada jugada es un tipo, y las reglas del juego son métodos de gana para cada pareja de tipos. El método general dice false; los tres que dicen true son más específicos y ganan cuando encajan.","titulo":"Las reglas del juego, como métodos"}}
```

`Jugada` es un tipo abstracto, y `Piedra`, `Papel` y `Tijera` son tipos concretos sin campos: no guardan nada, porque lo único que importa de ellos es **qué tipo son**. `Piedra()` crea una piedra.

Las reglas del juego no están en ningún `if`. Están en los métodos: uno general, `gana(a::Jugada, b::Jugada)`, que dice `false`, y tres más específicos para las tres parejas en las que el primero gana. En cada vuelta, Julia mira los tipos de `a` y de `b` y elige. Con una piedra y una tijera encajan dos métodos, el general y `gana(a::Piedra, b::Tijera)`, y gana el segundo, que es más específico en las dos posiciones. Con dos piedras solo encaja el general.

El `for` con dos variables, `for a in jugadas, b in jugadas`, es un bucle dentro de otro escrito en una línea: para cada `a`, recorre todas las `b`. La tabla enseña las nueve parejas: `gana` dice que sí tres veces, una por cada regla. Sin despacho múltiple habría que escribir algo como `if a isa Piedra && b isa Tijera … elseif …`, con todas las combinaciones juntas. Con él, cada regla es un método aparte, y añadir una jugada nueva es añadir métodos, sin tocar los que ya hay.

### 3 · Dos métodos que encajan igual

:::{tip} Predice
Un método quiere el entero primero y el otro, segundo. Con `mezcla(1, 2)`, los dos argumentos son enteros: ¿cuál elegirá Julia?
:::

```{code-cell} julia
mezcla(x::Integer, y::Number) = "el entero va primero"
mezcla(x::Number, y::Integer) = "el entero va segundo"
mezcla(1, 2.5)
mezcla(2.5, 1)
mezcla(1, 2)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/18-despacho-multiple-3.json","config":{"etiqueta":"ambigüedad","idea":"Si encajan dos métodos y ninguno es más específico que el otro en todas las posiciones, Julia no elige: da un error de ambigüedad y dice qué método habría que añadir.","titulo":"Cuando ningún método gana"}}
```

Con `mezcla(1, 2.5)` solo encaja el primer método, porque `2.5` no es un `Integer`; con `mezcla(2.5, 1)`, solo el segundo. Pero `mezcla(1, 2)` son dos enteros, y encajan los dos. ¿Cuál es más específico? El primero lo es en el primer argumento (`Integer` frente a `Number`), y el segundo, en el segundo. Ninguno gana en todas las posiciones.

Julia no lanza una moneda: da un **`MethodError`** que dice que la llamada `mezcla(::Int64, ::Int64)` es **ambigua**, enseña los dos candidatos y propone el arreglo: `Possible fix, define mezcla(::Integer, ::Integer)`. Un método para dos enteros sería más específico que los dos a la vez, y resolvería el empate. Es el ejercicio 1.

Que Julia se niegue a elegir es una ventaja: un programa que hiciera una cosa u otra según el orden en que se definieron los métodos sería muy difícil de entender.

### 4 · Enseñar a `+` a sumar puntos

:::{tip} Predice
Hay un método de `*` para un número por un punto. ¿Funcionará `p * 2`, con el punto primero?
:::

```{code-cell} julia
struct Punto{T<:Real}
    x::T
    y::T
end
Base.:+(a::Punto, b::Punto) = Punto(a.x + b.x, a.y + b.y)
Base.:*(k::Real, a::Punto) = Punto(k * a.x, k * a.y)
p = Punto(1, 2)
q = Punto(3, 4)
p + q
2 * p
p + 0.5 * q
p * 2
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/18-despacho-multiple-4.json","config":{"etiqueta":"Base.:+ · Base.:*","idea":"Los operadores son funciones de Julia, del módulo Base. Base.:+(a::Punto, b::Punto) les añade un método para tus puntos. Como el despacho mira todos los argumentos, un número por un punto y un punto por un número son métodos distintos.","titulo":"Un método nuevo para un operador"}}
```

`p + q` es otra forma de escribir `+(p, q)`: una llamada a la función `+` con dos argumentos. `+` es una función de Julia, del módulo `Base`, y ya tiene muchísimos métodos (`length(methods(+))` da 190 en un REPL recién abierto): uno para dos enteros, otro para un entero y un decimal, otro para dos fracciones… Ninguno para puntos.

`Base.:+(a::Punto, b::Punto) = …` le **añade un método**. Se escribe así, con `Base.` delante, para decir que no es una función nueva tuya que se llame `+`, sino un método más para la `+` de Julia. Desde ese momento, `p + q` funciona y da `Punto{Int64}(4, 6)`. Dentro del método, `a.x + b.x` vuelve a usar `+`, esta vez con dos enteros, y Julia elige el método de los enteros: el despacho trabaja en cada `+`.

El método de `*` es para un `Real` y un `Punto`, en ese orden. `2 * p` da `Punto{Int64}(2, 4)`. `p + 0.5 * q` combina los dos: `0.5 * q` es `Punto{Float64}(1.5, 2.0)`, y sumarle `p` da `Punto{Float64}(2.5, 4.0)`, porque `1 + 1.5` ya sabe que tiene que dar un decimal. Pero `p * 2` da un `MethodError`: `no method matching *(::Punto{Int64}, ::Int64)`. Para Julia, un punto por un número es otra pareja de tipos, y nadie le ha dicho qué hacer con ella. Lo arreglas en el ejercicio 5.

### 5 · Escribir una vez, servir para todo

:::{tip} Predice
`total` no sabe nada de puntos: solo usa `+`. ¿Funcionará con un vector de puntos? ¿Y `sum`, que es de Julia?
:::

```{code-cell} julia
struct Punto{T<:Real}
    x::T
    y::T
end
Base.:+(a::Punto, b::Punto) = Punto(a.x + b.x, a.y + b.y)
function total(v)
    s = v[1]
    for x in v[2:end]
        s = s + x
    end
    return s
end
total([1, 2, 3])
total([1//2, 1//3])
puntos = [Punto(1, 2), Punto(3, 4), Punto(5, 6)]
total(puntos)
sum(puntos)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/18-despacho-multiple-5.json","config":{"etiqueta":"código genérico","idea":"total solo usa +, sin decir de qué tipo son los elementos. Cada s + x elige su método en el momento: el de los enteros, el de las fracciones o el de los puntos. Incluso sum, que es de Julia, suma puntos sin cambiar nada.","titulo":"Una función, muchos tipos"}}
```

`total(v)` no pone ningún tipo: suma los elementos de `v` uno a uno con `+`. Con `[1, 2, 3]` da `6`; con dos fracciones, `5//6`. Y con un vector de puntos, `Punto{Int64}(9, 12)`. En cada `s = s + x`, Julia mira los tipos de `s` y de `x` y elige el método de `+`: el de los enteros, el de las fracciones o el tuyo. Por eso el visualizador entra en tu método de `+` en las vueltas de los puntos.

Lo más llamativo es la última línea. `sum` es una función de Julia, escrita mucho antes de que existiera tu `Punto`, y también funciona: por dentro hace lo mismo que `total`, sumar con `+`. Has añadido un método a `+`, y todo el código que suma, el tuyo y el de Julia, sabe sumar puntos. Así se **combinan** los paquetes de Julia: uno define un tipo, otro escribe funciones genéricas, y funcionan juntos sin conocerse.

::::{div}
:class: afondo
### 6 · Cómo elige Julia, y qué hace con lo que elige

**Más específico quiere decir un subtipo.** Julia guarda la firma de cada método como una tupla de tipos: `junta(x::Integer, y::AbstractFloat)` es `Tuple{Integer, AbstractFloat}`. Una llamada `junta(1, 2.5)` es `Tuple{Int64, Float64}`, y un método encaja si la tupla de la llamada es un subtipo de la suya: `Tuple{Int64, Float64} <: Tuple{Integer, AbstractFloat}` es `true`. Entre los que encajan, un método es más específico que otro si su tupla es un subtipo de la del otro; `Tuple{Integer, AbstractFloat} <: Tuple{Any, Any}`, así que gana a `junta(x, y)`. Con `mezcla`, ni `Tuple{Integer, Number}` es subtipo de `Tuple{Number, Integer}` ni al revés: por eso es una ambigüedad.

**Ver lo que hay.** `methods(junta)` enumera los cuatro métodos, cada uno con el archivo y la línea donde está definido. Y `@which junta(1, 2.5)` dice cuál elegiría Julia para esa llamada, sin ejecutarla: `junta(x::Integer, y::AbstractFloat)`. En el REPL está siempre a mano; en un archivo hay que escribir antes `using InteractiveUtils`.

**`where`: el mismo tipo en los dos.** A veces no importa qué tipo es, sino que los dos argumentos sean del mismo. `iguales(x::T, y::T) where {T} = "los dos son $T"` tiene un parámetro, `T`, que Julia deduce de los argumentos: `iguales(1, 2)` da `"los dos son Int64"`, `iguales("a", "b")`, `"los dos son String"`, y con `iguales(1, 2.0)` no hay ningún `T` que sea a la vez `Int64` y `Float64`, así que el método no encaja. Con una cota, `where {T<:Real}`, `T` tiene que ser además un número real. Es lo mismo que los parámetros de `Punto{T}`, pero en un método. Lo pruebas en los ejercicios 7 y 8.

**Una versión compilada para cada combinación.** El despacho no frena a Julia. La primera vez que llamas a `total` con un `Vector{Int64}`, Julia compila una versión de `total` solo para ese tipo, en la que cada `s + x` ya sabe que es una suma de enteros y no tiene que elegir nada. Tras la sección 5, `Base.specializations` cuenta tres versiones compiladas de `total`: para `Vector{Int64}`, para `Vector{Rational{Int64}}` y para `Vector{Punto{Int64}}`. Elegir el método cuesta algo solo cuando Julia no puede saber los tipos de antemano, como en un `Vector{Real}` (ese «18 veces más lento» de *El sistema de tipos*). Es el tema de *Rendimiento*.

**La piratería de tipos.** Puedes añadir métodos a `+` para tus tipos, pero no conviene hacerlo para tipos que no son tuyos. El manual de Julia lo llama *type piracy*: extender o redefinir métodos de `Base` o de otros paquetes para tipos que no has definido tú. Si un programa añadiera `Base.:+(a::String, b::String) = a * b`, cambiaría lo que hace `+` en cualquier otro código que se ejecute con él, también en los paquetes. Añade métodos cuando al menos uno de los tipos sea tuyo, como `Punto`.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio, con las mismas elecciones que Julia: el laboratorio compara las firmas como subtipos, da el mismo mensaje de ambigüedad y deja añadir métodos a los operadores de `Base` para tus tipos (`Base.:+`, `Base.:-`, `Base.:*`, `Base.:(==)`…). También entiende `where`. Lo que no sabe hacer, como `methods`, `@which` o añadir métodos a `+` para tipos de Julia, te lo dice y te manda a la nube.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Un método según los tipos | despacho múltiple: todos los argumentos | un método por clase, o `functools.singledispatch`: solo el primer argumento | S3: el primer argumento; S4 (`setMethod` con `signature("integer", "numeric")`): todos |
| Sumar dos puntos | `Base.:+(a::Punto, b::Punto)` | `def __add__(self, otro)` en la clase | `setMethod("+", signature("Punto", "Punto"))` en S4 |
| Un número por un punto, y al revés | dos métodos de `*`: `(::Real, ::Punto)` y `(::Punto, ::Real)` | `__rmul__` y `__mul__` | dos métodos con las dos firmas |
| Dos métodos que encajan igual | error: `is ambiguous`, con el arreglo | casi nunca, porque solo mira el primero; con herencia múltiple, `RuntimeError: Ambiguous dispatch` | S4 elige uno y avisa con una nota |

En Python, `p * 2` sin `__mul__` da `TypeError: unsupported operand type(s) for *: 'Punto' and 'int'`: el mismo problema que en la sección 4, pero resuelto con métodos especiales dentro de la clase, no con métodos de `*`. En R con S4, la ambigüedad de `mezcla(1L, 2L)` no es un error: R elige el método `integer#numeric` y escribe una nota que dice que `numeric#integer` también valdría. Julia prefiere detenerse.
:::

## Conexiones

- Los métodos con un argumento de *El sistema de tipos* (`que_es`) y de *Tipos propios* (`area`) eran ya despacho múltiple, con una sola posición.
- `1 + 2.5` funciona desde *Julia como calculadora* porque `+` tiene un método para un entero y un decimal que promociona el entero, como `promote` en *El sistema de tipos*.
- `Punto{T}` es el tipo con parámetro del capítulo anterior; aquí aprende a sumarse.
- El `MethodError` de `p * 2` es el de `mitad(7.0)`: ninguna pareja de tipos encaja.
- `sum` de un vector de puntos funciona por la misma razón que `sum` de una máscara cuenta los `true` (*Índices, filtros y el punto*): `sum` suma con `+`, y `+` sabe qué hacer con cada tipo.

## La grieta

La sección 6 dice que Julia compila una versión de cada función para cada combinación de tipos, y que por eso el despacho no la frena. Pero ¿cuánto tarda de verdad un programa en Julia? ¿Por qué la primera llamada es más lenta que las siguientes? ¿Qué hace que una función sea rápida o lenta, y cómo se mide? Es el capítulo siguiente, *Rendimiento*.

## Ejercicios

1. **Arregla la ambigüedad.** Añade a la sección 3, antes de las llamadas, el método `mezcla(x::Integer, y::Integer) = "dos enteros"`. ¿Qué dan ahora `mezcla(1, 2)` y `mezcla(1, 2.5)`? ¿Cuántos métodos tiene `mezcla`?

2. **Predice.** Con la `junta` de la sección 1, ¿qué dan `junta(true, 2)`, `junta(true, 2.0)`, `junta(2//3, 1)` y `junta('a', 1)`? Compruébalo.

3. **¿Quién gana?** Añade a la sección 2 una función `resultado(a::Jugada, b::Jugada)` que devuelva `"gana"` si `gana(a, b)`, `"pierde"` si `gana(b, a)` y `"empate"` si no. ¿Qué da con una piedra y una tijera? ¿Y con una piedra y un papel? ¿Y con dos tijeras?

4. **Restar puntos.** Añade a la sección 4 un método para `q - p`, con `Base.:-(a::Punto, b::Punto)`, y otro para `-p`, con un solo argumento, `Base.:-(a::Punto)`. ¿Qué dan `q - p` y `-p`? ¿Por qué son métodos distintos de la misma función?

5. **El orden importa.** Arregla el error de la sección 4 con `Base.:*(a::Punto, k::Real) = k * a`. ¿Qué dan ahora `p * 2` y `2 * p`? ¿Qué método usa por dentro el nuevo?

6. **`total` con otras cosas.** Con la `total` de la sección 5, ¿qué pasa con `total(["ho", "la"])`? ¿Qué te sugiere el mensaje? ¿Y con `total([7])` y con `total([])`?

::::{div}
:class: afondo
7. **El mismo tipo.** Define `iguales(x::T, y::T) where {T} = "los dos son $T"` y `iguales(x, y) = "tipos distintos"`. ¿Qué dan `iguales(1, 2)`, `iguales(1, 2.0)`, `iguales("a", "b")` e `iguales(1.5, 2.5)`?

8. **Enteros contra reales del mismo tipo.** Define `k(x::T, y::T) where {T<:Real} = "reales del mismo tipo"` y `k(x::Integer, y::Integer) = "enteros"`. ¿Qué dan `k(1, 2)`, `k(1.0, 2.0)` y `k(true, 2)`? ¿Por qué `k(1, 2)` no es una ambigüedad?
::::

## Solucionario

1. `mezcla(1, 2)` da `"dos enteros"`: el método nuevo encaja y es más específico que los otros dos en las dos posiciones (`Integer` está por debajo de `Number`). `mezcla(1, 2.5)` sigue dando `"el entero va primero"`, porque el nuevo no encaja con un decimal. `mezcla` tiene ahora 3 métodos.
2. `junta(true, 2)` da `"dos enteros"`, porque `Bool` es un `Integer`. `junta(true, 2.0)`, `"un entero y un decimal"`. `junta(2//3, 1)`, `"otra cosa"`: una fracción no es ni entero ni decimal. `junta('a', 1)`, `"otra cosa"`: un carácter no es un número.
3. Una forma de escribirla:

   ```julia
   function resultado(a::Jugada, b::Jugada)
       if gana(a, b)
           return "gana"
       elseif gana(b, a)
           return "pierde"
       else
           return "empate"
       end
   end
   ```

   Con `Piedra()` y `Tijera()` da `"gana"`; con `Piedra()` y `Papel()`, `"pierde"`; con dos `Tijera()`, `"empate"`. `resultado` no necesita saber las reglas: se las pregunta a `gana`.
4. `q - p` da `Punto{Int64}(2, 2)` y `-p`, `Punto{Int64}(-1, -2)`. Son dos métodos de la misma función `-`, uno con dos argumentos y otro con uno: Julia también los distingue por cuántos argumentos hay, igual que `-` de números resta con dos y cambia el signo con uno.
5. `p * 2` y `2 * p` dan los dos `Punto{Int64}(2, 4)`. El método nuevo, `*(a::Punto, k::Real)`, se limita a llamar a `k * a`: con el número primero, que es el método que ya había.
6. `total(["ho", "la"])` da `MethodError: no method matching +(::String, ::String)`, y el mensaje sugiere que los textos se juntan con `*`, no con `+` (*Cadenas y caracteres*). `total([7])` da `7`: `v[2:end]` está vacío, y el bucle no da ninguna vuelta. `total([])` da `BoundsError: attempt to access 0-element Vector{Any} at index [1]`: un vector vacío no tiene primer elemento.

::::{div}
:class: afondo
7. `iguales(1, 2)` da `"los dos son Int64"`; `iguales(1, 2.0)`, `"tipos distintos"`, porque ningún `T` es a la vez `Int64` y `Float64`; `iguales("a", "b")`, `"los dos son String"`; `iguales(1.5, 2.5)`, `"los dos son Float64"`.
8. `k(1, 2)` da `"enteros"`, `k(1.0, 2.0)`, `"reales del mismo tipo"`, y `k(true, 2)`, `"enteros"`: `true` es un `Bool` y `2` un `Int64`, así que no hay un `T` común y el primer método no encaja. Con `k(1, 2)` encajan los dos, pero no hay empate: `Tuple{Integer, Integer}` es un subtipo de `Tuple{Real, Real}`, y en las dos posiciones donde el primer método pide el mismo `T`, el segundo pide el mismo tipo, `Integer`. Julia considera más específico el método de los enteros.
::::
