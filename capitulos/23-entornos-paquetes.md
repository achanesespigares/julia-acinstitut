---
title: Entornos y paquetes
subtitle: Qué es un paquete por dentro, qué versión de cada uno se usa y cómo se repite el mismo entorno en otro ordenador
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

Desde *Tablas de datos* has escrito `using DataFrames`; desde *Gráficos*, `using Plots`. Los dos son **paquetes**: código que no viene con Julia, que alguien escribió y que hubo que instalar antes de usarlo. En *Errores y pruebas*, `using Test` funcionó sin instalar nada, porque `Test` viene con Julia. Y la grieta de ese capítulo dejaba varias preguntas: dónde se instalan los paquetes, cómo sabe Julia qué versión usar y cómo se asegura otra persona de tener los mismos.

## La pregunta

¿Qué es un paquete, por dentro? ¿Qué hace exactamente `using`? Si un paquete cambia con el tiempo y sale en versiones, ¿cómo decide Julia cuál usar? ¿Y cómo consigues que, en otro ordenador, tu programa use las mismas?

## La idea

Un paquete es, por dentro, un **módulo**: una caja con nombre que guarda sus funciones y sus variables, y que decide cuáles **exporta**, es decir, cuáles se pueden usar desde fuera sin escribir el nombre de la caja delante. `using` abre la caja.

Cada paquete sale en **versiones** numeradas, como `1.8.3`, y los números dicen qué ha cambiado. Un **entorno** es una carpeta con dos listas. `Project.toml` dice qué paquetes quieres y qué versiones admites. `Manifest.toml` apunta las versiones exactas que se eligieron, también las de los paquetes que esos usan por dentro. Con la segunda lista, otro ordenador repite el mismo entorno.

:::{important} Lo que se ve y lo que no
Instalar un paquete depende de la red y del ordenador, y no se puede repetir en el visualizador. Los visualizadores enseñan lo que es igual en cualquier ordenador: los módulos, los números de versión y la regla con la que se eligen. Instalar, el modo de paquetes y las pruebas de un paquete van en el «A fondo», con lo que dieron en el ordenador de pruebas.
:::

## Construcción

### 1 · Un módulo

:::{tip} Predice
`redondea` no está en la lista de `export`. ¿Se podrá llamar desde fuera del módulo? ¿Y escribiendo `Notas.redondea`?
:::

```{code-cell} julia
module Notas
export media, aprobado
const MINIMO = 5
redondea(x) = round(x; digits = 1)
media(v) = redondea(sum(v) / length(v))
aprobado(n) = n >= MINIMO
end
using .Notas
notas = [6.5, 8.0, 4.5]
m = media(notas)
aprobado(m)
Notas.redondea(7.26)
Notas.MINIMO
redondea(7.26)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/23-entornos-paquetes-1.json","config":{"etiqueta":"module · export · using","idea":"Un módulo es una caja con nombre para variables y funciones. Lo que exporta se usa desde fuera tal cual, después de using; lo demás, con el nombre del módulo delante: Notas.redondea.","titulo":"Un módulo"}}
```

`module Notas … end` define un **módulo**, un espacio de nombres propio. Dentro hay cuatro nombres: la constante `MINIMO` y las funciones `redondea`, `media` y `aprobado`. El visualizador dibuja el módulo como una ficha con sus nombres, y marca los dos que exporta.

`using .Notas` hace visibles en el programa principal los nombres que exporta `Notas`. El punto delante dice que el módulo está aquí, en este mismo programa. Un paquete instalado se carga sin punto, como `using DataFrames`. Desde esa línea, `media(notas)` llama a la `media` de `Notas`. Fíjate en la llamada: dentro de `media`, `redondea` se escribe sin nada delante, porque dentro de un módulo sus propios nombres se ven siempre.

Desde fuera, lo que no se exporta se alcanza con el nombre del módulo delante: `Notas.redondea(7.26)` da `7.3`, y `Notas.MINIMO` da `5`. Pero `redondea` sola no existe para el programa principal, y la última línea da un `UndefVarError`.

¿Para qué tanta caja? Para que dos autores puedan usar el mismo nombre sin pisarse, y para separar lo que el paquete **promete**, lo que exporta, de sus piezas internas, que puede cambiar cuando quiera. `DataFrames` exporta `DataFrame`, `groupby` y `combine`, y por dentro tiene cientos de funciones que no ves.

### 2 · Dos módulos, el mismo nombre

:::{tip} Predice
`Notas` y `Estadistica` exportan las dos una función `media`. ¿Qué hará Julia con la última línea? ¿Elegirá una de las dos?
:::

```{code-cell} julia
module Notas
export media
media(v) = round(sum(v) / length(v); digits = 1)
end
module Estadistica
export media
media(v) = sum(v) / length(v)
end
using .Notas
using .Estadistica
v = [6.5, 8.0, 4.5]
Notas.media(v)
Estadistica.media(v)
media(v)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/23-entornos-paquetes-2.json","config":{"etiqueta":"Notas.media · Estadistica.media","idea":"Con el nombre del módulo delante no hay duda posible. Si dos módulos exportan el mismo nombre, Julia no elige por ti: el nombre a secas da un error que pide decir de cuál se habla.","titulo":"Dos módulos, el mismo nombre"}}
```

Hay dos funciones `media` distintas, una en cada caja. Con el nombre del módulo delante no hay duda: `Notas.media(v)` redondea, `6.3`, y `Estadistica.media(v)` no, `6.333333333333333`.

Los dos `using` hacen visibles las dos `media` a la vez, y Julia no se queja hasta que el programa escribe `media` a secas. Entonces no elige: para el programa principal, `media` no está definida, y el mensaje explica por qué. Dos o más módulos exportan cosas distintas con ese nombre, y hay que decir de cuál se habla: con el nombre del módulo delante, o importando solo una, `using .Notas: media` (el ejercicio 2).

Otros lenguajes eligen por ti la última que se cargó, como se ve en la tabla del final de este capítulo. Julia prefiere un error claro a una media que no es la que creías.

### 3 · Números de versión

:::{tip} Predice
¿Qué versión es más nueva, la 1.10.0 o la 1.9.2? ¿Y qué dirá Julia si las compara como textos?
:::

```{code-cell} julia
v = v"1.8.3"
typeof(v)
v"1.10.0" > v"1.9.2"
"1.10.0" > "1.9.2"
versiones = [v"1.10.0", v"1.9.2", v"1.2.0", v"1.10.1"]
sort(versiones)
maximum(versiones)
VERSION
VERSION >= v"1.10"
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/23-entornos-paquetes-3.json","config":{"etiqueta":"v\"1.8.3\" · VersionNumber","idea":"Un número de versión tiene tres partes, mayor.menor.parche, y Julia lo compara parte a parte, como números: v\"1.10.0\" va después de v\"1.9.2\". Como textos, sería al revés.","titulo":"Números de versión"}}
```

`v"1.8.3"` no es un texto: es un valor de tipo `VersionNumber`, con tres partes, la mayor (1), la menor (8) y el parche (3). Se comparan parte a parte, como números, y por eso `v"1.10.0"` es mayor que `v"1.9.2"`: 10 es más que 9. Los textos `"1.10.0"` y `"1.9.2"` se comparan letra a letra, como en *Cadenas y caracteres*, y en la tercera letra `'1'` va antes que `'9'`: como textos, el orden sale al revés. `sort` y `maximum` usan el orden de las versiones.

Cada parte tiene un significado, el que propone el **versionado semántico** (*semver*), que siguen casi todos los paquetes de Julia:

- el **parche** sube con un arreglo, sin cambiar nada de lo que el paquete promete;
- la **menor** sube con cosas nuevas que no rompen lo que había;
- la **mayor** sube cuando algo cambia de forma que un programa que funcionaba puede dejar de hacerlo.

Antes de la 1.0, en las versiones `0.x`, todo puede cambiar: ahí la menor hace de mayor.

`VERSION` es la versión de Julia que está ejecutando el programa: `v"1.13.4"`, la del libro, y la que imita el laboratorio. Los paquetes también dicen qué Julia necesitan: `DataFrames` 1.8.3 pide la 1.10 o una posterior, y por eso tiene sentido preguntar `VERSION >= v"1.10"`. Las tres partes se leen con `v.major`, `v.minor` y `v.patch`, que son enteros sin signo de 32 bits: Julia escribe `v.major` como `0x00000001`, en hexadecimal.

### 4 · Qué versiones admite un proyecto

:::{tip} Predice
Un proyecto dice que quiere `CSV` en la versión `"0.10"`. ¿Admitirá la 1.3.0, que es más nueva?
:::

```{code-cell} julia
function admite(compat, v)
    if compat.major > 0
        return compat <= v < VersionNumber(compat.major + 1)
    elseif compat.minor > 0
        return compat <= v < VersionNumber(0, compat.minor + 1)
    else
        return compat <= v < VersionNumber(0, 0, compat.patch + 1)
    end
end
admite(v"1.8", v"1.8.3")
admite(v"1.8", v"1.7.1")
admite(v"1.8", v"2.0.0")
admite(v"0.16", v"0.16.1")
admite(v"0.16", v"0.17.0")
for v in [v"0.10.17", v"1.0.0", v"1.3.0"]
    println("CSV ", v, ": ", admite(v"0.10", v) ? "sí" : "no")
end
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/23-entornos-paquetes-4.json","config":{"etiqueta":"[compat] · semver","idea":"Un proyecto no dice una versión exacta: dice desde cuál vale y admite las siguientes hasta que cambia la parte que puede romperlo. \"1.8\" admite de la 1.8.0 a la 2.0.0, sin llegar.","titulo":"Qué versiones admite un proyecto"}}
```

El `Project.toml` de un proyecto no apunta versiones exactas: en su apartado `[compat]` dice, para cada paquete, **desde qué versión** vale, y Pkg, el gestor de paquetes de Julia, admite todas las que vienen detrás mientras no cambie la parte que puede romper el programa. `admite` escribe esa regla con un `if`:

- `"1.8"` admite desde la 1.8.0 hasta la 2.0.0, sin llegar: la 1.8.3 sí, la 1.7.1 no (es anterior) y la 2.0.0 tampoco (cambia la mayor);
- `"0.16"` admite desde la 0.16.0 hasta la 0.17.0, sin llegar: antes de la 1.0, es la menor la que puede romper;
- y una como `"0.0.3"` solo admite la 0.0.3.

La regla es la de Pkg: comprobada con `Pkg.Versions.semver_spec` en Julia 1.13.4 con estas mismas versiones.

El bucle usa versiones reales de `CSV`, el paquete para leer y escribir tablas de *Tablas de datos*: en el registro de paquetes de Julia, a la 0.10.17 le siguió la 1.0.0. Un proyecto escrito para la 0.10 no se pasa solo a la 1.0, aunque sea más nueva, porque ese cambio puede romperlo. Para pasar, alguien tiene que cambiar el `[compat]` a mano, después de comprobar que todo sigue funcionando.

### 5 · Elegir las versiones: el manifiesto

:::{tip} Predice
`DataFrames` pide `Tables` desde la 1.9, y `CSV` desde la 1.14. ¿Qué versión de `Tables` se elegirá?
:::

```{code-cell} julia
admite(compat, v) = compat <= v < VersionNumber(compat.major + 1)
elige(versiones, compat) = maximum(filter(v -> admite(compat, v), versiones))
versiones = Dict(
    "DataFrames" => [v"1.7.1", v"1.8.0", v"1.8.3"],
    "CSV" => [v"0.10.17", v"1.0.0", v"1.3.0"],
    "Tables" => [v"1.8.1", v"1.12.1", v"1.13.0", v"1.14.0"])
proyecto = Dict("DataFrames" => v"1.8", "CSV" => v"1")
manifiesto = Dict{String, VersionNumber}()
for (nombre, compat) in proyecto
    manifiesto[nombre] = elige(versiones[nombre], compat)
end
manifiesto
piden = [v"1.9", v"1.14"]
manifiesto["Tables"] = maximum(filter(v -> all(c -> admite(c, v), piden), versiones["Tables"]))
manifiesto
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/23-entornos-paquetes-5.json","config":{"etiqueta":"Project.toml → Manifest.toml","idea":"Para cada paquete, se elige la versión más nueva que admiten todos los que lo piden, también los paquetes que lo usan por dentro. La lista de lo elegido, con versiones exactas, es el manifiesto.","titulo":"Elegir las versiones: el manifiesto"}}
```

Este programa hace, en pequeño, lo que hace Pkg cuando instalas paquetes. `admite` es la regla de la sección 4 para versiones de la 1.0 en adelante, que son todas las de aquí. `elige` se queda con la versión **más nueva** que el proyecto admite: `filter` deja las que valen y `maximum` toma la mayor.

`proyecto` es lo que diría un `Project.toml`: `DataFrames` desde la 1.8 y `CSV` desde la 1. Para cada uno, el bucle apunta en `manifiesto` la versión elegida: la 1.8.3 y la 1.3.0.

Pero esos paquetes usan otros por dentro, y cada versión dice qué versiones de los suyos admite. Las dos de aquí usan `Tables`: en el registro, `DataFrames` 1.8.3 pide `Tables` desde la 1.9, y `CSV` 1.3.0, desde la 1.14. La versión de `Tables` tiene que valer para los dos a la vez: `all(c -> admite(c, v), piden)` lo comprueba con cada candidata, y deja de mirar en cuanto una exigencia dice que no: con la 1.8.1, la primera ya basta. Gana la 1.14.0. Si ninguna valiera para todos, no habría solución, y Pkg lo diría (está en el «A fondo»).

El diccionario final es un **manifiesto**: la lista de cada paquete con su versión exacta. Es lo que guarda `Manifest.toml`. El `Project.toml` dice lo que quieres, y otro día, con versiones nuevas en el registro, podría dar otra elección; el `Manifest.toml` dice lo que se eligió. Con él, otro ordenador instala exactamente lo mismo.

Las versiones del programa son reales: las del registro General de paquetes el 21 de noviembre de 2026, con las más nuevas de cada uno. Pkg hace lo mismo con todas las dependencias a la vez (solo `DataFrames` 1.8.3 usa 22 paquetes), con una búsqueda más lista, que también prueba versiones más viejas cuando la más nueva no encaja.

::::{div}
:class: afondo
### 6 · Entornos y paquetes, a fondo

**El modo de paquetes.** En el REPL, la tecla `]` cambia al modo de paquetes, con el indicador `(@v1.13) pkg>`. `add DataFrames` instala un paquete, `status` lista los del entorno, `update` los pone al día dentro de lo que admite el `[compat]`, y `rm DataFrames` lo quita. La tecla de borrar vuelve al modo normal. Lo mismo, en un programa, es `using Pkg; Pkg.add("DataFrames")`, `Pkg.status()`…

**Un entorno por proyecto.** Sin hacer nada, Julia usa el entorno general de tu usuario, el de `@v1.13`, cuyo `Project.toml` está en `~/.julia/environments/v1.13/` (`Base.active_project()` lo dice). Para un proyecto, lo normal es un entorno propio, en su carpeta: `julia --project=.` o, dentro de Julia, `Pkg.activate(".")`. El primer `add` crea allí `Project.toml` y `Manifest.toml`, y el indicador cambia al nombre del proyecto. El libro tiene el suyo, en la carpeta `herramientas`, con sus cuatro paquetes:

```toml
[deps]
DataFrames = "a93c6f00-e57d-5684-b7b6-d8193f3e46c0"
JSON = "682c06a0-de6a-54ab-a142-c8b1cf79cde6"
Plots = "91a5bcdd-55d7-5caf-9e0b-520d859cae80"
Statistics = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"
```

Cada paquete va con su **UUID**, un identificador único: dos paquetes pueden llamarse igual, pero no tener el mismo UUID. Su `Manifest.toml` empieza diciendo con qué Julia se hizo (`julia_version = "1.13.4"`) y tiene una entrada por paquete, de los cuatro y de todos los que usan por dentro, cada una con su versión exacta (`version = "1.8.3"` en la de `DataFrames`).

**Repetir un entorno.** Para que otra persona tenga lo mismo, le pasas la carpeta con los dos archivos y, en ella, ejecuta `Pkg.instantiate()`: instala exactamente las versiones del manifiesto. Es lo que hace el libro en GitHub cada vez que cambia algo, antes de comprobar el intérprete del laboratorio.

**Dónde viven.** Los paquetes se guardan en el **depósito**, `DEPOT_PATH[1]`, que suele ser `~/.julia`: el código en `~/.julia/packages/DataFrames/…`, con una carpeta por versión, así que dos proyectos pueden usar versiones distintas del mismo paquete sin estorbarse; la versión ya compilada, en `~/.julia/compiled/v1.13`; y el registro, en `~/.julia/registries`. El registro General, la lista de paquetes que conoce Pkg, tenía 14 811 en el ordenador de pruebas el 21 de noviembre de 2026.

**Cuando no hay versión que encaje.** Si las exigencias chocan, Pkg no instala nada y explica por qué. Pedir a la vez `DataFrames` 1.8.3 y `Tables` 1.8.1 da `Unsatisfiable requirements detected for package Tables`, y una lista que acaba en `restricted by compatibility requirements with DataFrames [a93c6f00] to versions: 1.9.0 - 1.14.0 — no versions left`: `DataFrames` quiere una `Tables` desde la 1.9, y se ha pedido la 1.8.1.

**Un paquete propio y sus pruebas.** `Pkg.generate("Notas")` crea la carpeta de un paquete: `Notas/Project.toml`, con su nombre, un UUID nuevo y `version = "0.1.0"`, y `Notas/src/Notas.jl`, con un `module Notas … end` dentro. Las pruebas van en `test/runtests.jl`, con los `@test` y `@testset` de *Errores y pruebas*, y se ejecutan con `Pkg.test()` (o `test` en el modo de paquetes), que las corre en un entorno aparte, limpio. Ese entorno solo tiene los paquetes que el proyecto declara: si no declaras `Test` (en `[extras]` y `[targets]` del `Project.toml`, o en un `test/Project.toml`), las pruebas fallan con `Package Test not found in current path`. Con `Test` declarado, el ordenador de pruebas escribió `Test Summary: | Pass  Total  Time`, `media | 2  2  0.1s` y `Testing Notas tests passed`.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio, con los mismos pasos que en Julia: los módulos (`module`, `export`, `const`, `using .Notas`, `using .Notas: media`, `import .Notas: media` y `Notas.media`) y los números de versión (`v"…"`, `VersionNumber(…)`, `VERSION`, sus partes y sus comparaciones). Lo que no sabe hacer te lo dice y te manda a la nube: instalar paquetes, `Pkg` y el modo de paquetes, un módulo dentro de otro o dentro de un bloque, cargar paquetes que no sean los del libro, y las versiones con un añadido como `v"1.9.0-rc1"`.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python | R |
|---|---|---|---|
| Un espacio de nombres | `module Notas … end` | cada archivo, `notas.py`, es un módulo | cada paquete tiene el suyo |
| Usar lo que exporta | `using .Notas` | `from notas import *` | `library(dplyr)` |
| Con su nombre delante | `Notas.media` | `notas.media` | `dplyr::filter` |
| Dos con el mismo nombre | un error al usarlo | gana el último que se importa | gana el último que se carga, con un aviso |
| Comparar versiones | `v"1.10.0" > v"1.9.2"` | `Version("1.10.0") > Version("1.9.2")` | `package_version("1.10.0") > package_version("1.9.2")` |
| Instalar | `Pkg.add("DataFrames")` | `pip install pandas` | `install.packages("dplyr")` |
| Un entorno por proyecto | `Project.toml` y `Manifest.toml` | `venv`, y `requirements.txt` o `uv.lock` | `renv` y `renv.lock` |

En Python, `from notas import media` seguido de `from estadistica import media` deja la segunda sin avisar. En R, `library(dplyr)` avisa de lo que tapa («The following objects are masked from 'package:stats': filter, lag») y sigue. En los tres, `"1.10.0" > "1.9.2"` como textos es falso. Comprobado con Python 3.13 y packaging 26.3, y con R 4.3.3 y dplyr.
:::

## Conexiones

- `using DataFrames`, de *Tablas de datos*, `using Plots`, de *Gráficos*, y `using Test`, de *Errores y pruebas*, abren módulos como `Notas`.
- El nombre del módulo delante ya había salido: `Random.seed!`, en *Probabilidad y simulación*, y `Base.:+`, en *Despacho múltiple*, donde `+` es una función del módulo `Base`.
- En *Metaprogramación*, `@macroexpand` escribía `Main.println`: `Main` es el módulo del programa principal, y `Notas` vive dentro de él (`Main.Notas`).
- Los textos se comparan letra a letra, como en *Cadenas y caracteres*; los números de versión, parte a parte.
- `filter`, `maximum` y `all(c -> …, piden)` usan funciones como valores, como en *Funciones*, y el manifiesto es un diccionario de *Tuplas y diccionarios*.

## La grieta

Cada programa del libro se ejecuta de arriba abajo, y si cambias una línea del principio, hay que volver a ejecutarlo entero para ver qué cambia. ¿Y si el programa supiera qué depende de qué, y al cambiar una línea se recalculara solo lo que la usa? Pluto, un cuaderno para Julia, hace eso. Además, guarda su propio `Project.toml` y su `Manifest.toml` dentro del archivo del cuaderno: quien lo abra tendrá las mismas versiones. Es el capítulo siguiente: *Cuadernos reactivos con Pluto*.

## Ejercicios

1. **Lo que no se exporta.** Con el módulo `Notas` de la sección 1 y `using .Notas`, ¿qué da `Notas.MINIMO + 1`? ¿Y `MINIMO` sola? ¿Por qué?

2. **Arregla la sección 2.** Cambia el `using .Notas` de la sección 2 para que la última línea funcione y dé la media redondeada, sin tocar los módulos.

3. **Ordena a mano.** Ordena de menor a mayor `v"0.10.0"`, `v"0.9.12"`, `v"1.0.0"` y `v"0.10.2"`, y compruébalo con `sort`.

4. **Predice.** Con la función `admite` de la sección 4, ¿qué dan `admite(v"1.2", v"1.10.0")` y `admite(v"0.2", v"0.10.0")`?

5. **Un módulo propio.** Escribe un módulo `Conversion` que guarde dentro la constante `CERO_ABSOLUTO = -273.15` y exporte una función `a_fahrenheit(c)`, que dé `9c / 5 + 32` y lance un `DomainError` si `c` está por debajo del cero absoluto. ¿Qué dan `a_fahrenheit(100)` y `a_fahrenheit(-40)`?

6. **Un proyecto viejo.** En la sección 5, cambia el proyecto para que pida `CSV` desde la `"0.10"`, con la función `admite` de la sección 4. ¿Qué versión de `CSV` se elige? Esa versión pide `Tables` desde la 1.1: ¿cuál se elige ahora?

::::{div}
:class: afondo
7. **Tu primer entorno.** En tu ordenador, crea una carpeta vacía, abre Julia en ella con `julia --project=.` y, en el modo de paquetes, escribe `add Statistics`. ¿Qué archivos aparecen en la carpeta? ¿Qué versión de `Statistics` apunta el `Manifest.toml`?

8. **Un paquete con pruebas.** Crea un paquete con `Pkg.generate("Notas")`, cambia `src/Notas.jl` para que exporte una `media`, escribe un `test/runtests.jl` con dos `@test` y ejecuta `Pkg.test()` desde la carpeta del paquete. ¿Qué pasa si no declaras `Test` en el `Project.toml`?
::::

## Solucionario

1. `Notas.MINIMO + 1` da `6`: con el nombre del módulo delante, se alcanza cualquier nombre de dentro, se exporte o no. `MINIMO` sola da `UndefVarError: MINIMO not defined in Main`: `Notas` no la exporta, así que `using .Notas` no la hace visible.
2. `using .Notas: media` en lugar de `using .Notas`. Así se trae de `Notas` solo `media`, con nombre y apellido, y un nombre importado así gana a los que solo se exportan: `media(v)` da `6.3`. También vale escribir `Notas.media(v)` en la última línea.
3. `v"0.9.12"`, `v"0.10.0"`, `v"0.10.2"` y `v"1.0.0"`. Parte a parte: todas las 0 van antes que la 1, y entre ellas, la menor 9 va antes que la 10, aunque `"0.9.12"` como texto iría detrás. `sort` da `VersionNumber[v"0.9.12", v"0.10.0", v"0.10.2", v"1.0.0"]`.
4. `true` y `false`. `"1.2"` admite todo lo que hay desde la 1.2.0 hasta la 2.0.0, y la 1.10.0 está ahí: 10 es más que 2. `"0.2"` solo admite de la 0.2.0 a la 0.3.0, y la 0.10.0 se sale: antes de la 1.0, cada menor puede romper.
5. Una forma:

   ```julia
   module Conversion
   export a_fahrenheit
   const CERO_ABSOLUTO = -273.15
   function a_fahrenheit(c)
       c < CERO_ABSOLUTO && throw(DomainError(c, "por debajo del cero absoluto"))
       return 9c / 5 + 32
   end
   end
   using .Conversion
   ```

   `a_fahrenheit(100)` da `212.0` y `a_fahrenheit(-40)` da `-40.0`: es la temperatura que se escribe igual en las dos escalas.
6. `CSV` 0.10.17, la más nueva de la 0.10, y no la 1.3.0. Con `piden = [v"1.9", v"1.1"]`, `Tables` sigue siendo la 1.14.0: es la más nueva que admiten los dos, porque las dos exigencias van desde una 1.x hasta la 2.0.0, sin llegar.

::::{div}
:class: afondo
7. Aparecen `Project.toml` y `Manifest.toml`. El primero tiene una línea en `[deps]`, `Statistics` con su UUID. El segundo, una entrada `[[deps.Statistics]]` con la versión exacta que se instaló (la 1.11.5 en el ordenador de pruebas, con Julia 1.13.4) y las de los paquetes que usa por dentro.
8. Con `Test` declarado, Julia escribe el resumen de las pruebas (`Test Summary: | Pass  Total`) y `Testing Notas tests passed`. Sin declararlo, las pruebas no llegan a ejecutarse: `Pkg.test()` las corre en un entorno aparte que solo tiene los paquetes que el proyecto declara, y falla con `Package Test not found in current path` y `Package Notas errored during testing`.
::::
