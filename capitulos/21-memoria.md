---
title: "Memoria: copias y vistas"
subtitle: Cuándo dos nombres son el mismo objeto, y cuándo un trozo no copia nada
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

La pregunta ha ido saliendo por todo el libro. En *Vectores y rangos*, `b = a` no copiaba el vector: le ponía un segundo nombre. En *Índices, filtros y el punto*, un trozo como `notas[2:4]` sí era un vector nuevo. En *Funciones*, `aprueba_todos!(notas)` cambiaba el vector de fuera, porque la función recibía el mismo. En *Tipos propios*, `copia = biel` no creaba otra ficha, y en *Tablas de datos*, `clase.nota` daba la columna misma, sin copiarla. Y la grieta de *Metaprogramación* dejaba la última pista: `@view` promete trozos que no copian nada.

## La pregunta

¿Qué hace de verdad una asignación? ¿Cómo se sabe si dos nombres son el mismo objeto o solo dos objetos iguales? ¿Qué copia `copy`, y qué se deja sin copiar? ¿Y cómo puede un trozo de un vector no ser una copia?

## La idea

Una variable es una **etiqueta**, no una caja. Los vectores, las matrices y las fichas viven en la memoria, cada uno en su sitio, y un nombre solo dice a cuál de ellos señala. `b = a` pega una etiqueta más en el mismo objeto. Hay dos formas muy distintas de «cambiar» algo: **pegar la etiqueta en otro objeto** (`w = …`) o **cambiar las casillas del objeto** (`w[1] = …`, `w .+= 1`, `push!(w, …)`). Lo primero solo afecta a ese nombre; lo segundo se ve desde todos los nombres que señalan al objeto.

`copy` hace un objeto nuevo, pero de un solo piso: si dentro hay otros objetos, la copia señala a los mismos. `deepcopy` copia todos los pisos. Y una **vista** es un objeto sin casillas propias: es una ventana a las casillas de otro.

:::{important} Dos preguntas distintas
`a == b` pregunta si tienen los mismos valores. `a === b` pregunta si son **el mismo objeto**. Los visualizadores marcan con «↔» los nombres que señalan al mismo objeto, y con «vista de» las ventanas a las casillas de otro.
:::

## Construcción

### 1 · Igual no es lo mismo

:::{tip} Predice
`c` es una copia de `a`. ¿Qué dará `c == a`? ¿Y `c === a`, con tres signos de igual?
:::

```{code-cell} julia
a = [1, 2, 3]
b = a
b[1] = 100
a
a === b
c = copy(a)
c == a, c === a
c[2] = 0
a
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/21-memoria-1.json","config":{"etiqueta":"== · ===","idea":"== compara los valores; === pregunta si son el mismo objeto de la memoria. b = a da otro nombre al mismo vector, y copy(a) hace otro vector con los mismos valores: igual, pero no el mismo.","titulo":"Igual no es lo mismo"}}
```

Lo de las tres primeras líneas ya lo conoces: `b = a` no copia, y `b[1] = 100` cambia el vector que comparten los dos nombres. Lo nuevo es `===`. Con dos signos, `==`, Julia compara los **valores**, casilla a casilla. Con tres, `===`, pregunta otra cosa: si los dos nombres señalan al **mismo objeto** de la memoria. `a === b` da `true`, porque son dos etiquetas en el mismo vector.

`c = copy(a)` crea un vector nuevo, con los mismos valores. Por eso `c == a` da `true` y `c === a` da `false`: son iguales, pero no son el mismo. El visualizador no los une con «↔». Y `c[2] = 0` cambia `c`, pero `a` se queda como estaba.

Con los números, las dos preguntas dan lo mismo: `5 === 5` es `true`, porque un número no es un objeto que se pueda cambiar por dentro, y da igual si hay uno o dos.

### 2 · Pegar una etiqueta o cambiar las casillas

:::{tip} Predice
`w = w .+ 10` y `w .+= 10` parecen la misma cosa. ¿Cambia `v` con alguna de las dos?
:::

```{code-cell} julia
v = [1, 2, 3]
w = v
w = w .+ 10
v
w = v
w .+= 10
v
x = 5
y = x
y += 1
x
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/21-memoria-2.json","config":{"etiqueta":"etiqueta · casillas","idea":"w = w .+ 10 calcula un vector nuevo y le pega la etiqueta w: v no se entera. w .+= 10 escribe en las casillas del vector que ya tiene la etiqueta w, que es el de v.","titulo":"Pegar una etiqueta o cambiar las casillas"}}
```

Con `w = v`, los dos nombres señalan al mismo vector. Pero `w = w .+ 10` no toca ese vector: `w .+ 10` **calcula uno nuevo**, `[11, 12, 13]`, y el `=` pega la etiqueta `w` en él. `v` sigue en el de antes, que no ha cambiado, y el visualizador ya no los une.

`w .+= 10` es otra cosa. Es `w .= w .+ 10`, y el `.=` no pega ninguna etiqueta: **escribe en las casillas** del vector que ya tiene. Como ese vector es el de `v`, ahora `v` vale `[11, 12, 13]`. La diferencia entre las dos líneas es un solo punto, y por eso conviene leerla despacio: un `=` solo pega una etiqueta; un `.=`, un índice como `w[1] =` o una función con `!` cambian el objeto.

Con los números, `y += 1` es `y = y + 1`: calcula un número nuevo y le pega la etiqueta `y`. `x` sigue valiendo 5. No hay forma de cambiar un número por dentro, así que con ellos nunca hay sorpresas.

### 3 · Una copia de un solo piso

:::{tip} Predice
`copia` es una copia de `clase`. Si cambias las faltas de `copia[1]`, ¿cambian también las de `clase[1]`?
:::

```{code-cell} julia
mutable struct Ficha
    nombre::String
    faltas::Int
end
clase = [Ficha("Ana", 0), Ficha("Biel", 2)]
copia = copy(clase)
copia[1].faltas = 5
clase[1]
copia[2] = Ficha("Carla", 1)
clase[2]
profunda = deepcopy(clase)
profunda[1].faltas = 0
clase[1]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/21-memoria-3.json","config":{"etiqueta":"copy · deepcopy","idea":"copy copia el vector, pero no las fichas que guarda: la copia señala a las mismas fichas. deepcopy copia también todo lo que cuelga de él.","titulo":"Una copia de un solo piso"}}
```

Sí cambian: `clase[1]` también tiene ahora 5 faltas. `copy(clase)` hace un vector nuevo, pero no copia las fichas que hay dentro. Cada casilla de un vector de fichas guarda **a qué ficha señala**, y `copy` copia eso, las señales. Así que `copia[1]` y `clase[1]` son la misma ficha, y el visualizador lo marca en cada casilla con «↔». Es una **copia superficial**, de un solo piso.

El vector sí es otro. `copia[2] = Ficha("Carla", 1)` cambia una casilla de `copia`, que pasa a señalar a una ficha nueva, y `clase[2]` sigue siendo Biel. Cambiar una casilla del vector copiado no afecta al original; cambiar por dentro algo que los dos comparten, sí.

`deepcopy` copia todos los pisos: el vector y también cada ficha. `profunda[1]` es otra Ana, con sus propias faltas, y ponerle 0 no cambia la Ana de `clase`, que sigue con 5. Con un vector de números no hace falta: los números no son objetos que se cambien por dentro, y `copy` ya basta.

### 4 · Un trozo copia, una vista no

:::{tip} Predice
`t = v[2:4]` y `w = @view v[2:4]` dan los mismos tres números. Si cambias su primera casilla, ¿cambia `v` en algún caso?
:::

```{code-cell} julia
v = [10, 20, 30, 40, 50]
t = v[2:4]
t[1] = 0
v
w = @view v[2:4]
w[1] = 0
v
w
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/21-memoria-4.json","config":{"etiqueta":"trozo · vista","idea":"v[2:4] copia las casillas en un vector nuevo. @view v[2:4] no copia nada: es una ventana a las casillas 2, 3 y 4 de v, y escribir en ella es escribir en v.","titulo":"Un trozo copia, una vista no"}}
```

`t = v[2:4]` es el trozo de *Índices, filtros y el punto*: un vector **nuevo** con una copia de las casillas 2, 3 y 4. Cambiar `t[1]` no toca `v`.

`w = @view v[2:4]` no copia nada. Una **vista** es un objeto sin casillas propias: guarda a qué vector mira (`parent(w)` es `v`) y qué casillas le tocan. `w[1]` *es* `v[2]`, y escribir `w[1] = 0` es escribir en `v[2]`. El visualizador dibuja `w` con sus tres casillas y, debajo de cada una, la de `v` que es en realidad.

Julia escribe la vista como lo que es: `3-element view(::Vector{Int64}, 2:4) with eltype Int64`, «una vista de un `Vector{Int64}` con los índices `2:4`». Su tipo es `SubArray`, un trozo que comparte las casillas, como el `SubString` de *Cadenas y caracteres* compartía los bytes del texto. `@view` es una macro, como las del capítulo anterior: recibe el código `v[2:4]` y lo cambia por `view(v, 2:4)`.

### 5 · Lo que una función puede cambiar

:::{tip} Predice
`sube` y `sube!` hacen la misma cuenta. ¿Cuál cambia `notas`? ¿Y qué casillas cambia `sube!(@view notas[1:2])`?
:::

```{code-cell} julia
function anota!(v, x)
    push!(v, x)
    return nothing
end
function sube(v)
    v = v .+ 1
    return v
end
function sube!(v)
    v .+= 1
    return nothing
end
notas = [5, 7, 4]
anota!(notas, 9)
sube(notas)
notas
sube!(@view notas[1:2])
notas
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/21-memoria-5.json","config":{"etiqueta":"funciones · vistas","idea":"La función recibe el mismo objeto que se le pasa. Si es una vista, lo que cambia la función son las casillas del vector de fuera.","titulo":"Lo que una función puede cambiar"}}
```

Una función recibe **el mismo objeto** que se le pasa, como en *Funciones*: dentro de `anota!`, `v` es otro nombre para `notas`, y `push!` le añade un 9. `sube` hace lo del principio de la sección 2: `v = v .+ 1` calcula un vector nuevo y le pega la etiqueta local `v`. La función lo devuelve, `[6, 8, 5, 10]`, y `notas` no cambia. `sube!` usa `.+=`, que escribe en las casillas del vector que recibe.

La última llamada no le pasa `notas`, sino una vista de sus dos primeras casillas. Dentro de la función, `v` es esa vista (la llamada se ve como `sube!(v = [5, 7])`), y `v .+= 1` escribe en sus casillas, que son las de `notas`. Por eso cambian `notas[1]` y `notas[2]`, y nada más. Es la forma de dejar que una función trabaje solo en una parte de un vector: ni la función tiene que saber que es una parte, ni hay que copiar nada y luego volver a colocarlo.

Si en lugar de la vista le pasaras `notas[1:2]`, la función cambiaría una copia que nadie guarda, y `notas` se quedaría igual.

::::{div}
:class: afondo
### 6 · La memoria, a fondo

**`===` y `objectid`.** Para los objetos que se pueden cambiar, `a === b` mira si son el mismo objeto; `objectid(a)` da un número que identifica el objeto, y es el mismo para dos nombres que señalan a él. Para los valores que no se pueden cambiar (números, tuplas, fichas de un `struct` sin `mutable`), `===` compara su contenido, bit a bit: dos tuplas `(1, 2)` son `===` aunque se escriban en sitios distintos, porque no hay forma de distinguirlas.

**`ismutable`.** `ismutable(x)` dice si `x` es un objeto que se puede cambiar por dentro: `true` para vectores, matrices, diccionarios y fichas de un `mutable struct`; `false` para números, caracteres, tuplas, rangos y `struct` normales. Hay dos sorpresas: `ismutable("hola")` da `true`, porque por dentro un texto es un objeto de la memoria, aunque Julia no te deje cambiarlo; y una vista da `false`, porque lo que se cambia no es la vista, sino el vector al que mira.

**Las vistas y el rendimiento.** Un trozo copia las casillas, y copiar cuesta memoria. Con un vector de 10 000 números, `sum(v[2:end])` pide unos 80 000 bytes para la copia; `sum(@view v[2:end])`, ninguno. Es lo que medía `@allocated` en *Rendimiento*. `@views` delante de una función, de un bucle o de una línea cambia todos sus trozos por vistas de una vez. No siempre gana: una vista de casillas sueltas, como `view(v, [3, 1, 4])`, es más lenta de recorrer que un vector propio, y si vas a usar el trozo muchas veces, a veces compensa copiarlo una vez.

**Otras formas de compartir.** Muchas operaciones devuelven un objeto que comparte las casillas con otro, sin copiarlas: `vec(A)`, `reshape(A, …)` y la traspuesta `A'` de *Matrices*; `clase.nota` en *Tablas de datos* (mientras que `clase[:, :nota]` copia); los `SubString` de `split`; y `view(A, :, 2)`, una columna de una matriz. Para lo contrario, copiar sin crear un objeto nuevo, está `copyto!(destino, origen)`, que escribe los valores de `origen` en las casillas de `destino`.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio, con los mismos pasos que en Julia: `===`, `copy`, `deepcopy` (también con fichas compartidas), `ismutable`, `parent` y las vistas de un vector (con un rango, `:`, un vector de índices o un filtro) o de una fila o una columna de una matriz, con `view` o con `@view`. Lo que no sabe hacer te lo dice y te manda a la nube: la vista de otra vista, las vistas de dos dimensiones o de una sola casilla, y `@views`.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| `b = a`, y después `b[1] = 100` | `a` cambia: es el mismo vector | `a` cambia: es la misma lista | `a` no cambia: R copia al modificar |
| ¿Son el mismo objeto? | `a === b` | `a is b` | no se pregunta: `tracemem(a)` avisa cuando se copia |
| Un trozo, `a[2:4]` | copia | copia (en una lista) | copia |
| Un trozo sin copiar | `@view a[2:4]` | el trozo de un array de NumPy, `x[1:4]` | no hay |
| Copia de un piso y de todos | `copy`, `deepcopy` | `copy.copy`, `copy.deepcopy` | no hace falta: todo se copia al modificar |
| Una función que cambia lo que recibe | sí, por convenio con `!` | sí | no: cambia una copia |

Julia y Python se parecen mucho: los dos pasan etiquetas, no copias, y los dos distinguen «igual» (`==`) de «el mismo» (`===` y `is`). La diferencia está en los trozos: en Python, el trozo de una lista copia, como en Julia, pero el de un array de NumPy es una vista, como `@view`, y quien viene de NumPy se sorprende de que en Julia `v[2:4]` copie. R sigue otra política, **copiar al modificar**: dos nombres pueden compartir un vector mientras nadie lo cambia, pero en cuanto uno lo modifica, R le da su propia copia. Por eso en R una función nunca cambia el vector de fuera. Comprobado con Python 3.13, NumPy 2.5 y R 4.3.3.
:::

## Conexiones

- `b = a` de *Vectores y rangos* y `copia = biel` de *Tipos propios* son la misma cosa: una etiqueta más en el mismo objeto. `===` es la forma de preguntarlo.
- Los trozos de *Índices, filtros y el punto* copian; las vistas de este capítulo, no. El `.=` de ese capítulo es lo que escribe en las casillas sin pegar etiquetas nuevas.
- El convenio del `!` de *Funciones* avisa de que una función cambia sus casillas; con una vista, puedes elegir qué casillas le dejas cambiar.
- `vec`, `reshape` y `A'` de *Matrices*, `clase.nota` de *Tablas de datos* y el `SubString` de *Cadenas y caracteres* comparten las casillas de otro objeto, como una vista.
- `@allocated`, de *Rendimiento*, mide lo que ahorra una vista, y `@view`, como las macros de *Metaprogramación*, reescribe el código antes de ejecutarlo.

## La grieta

En la sección 4, si escribes `w[4]`, la vista no tiene cuarta casilla y Julia se detiene con un `BoundsError`. Y en todo el libro han salido otros: `MethodError`, `UndefVarError`, `InexactError`, `DomainError`. Hasta ahora, cada error ha detenido el programa. ¿Se puede **atrapar** un error y seguir? ¿Se puede lanzar uno propio, con un mensaje que diga qué ha ido mal? ¿Y cómo se comprueba, con un programa, que otro programa hace lo que debe? Es la parte V, que empieza con *Errores y pruebas*.

## Ejercicios

1. **Otra etiqueta.** Escribe `x = [1, 2]`, `y = x` y después `x = [3, 4]`. ¿Cuánto vale `y`? ¿Qué da `x === y`? ¿Por qué no es como `x[1] = 3`?

2. **Igual o el mismo.** Con `a = [1, 2, 3]` y `b = copy(a)`, ¿qué dan `a == b` y `a === b`? Después, `b[1] = 0`. ¿Qué da ahora `a == b`?

3. **Un punto de diferencia.** Con `v = [1, 2, 3]` y `w = v`, haz `w .*= 2` y mira `v`. Después, `w = w .* 2`. ¿Cuánto valen `v` y `w` al final?

4. **Una copia superficial.** Con la `Ficha` de la sección 3, escribe `equipo = [Ficha("Ana", 0), Ficha("Biel", 1)]` y `c = copy(equipo)`. Cambia `c[2].faltas = 3` y mira `equipo[2]`. Después, `push!(c, Ficha("Carla", 0))`. ¿Cuántas fichas tienen `equipo` y `c`?

5. **Una vista con paso.** Con `v = collect(1:6)`, escribe `w = @view v[2:2:6]` y `w .= 0`. ¿Cómo queda `v`? Después, `t = v[1:2]` y `t[1] = 99`. ¿Cuánto vale `v[1]`?

6. **Predice.** Define `function pon_cero!(x) x[1] = 0; return nothing end` y `v = [5, 6, 7]`. ¿Qué queda en `v` después de `pon_cero!(v[2:3])`? ¿Y después de `pon_cero!(@view v[2:3])`?

::::{div}
:class: afondo
7. **Lo que cuesta un trozo.** En la nube o en tu ordenador, define `s(v) = sum(v[2:end])` y `sv(v) = sum(@view v[2:end])`, y `z = collect(1:10_000)`. Llama una vez a cada una y después mide `@allocated s(z)` y `@allocated sv(z)`. ¿Qué dan? ¿De dónde sale el primer número?

8. **Una caja dos veces.** Con `mutable struct Caja n::Int end`, escribe `k = Caja(1)`, `u = [k, k]` y `d = deepcopy(u)`. Cambia `d[1].n = 5`. ¿Cuánto valen `d[2].n` y `u[1].n`? ¿Qué da `d[1] === d[2]`?
::::

## Solucionario

1. `y` sigue valiendo `[1, 2]`, y `x === y` da `false`. `x = [3, 4]` crea un vector nuevo y le pega la etiqueta `x`; `y` sigue en el de antes. Con `x[1] = 3`, en cambio, se cambiaría una casilla del vector que comparten, y `y` lo vería.
2. `a == b` da `true` y `a === b`, `false`: los mismos valores en dos vectores distintos. Después de `b[1] = 0`, `a == b` da `false`, y `a` sigue siendo `[1, 2, 3]`.
3. `w .*= 2` escribe en las casillas del vector de `v`, que pasa a ser `[2, 4, 6]`. `w = w .* 2` calcula un vector nuevo, `[4, 8, 12]`, y le pega la etiqueta `w`. Al final, `v` vale `[2, 4, 6]` y `w`, `[4, 8, 12]`.
4. `equipo[2]` es `Ficha("Biel", 3)`: `copy` copió el vector, no las fichas, y `c[2]` es la misma ficha que `equipo[2]`. Después de `push!`, `equipo` tiene 2 fichas y `c`, 3: añadir una casilla cambia el vector `c`, que sí es otro.
5. `v` queda `[1, 0, 3, 0, 5, 0]`: la vista mira las casillas 2, 4 y 6, y `w .= 0` escribe en ellas. `t` es una copia, así que `t[1] = 99` no toca `v`, y `v[1]` sigue valiendo `1`.
6. Después de `pon_cero!(v[2:3])`, `v` sigue siendo `[5, 6, 7]`: la función puso un 0 en una copia que nadie guarda. Después de `pon_cero!(@view v[2:3])`, `v` es `[5, 0, 7]`: la primera casilla de la vista es `v[2]`.

::::{div}
:class: afondo
7. `@allocated s(z)` da unos 80 000 bytes (80 072 con Julia 1.13), y `@allocated sv(z)`, `0`. El trozo `z[2:end]` es un vector nuevo de 9 999 números de 8 bytes, 79 992 bytes, y unos pocos más para la cabecera del vector. La vista no copia ninguno. Se llama primero una vez a cada función para que la medida no cuente la compilación, como en *Rendimiento*.
8. `d[2].n` vale `5` y `u[1].n`, `1`; `d[1] === d[2]` da `true`. `deepcopy` copia la caja una sola vez y recuerda que ya la ha copiado: como en `u` las dos casillas señalaban a la misma caja, en `d` las dos señalan a la misma copia. El original no cambia.
::::
