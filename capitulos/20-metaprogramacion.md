---
title: Metaprogramación
subtitle: El código también es un dato, que se puede mirar, cambiar y ejecutar
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *Tablas de datos* escribiste `clase[2, :nota]`, con un **símbolo**: un nombre que Julia guarda tal cual, sin buscar ninguna variable que se llame así. Y desde entonces han ido saliendo palabras con una `@` delante: `@formula` en *Datos y estadística*, `@which` en *Despacho múltiple*, `@time` y `@eval` en *Rendimiento*. La grieta de ese capítulo dejaba la pista: `@time` no recibe un valor, sino el código mismo.

## La pregunta

¿Cómo puede un programa tener en la mano un trozo de código sin ejecutarlo? ¿Qué forma tiene ese código por dentro? ¿Se puede cambiar, o construir pieza a pieza, y ejecutarlo después? ¿Y qué es de verdad una macro, como `@time`?

## La idea

Antes de ejecutar nada, Julia lee el texto del programa y lo convierte en un **árbol**: cada operación es un nodo, con sus datos colgando debajo. `a + b * 2` es un nodo `+` con dos ramas, `a` y otro nodo, `b * 2`. Ese árbol es un valor de Julia como cualquier otro, de tipo `Expr`: se puede guardar en una variable, mirar, cambiar y, cuando se quiera, **ejecutar** con `eval`.

Escribir `:( … )` alrededor de un trozo de código da su árbol en lugar de su resultado. Dentro, `$x` mete el **valor** que tiene `x` en ese momento. Y una **macro** es una función que recibe código y devuelve código: Julia la ejecuta al leer la línea y pone en su lugar el código que devuelve.

:::{important} Un programa que escribe programas
Para Julia, el código es un dato más, del tipo `Expr`. Un programa puede fabricar código, cambiarlo y ejecutarlo: eso es la **metaprogramación**. Los visualizadores dibujan cada expresión como el árbol que Julia guarda en la memoria.
:::

## Construcción

### 1 · El código como dato

:::{tip} Predice
`a` y `b` no existen. ¿Dará error la primera línea? Y si no lo da, ¿qué crees que guarda `ex`?
:::

```{code-cell} julia
ex = :(a + b * 2)
typeof(ex)
ex.head
ex.args
ex.args[3]
typeof(ex.args[2])
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/20-metaprogramacion-1.json","config":{"etiqueta":"expresiones","idea":"Con :( … ) alrededor, Julia no calcula a + b * 2: guarda el código. Es un árbol de tipo Expr, con una cabeza (head) que dice qué clase de código es y unos argumentos (args) que cuelgan de ella.","titulo":"Una expresión es un árbol"}}
```

La primera línea no da error, aunque `a` y `b` no existan, porque no se calcula nada. Los dos puntos y el paréntesis, `:( … )`, le piden a Julia el código mismo: `ex` es una **expresión**, de tipo `Expr`. El visualizador la dibuja como el árbol que Julia guarda. Arriba, la **cabeza** (`ex.head`), `:call`: es una llamada a una función. Debajo, sus **argumentos** (`ex.args`), en orden: la función que se llama, `:+`, y los dos datos a los que se aplica, `:a` y otra expresión, `:(b * 2)`.

`ex.args` es un vector de verdad, un `Vector{Any}`, con tres casillas. `ex.args[3]` es otra `Expr`, con su propia cabeza `:call` y sus tres argumentos: `:*`, `:b` y `2`. Por eso es un árbol: unas expresiones cuelgan de otras. La multiplicación queda más abajo que la suma porque se hace antes; el árbol ya lleva dentro la prioridad de las operaciones, sin paréntesis.

Las hojas son **símbolos**, como el `:nota` de *Tablas de datos*: `typeof(ex.args[2])` es `Symbol`. Un símbolo es un nombre sin buscar. En el árbol, `:a` no es el valor de `a`, sino el nombre `a`, que se buscará cuando el código se ejecute.

### 2 · Ejecutar y cambiar el código

:::{tip} Predice
`eval(ex)` ejecuta la expresión. Después de cambiar su primer argumento por `:*`, ¿qué dará `eval(ex)` la segunda vez?
:::

```{code-cell} julia
x = 10
ex = :(x + 1)
eval(ex)
ex.args[1] = :*
ex
eval(ex)
otra = Expr(:call, :-, :x, 3)
eval(otra)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/20-metaprogramacion-2.json","config":{"etiqueta":"eval","idea":"eval ejecuta una expresión como si su código estuviera escrito en el programa principal, con los valores de ese momento. Y como una Expr es un objeto que se puede cambiar, el mismo ex da otro resultado después de tocarle un argumento.","titulo":"Ejecutar una expresión"}}
```

`eval(ex)` ejecuta el código guardado en `ex`, `x + 1`, y da `11`: busca `x` en el programa principal, que vale 10. Es lo mismo que si la línea dijera `x + 1`.

`ex.args[1] = :*` cambia la primera casilla de los argumentos, la función que se llama. El visualizador marca la hoja que cambia: el árbol es el mismo objeto, pero ahora es `:(x * 1)`. Una `Expr` se puede cambiar por dentro, como un vector, y la segunda vez `eval(ex)` da `10`.

`Expr(:call, :-, :x, 3)` construye una expresión **pieza a pieza**: primero la cabeza y luego los argumentos, en el mismo orden en que salen en el árbol. Es la misma expresión que escribir `:(x - 3)`, y `eval(otra)` da `7`. Escrita así, sin `:( … )`, una expresión se puede fabricar con piezas que solo se conocen cuando el programa ya está en marcha.

### 3 · Construir código con `$`

:::{tip} Predice
`sin_dolar` y `con_dolar` solo se diferencian en un `$`. ¿Qué guarda cada una? Y después del bucle, ¿cómo será `suma`?
:::

```{code-cell} julia
n = 3
sin_dolar = :(x ^ n)
con_dolar = :(x ^ $n)
suma = :(0)
for i in 1:3
    suma = :($suma + $i)
end
suma
eval(suma)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/20-metaprogramacion-3.json","config":{"columnas":["i","suma"],"etiqueta":"interpolación","fila_en":"fin_iteracion","idea":"Dentro de :( … ), $n no deja el nombre n: mete el valor que n tiene en ese momento. En el bucle, $suma mete la expresión de la vuelta anterior, que queda como una rama de la nueva: el árbol crece hacia arriba.","titulo":"Meter valores en el código"}}
```

`sin_dolar` guarda el nombre `n`: el árbol tiene la hoja `:n`, que se buscaría al ejecutarlo. `con_dolar` guarda el número `3`, el valor que tenía `n` al escribir la línea. Es la **interpolación**, con el mismo `$` que en los textos de *Cadenas y caracteres*: allí `"$n"` mete el valor de `n` en un texto, y aquí, en un trozo de código.

El bucle construye una suma pieza a pieza. `suma` empieza siendo `:(0)`, que no es una expresión, sino el número 0: un número solo no necesita árbol. En cada vuelta, `:($suma + $i)` hace una expresión **nueva**, con la `suma` de la vuelta anterior como primera rama y el valor de `i` como segunda. El visualizador enseña el árbol creciendo hacia arriba: `0 + 1`, luego `(0 + 1) + 2` y luego `((0 + 1) + 2) + 3`.

Julia escribe los paréntesis porque el árbol es así: cada suma cuelga de la siguiente. Si escribieras tú `0 + 1 + 2 + 3`, Julia lo leería como una sola llamada a `+` con cuatro argumentos, un árbol más plano. Los dos dan `6` con `eval`, pero no son el mismo código.

### 4 · Una macro propia

:::{tip} Predice
`@dime x + 1` tiene que escribir el texto `x + 1` y su valor. ¿Podría hacerlo una función normal, `dime(x + 1)`? ¿Qué recibiría?
:::

```{code-cell} julia
macro dime(ex)
    return :(println($(string(ex)), " = ", $(esc(ex))))
end
x = 5
@dime x + 1
@dime x * x - 1
@macroexpand @dime x + 1
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/20-metaprogramacion-4.json","config":{"etiqueta":"macros","idea":"Una macro recibe el código de la línea sin ejecutarlo, como una Expr, y devuelve otro código, que Julia ejecuta en su lugar. @macroexpand enseña ese código sin ejecutarlo.","titulo":"Código que recibe código"}}
```

Una función normal recibiría `6`: Julia calcula `x + 1` antes de llamarla, y el texto `x + 1` se pierde. Una **macro** se escribe con `macro` en lugar de `function` y recibe el código sin calcular: con `@dime x + 1`, el argumento `ex` es la expresión `:(x + 1)`.

`@dime` devuelve otra expresión, una llamada a `println` con tres cosas: el texto del código, `string(ex)`, que es `"x + 1"`; el separador `" = "`, y el código mismo, `esc(ex)`. Julia ejecuta ese código en lugar de la línea, y en la consola aparece `x + 1 = 6`. Con `@dime x * x - 1`, `x * x - 1 = 24`. Es lo que hace `@show`, que trae Julia.

`@macroexpand` enseña el código en que se convierte la llamada, sin ejecutarlo: `:(Main.println("x + 1", " = ", x + 1))`. `esc(ex)` marca el código del que llama: queda tal cual, `x + 1`, y se calcula con su `x`. Lo demás es código de la macro, y Julia le pone delante el módulo donde está definida, `Main.println`: así, la macro usa siempre el `println` de Julia, aunque quien la llama tenga una variable que se llame igual. Es la **higiene** de las macros.

### 5 · Código que escribe funciones

:::{tip} Predice
El programa no escribe `doble(x) = 2 * x` en ninguna parte. Después del bucle, ¿existirá `doble`? ¿Y `triple` y `cuadruple`?
:::

```{code-cell} julia
for (nombre, factor) in [:doble => 2, :triple => 3, :cuadruple => 4]
    @eval $nombre(x) = $factor * x
end
doble(5)
triple(5)
cuadruple(2.5)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/20-metaprogramacion-5.json","config":{"etiqueta":"@eval","idea":"En cada vuelta, @eval construye el código de una función, con el nombre y el factor de esa vuelta, y lo ejecuta. Ejecutar el código de una definición es definir la función: el bucle escribe tres funciones.","titulo":"Un bucle que define funciones"}}
```

`@eval` es `eval` con `:( … )` alrededor: interpola los `$` y ejecuta el resultado. En la primera vuelta, `nombre` es el símbolo `:doble` y `factor` es `2`, así que el código que se construye es `doble(x) = 2x`, y ejecutarlo es **definir** la función `doble`. El visualizador enseña cómo aparece en la memoria. En la segunda vuelta se define `triple`, y en la tercera, `cuadruple`.

Después, son funciones como las demás: `doble(5)` da `10`, `triple(5)` da `15` y `cuadruple(2.5)` da `10.0`. El visualizador no entra en ellas al llamarlas, porque su código no está en el programa: lo ha escrito el programa mientras corría.

Julia se hace a sí mismo así en muchos sitios. En su propio código, `Base`, hay bucles de `@eval` que recorren una lista de operadores (`:+`, `:-`, `:*`…) y definen el mismo método para todos, en lugar de escribirlo una vez por operador. Son los métodos de *Despacho múltiple*, escritos por un programa.

::::{div}
:class: afondo
### 6 · Más allá de una línea

**`quote … end`.** Para un trozo de código de varias líneas, `:( … )` se queda corto, y se usa un bloque `quote … end`. Su `Expr` tiene la cabeza `:block`, y Julia guarda en ella, entre línea y línea, de qué línea del archivo viene cada una (un `LineNumberNode`): los mensajes de error lo usan para decir dónde ha fallado algo. Las macros de verdad suelen devolver un bloque así.

**`Meta.parse` y `dump`.** `Meta.parse("x^2 + 1")` lee un texto como lo leería Julia y da su expresión, `:(x ^ 2 + 1)`, sin ejecutarla. `dump(ex)` escribe el árbol entero, nivel a nivel, con el tipo de cada hoja:

```julia
julia> dump(:(a + b * 2))
Expr
  head: Symbol call
  args: Array{Any}((3,))
    1: Symbol +
    2: Symbol a
    3: Expr
      head: Symbol call
      args: Array{Any}((3,))
        1: Symbol *
        2: Symbol b
        3: Int64 2
```

**Cuándo trabaja una macro.** Una macro se ejecuta **al leer** el código, no al ejecutarlo. Si `@dime` está dentro de un bucle de mil vueltas, Julia la expande una sola vez, antes de empezar el bucle, y lo que repite mil veces es el código que ha devuelto. Por eso una macro puede preparar trabajo sin coste en cada vuelta, como hace `@time` con su cronómetro.

**La higiene, a fondo.** Si una macro asigna una variable sin `esc`, como `macro pon_cero(n) :($n = 0) end`, Julia le cambia el nombre por uno que nadie puede escribir: `@macroexpand @pon_cero z` da algo como `:(var"#1#z" = 0)`, y después `z` sigue sin existir. Así, una macro no pisa por sorpresa las variables de quien la usa. Con `$(esc(n)) = 0`, la asignación es del que llama, y `@pon_cero z` crea `z`.

**Las macros de Julia.** Muchas herramientas de Julia son macros: `@time` y `@btime` rodean el código de un cronómetro; `@show`, como `@dime`; `@view` y `@views` cambian los trozos de una matriz por vistas (el capítulo siguiente); `@.` pone el punto en todas las operaciones de una línea (`@. y = 2x + 1`); `@assert` comprueba una condición y, si falla, dice cuál; `@test`, en los paquetes de pruebas, enseña los dos lados de una comparación que no se cumple. La guía de estilo del manual de Julia avisa, aun así, de no abusar de ellas: si algo puede ser una función, mejor una función. Una macro solo hace falta cuando hay que trabajar con el código, no con sus valores.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio, con los mismos pasos que en Julia: `:( … )` con `$`, `Expr`, `eval`, `Meta.parse`, `dump`, las macros que devuelven una expresión con `esc`, `@macroexpand` y `@eval`. El laboratorio escribe las expresiones exactamente como Julia, comprobado con cientos de expresiones al azar. Lo que no sabe hacer te lo dice y te manda a la nube: los bloques `quote … end`, las macros que asignan sin `esc` (la higiene les cambia el nombre), las macros que escriben algo mientras se expanden y las macros dentro de otras macros.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| El código como dato | `:(a + b * 2)`, de tipo `Expr` | `ast.parse("a + b * 2")`, un árbol del módulo `ast` | `quote(a + b * 2)`, de clase `"call"` |
| Sus piezas | `ex.args`: `:+`, `:a`, `:(b * 2)` | `BinOp(left=Name(id='a', …), op=Add(), right=BinOp(…))` | `as.list(e)`: `` `+` ``, `a`, `b * 2` |
| Ejecutarlo | `eval(ex)` | `eval(compile(arbol, "<e>", "eval"))` | `eval(e)` |
| Meter un valor | `:(x ^ $n)` | construir los nodos a mano | `bquote(x ^ .(n))` |
| Recibir el código de un argumento | una macro, `macro dime(ex)` | no se puede: una función recibe valores | `substitute(x)` dentro de la función |

R se parece mucho a Julia: guarda `a + b * 2` como una llamada a `` `+` `` con dos argumentos, y sus funciones pueden quedarse con el código de lo que reciben, porque R no calcula los argumentos hasta que se usan. Python también lee su código como un árbol, pero de otra forma, con nodos de muchas clases (`BinOp`, `Name`, `Constant`), y no tiene macros: un decorador de Python transforma una función ya hecha, no su código. Comprobado con Python 3.13 y R 4.3.3.
:::

## Conexiones

- Los símbolos de *Tablas de datos*, como `:nota`, son las hojas de los árboles de este capítulo: nombres que todavía no se han buscado.
- El `$` de los textos de *Cadenas y caracteres* y el de las expresiones hacen lo mismo: meter un valor de ahora en algo que se escribe.
- Los métodos de *Despacho múltiple* se pueden definir con un bucle de `@eval`, como hace el propio Julia con los operadores.
- `@time`, de *Rendimiento*, es una macro: recibe el código, lo rodea de un cronómetro y lo ejecuta.
- Una `Expr` se cambia por dentro como un vector de *Vectores y rangos*: `ex.args` es un `Vector{Any}`, y `ex.args[1] = :*` cambia una casilla.

## La grieta

En la sección 3, cada `suma` nueva guardaba dentro la de la vuelta anterior, sin copiarla. Entonces, si después cambias esa rama, ¿cambia también la expresión de fuera? ¿Cuándo una asignación hace una copia y cuándo solo pone otro nombre al mismo objeto? Y `@view`, otra macro, promete trozos de una matriz que no copian nada. Es el capítulo siguiente: *Memoria: copias y vistas*.

## Ejercicios

1. **Otro árbol.** Escribe `ex = :(2x + 3y)`. ¿Cuántos argumentos tiene? ¿Qué es `ex.args[2]`, y de qué tipo? Dibuja el árbol antes de mirarlo.

2. **Cambiar las hojas.** Con `x = 10`, `y = 5` y `ex = :(x + 1)`, haz `ex.args[2] = :y` y evalúa `ex`. Después, `ex.args[3] = 100`. ¿Qué escribe Julia al mostrar `ex` cada vez? ¿Y qué da `eval(ex)`?

3. **Predice.** Con `k = 2`, escribe `e1 = :(k * 10)` y `e2 = :($k * 10)`. Después, cambia `k = 5`. ¿Qué dan `eval(e1)` y `eval(e2)`? ¿Por qué no dan lo mismo?

4. **Un producto.** Copia el bucle de la sección 3, pero empieza con `p = :(1)` y construye `:($p * $i)` para `i` de 1 a 4. ¿Cómo escribe Julia `p` al final? ¿Qué da `eval(p)`?

5. **Tu macro.** Escribe una macro `@cuadrado ex` que devuelva el código elevado al cuadrado, con `esc`. ¿Qué da `@cuadrado x + 1` con `x = 3`? ¿Y `@macroexpand @cuadrado x + 1`? Fíjate en los paréntesis.

6. **Una rama compartida.** Escribe `a = :(0 + 1)` y `b = :($a + 2)`. Después cambia `a.args[1] = :*`. ¿Cambia `b`? ¿Qué da `eval(b)`?

::::{div}
:class: afondo
7. **Generar métodos.** Con un bucle de `@eval` sobre `[:suma2 => :+, :resta2 => :-]`, define `suma2(a, b)` y `resta2(a, b)`, que apliquen el operador a sus dos argumentos. Pista: `$op(a, b)`. ¿Qué dan `suma2(5, 3)` y `resta2(5, 3)`?

8. **La higiene.** En la nube o en tu ordenador, define `macro pon_cero(n) return :($n = 0) end` y prueba `@macroexpand @pon_cero z`, y después `@pon_cero z` y `z`. Haz lo mismo con `$(esc(n)) = 0` en lugar de `$n = 0`. ¿Qué cambia?
::::

## Solucionario

1. Tres argumentos: `:+`, `:(2x)` y `:(3y)`. `ex.args[2]` es `:(2x)`, otra expresión, de tipo `Expr`: la multiplicación `2 * x`, que Julia escribe pegada, `2x`, como en el programa. El árbol es un nodo `:call` con la función `:+` y dos ramas, cada una un `:call` con `:*`, el número y la letra.
2. Con `ex.args[2] = :y`, Julia escribe `:(y + 1)` y `eval(ex)` da `6`. Con `ex.args[3] = 100`, `:(y + 100)`, y `eval(ex)` da `105`. Cada cambio toca una hoja del mismo árbol.
3. `eval(e1)` da `50` y `eval(e2)` da `20`. `e1` guarda el nombre `k`, que se busca al ejecutar, cuando ya vale 5. `e2` guarda el número 2, el valor que tenía `k` al construirla: Julia la escribe `:(2 * 10)`.
4. Julia la escribe `:((((1 * 1) * 2) * 3) * 4)`, y `eval(p)` da `24`, el factorial de 4.
5. Una forma:

   ```julia
   macro cuadrado(ex)
       return :($(esc(ex))^2)
   end
   ```

   `@cuadrado x + 1` da `16`, y `@macroexpand @cuadrado x + 1`, `:((x + 1) ^ 2)`. Los paréntesis no los ha escrito nadie: la potencia cuelga de la suma en el árbol, y Julia los pone al escribirlo. Es la diferencia con pegar textos: `"x + 1" * "^2"` daría `x + 1^2`, que es otra cosa.
6. Sí: `b` pasa a ser `:(0 * 1 + 2)`, y `eval(b)` da `2`. `b` no guardó una copia de `a`, sino la misma expresión, como rama. Al cambiar `a` por dentro, cambia la rama de `b`. (Julia ya no escribe los paréntesis, porque la multiplicación va antes que la suma.)

::::{div}
:class: afondo
7. Una forma:

   ```julia
   for (nombre, op) in [:suma2 => :+, :resta2 => :-]
       @eval $nombre(a, b) = $op(a, b)
   end
   ```

   `suma2(5, 3)` da `8` y `resta2(5, 3)` da `2`. En la primera vuelta, el código que se construye es `suma2(a, b) = a + b`: `$op(a, b)` con `op = :+` es la llamada `+(a, b)`, que Julia escribe `a + b`.
8. Sin `esc`, `@macroexpand @pon_cero z` da algo como `:(var"#1#z" = 0)`, con un nombre que ha inventado Julia, y después `z` da `UndefVarError: z not defined`: la macro ha creado otra variable. Con `esc`, da `:(z = 0)`, y `z` vale `0`. La higiene protege las variables de quien usa la macro; `esc` dice cuándo la macro quiere tocarlas a propósito. El laboratorio no imita el cambio de nombre y te manda a la nube.
::::
