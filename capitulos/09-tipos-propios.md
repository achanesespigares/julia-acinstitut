---
title: Tipos propios
subtitle: Ponerle nombre a tus datos y escribir funciones para ellos
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En la secretaría de un instituto, cada alumna tiene su ficha: nombre, curso y nota. Todas las fichas tienen los mismos apartados, en el mismo orden, y nadie confunde una ficha de alumna con una factura o con un horario, aunque las tres sean papeles con datos.

Un programa también trabaja con cosas así: alumnas, cuentas, puntos de un plano, figuras. Hasta ahora las has guardado en tuplas o en vectores sueltos. Funciona, pero Julia no sabe que esa tupla es una alumna, y tú tienes que acordarte de qué va en cada posición.

## La pregunta

¿Puedo crear mi propio tipo de dato, con su nombre y sus campos, como `Alumna`? ¿Puedo decidir si sus datos se pueden cambiar? ¿Y escribir funciones que sepan trabajar con él?

## La idea

Un **tipo propio** se define con `struct`, su nombre y sus campos, cada uno con su tipo:

```julia
struct Alumna
    nombre::String
    curso::Int
    nota::Float64
end
```

Es un molde. Los valores se crean llamando al tipo como a una función, `Alumna("Ana", 2, 9.0)`, y sus campos se leen con un punto, `ana.nota`. Las funciones se escriben para un tipo poniéndolo en el argumento, `media(e::Expediente)`, y una misma función puede tener un **método** distinto para cada tipo.

:::{important} Un struct no se puede cambiar; un mutable struct, sí
Por defecto, un valor de un tipo propio es **inmutable**: una vez creado, sus campos no cambian. Si necesitas cambiarlos, defínelo con `mutable struct`. Esa elección cambia también qué es copiar: dos nombres pueden señalar el **mismo** objeto mutable, como pasaba con los vectores.
:::

## Construcción

### 1 · Una ficha con nombre

:::{tip} Predice
`Alumna` dice que la nota es un `Float64`, y la línea 6 le da un 9 entero. ¿Qué guardará Julia en el campo? ¿Y qué pasará en la última línea, que intenta cambiar la nota?
:::

```{code-cell} julia
struct Alumna
    nombre::String
    curso::Int
    nota::Float64
end
ana = Alumna("Ana", 2, 9)
n = ana.nombre
aprobada = ana.nota >= 5
t = typeof(ana)
ana.nota = 10.0
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/09-tipos-propios-1.json","config":{"etiqueta":"struct","idea":"struct define un tipo nuevo, con sus campos y el tipo de cada uno. Los valores se crean llamando al tipo, Alumna(…), y los campos se leen con un punto. Un struct es inmutable: sus campos no se pueden cambiar.","titulo":"La ficha de Ana"}}
```

La definición ocupa cinco líneas, pero es **una sola sentencia**: de `struct` a `end`. Después de ejecutarla existe el tipo `Alumna`, pero ninguna alumna todavía. El visualizador lo dibuja como una variable más, porque el nombre `Alumna` señala ese molde.

`Alumna("Ana", 2, 9)` crea un valor del tipo, dando un valor a cada campo en el orden en que se definieron. El 9 entero se guarda como `9.0`: cada campo tiene su tipo, y Julia **convierte** el valor al tipo del campo al construir. Si no pudiera, por ejemplo con un texto donde va un número, daría un error.

Los campos se leen con un punto, como en las tuplas con nombre: `ana.nombre` es `"Ana"`, y `ana.nota >= 5` se entiende sin saber en qué posición está la nota. `typeof(ana)` da `Alumna`: para Julia es un tipo tan de verdad como `Int64` o `String`.

La última línea falla con ``setfield!: immutable struct of type Alumna cannot be changed``. Un `struct` es **inmutable**: no se pueden cambiar sus campos. Si la nota cambia, se crea otra alumna, `ana = Alumna("Ana", 2, 10.0)`.

### 2 · Fichas que cambian: mutable struct

:::{tip} Predice
`copia = biel` y después `copia.faltas = 5`. ¿Cuántas faltas tendrá `biel`? Piensa en lo que pasaba con `b = a` en los vectores.
:::

```{code-cell} julia
mutable struct Ficha
    nombre::String
    faltas::Int
end
biel = Ficha("Biel", 0)
biel.faltas += 1
copia = biel
copia.faltas = 5
biel
biel.faltas = 2.5
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/09-tipos-propios-2.json","config":{"etiqueta":"mutable struct","idea":"Los campos de un mutable struct se pueden cambiar con =. Asignarlo a otro nombre no lo copia: los dos nombres señalan el mismo objeto. Cada campo conserva su tipo: un Int no admite un 2.5.","titulo":"Las faltas de Biel"}}
```

Con `mutable struct` los campos sí se pueden cambiar: `biel.faltas += 1` suma una falta, y el visualizador marca el tipo como **mutable**.

`copia = biel` no crea otra ficha: le da **otro nombre** a la misma, igual que `b = a` con un vector. Por eso, al cambiar `copia.faltas`, también cambia `biel.faltas`, y la consola escribe `Ficha("Biel", 5)`: es la forma en que Julia escribe un valor de un tipo propio, con su nombre y sus campos entre paréntesis.

La última línea intenta guardar 2.5 faltas, y Julia se detiene con ``InexactError: Int64(2.5)``. Que el objeto sea mutable deja cambiar los valores de sus campos, pero no sus tipos: `faltas` es un `Int`, y 2.5 no se puede convertir en un entero sin perder algo.

### 3 · Funciones para tu tipo

:::{tip} Predice
`media` está escrita para un `Expediente`. ¿Qué crees que pasará si se le da directamente un vector de notas?
:::

```{code-cell} julia
struct Expediente
    nombre::String
    notas::Vector{Float64}
end
media(e::Expediente) = sum(e.notas) / length(e.notas)
function informe(e::Expediente)
    m = media(e)
    return e.nombre * ": " * string(m)
end
ana = Expediente("Ana", [9.0, 6.5, 7.0])
m = media(ana)
texto = informe(ana)
media([9.0, 6.5])
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/09-tipos-propios-3.json","config":{"etiqueta":"f(x::Tipo)","idea":"Una función se escribe para un tipo poniendo ::Tipo en su argumento. Dentro, los campos se leen con un punto. Si la llamas con un valor de otro tipo, Julia no la ejecuta: no tiene ningún método para él.","titulo":"El expediente de Ana"}}
```

Un campo puede ser de cualquier tipo, también un vector: cada `Expediente` guarda un nombre y un vector de notas.

`media(e::Expediente)` dice que la función recibe un `Expediente`. Dentro, `e.notas` es el vector y la media sale como siempre: (9.0 + 6.5 + 7.0) / 3 = 7.5. `informe` usa a su vez `media`, y el visualizador abre un marco para cada llamada.

Escribir el tipo del argumento tiene dos ventajas. Quien lee la función sabe qué espera. Y Julia lo comprueba: la última línea llama a `media` con un vector, no con un expediente, y se detiene con ``MethodError: no method matching media(::Vector{Float64})``. La función existe, pero no tiene ningún **método** para un vector.

### 4 · Un nombre, varios métodos: el despacho múltiple

:::{tip} Predice
Hay dos funciones `area`, una para círculos y otra para rectángulos. En el bucle, ¿cómo sabe Julia cuál usar en cada vuelta?
:::

```{code-cell} julia
abstract type Figura end
struct Circulo <: Figura
    r::Float64
end
struct Rectangulo <: Figura
    base::Float64
    altura::Float64
end
area(c::Circulo) = π * c.r^2
area(r::Rectangulo) = r.base * r.altura
figuras = [Circulo(1), Rectangulo(2, 3)]
for f in figuras
    println(area(f))
end
total = sum(area.(figuras))
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/09-tipos-propios-4.json","config":{"etiqueta":"despacho múltiple","idea":"area tiene dos métodos, uno para cada tipo de figura. En cada llamada, Julia mira el tipo de los argumentos y elige el método que les corresponde. Un tipo abstracto, Figura, agrupa a los dos.","titulo":"Áreas de figuras"}}
```

`abstract type Figura end` crea un tipo **abstracto**: no tiene campos ni se pueden crear figuras sin más, pero sirve para agrupar. `Circulo <: Figura` dice que un círculo **es una** figura, y lo mismo el rectángulo. Por eso el vector `figuras` es un `Vector{Figura}`: un vector de figuras, de cualquier clase.

`area` no son dos funciones, sino una con **dos métodos**, y el visualizador lo dice: «2 métodos». En cada vuelta del bucle, Julia mira de qué tipo es `f` y elige el método que le corresponde: con el círculo, π · 1² = 3.141592653589793; con el rectángulo, 2 · 3 = 6.0. Esto se llama **despacho**: elegir el método por el tipo de los argumentos.

Lo potente es que nadie ha escrito un `if` que pregunte qué figura es. Para añadir triángulos basta con definir `struct Triangulo <: Figura` y su método `area(t::Triangulo)`, sin tocar lo que ya funciona. Y `area.(figuras)` aplica `area` a cada figura con el punto, de modo que `total` vale 9.141592653589793.

### 5 · Un struct que guarda un vector

:::{tip} Predice
`ana` es inmutable, pero uno de sus campos es un vector. ¿Funcionará `push!(ana.notas, 7.0)`? ¿Cambiará también la variable `notas`?
:::

```{code-cell} julia
struct Expediente
    nombre::String
    notas::Vector{Float64}
end
notas = [9.0, 6.5]
ana = Expediente("Ana", notas)
push!(ana.notas, 7.0)
notas
otra = Expediente("Ana", [9.0, 6.5, 7.0])
iguales = ana == otra
ana.notas = [10.0]
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/09-tipos-propios-5.json","config":{"etiqueta":"inmutable por fuera","idea":"Un struct inmutable no deja cambiar a qué vector señala su campo, pero el vector, que es mutable, sí puede cambiar por dentro. Al construir, Julia guarda el mismo vector, sin copiarlo.","titulo":"Inmutable, pero no del todo"}}
```

Al construir `ana` con la variable `notas`, Julia no copia el vector: el campo `ana.notas` y la variable `notas` son el **mismo vector**, y el visualizador los une con «↔».

`push!(ana.notas, 7.0)` funciona, aunque `ana` sea inmutable. Lo que no se puede cambiar es el campo, es decir, **qué** vector guarda. Pero el vector es mutable, y añadirle una nota lo cambia por dentro sin cambiar el campo. Como es el mismo vector, `notas` también tiene ahora tres notas. Por eso la consola escribe el mismo vector dos veces: una porque `push!` devuelve el vector cambiado, y otra al pedir `notas`.

`ana == otra` da `false`, aunque las dos digan lo mismo. En un tipo propio, `==` compara cada campo con `===`, «¿es exactamente el mismo?», y los dos vectores tienen las mismas notas pero son objetos distintos. Para comparar por contenido, compara los campos: `ana.notas == otra.notas` da `true`.

La última línea sí intenta cambiar el campo, que señale otro vector, y Julia lo impide: ``setfield!: immutable struct of type Expediente cannot be changed``.

::::{div}
:class: afondo
### 6 · Cómo guarda Julia un tipo propio

Un struct inmutable cuyos campos son números, como

```julia
struct Punto
    x::Float64
    y::Float64
end
```

es un tipo **de bits** (`isbitstype(Punto)` da `true`): un punto son sus dos números y nada más, `sizeof(Punto)` da 16 bytes. Un `Vector{Punto}` guarda los puntos uno detrás de otro, como una matriz de dos filas: mil puntos ocupan 16 000 bytes seguidos. Como un punto no puede cambiar, Julia puede copiarlo, guardarlo en los registros del procesador o meterlo dentro de un vector sin preocuparse de que alguien lo modifique por otro lado.

Con `mutable struct` es distinto. Cada objeto vive aparte en la memoria y tiene identidad propia, porque dos nombres pueden compartirlo. Un vector de mil puntos mutables guarda mil **direcciones**, de 8 bytes cada una (8 000 bytes), y cada punto está en otro sitio. Por eso Julia elige la inmutabilidad por defecto: es más rápida y más segura, y casi siempre basta.

Dos herramientas más para tus tipos:

- **Un constructor que comprueba.** Dentro del `struct` se puede escribir una función con el nombre del tipo que revise los datos antes de crear el valor con `new`:

  ```julia
  struct Alumna
      nombre::String
      curso::Int
      nota::Float64
      function Alumna(nombre, curso, nota)
          0 <= nota <= 10 || error("la nota debe estar entre 0 y 10")
          new(nombre, curso, nota)
      end
  end
  ```

  Ahora `Alumna("Ana", 2, 11)` se detiene con «la nota debe estar entre 0 y 10»: no puede existir una alumna con una nota imposible.
- **Escribirlo a tu manera.** `Base.show(io::IO, a::Alumna) = print(io, a.nombre, " (", a.curso, "º): ", a.nota)` añade un método a `show`, la función con la que Julia escribe los valores. Desde ese momento, una alumna se escribe `Ana (2º): 9.0`. Es despacho múltiple otra vez: le enseñas a una función de Julia a trabajar con tu tipo.

Los tipos de Julia están hechos así. Un rango `1:10` es un struct con dos campos (`fieldnames(UnitRange)` da `(:start, :stop)`), y un `Dict` es un struct con sus vectores de claves, valores y casillas. Tus tipos no son de segunda: Julia los trata igual que a los suyos.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R (S3) |
|---|---|---|---|
| Definir | `struct Alumna … end` | `@dataclass` `class Alumna:` | una lista con `class = "alumna"` |
| Crear | `Alumna("Ana", 2, 9.0)` | `Alumna("Ana", 2, 9.0)` | `structure(list(…), class = "alumna")` |
| Leer un campo | `a.nota` | `a.nota` | `a$nota` |
| Por defecto | inmutable | mutable | se copia al cambiarla |
| Métodos | fuera del tipo: `media(a::Alumna)` | dentro de la clase: `a.media()` | funciones genéricas: `print.alumna` |
| El método se elige por | el tipo de **todos** los argumentos | el del objeto, `self` | la clase del primer argumento |

En Python y en R, el método se elige por un solo objeto; en Julia, por todos los argumentos a la vez. Por eso se llama despacho **múltiple**, y es la idea en la que se apoya todo el lenguaje.
:::

## Conexiones

- Una tupla con nombre de *Tuplas y diccionarios* es casi un struct sin nombre: `(nombre = "Ana", nota = 9.0)` tiene campos, pero no un tipo propio para el que escribir métodos.
- `copia = biel` con un objeto mutable es lo mismo que `b = a` con un vector: dos nombres para el mismo objeto.
- La anotación `::Expediente` de los argumentos es la misma que, en *Funciones*, permitía que una función tuviera varios métodos.
- En la parte IV, *El sistema de tipos* y *Despacho múltiple* explican el árbol de tipos de Julia y cómo elige el método más específico.

## La grieta

Un vector de `Alumna` guarda toda la clase, pero cada pregunta exige un bucle o una comprensión: la media de los de segundo, las cinco mejores notas, cuántas aprueban por curso. Y los datos de verdad no se escriben a mano: llegan en una hoja de cálculo o en un archivo CSV. Hace falta una tabla con columnas con nombre, que se pueda filtrar, ordenar y agrupar: un *DataFrame*, en [Tablas de datos](10-tablas.md).

## Ejercicios

1. **Distancia.** Define `struct Punto` con dos campos `x::Float64` e `y::Float64`, y una función `distancia(p::Punto, q::Punto)`. ¿Cuánto da `distancia(Punto(0, 0), Punto(3, 4))`?

2. **Un contador.** Define `mutable struct Contador` con un campo `n::Int` y una función `suma!(c::Contador)` que le sume 1. Crea `c = Contador(0)` y llama tres veces a `suma!(c)`. ¿Qué vale `c`? ¿Por qué el nombre lleva `!`?

3. **Triángulos.** Añade al ejemplo de las figuras un tipo `Triangulo <: Figura`, con `base` y `altura`, y su método de `area`. ¿Cuánto da `sum(area.(figuras))` con `figuras = [Circulo(1), Rectangulo(2, 3), Triangulo(4, 5)]`?

4. **Iguales o no.** ¿Qué dan `Punto(1, 2) == Punto(1, 2)` y, con `mutable struct PuntoM` con los mismos campos, `PuntoM(1, 2) == PuntoM(1, 2)`? Explica la diferencia.

5. **La clase.** Con `clase = [Alumna("Ana", 2, 9.0), Alumna("Biel", 1, 4.5), Alumna("Carla", 2, 7.5)]`, obtén con una comprensión los nombres de las aprobadas y calcula la nota media de la clase.

6. **Predice.** ¿Qué vale `fichas[1].faltas` al final?

   ```julia
   fichas = [Ficha("Ana", 0), Ficha("Biel", 0)]
   f = fichas[1]
   f.faltas = 4
   fichas[1].faltas
   ```

::::{div}
:class: afondo
7. **Cuánto ocupa.** Compara `sizeof([Punto(i, i) for i in 1:1000])` con lo mismo para `PuntoM`, la versión mutable. Explica la diferencia con lo que guarda cada vector.

8. **Una nota imposible.** Escribe el constructor que comprueba la nota del «A fondo» y prueba `Alumna("Ana", 2, 11)` y `Alumna("Ana", 2, 9)`. ¿Qué escribe Julia en cada caso?
::::

## Solucionario

1. `distancia(p::Punto, q::Punto) = sqrt((p.x - q.x)^2 + (p.y - q.y)^2)`. `distancia(Punto(0, 0), Punto(3, 4))` da `5.0`. Los enteros 0, 3 y 4 se convierten en `Float64` al construir los puntos.
2. Con `function suma!(c::Contador); c.n += 1; end`, después de tres llamadas `c` vale `Contador(3)`. El `!` avisa, por convenio, de que la función cambia su argumento: aquí cambia el campo `n` del contador.
3. Con `area(t::Triangulo) = t.base * t.altura / 2`, `area.(figuras)` da `[3.141592653589793, 6.0, 10.0]` y la suma es `19.141592653589793`. No hace falta tocar los otros métodos.
4. `Punto(1, 2) == Punto(1, 2)` da `true`: los dos son inmutables y tienen los mismos campos, así que son el mismo valor. `PuntoM(1, 2) == PuntoM(1, 2)` da `false`: cada mutable es un objeto con identidad propia, y `==` (que en un tipo propio es `===`) pregunta si son el mismo objeto.
5. `[a.nombre for a in clase if a.nota >= 5]` da `["Ana", "Carla"]`, y `sum(a.nota for a in clase) / length(clase)` da `7.0`.
6. `4`. `fichas[1]` no da una copia: da la misma ficha que está en el vector, y `f` es otro nombre para ella. Cambiar `f.faltas` cambia la ficha del vector.

::::{div}
:class: afondo
7. El vector de `Punto` ocupa 16 000 bytes: guarda los mil puntos seguidos, 16 bytes cada uno. El de `PuntoM` ocupa 8 000: guarda mil direcciones de 8 bytes, y los puntos están en otra parte de la memoria (`sizeof` no los cuenta).
8. `Alumna("Ana", 2, 11)` se detiene con el error «la nota debe estar entre 0 y 10». `Alumna("Ana", 2, 9)` funciona y escribe `Alumna("Ana", 2, 9.0)`: `new` convierte el 9 en `9.0`, como el constructor normal.
::::
