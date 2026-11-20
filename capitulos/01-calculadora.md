---
title: Julia como calculadora
subtitle: Expresiones, nombres y los tipos de datos básicos
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

Las calculadoras de bolsillo tienen una tecla discreta, **M+**, que guarda el resultado en la memoria para recuperarlo después con **MR**. Sirve para no copiar números a mano entre una cuenta y la siguiente. Pero solo hay una memoria, y nada dice qué guarda.

## La pregunta

¿Cómo se guarda un resultado con un **nombre** que diga qué es, para usarlo más tarde? ¿Y qué clase de cosas se pueden guardar, además de números?

## La idea

Julia lee **expresiones** y las evalúa: escribes `3 * 4`, Julia contesta `12`. Para guardar un resultado se le da un nombre con el signo igual: `total = 3 * 4` se lee «total recibe 3 por 4». A partir de ahí, `total` vale 12 en cualquier expresión.

Cada valor tiene además un **tipo**, y Julia lo lleva siempre consigo. `12` es un número entero (`Int64`), `12.0` es un número decimal (`Float64`), `"doce"` es un texto (`String`) y `true` es un valor lógico (`Bool`). Para nosotros, `12` y `12.0` son el mismo número. Para Julia son dos valores de tipos distintos, y lo dice al escribirlos.

:::{important} El nombre guarda el valor, no la cuenta
`total = 3 * 4` guarda el **resultado**, 12, no la fórmula. Si después cambias algo de lo que se usó para calcularlo, `total` no se entera. En esto Julia no se parece a una hoja de cálculo.
:::

## Construcción

### 1 · Las operaciones

Los operadores son los de siempre. La división entera tiene los suyos: `÷` da el cociente y `%` el resto. El signo `÷` se escribe con `\div` seguido del tabulador, o con la función `div(7, 2)`.

```{code-cell} julia
7 + 2
7 / 2
7 ^ 2
7 ÷ 2
7 % 2
2 + 3 * 4 ^ 2
```

Las respuestas son `9`, `3.5`, `49`, `3`, `1` y `50`. La última sigue el orden de siempre: primero la potencia (`4 ^ 2` = 16), después el producto (`3 * 16` = 48) y al final la suma. Si quieres otro orden, usa paréntesis: `(2 + 3) * 4` da `20`.

Fíjate en la división: `/` da **siempre** un decimal, aunque la cuenta sea exacta. `7 / 7` da `1.0`, no `1`. Si quieres un entero, usa `÷`: `7 ÷ 7` da `1`.

Julia trae las funciones matemáticas habituales. Se escriben con su nombre y el valor entre paréntesis: `sqrt(16)` da `4.0`, `abs(-4)` da `4` y `exp(1)` da `2.718281828459045`. Para redondear se dice cuántos decimales se quieren: `round(3.14159, digits = 2)` da `3.14`. `log(100)` es el logaritmo neperiano; para otra base, la base va **delante**: `log(10, 100)` da `2.0`.

Y una comodidad de matemático: un número pegado a un nombre se multiplica, como en la pizarra. Si `x` vale 3, `2x + 1` da `7`.

### 2 · Dar nombre a un resultado

:::{tip} Predice
En el programa de abajo el precio cambia de 40 a 50 en la línea 5. ¿Cuánto vale `final` en la última línea: 34.0 o 42.5?
:::

```{code-cell} julia
precio = 40
descuento = 0.15
final = precio * (1 - descuento)
final
precio = 50
final
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/01-calculadora-1.json","config":{"columnas":["precio","descuento","final"],"etiqueta":"asignación · =","fila_en":"cada_linea","idea":"final se calcula una vez, en la línea 3, con el precio de entonces. Cambiar precio después no recalcula final: Julia guardó el número, no la fórmula.","titulo":"El nombre guarda el valor"}}
```

`final` sigue valiendo 34.0. Para que use el precio nuevo hay que volver a ejecutar la línea 3. Fíjate también en la línea 4: escribir solo un nombre hace que Julia muestre su valor en la consola. Así se consulta una variable.

Y mira las etiquetas de la memoria. `precio` es un `Int64`, porque 40 es un entero. `descuento` es un `Float64`. Y `final` también es un `Float64`, y por eso se escribe `34.0` y no `34`: al multiplicar un entero por un decimal, Julia da un decimal.

:::{note} Lo que se ve en la consola
En el REPL, la ventana donde se escribe Julia línea a línea, Julia muestra el valor de **cada** línea, también el de las asignaciones. Si la línea termina en punto y coma, no lo muestra. En los visualizadores del libro solo se ve el valor de las líneas que no son asignaciones, como si todas ellas terminaran en punto y coma. Así la consola enseña solo lo que has pedido ver.
:::

Los nombres pueden llevar letras, números, guiones bajos y el signo `!`, y no pueden empezar por número. Julia distingue mayúsculas de minúsculas: `Precio` y `precio` son dos variables distintas. Y las letras pueden ser de cualquier alfabeto: `α = 0.05` es un nombre válido. Se escribe `\alpha` seguido del tabulador, como en LaTeX. La constante `π` ya viene definida, y vale lo que tiene que valer.

### 3 · Los tipos básicos

Todo valor tiene un tipo, y `typeof()` lo dice. Los básicos son estos:

| Tipo | Ejemplos | Para qué |
|---|---|---|
| `Int64` | `17`, `-3`, `0` | números enteros |
| `Float64` | `1.74`, `3.0`, `-0.5` | números con decimales (de coma flotante) |
| `String` | `"Lucía"`, `"3"` | texto, siempre entre comillas dobles |
| `Char` | `'a'`, `'3'` | un solo carácter, entre comillas simples |
| `Bool` | `true`, `false` | el resultado de una comparación |

El 64 de `Int64` y `Float64` son los bits que ocupa cada número en la memoria. En el apartado «A fondo» verás qué consecuencias tiene.

:::{tip} Predice
`parse(Float64, "3.5")` convierte un texto en número. ¿Qué crees que dará `parse(Float64, "hola")`: un error, un cero o algo distinto?
:::

```{code-cell} julia
edad = 17
altura = 1.74
nombre = "Lucía"
mayor = edad >= 18
parse(Float64, "3.5")
x = tryparse(Float64, "hola")
parse(Float64, "hola")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/01-calculadora-2.json","config":{"etiqueta":"tipos · conversión","idea":"Mira la etiqueta de cada variable: Int64, Float64, String, Bool. parse() convierte un texto en número; si no puede, tryparse() devuelve nothing y parse() da un error.","titulo":"Cada valor, con su tipo"}}
```

`parse(Float64, "3.5")` convierte el texto en número sin problema. Con `"hola"` hay dos caminos. `tryparse()` lo intenta y, si no puede, devuelve `nothing`, el valor de Julia para decir «aquí no hay nada»: mira `x` en la memoria. `parse()`, en cambio, se niega: da un **error** y el programa se detiene en esa línea. Julia prefiere pararse a seguir con un número inventado.

Entre números también se convierte, pero con la misma exigencia. `trunc(Int, 3.9)` corta los decimales y da `3`; `round(Int, 3.9)` redondea y da `4`. En cambio, `Int(3.9)` da un error, porque 3.9 no es un entero y Julia no decide por ti si cortar o redondear. `Int(3.0)` sí funciona: da `3`. Y en la otra dirección, `string(42)` da el texto `"42"`.

::::{div}
:class: afondo
### 4 · Cómo guarda Julia un número

Julia guarda los `Float64` en **coma flotante de doble precisión**: 64 bits por número, el estándar IEEE 754 que usan casi todos los lenguajes. Con 64 bits caben unos 15 o 16 dígitos significativos, y muchos decimales que parecen sencillos, como 0,1, no tienen representación exacta en binario. Por eso pasa esto:

```{code-cell} julia
a = 0.1 + 0.2
a == 0.3
a ≈ 0.3
1 / 0
0 / 0
1//10 + 2//10 == 3//10
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/01-calculadora-3.json","config":{"etiqueta":"a fondo · coma flotante","idea":"Julia escribe a tal como es: 0.30000000000000004. Por eso la comparación con == da false. ≈ compara con una tolerancia, y las fracciones // son exactas.","titulo":"0.1 + 0.2 no es 0.3"}}
```

Julia no esconde la diferencia: escribe `0.30000000000000004`, porque siempre escribe los dígitos justos para que el número se pueda recuperar exacto. La lección práctica es **no comparar decimales con `==`**. Para comparar con una tolerancia está `≈` (se escribe `\approx` y tabulador), que es lo mismo que la función `isapprox()`.

Si necesitas cuentas exactas con fracciones, Julia tiene un tipo para ellas, `Rational`: `1//10` es la fracción un décimo, guardada como dos enteros. `1//10 + 2//10` da `3//10`, exacto.

Hay además valores especiales que conviene distinguir:

- `Inf` y `-Inf`, el infinito: `1 / 0` da `Inf`. Julia no se detiene con un error.
- `NaN` (*not a number*), un resultado indefinido: `0 / 0` da `NaN`. Ni siquiera es igual a sí mismo: `NaN == NaN` da `false`.
- `missing`, un dato que falta. Contagia todo lo que toca: `missing + 1` es `missing`, e incluso `missing > 3` es `missing`, porque no se sabe.

Los enteros también tienen un límite, y aquí Julia se comporta distinto que R o Python. El mayor `Int64` es `typemax(Int64)`, 9 223 372 036 854 775 807. Si lo sobrepasas, Julia **da la vuelta** sin avisar: `typemax(Int64) + 1` da `-9223372036854775808`, el menor. Es el precio de la velocidad: comprobar cada suma costaría tiempo. Por eso `10^19` da un número negativo. Cuando haga falta, `big()` pasa a enteros sin límite: `big(typemax(Int64)) + 1` da `9223372036854775808`.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
Guardar un resultado y comparar decimales:

| | Julia | Python | R |
|---|---|---|---|
| Asignar | `x = 0.1 + 0.2` | `x = 0.1 + 0.2` | `x <- 0.1 + 0.2` |
| ¿Es igual a 0.3? | `x == 0.3` da `false` | `x == 0.3` da `False` | `x == 0.3` da `FALSE` |
| Comparar con tolerancia | `x ≈ 0.3` | `math.isclose(x, 0.3)` | `isTRUE(all.equal(x, 0.3))` |
| ¿Qué tipo tiene? | `typeof(x)` da `Float64` | `type(x)` da `float` | `class(x)` da `"numeric"` |

Los tres lenguajes guardan los decimales con el mismo estándar, así que fallan exactamente igual en la comparación directa. Cambia la forma de escribirlo, no el fondo.
:::

## Conexiones

- Los **tipos** son el corazón de Julia. Aquí solo has visto los básicos; en la parte IV verás que Julia elige qué código ejecutar según el tipo de cada valor, y que por eso es tan rápida.
- Los valores **lógicos** de las comparaciones serán la base de los filtros y de las decisiones con `if`.
- El `missing` volverá en el análisis de datos: los datos reales están llenos de huecos.

## La grieta

Hasta ahora cada nombre guarda un único valor. Pero las notas de una clase, las temperaturas de un mes o los precios de una tienda son muchos valores del mismo tipo. ¿Hay que inventar un nombre para cada uno? En el capítulo siguiente, [Vectores y rangos](02-vectores.md), la respuesta es que no.

## Ejercicios

1. **El cociente y el resto.** ¿Qué dan `7 ÷ 2` y `7 % 2`? ¿Cómo usarías `%` para saber si un número es par?

2. **El orden de las operaciones.** Predice y después comprueba: `2 + 3 * 4 ^ 2`, `(2 + 3) * 4` y `-2^2`.

3. **Traza a mano.** ¿Qué muestra la última línea?

   ```julia
   x = 5
   y = x * 2
   x = 1
   y
   ```

4. **Los tipos.** ¿Qué devuelve `typeof()` con cada uno de estos valores: `3`, `3.0`, `"3"`, `'3'` y `3 > 2`?

5. **De km/h a m/s.** Guarda una velocidad de 72 km/h en una variable y calcula, en otra, su valor en metros por segundo. ¿Por qué sale `20.0` y no `20`?

6. **Convertir sin perder nada.** ¿Qué dan `Int(3.0)`, `trunc(Int, 3.9)`, `round(Int, 3.9)` e `Int(3.9)`?

::::{div}
:class: afondo
7. **La raíz que no vuelve.** ¿Qué da `sqrt(2)^2 == 2`? Escribe una comparación que sí diga que son iguales.

8. **Dar la vuelta.** ¿Qué da `2^64`? ¿Y `2.0^64`? Explica la diferencia.
::::

## Solucionario

1. `3` y `1`. Un número es par cuando el resto al dividirlo entre 2 es 0: `n % 2 == 0`. Julia trae además la función `iseven(n)`, que dice lo mismo.
2. `50` (primero la potencia, después el producto, al final la suma), `20` y `-4`. En `-2^2` la potencia va antes que el signo menos: es `-(2^2)`.
3. `10`. `y` se calculó con el valor que tenía `x` en la segunda línea. Cambiar `x` después no la recalcula.
4. `Int64`, `Float64`, `String`, `Char` y `Bool`.
5. Por ejemplo, `v_kmh = 72` y `v_ms = v_kmh * 1000 / 3600`, que da `20.0`. Sale un decimal porque `/` da siempre un `Float64`, aunque la división sea exacta. Con `v_kmh * 1000 ÷ 3600` saldría el entero `20`.
6. `3`, `3`, `4` y un error (`InexactError`). 3.9 no es un entero, y `Int()` no corta ni redondea: para eso están `trunc()` y `round()`.

::::{div}
:class: afondo
7. `false`, porque `sqrt(2)` no se guarda exacto y al elevarlo al cuadrado sale `2.0000000000000004`. La comparación con tolerancia es `sqrt(2)^2 ≈ 2`, que da `true`.
8. `2^64` da `0`. Los dos números son `Int64`, y 2⁶⁴ no cabe en 64 bits: la cuenta da la vuelta y lo que queda es 0. `2.0^64` es un `Float64`, que tiene mucho más alcance (aunque menos precisión), y da `1.8446744073709552e19`.
::::
