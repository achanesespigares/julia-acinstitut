---
title: Decidir y repetir
subtitle: if para elegir, for y while para repetir, y break y continue para salir a tiempo
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

Cuando corriges un montón de exámenes, haces lo mismo con cada uno: miras la nota y decides qué poner en el boletín. Por encima de 9, sobresaliente; por encima de 7, notable; y así. Repites ese gesto hasta que se acaba el montón. Y a veces paras antes, por ejemplo cuando encuentras el examen que buscabas.

## La pregunta

¿Cómo se le dice a Julia que haga una cosa u otra según un valor? ¿Y cómo se repite un trabajo con cada elemento de un vector, o hasta que se cumpla una condición?

## La idea

Tres palabras bastan:

- **`if`** elige: ejecuta un bloque solo si una condición es `true`. Con `elseif` y `else` se encadenan alternativas, y gana **la primera** que se cumple.
- **`for`** repite un bloque **una vez por cada elemento**: `for nota in notas` da una vuelta con cada nota.
- **`while`** repite un bloque **mientras** una condición sea `true`. Sirve cuando no sabes cuántas vueltas hacen falta.

Todos los bloques terminan con `end`. Dentro de un bucle, `break` sale del bucle en el acto y `continue` salta a la vuelta siguiente.

:::{important} La condición tiene que ser `true` o `false`
Un `if` o un `while` necesitan **un solo** valor `Bool`. Con un vector de `true` y `false` no saben qué hacer:

```julia
notas = [9.0, 6.5, 4.0]
if notas .>= 5          # TypeError: non-boolean (BitVector) used in boolean context
```

Para preguntar por todas las casillas, usa una máscara como en el capítulo anterior (`notas[notas .>= 5]`), o `all(notas .>= 5)` y `any(notas .>= 5)`. Para decidir casilla a casilla, recorre el vector con un `for`.
:::

## Construcción

### 1 · Decidir con if

:::{tip} Predice
La nota es 7.5. ¿Cuántas condiciones comprueba Julia antes de decidir?
:::

```{code-cell} julia
nota = 7.5
if nota >= 9
    texto = "sobresaliente"
elseif nota >= 7
    texto = "notable"
elseif nota >= 5
    texto = "aprobado"
else
    texto = "suspenso"
end
estado = nota >= 5 ? "apto" : "no apto"
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/04-decidir-repetir-1.json","config":{"etiqueta":"if · elseif · else","idea":"Julia comprueba las condiciones de arriba abajo. En cuanto una es true, ejecuta su bloque y se salta todas las demás, sin mirarlas.","titulo":"Gana la primera que se cumple"}}
```

Julia comprueba `nota >= 9`, que es `false`, y pasa a la siguiente. `nota >= 7` es `true`: ejecuta `texto = "notable"` y salta directamente detrás del `end`. Las dos últimas ramas ni se miran. Por eso el orden importa: si la primera pregunta fuera `nota >= 5`, un 9.5 se quedaría en «aprobado».

Fíjate en que `texto` sigue existiendo después del `end`. Un `if` no crea un espacio propio para sus variables: lo que se asigna dentro se queda fuera.

La última línea es la forma corta de un `if` con dos ramas, el **operador ternario**: `condición ? valor_si_true : valor_si_false`. Se lee «¿la nota llega a 5? Entonces "apto"; si no, "no apto"». Va bien para elegir un valor; para bloques de varias líneas, mejor el `if` entero.

### 2 · Repetir con for

:::{tip} Predice
¿Qué valdrán `aprobados` y `suma` al terminar? Sigue la tabla de debajo vuelta a vuelta.
:::

```{code-cell} julia
notas = [9.0, 6.5, 4.0, 7.5, 3.0]
aprobados = 0
suma = 0.0
for nota in notas
    if nota >= 5
        aprobados += 1
        suma += nota
    end
end
media = suma / aprobados
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/04-decidir-repetir-2.json","config":{"columnas":["nota","aprobados","suma"],"etiqueta":"for · acumuladores","fila_en":"fin_iteracion","idea":"nota toma, una tras otra, cada casilla de notas. aprobados y suma se crean antes del bucle y van acumulando: cada vuelta parte de lo que dejó la anterior.","titulo":"Una vuelta por cada nota"}}
```

En cada vuelta, `nota` vale una casilla distinta: 9.0, 6.5, 4.0, 7.5 y 3.0. Dentro, el `if` decide si esa nota cuenta. La tabla enseña el estado al final de cada vuelta: en la tercera y la quinta no cambia nada, porque 4.0 y 3.0 no pasan el `if`.

`aprobados` y `suma` son **acumuladores**: se crean antes del bucle con su valor inicial (0 y 0.0) y cada vuelta les añade algo. `aprobados += 1` es la forma corta de `aprobados = aprobados + 1`. Al final, 3 aprobados que suman 23.0, y una media de 7.666666666666667.

`nota` es una variable **local** del bucle: se crea en cada vuelta y desaparece al terminar el `for`. Si después escribes `nota`, Julia responde que no existe.

:::{note} ¿Bucle o máscara?
Lo que acabas de hacer con un `for` se puede escribir con las máscaras del capítulo anterior: `count(notas .>= 5)` y `sum(notas[notas .>= 5])`. En R o en Python se suele preferir la versión con máscara, porque sus bucles son lentos. En Julia los bucles son tan rápidos como las operaciones con punto: elige la forma que se lea mejor.
:::

### 3 · Recorrer dos vectores a la vez

```{code-cell} julia
nombres = ["Ana", "Biel", "Carla"]
notas = [9.0, 4.0, 7.5]
for (nombre, nota) in zip(nombres, notas)
    if nota >= 5
        println(nombre, ": aprobado con ", nota)
    else
        println(nombre, ": suspenso")
    end
end
for (i, nota) in enumerate(notas)
    println(i, ". ", nota)
end
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/04-decidir-repetir-3.json","config":{"etiqueta":"for · parejas","idea":"zip junta los dos vectores casilla a casilla: en cada vuelta llega una pareja (nombre, nota). enumerate hace lo mismo con la posición: llega (1, 9.0), (2, 4.0)…","titulo":"zip y enumerate"}}
```

`zip(nombres, notas)` forma parejas: primero `("Ana", 9.0)`, después `("Biel", 4.0)` y por último `("Carla", 7.5)`. Al escribir `for (nombre, nota) in …`, Julia separa cada pareja en dos variables. Es como cerrar una cremallera, que es lo que significa *zip*.

`enumerate(notas)` da parejas con la posición delante: `(1, 9.0)`, `(2, 4.0)`, `(3, 7.5)`. Sirve cuando necesitas saber en qué casilla estás. Otra forma de tener la posición es recorrer los índices, `for i in eachindex(notas)`, y leer `notas[i]` dentro.

### 4 · Repetir mientras haga falta

:::{tip} Predice
Ahorras 15 euros cada semana y quieres llegar a 100. ¿Cuántas semanas hacen falta? ¿Y cuánto tendrás ahorrado al final, exactamente?
:::

```{code-cell} julia
ahorro = 0
semanas = 0
while ahorro < 100
    ahorro += 15
    semanas += 1
end
semanas
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/04-decidir-repetir-4.json","config":{"columnas":["semanas","ahorro"],"etiqueta":"while","fila_en":"fin_iteracion","idea":"Antes de cada vuelta, Julia vuelve a comprobar ahorro < 100. La vuelta en que ahorro llega a 105, la condición pasa a ser false y el bucle termina.","titulo":"Mientras falte"}}
```

Aquí no hay un vector que recorrer: no sabes de antemano cuántas vueltas hacen falta. El `while` comprueba la condición **antes** de cada vuelta. Tras la sexta semana hay 90 euros, que es menos de 100, así que da otra vuelta. Tras la séptima hay 105, la condición es `false` y el bucle termina: 7 semanas y 105 euros, no 100.

Un `while` necesita que algo cambie dentro del bucle para que la condición acabe siendo `false`. Si olvidas `ahorro += 15`, la condición es `true` para siempre y el programa no termina nunca. En el REPL se para con <kbd>Ctrl</kbd>+<kbd>C</kbd>.

### 5 · Salir antes: break y continue

:::{tip} Predice
Un −1 quiere decir «no presentado». ¿Qué casilla escribirá el programa?
:::

```{code-cell} julia
notas = [9.0, -1.0, 6.5, 4.0, 3.0]
for i in eachindex(notas)
    if notas[i] < 0
        continue
    end
    if notas[i] < 5
        println("Primer suspenso: casilla ", i)
        break
    end
end
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/04-decidir-repetir-5.json","config":{"etiqueta":"continue · break","idea":"continue deja la vuelta a medias y pasa a la siguiente: el −1 no cuenta como suspenso. break sale del bucle en el acto: el 3.0 de la casilla 5 ni se mira.","titulo":"Saltar y salir"}}
```

La casilla 2 tiene un −1, que es menor que 5. Sin el `continue`, el programa diría que el primer suspenso está en la casilla 2. El `continue` hace que Julia abandone esa vuelta sin llegar al segundo `if` y pase a la casilla 3.

En la casilla 4 aparece el 4.0. El programa escribe el mensaje y el `break` termina el bucle: la casilla 5 no llega a mirarse. Buscar «el primero que cumpla algo» es el uso típico de `break`. Para este caso concreto Julia tiene una función, `findfirst`, que verás más adelante.

::::{div}
:class: afondo
### 6 · Un for es un while disfrazado

Julia no tiene una forma especial de recorrer cada tipo de colección. Por dentro, todo `for` se convierte en un `while` que llama a la función `iterate`:

```julia
siguiente = iterate(notas)            # (9.0, 2): el primer elemento y dónde seguir
while siguiente !== nothing
    (nota, estado) = siguiente
    # … el cuerpo del bucle …
    siguiente = iterate(notas, estado)
end
```

`iterate` devuelve una pareja (el elemento y una marca para continuar), o `nothing` cuando ya no queda nada. Puedes comprobarlo: `iterate([9.0, 4.0])` da `(9.0, 2)` e `iterate(1:3, 3)` da `nothing`. Es lo que enseña `Meta.lower` si le pasas un bucle.

Esto tiene dos consecuencias. La primera: cualquier tipo que defina `iterate` se puede recorrer con `for`, también los que crees tú. La segunda: un rango no necesita guardar sus números. `1:10^9` ocupa 16 bytes, el principio y el final, porque `iterate` calcula cada número cuando se le pide.

### El mismo bucle, dentro de un archivo

Escribe el programa de la sección 2 en un archivo `notas.jl` y ejecútalo con `julia notas.jl`. Falla:

```text
┌ Warning: Assignment to `aprobados` in soft scope is ambiguous because a global
│ variable by the same name exists: `aprobados` will be treated as a new local. …
ERROR: LoadError: UndefVarError: `aprobados` not defined in local scope
```

Un bucle crea su propio espacio de variables. En el REPL, y en los cuadernos, Julia usa el **ámbito suave** (*soft scope*): si dentro del bucle asignas una variable que ya existe fuera, entiende que te refieres a esa. En un archivo es más estricta: la asignación crea una variable **local** nueva, que no tiene valor cuando `aprobados += 1` intenta leerla. Lo mismo pasa con `julia -e`.

Hay dos arreglos. Uno es decirlo explícitamente con `global aprobados += 1`. El otro, mejor, es meter el código en una función, que es justo lo que viene en el capítulo siguiente. Este libro, y su visualizador, ejecutan los programas como el REPL.

### && como un if corto

Como `&&` solo evalúa su lado derecho si el izquierdo es `true`, en Julia es costumbre escribir `nota >= 5 && println("aprobado")` en lugar de un `if` de una línea. Igual con `||`: `nota >= 0 || println("nota no válida")` solo escribe si la nota es negativa.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Decidir | `if … elseif … else … end` | `if …:` `elif …:` `else:` | `if (…) {…} else if (…) {…} else {…}` |
| Recorrer | `for x in v … end` | `for x in v:` | `for (x in v) {…}` |
| Mientras | `while c … end` | `while c:` | `while (c) {…}` |
| Los bloques se marcan con | `end` | la sangría | llaves `{}` |
| `x` después del bucle | no existe | el último valor | el último valor |
| Elegir un valor | `c ? a : b` | `a if c else b` | `ifelse(c, a, b)` o `if (c) a else b` |

En Julia la sangría no cambia nada, pero se usa igual para leer mejor. Y la variable del bucle no sobrevive al bucle, al contrario que en Python y en R.
:::

## Conexiones

- Las máscaras del capítulo anterior y los bucles de este hacen el mismo trabajo de dos maneras. En Julia puedes elegir sin pensar en la velocidad; lo verás con números en el capítulo *Rendimiento*.
- `iterate` es el primer ejemplo de una idea que recorre todo Julia: el lenguaje está construido sobre funciones normales que puedes ampliar. Volverá en *Despacho múltiple*.
- El ámbito de las variables (qué se ve desde dónde) es la puerta del capítulo siguiente.

## La grieta

El `if` que convierte una nota en «notable» o «suspenso» ya lo has escrito. Pero si mañana lo necesitas en otro programa, o tres veces en este, tendrás que copiarlo entero. Y si cambias el corte del notable, tendrás que cambiarlo en todas las copias. Hace falta ponerle un nombre a ese trozo de código y usarlo cuando haga falta: una **función**, el capítulo siguiente: [Funciones](05-funciones.md).

## Ejercicios

1. **El orden de las ramas.** ¿Qué vale `texto` al final? ¿Qué cambiarías para que salga lo correcto?

   ```julia
   nota = 9.5
   if nota >= 5
       texto = "aprobado"
   elseif nota >= 9
       texto = "sobresaliente"
   end
   ```

2. **Sumar con un for.** Calcula con un bucle la suma de los números del 1 al 100, y después la de los pares del 2 al 100. Comprueba la primera con `sum(1:100)`.

3. **El máximo a mano.** Con `notas = [6.5, 9.0, 4.0, 9.5, 7.0]`, encuentra con un `for` la nota más alta y su posición, sin usar `maximum`. Compara tu resultado con `findmax(notas)`.

4. **Doblar.** Empezando en `x = 1`, ¿cuántas veces hay que doblar `x` para que pase de 1000? Escríbelo con un `while`. ¿Cuánto vale `x` al final?

5. **La tabla del 7.** Escribe con un `for` las líneas `7 × 1 = 7` hasta `7 × 10 = 70`. Pista: dentro de un texto, `$(7i)` pone el valor de `7i`.

6. **Predice.** ¿Qué escribe Julia en la última línea? ¿Y Python o R con el mismo programa?

   ```julia
   for k in 1:3
   end
   k
   ```

::::{div}
:class: afondo
7. **Collatz.** Empieza con `n = 27`. Mientras `n` no valga 1: si es par, divídelo entre 2 (`n ÷ 2`); si es impar, cámbialo por `3n + 1`. ¿Cuántos pasos hacen falta para llegar a 1? ¿Cuál es el valor más alto por el que pasa `n`? Nadie ha demostrado que esto termine para todos los números.

8. **El archivo que falla.** Este programa funciona en el REPL pero falla con `julia suma.jl`. Explica por qué y arréglalo de dos formas.

   ```julia
   notas = [9.0, 6.5, 4.0]
   total = 0.0
   for nota in notas
       total += nota
   end
   println(total)
   ```
::::

## Solucionario

1. `texto` vale `"aprobado"`: la primera condición ya es `true` y la segunda no llega a mirarse. Hay que preguntar primero por lo más exigente: `if nota >= 9` … `elseif nota >= 5` ….
2. Con `s = 0` y `for i in 1:100; s += i; end`, `s` vale `5050`, igual que `sum(1:100)`. Con `for i in 2:2:100`, `2550`.
3. Una solución:

   ```julia
   mejor = notas[1]
   pos = 1
   for i in eachindex(notas)
       if notas[i] > mejor
           mejor = notas[i]
           pos = i
       end
   end
   ```

   Da `mejor = 9.5` y `pos = 4`, lo mismo que `findmax(notas)`, que devuelve `(9.5, 4)`.
4. Con `c = 0` y `while x <= 1000; x *= 2; c += 1; end`: 10 veces, y `x` vale `1024`.
5. `for i in 1:10` y dentro `println("7 × $i = $(7i)")`.
6. Un error: ``UndefVarError: `k` not defined in `Main` ``. La `k` del bucle era local y desapareció con él. En Python y en R, `k` seguiría existiendo y valdría 3.

::::{div}
:class: afondo
7. 111 pasos, y el valor más alto es 9232. Una forma de escribirlo: `while n != 1`, dentro `n = iseven(n) ? n ÷ 2 : 3n + 1`, `pasos += 1` y `mayor = max(mayor, n)`.
8. En un archivo, el `for` usa el ámbito estricto: `total += nota` crea una `total` local nueva, sin valor, y Julia da ``UndefVarError: `total` not defined in local scope``. Arreglos: escribir `global total += nota` dentro del bucle, o envolver el programa en un bloque `let total = 0.0 … end` (o, mejor, en una función). Las dos versiones escriben `19.5`.
::::
