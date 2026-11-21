---
title: El sistema de tipos
subtitle: Cada valor sabe lo que es, y Julia lo usa para elegir qué hacer con él
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *Julia como calculadora* viste que `7` es un `Int64` y `7.0` un `Float64`, y que se comportan distinto. En *Tipos propios* creaste los tuyos con `struct`, y una función con dos métodos, `area(c::Circulo)` y `area(r::Rectangulo)`. Y en todo el libro, el visualizador ha escrito al lado de cada valor su tipo: `Vector{Float64}`, `String`, `Dict{String, Int64}`…

## La pregunta

¿Qué es exactamente un tipo? ¿Por qué la misma `+` sirve para enteros, decimales, fracciones y vectores? ¿Qué quiere decir el `{Float64}` de `Vector{Float64}`? ¿Y por qué a Julia le importa tanto?

## La idea

En Julia, **todo valor tiene un tipo**, y lo lleva consigo: `typeof(x)` lo dice. Los tipos forman un **árbol**: `Int64` es un `Signed` (un entero con signo), que es un `Integer`, que es un `Real`, que es un `Number`, que es un `Any`. Las hojas del árbol, como `Int64` o `Float64`, son tipos **concretos**: hay valores de ellos. Las ramas, como `Integer` o `Number`, son **abstractos**: sirven para agrupar.

Una función puede tener un **método** distinto para cada tipo de argumento, y en cada llamada Julia elige el más específico que encaja. Es el **despacho múltiple**, la idea central de Julia: por eso `+` sabe sumar cosas tan distintas.

Y hay tipos con **parámetros**: `Vector{Float64}` es un vector cuyos elementos son todos `Float64`. El parámetro dice a Julia cómo guardar los datos, y es una de las razones por las que Julia es rápida.

:::{important} El tipo decide qué se hace con un valor
Julia mira el tipo de cada argumento para decidir qué método ejecutar, cómo guardar un vector en la memoria y qué conversiones hacer. Por eso conviene saber qué tipo tiene cada cosa: un `Vector{Int64}` no puede guardar un 4,5, y `que_es(true)` dice «un entero», porque `Bool` es un tipo de entero.
:::

## Construcción

### 1 · Todo valor tiene un tipo

:::{tip} Predice
¿Qué tipo tendrá `[1, 2.5]`, un vector con un entero y un decimal? ¿Y `typeof(Int64)`, el tipo de un tipo?
:::

```{code-cell} julia
typeof(42)
typeof(4.2)
typeof(3//4)
typeof("cuarenta")
typeof('c')
typeof(true)
typeof([1, 2, 3])
typeof([1, 2.5])
typeof((1, "uno"))
typeof(Int64)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/17-sistema-tipos-1.json","config":{"etiqueta":"typeof","idea":"typeof(x) dice el tipo de un valor. Los números, los textos, los caracteres y los valores lógicos tienen cada uno el suyo; un vector o una tupla llevan además, entre llaves, los tipos de lo que guardan.","titulo":"El tipo de cada cosa"}}
```

`typeof` dice el tipo de cualquier valor. `42` es un `Int64`, un entero de 64 bits; `4.2` un `Float64`, un decimal de 64 bits; `3//4` un `Rational{Int64}`, una fracción con numerador y denominador `Int64`. `"cuarenta"` es un `String`, `'c'` un `Char` y `true` un `Bool`.

Los contenedores llevan, entre llaves, el tipo de lo que guardan: `[1, 2, 3]` es un `Vector{Int64}`. La consola añade `(alias for Array{Int64, 1})`: un `Vector` es un `Array` de una dimensión, y una matriz sería un `Array{Int64, 2}`. En `[1, 2.5]`, Julia convierte el 1 en `1.0` para que todos los elementos tengan el mismo tipo, y el vector es un `Vector{Float64}`. La tupla `(1, "uno")`, en cambio, guarda cada elemento con su tipo: `Tuple{Int64, String}`.

Y los tipos también son valores: `typeof(Int64)` es `DataType`, el tipo de los tipos. Por eso se pueden guardar en una variable, pasar a una función o comparar, como en la sección siguiente.

### 2 · El árbol de los tipos

:::{tip} Predice
Subiendo desde `Int64` con `supertype`, ¿cuántos pasos hacen falta para llegar a `Any`? ¿Es `Bool` un tipo de entero?
:::

```{code-cell} julia
t = Int64
while t != Any
    t = supertype(t)
end
Int64 <: Real
Float64 <: Integer
Bool <: Integer
isabstracttype(Real)
isconcretetype(Int64)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/17-sistema-tipos-2.json","config":{"columnas":["t"],"etiqueta":"supertype · <:","fila_en":"fin_iteracion","idea":"supertype(T) da el tipo de encima en el árbol. Subiendo desde Int64 se pasa por Signed, Integer, Real y Number hasta llegar a Any, la raíz. A <: B pregunta si A está por debajo de B.","titulo":"Subir por el árbol de tipos"}}
```

`supertype(t)` da el tipo que está justo encima de `t` en el árbol. El bucle sube desde `Int64` hasta llegar a `Any`, la raíz, y la tabla enseña el camino: `Signed`, `Integer`, `Real`, `Number`, `Any`. Cinco pasos. Un `Float64` subiría por `AbstractFloat` hasta `Real`, y ahí se juntaría con los enteros.

El operador **`<:`** pregunta si un tipo está por debajo de otro: «es un subtipo de». `Int64 <: Real` es `true`; `Float64 <: Integer`, `false`. Y `Bool <: Integer` es `true`: para Julia, `true` y `false` son enteros que valen 1 y 0, y por eso `sum` de una máscara cuenta los `true`, como en *Índices, filtros y el punto*.

`isabstracttype(Real)` es `true`: no hay ningún valor que sea solo un `Real`, sin ser algo más concreto. `isconcretetype(Int64)` es `true`: `Int64` es una hoja, y `42` es uno de sus valores.

### 3 · Un método para cada tipo

:::{tip} Predice
Hay un método para `Integer`, otro para `AbstractFloat`, otro para `Number` y otro para cualquier cosa. ¿Qué dirá `que_es(true)`? ¿Y `que_es(3//4)`?
:::

```{code-cell} julia
que_es(x::Integer) = "un entero"
que_es(x::AbstractFloat) = "un decimal"
que_es(x::Number) = "otro número"
que_es(x) = "no es un número"
que_es(7)
que_es(7.5)
que_es(3//4)
que_es("siete")
que_es(true)
mitad(x::Integer) = x ÷ 2
mitad(7)
mitad(7.0)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/17-sistema-tipos-3.json","config":{"etiqueta":"despacho múltiple","idea":"x::Integer dice que el método solo vale si x es un entero. Con varios métodos, Julia mira el tipo del argumento y elige el más específico que encaja. Si no encaja ninguno, da un MethodError.","titulo":"Un método para cada tipo"}}
```

`x::Integer` es una **anotación de tipo**: este método solo vale si `x` es algún tipo de entero. Las cuatro líneas crean una sola función, `que_es`, con **cuatro métodos**, y el visualizador lo cuenta al definirlos.

En cada llamada, Julia mira el tipo del argumento y elige el método **más específico** que encaja. `7` es un `Int64`, que es a la vez `Integer`, `Number` y `Any`: los cuatro métodos encajan, y gana el de `Integer`, el más bajo en el árbol. `7.5` va al de `AbstractFloat`. `3//4` es un `Rational`, que no es ni entero ni decimal: gana el de `Number`. `"siete"` no es un número, y solo encaja el último, que no pone tipo (es lo mismo que `x::Any`). Y `true` es un `Bool`, un entero: «un entero».

`mitad(x::Integer)` solo tiene un método. `mitad(7)` da `3`, pero `mitad(7.0)` da un **`MethodError`**: `no method matching mitad(::Float64)`. Aunque `7.0` valga lo mismo que `7`, es otro tipo, y nadie ha dicho qué hacer con él. Mejor un error claro que un resultado inesperado.

### 4 · Los tipos de los contenedores

:::{tip} Predice
`v` es un `Vector{Int64}`. `push!(v, 4.0)` le añade un 4,0. ¿Qué pasará con `push!(v, 4.5)`?
:::

```{code-cell} julia
v = [1, 2, 3]
eltype(v)
promote(1, 2.5)
r = Real[1, 2.5]
eltype(r)
push!(v, 4.0)
push!(v, 4.5)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/17-sistema-tipos-4.json","config":{"etiqueta":"Vector{T} · promote","idea":"Un Vector{Int64} solo guarda Int64. Lo que se le añade se convierte a Int64 si se puede sin perder nada, como 4.0; si no, como 4.5, es un InexactError. Real[…] crea un vector que admite cualquier número real.","titulo":"Un vector solo guarda un tipo"}}
```

El parámetro de `Vector{Int64}` dice qué guarda: `eltype(v)`, el tipo de sus elementos, es `Int64`. Cuando un vector se escribe con números de varios tipos, Julia los **promociona** a un tipo común, como `promote(1, 2.5)`, que da `(1.0, 2.5)`: el entero pasa a decimal, porque un decimal puede guardar el 1 sin perder nada y un entero no puede guardar el 2,5.

Si quieres que cada elemento conserve su tipo, puedes poner el tipo del vector delante de los corchetes: `Real[1, 2.5]` es un `Vector{Real}`, con un `Int64` y un `Float64` dentro. Es más flexible, pero, como explica el «A fondo», mucho más lento.

Un vector no cambia de tipo después de crearse. `push!(v, 4.0)` funciona: Julia convierte el 4,0 en el entero 4 sin perder nada. Pero `push!(v, 4.5)` da un **`InexactError: Int64(4.5)`**: el 4,5 no cabe en un entero, y Julia prefiere avisar a redondearlo sin decir nada. Es el mismo error que en *Tipos propios*, al guardar 2,5 faltas en un campo `Int`.

### 5 · Un tipo propio con parámetro

:::{tip} Predice
`Punto{T}` pide que `x` e `y` sean del mismo tipo `T`. ¿Qué tipo tendrá `Punto(3, 4)`? ¿Y qué pasará con `Punto(1, 2.5)`?
:::

```{code-cell} julia
struct Punto{T<:Real}
    x::T
    y::T
end
p = Punto(3, 4)
q = Punto(1.5, 2.0)
typeof(p)
typeof(q)
distancia(a::Punto) = sqrt(a.x^2 + a.y^2)
distancia(p)
distancia(q)
Punto(1, 2.5)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/17-sistema-tipos-5.json","config":{"etiqueta":"struct con parámetro","idea":"Punto{T} es una familia de tipos, uno para cada T: Punto{Int64}, Punto{Float64}… Julia deduce T de los argumentos. Como x e y tienen que ser del mismo T, Punto(1, 2.5) no encaja.","titulo":"Un punto de cualquier tipo de número"}}
```

`struct Punto{T<:Real}` define una **familia** de tipos con un parámetro, `T`, que puede ser cualquier subtipo de `Real`. Los dos campos son de tipo `T`, el mismo. Es como `Vector{T}`, pero hecho por ti.

Al construir `Punto(3, 4)`, Julia mira los argumentos, ve dos `Int64` y deduce `T = Int64`: `p` es un `Punto{Int64}`. Con `Punto(1.5, 2.0)`, `q` es un `Punto{Float64}`. Son dos tipos distintos, aunque los dos sean `Punto`.

`distancia(a::Punto)` vale para cualquier `Punto`, sea cual sea su `T`: da `5.0` con `p` y `2.5` con `q`. Pero `Punto(1, 2.5)` da un `MethodError`: un argumento es `Int64` y el otro `Float64`, y no hay ningún `T` que sea los dos a la vez. Julia no los promociona por su cuenta, porque el tipo dice que los dos campos tienen que ser del mismo `T`. Si lo quieres en decimales, `Punto{Float64}(1, 2.5)` lo dice explícitamente y convierte el 1.

::::{div}
:class: afondo
### 6 · Bits, invarianza y velocidad

**Un tipo concreto dice cuántos bytes ocupa.** `sizeof(1)` y `sizeof(1.0)` son `8`: 64 bits cada uno. Pero no significan lo mismo: `bitstring(1.0)` da `0011111111110000…0000`, el signo, el exponente y la mantisa del capítulo *Julia como calculadora*, y el `1` entero sería 63 ceros y un uno. El tipo es lo que dice a Julia cómo leer esos 64 bits.

**Por qué `Vector{Real}` es lento.** Un `Vector{Float64}` guarda los números uno detrás de otro, 8 bytes cada uno, y Julia sabe que todos son `Float64`: puede sumar sin preguntar. Un `Vector{Real}` guarda en cada casilla la dirección de un número, que puede ser de cualquier tipo, y en cada suma Julia tiene que ir a buscarlo y mirar qué es. Con diez millones de números, sumar el `Vector{Real}` tardó unas 18 veces más que el `Vector{Float64}` (0,21 s frente a 0,012 s en el ordenador de pruebas) y ocupó el doble de memoria (160 MB frente a 80 MB). Es el primer secreto del capítulo *Rendimiento*: usa tipos concretos en los contenedores.

**La invarianza.** `Int64 <: Real` es `true`, pero `Vector{Int64} <: Vector{Real}` es `false`. Un `Vector{Real}` tiene que poder guardar un 2,5, y un `Vector{Int64}` no puede, así que no es «un tipo de» `Vector{Real}`. Para decir «un vector de cualquier tipo de real» se escribe `Vector{<:Real}`, y `Vector{Int64} <: Vector{<:Real}` sí es `true`. Por eso una función que quiera aceptar vectores de enteros y de decimales se escribe `f(v::Vector{<:Real})`, o directamente `f(v::AbstractVector)`.

**Los hijos de un tipo.** `subtypes(Integer)` da `Bool`, `Signed` y `Unsigned` (los enteros sin signo, como `UInt8`); `subtypes(Real)` da `AbstractFloat`, `AbstractIrrational` (el tipo de `π`), `Integer` y `Rational`. Viene en el paquete InteractiveUtils, que el REPL carga solo; en un archivo hay que escribir `using InteractiveUtils`.

**`Union` y `nothing`.** `findfirst(==(7), [1, 2, 3])` no encuentra nada y devuelve `nothing`, cuyo tipo es `Nothing`. Así que `findfirst` puede devolver un `Int64` o un `Nothing`: su resultado es de tipo `Union{Nothing, Int64}`, un tipo que es «uno de estos dos». Con `x === nothing` se comprueba cuál ha llegado.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio, con los mismos tipos que Julia, incluido `Punto{T}`. Lo que aún no sabe (`bitstring`, `subtypes`, `Union`, los tipos de 32 bits o sin signo) te lo dice y te manda a la nube.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| El tipo de un valor | `typeof(42)` → `Int64` | `type(42)` → `int` | `class(42)` → `"numeric"`, `typeof(42)` → `"double"` |
| ¿Es de este tipo? | `42 isa Integer` | `isinstance(42, int)` | `is.integer(42)` → `FALSE` (`42L` sí) |
| Un método para cada tipo | despacho múltiple: `f(x::Integer)`, `f(x::AbstractFloat)` | un método por clase, o `functools.singledispatch` (solo por el primer argumento) | S3: `f.integer`, `f.numeric`, por la clase del primer argumento |
| Contenedor de un solo tipo | `Vector{Float64}` | `numpy.array([...], dtype = float)` (una lista guarda cualquier cosa) | un vector atómico (`c(1, 2.5)` es todo `double`) |

En Python y en R, los números de siempre no se parecen a los de Julia: el `int` de Python no tiene límite de tamaño (no da la vuelta, pero es más lento), y en R `42` es un decimal; el entero se escribe `42L`. Y el despacho de Python y R mira solo el primer argumento; el de Julia, todos a la vez.
:::

## Conexiones

- Los tipos de *Julia como calculadora* (`Int64`, `Float64`, la vuelta de los enteros) son las hojas del árbol de este capítulo.
- `struct` y los métodos para tipos propios eran los de *Tipos propios*; aquí se les añade un parámetro.
- `Vector{Float64}`, `Dict{String, Int64}` y `Rational{Int64}`, que el visualizador escribe desde el principio, son tipos con parámetros.
- El `InexactError` de `push!(v, 4.5)` es el de las faltas de *Tipos propios*; el `MethodError`, el de `media` con un vector.
- `Bool <: Integer` explica por qué `sum` y `count` de una máscara cuentan los `true` (*Índices, filtros y el punto*).
- La promoción de `[1, 2.5]` es la misma que hacía `1 + 2.5` en *Julia como calculadora*.

## La grieta

Hemos visto que Julia elige un método según el tipo de un argumento. Pero `+` no tiene uno, sino dos argumentos: ¿cómo elige entre sumar un entero con un decimal, un decimal con una fracción o un vector con otro? ¿Y qué pasa si dos métodos encajan igual de bien? Elegir mirando los tipos de todos los argumentos a la vez es el **despacho múltiple**, y es el capítulo siguiente.

## Ejercicios

1. **Predice el tipo.** ¿De qué tipo es el resultado de cada una? `1 + 2.0`, `3//1 + 1`, `2^3`, `2.0^3`, `7 ÷ 2` y `7 / 2`. Compruébalo con `typeof`.

2. **Otros caminos.** Cambia la sección 2 para subir desde `Float64`, desde `Bool` y desde `String`. ¿Por qué tipos pasa cada uno? ¿Dónde se juntan `Float64` y `Bool`?

3. **Un método más.** Añade a la sección 3 el método `que_es(x::Bool) = "un lógico"`. ¿Qué dice ahora `que_es(true)`? ¿Y `que_es(7)`? ¿Cuántos métodos tiene `que_es`?

4. **Predice.** ¿De qué tipo son `[1, true]`, `[1, 2//3]` y `[1.5, 2//3]`? ¿Qué escribe Julia para cada uno?

5. **Un punto en el espacio.** Define `Punto3{T<:Real}` con tres campos, `x`, `y` y `z`, y una función `distancia` para él. ¿Qué dan `Punto3(1, 2, 2)` y su distancia? ¿Y `Punto3{Float64}(1, 2, 2)`?

6. **El doble de cualquier número.** Define `doble(x::Number) = 2 * x`. ¿Qué dan `doble(true)`, `doble(3//4)` y `doble("dos")`? ¿De qué tipo es `doble(true)`?

::::{div}
:class: afondo
7. **La invarianza.** Define `suma(v::Vector{Real}) = sum(v)` y llama a `suma([1, 2])`. ¿Por qué falla? Arréglalo con `Vector{<:Real}` y prueba con `[1, 2]` y con `[1.5, 2.0]`. ¿Con qué vector funcionaría la primera versión?

8. **Dos parámetros.** Define `struct Pareja{A, B}` con los campos `primero::A` y `segundo::B`, sin cotas. ¿Qué tipo tienen `Pareja(1, "uno")` y `Pareja(2.5, 'x')`? ¿Por qué aquí no hay error con dos tipos distintos, y con `Punto(1, 2.5)` sí?
::::

## Solucionario

1. `Float64` (el entero se promociona), `Rational{Int64}` (el 1 se convierte en `1//1`), `Int64` (una potencia de enteros sigue siendo entera), `Float64`, `Int64` (`÷` es la división entera) y `Float64` (`/` siempre da decimales, aunque la división sea exacta).
2. `Float64` pasa por `AbstractFloat`, `Real`, `Number` y `Any`; `Bool`, por `Integer`, `Real`, `Number` y `Any`; `String`, por `AbstractString` y `Any`. `Float64` y `Bool` se juntan en `Real`: los dos son números reales. `String` no se junta con ellos hasta `Any`, la raíz.
3. `que_es(true)` da `"un lógico"`: `Bool` está más abajo en el árbol que `Integer`, así que su método es más específico. `que_es(7)` sigue dando `"un entero"`, porque un `Int64` no es un `Bool`. Ahora `que_es` tiene 5 métodos.
4. `[1, true]` es un `Vector{Int64}`, `[1, 1]`: `true` se convierte en el entero 1. `[1, 2//3]` es un `Vector{Rational{Int64}}`, y Julia lo escribe `Rational{Int64}[1, 2//3]` (el 1 es `1//1`). `[1.5, 2//3]` es un `Vector{Float64}`: `[1.5, 0.6666666666666666]`, porque una fracción y un decimal se promocionan a decimal.
5. `Punto3(1, 2, 2)` es un `Punto3{Int64}(1, 2, 2)`, y su distancia, `sqrt(1 + 4 + 4)`, es `3.0`. `Punto3{Float64}(1, 2, 2)` convierte los tres a decimales: `Punto3{Float64}(1.0, 2.0, 2.0)`.
6. `doble(true)` da `2`, un `Int64`: `true` es un número (`Bool <: Number`), y `2 * true` es el entero 2. `doble(3//4)` da `3//2`. `doble("dos")` da `MethodError: no method matching doble(::String)`: un texto no es un `Number`.

::::{div}
:class: afondo
7. `suma([1, 2])` da `MethodError: no method matching suma(::Vector{Int64})`: un `Vector{Int64}` no es un `Vector{Real}`, aunque `Int64` sea un `Real` (la invarianza). Con `suma(v::Vector{<:Real})`, `suma([1, 2])` da `3` y `suma([1.5, 2.0])`, `3.5`. La primera versión solo funcionaría con un vector que sea de verdad un `Vector{Real}`, como `Real[1, 2.5]`.
8. `Pareja(1, "uno")` es un `Pareja{Int64, String}`, y `Pareja(2.5, 'x')`, un `Pareja{Float64, Char}`. No hay error porque cada campo tiene su propio parámetro, `A` y `B`, que pueden ser distintos. En `Punto`, los dos campos comparten el mismo `T`, y un `T` no puede ser `Int64` y `Float64` a la vez.
::::
