---
title: "Proyecto 1 · La gripe del internado"
subtitle: Un modelo de verdad, de catorce números al cuaderno
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En enero de 1978, al volver de las vacaciones, un chico de un internado del norte de Inglaterra llegó con gripe. En el internado vivían 763 chicos. Dos semanas después, 512 habían pasado por la enfermería. Se contó cada día cuántos estaban en cama, y el *British Medical Journal* publicó la cuenta en una nota breve, el 4 de marzo de 1978, con una figura. Esos catorce números se han convertido en el ejemplo clásico de los cursos de epidemiología.

En este proyecto los explicamos con un modelo, y para eso juntamos casi todo el libro: leer un texto y convertirlo en números, funciones, ecuaciones diferenciales, optimización, gráficos, pruebas, un entorno reproducible, un cuaderno de Pluto y, en el «A fondo», varios núcleos.

## La pregunta

¿Se puede explicar cómo creció y se apagó el brote con un modelo de solo dos números? Y si se puede, ¿qué dicen esos dos números de la gripe: lo contagiosa que era y lo que tardaba en curarse un chico?

## El plan

Un proyecto de Julia vive en una **carpeta**, con su entorno (capítulo 23) y un sitio para cada cosa:

```text
gripe/
├─ Project.toml            los paquetes que usa: Plots y Test
├─ Manifest.toml           sus versiones exactas
├─ datos/
│  └─ gripe_internado.csv  los catorce días, tal como se transcribieron
├─ src/
│  └─ Epidemia.jl          el módulo: leer_datos, sir, paso, simula, error2, ajusta
├─ test/
│  └─ runtests.jl          las pruebas
├─ analisis.jl             todo de una vez
└─ cuaderno.jl             un cuaderno de Pluto con deslizadores
```

Y se avanza en cinco pasos: **mirar** los datos (capítulos 2 y 6), escribir **el modelo** (capítulos 5 y 15), **simular** el brote y dibujarlo (capítulos 12 y 15), **ajustar** los dos números a los datos (capítulo 14) y **comprobarlo y contarlo** con pruebas y un cuaderno (capítulos 22 a 24).

:::{important} Dos números para catorce datos
El modelo tiene dos números que no conocemos, β y γ, y los datos son catorce. Si dos números bastan para seguir catorce datos, el modelo ha capturado algo de verdad sobre la gripe. Y donde no los siga, también nos estará diciendo algo: qué le falta.
:::

La carpeta entera se puede descargar: [gripe.zip](https://achanesespigares.github.io/julia-acinstitut/datos/proyectos/gripe.zip). Para repetir el proyecto basta con abrir Julia en ella y escribir `julia --project=. analisis.jl`.

## Construcción

### 1 · Mirar los datos

Un archivo CSV es un texto: una línea por día y las columnas separadas por comas. Aquí lo escribimos dentro del programa, con `\n` donde acaba cada línea, para que el visualizador pueda leerlo. En el proyecto, `leer_datos` hace lo mismo con las líneas del archivo, que da `readlines`.

:::{tip} Predice
El texto tiene una línea de cabecera y catorce días. ¿Cuántas casillas acabará teniendo `cama`? ¿Y de qué tipo son los trozos que da `split`: números o textos?
:::

```{code-cell} julia
texto = "dia,en_cama\n1,3\n2,8\n3,26\n4,76\n5,225\n6,298\n7,258\n8,233\n9,189\n10,128\n11,68\n12,29\n13,14\n14,4"
lineas = split(texto, "\n")
cama = Int[]
for l in lineas[2:end]
    partes = split(l, ",")
    push!(cama, parse(Int, partes[2]))
end
cama
otra = [3, 8, 28, 76, 222, 293, 257, 237, 192, 126, 70, 28, 12, 5]
distintos = findall(cama .!= otra)
maximum(abs.(cama .- otra))
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/26-proyecto-gripe-1.json","config":{"etiqueta":"datos","idea":"split parte el texto en líneas y cada línea en dos trozos, que todavía son textos. parse convierte el segundo en un entero, y push! lo guarda. Al final, la otra transcripción de los mismos datos no coincide en 11 de los 14 días.","titulo":"De un texto a catorce números"}}
```

`split` da trozos de texto (`SubString{String}`, capítulo 6), no números: `"298"` no es `298`. Por eso hace falta `parse(Int, …)`. Saltamos la primera línea, la cabecera, con `lineas[2:end]`.

Las dos últimas líneas guardan una sorpresa. La nota de 1978 solo publicó una figura, así que cada libro que usa los datos tuvo que leerlos en ella, y no todos leyeron lo mismo. `cama` es la transcripción del paquete de R outbreaks, que la toma de un libro de biología matemática de 2006 (De Vries y otros). `otra` es la del paquete de R epimdr. Las dos coinciden en el primer día, el segundo y el cuarto, y en los once restantes difieren en hasta 5 chicos. No hay una versión «buena»: son dos lecturas de la misma figura. En la sección 4 veremos si eso cambia la respuesta.

El archivo del proyecto tiene cuatro columnas: el día, la fecha (del 22 de enero al 4 de febrero de 1978), los chicos en cama y los convalecientes. Usamos los de la cama.

### 2 · El modelo SIR

El modelo más sencillo de una epidemia reparte a los chicos en tres grupos: **S**, los sanos que se pueden contagiar; **I**, los enfermos, que contagian; y **R**, los recuperados, que ya no se contagian ni contagian. Cada día pasan dos cosas:

- **contagios** = β · S · I / N: cuantos más enfermos y más sanos haya, más encuentros entre ellos, y una parte de esos encuentros contagia. N = 763 es el total de chicos, y β mide lo contagiosa que es la gripe.
- **curas** = γ · I: cada día se cura una parte fija de los enfermos. Si γ = 0,5, la mitad; un enfermo pasa en cama, de media, 1/γ días.

Los contagios pasan de S a I, y las curas, de I a R. Es un sistema de tres ecuaciones diferenciales, como el muelle del capítulo 15, y `sir` calcula, para unos valores de S, I y R, cuánto cambia cada uno en un día.

:::{tip} Predice
Con β = 1,67 y γ = 0,44, al principio hay 762 sanos y 1 enfermo. Más adelante, por ejemplo, 400 sanos, 250 enfermos y 113 recuperados. ¿En cuál de los dos momentos crecen más deprisa los enfermos? ¿Unas diez veces más deprisa, o unas cien?
:::

```{code-cell} julia
N = 763
function sir(u, β, γ)
    contagios = β * u[1] * u[2] / N
    curas = γ * u[2]
    return [-contagios, contagios - curas, curas]
end
al_principio = sir([762.0, 1.0, 0.0], 1.67, 0.44)
en_mitad = sir([400.0, 250.0, 113.0], 1.67, 0.44)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/26-proyecto-gripe-2.json","config":{"etiqueta":"modelo SIR","idea":"sir recibe el vector u = [S, I, R] y devuelve cuánto cambia cada grupo en un día. Lo que pierden los sanos lo ganan los enfermos, y lo que pierden los enfermos lo ganan los recuperados.","titulo":"Tres grupos y dos flechas"}}
```

Al principio hay 1,67 contagios al día y 0,44 curas: los enfermos crecen en 1,23 al día. En mitad del brote hay 218,9 contagios y 110 curas: crecen en 108,9 al día, casi noventa veces más deprisa. Nada ha cambiado en la gripe; lo que cambia es que hay muchos más enfermos que contagian.

Fíjate en la suma de cada vector: −1,67 + 1,23 + 0,44 = 0. Nadie aparece ni desaparece; solo cambian de grupo. Es la primera cosa que comprobaremos en la sección 5.

### 3 · Simular el brote

`sir` dice cómo cambian las cosas en un instante. Para saber cómo evolucionan día a día, avanzamos con Runge–Kutta, el método de orden 4 del capítulo 15: `paso` es su `rk4`, con β y γ pasados a `sir`. Damos un paso por día, con `h = 1.0`, y guardamos los enfermos de cada día. Empezamos con un solo enfermo.

:::{tip} Predice
Con β = 1,67 y γ = 0,44, ¿qué día habrá más chicos en cama? En los datos fue el sexto, con 298.
:::

```{code-cell} julia
using Plots
cama = [3, 8, 26, 76, 225, 298, 258, 233, 189, 128, 68, 29, 14, 4]
N = 763
function sir(u, β, γ)
    contagios = β * u[1] * u[2] / N
    curas = γ * u[2]
    return [-contagios, contagios - curas, curas]
end
function paso(u, h, β, γ)
    k1 = sir(u, β, γ)
    k2 = sir(u + h / 2 * k1, β, γ)
    k3 = sir(u + h / 2 * k2, β, γ)
    k4 = sir(u + h * k3, β, γ)
    return u + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
end
function simula(β, γ, dias)
    u = [N - 1.0, 1.0, 0.0]
    enfermos = Float64[]
    for d in 1:dias
        u = paso(u, 1.0, β, γ)
        push!(enfermos, u[2])
    end
    return enfermos
end
I = simula(1.67, 0.44, 14)
scatter(1:14, cama, label = "en cama (datos)")
plot!(1:14, I, label = "modelo SIR")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/26-proyecto-gripe-3.json","config":{"etiqueta":"simulación","idea":"Cada día, paso llama cuatro veces a sir y avanza con la media de Runge–Kutta. simula guarda los enfermos de cada día. El gráfico pone los datos y el modelo uno junto a otro. Es una traza larga: «Saltar la llamada» va directo a lo que devuelve cada llamada.","titulo":"Catorce días de gripe"}}
```

Esta traza es larga: 14 días con cuatro llamadas a `sir` cada uno. Cuando llegues a una llamada que ya entiendes, el botón **Saltar la llamada** (o la tecla S) va directo al paso en que devuelve su resultado.

El modelo pone el pico el sexto día, con 288 enfermos, y los datos, el sexto, con 298. Hasta el día 9, las dos curvas van cerca. Al final se separan: el día 14, el modelo aún tiene 25,6 chicos en cama, y los datos, 4. El modelo se cura más despacio que los chicos. Volveremos a ello en las conexiones.

### 4 · Ajustar β y γ

β = 1,67 y γ = 0,44 no han salido de la nada: son los mejores. Pero ¿mejores en qué sentido? Como en el capítulo 16, medimos cuánto se equivoca el modelo con la **suma de los errores al cuadrado**: para cada día, la diferencia entre el modelo y los datos, al cuadrado, y todas sumadas. Cuanto más pequeña, mejor. Y buscamos los β y γ que la hacen más pequeña, como en el capítulo 14: probando.

:::{tip} Predice
Con γ = 0,44, probamos tres β: 1,3, 1,67 y 2,0. ¿Cuál dará el error más pequeño? ¿Y el error de los otros dos será el doble, diez veces más o más todavía?
:::

```{code-cell} julia
cama = [3, 8, 26, 76, 225, 298, 258, 233, 189, 128, 68, 29, 14, 4]
N = 763
function sir(u, β, γ)
    contagios = β * u[1] * u[2] / N
    curas = γ * u[2]
    return [-contagios, contagios - curas, curas]
end
function paso(u, h, β, γ)
    k1 = sir(u, β, γ)
    k2 = sir(u + h / 2 * k1, β, γ)
    k3 = sir(u + h / 2 * k2, β, γ)
    k4 = sir(u + h * k3, β, γ)
    return u + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
end
function simula(β, γ, dias)
    u = [N - 1.0, 1.0, 0.0]
    enfermos = Float64[]
    for d in 1:dias
        u = paso(u, 1.0, β, γ)
        push!(enfermos, u[2])
    end
    return enfermos
end
error2(β, γ) = sum((simula(β, γ, 14) .- cama) .^ 2)
βs = [1.3, 1.67, 2.0]
errores = [error2(β, 0.44) for β in βs]
findmin(errores)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/26-proyecto-gripe-4.json","config":{"etiqueta":"ajuste","idea":"error2 simula el brote con un β y un γ y suma los errores al cuadrado de los catorce días. La comprensión lo hace con tres β, y findmin dice cuál es el más pequeño y en qué posición está. Cada error2 es una simulación entera: sáltala con «Saltar la llamada».","titulo":"¿Cuánto se equivoca?"}}
```

Con β = 1,67, el error es 4 113,5. Con 1,3, el brote crece demasiado despacio y el error sube a 102 433; con 2,0, demasiado deprisa, y llega a 55 297. Con un 20 % más de contagio, el error se multiplica por 13; con un 22 % menos, por 25. El brote es muy sensible a β.

Probar tres valores de β con un γ fijo es una línea en un plano. La búsqueda de verdad es una rejilla, como la de la caja del capítulo 14 pero en dos dimensiones: todos los β de 1,0 a 2,5 de centésima en centésima, y todos los γ de 0,2 a 0,8, también de centésima en centésima. Son 151 × 61 = 9 211 simulaciones. Es la función `ajusta` del módulo:

```julia
function ajusta(datos, βs, γs)
    mejor = (Inf, 0.0, 0.0)
    for β in βs, γ in γs
        e = error2(β, γ, datos)
        if e < mejor[1]
            mejor = (e, β, γ)
        end
    end
    return mejor
end
```

```julia
julia> ajusta(cama, 1.0:0.01:2.5, 0.2:0.01:0.8)
(4113.470600941394, 1.67, 0.44)
```

Julia hace las 9 211 simulaciones en unas cuatro centésimas de segundo. Gana β = 1,67, γ = 0,44, el mismo β que en la línea de arriba. Y con la otra transcripción de los datos, `otra`, gana la misma pareja, con un error de 4 221,1. Las dos lecturas de la figura difieren, pero lo que dicen de la gripe es lo mismo: la respuesta no depende de esas diferencias.

### 5 · Comprobarlo y contarlo

Antes de creer un modelo, se comprueba que hace lo que dice, con pruebas (capítulo 22). Lo que más se puede comprobar es lo que ya sabemos que tiene que pasar, sin mirar los datos. Nadie aparece ni desaparece, así que, después de un paso, S + I + R tiene que seguir siendo 763. Y sin contagios, con β = 0, el brote se tiene que apagar.

:::{tip} Predice
Las dos pruebas, ¿pasarán? La primera compara con `≈` y no con `==`: ¿por qué?
:::

```{code-cell} julia
using Test
N = 763
function sir(u, β, γ)
    contagios = β * u[1] * u[2] / N
    curas = γ * u[2]
    return [-contagios, contagios - curas, curas]
end
function paso(u, h, β, γ)
    k1 = sir(u, β, γ)
    k2 = sir(u + h / 2 * k1, β, γ)
    k3 = sir(u + h / 2 * k2, β, γ)
    k4 = sir(u + h * k3, β, γ)
    return u + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
end
u = paso([762.0, 1.0, 0.0], 1.0, 1.67, 0.44)
@test sum(u) ≈ 763
@test sir([762.0, 1.0, 0.0], 0.0, 0.44)[2] < 0
R0 = 1.67 / 0.44
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/26-proyecto-gripe-5.json","config":{"etiqueta":"pruebas","idea":"Un paso del modelo no crea ni destruye chicos: S + I + R sigue siendo 763. Y sin contagios, los enfermos solo pueden bajar. Las dos pruebas pasan. R0, el número de contagios de cada enfermo al principio, sale casi 3,8.","titulo":"Lo que tiene que pasar"}}
```

Las dos pasan. La primera usa `≈` porque las cuentas con decimales pueden dejar una diferencia en la última cifra (capítulo 1). Aquí da exactamente `763.0`, pero una prueba no debe depender de esa suerte. En el proyecto, `test/runtests.jl` reúne ocho, en un `@testset`: además de estas dos, que se leen 14 días, que el primero tiene 3 y el máximo es 298, que el pico del modelo cae el sexto día y que `ajusta` da 1,67 y 0,44.

Y ahora podemos contar lo que hemos aprendido de la gripe:

- **γ = 0,44**: cada día se cura el 44 % de los enfermos. Un chico pasa en cama, de media, 1/0,44 ≈ 2,3 días.
- **β = 1,67**: al principio, cuando casi todos están sanos, cada enfermo contagia a 1,67 chicos al día.
- **R₀ = β/γ ≈ 3,8**: en sus 2,3 días de enfermedad, cada enfermo contagia, al principio, a unos 3,8 chicos. Es el **número básico de reproducción**. Si fuera menor que 1, cada enfermo contagiaría a menos de uno, y el brote no arrancaría.

`analisis.jl` lo hace todo de una vez: lee los datos, ajusta, escribe el resultado, guarda el gráfico y pasa las pruebas.

```{literalinclude} ../datos/proyectos/gripe/analisis.jl
:language: julia
```

```text
$ julia --project=. analisis.jl
β = 1.67, γ = 0.44, error = 4113.5
R₀ = 3.8; pico el día 6, con 288 enfermos
Gráfico guardado en gripe.svg
Test Summary: | Pass  Total  Time
Epidemia      |    8      8  0.4s
```

Para jugar con el modelo, el cuaderno de Pluto (capítulo 24) pone β y γ en dos deslizadores. Al moverlos, Pluto recalcula solo las celdas que dependen de ellos: la simulación, el error y el gráfico. Estas son sus celdas:

```julia
begin
    using PlutoUI, Plots
    include(joinpath(@__DIR__, "src", "Epidemia.jl"))
    using .Epidemia
end

cama = leer_datos(joinpath(@__DIR__, "datos", "gripe_internado.csv"))

@bind β Slider(1.0:0.01:2.5, default = 1.67, show_value = true)

@bind γ Slider(0.2:0.01:0.8, default = 0.44, show_value = true)

I = simula(β, γ, 14)

md"Error: **$(round(error2(β, γ, cama), digits = 1))** · R₀ = **$(round(β / γ, digits = 2))** · pico el día **$(argmax(I))**"

begin
    scatter(1:14, cama, label = "en cama (datos)", xlabel = "día", ylabel = "chicos")
    plot!(1:14, I, label = "modelo SIR", ylims = (0, 400))
end
```

Se abre con `using Pluto; Pluto.run()` y eligiendo `cuaderno.jl` en la carpeta del proyecto. Lleva dentro su propio entorno, con Plots 1.41.8 y PlutoUI 0.7.84, así que funciona igual en otro ordenador.

::::{div}
:class: afondo
### 6 · El proyecto, a fondo

**Un mínimo mejor que la rejilla.** La rejilla solo prueba centésimas. Optim (capítulo 14) busca entre ellas con el método de Nelder–Mead, que mueve un triángulo de tres parejas (β, γ) hacia donde baja el error:

```julia
using Optim
r = optimize(p -> error2(p[1], p[2], cama), [1.67, 0.44], NelderMead())
Optim.minimizer(r)    # [1.6752587198847064, 0.44386470818177265]
Optim.minimum(r)      # 4086.1704103823727
```

Hace 97 llamadas a `error2` y baja el error de 4 113,5 a 4 086,2, con β = 1,675 y γ = 0,444: las centésimas de la rejilla ya eran casi lo mejor. Empezando lejos, en (1,0; 0,3), llega al mismo sitio.

**¿Un paso al día es poco?** `simula` da un solo paso de Runge–Kutta por día. Para comprobar si es suficiente, se puede resolver el mismo modelo con OrdinaryDiffEq (capítulo 15), que elige el tamaño de sus pasos para no equivocarse:

```julia
using OrdinaryDiffEq
f!(du, u, p, t) = (du .= sir(u, p[1], p[2]))
prob = ODEProblem(f!, [762.0, 1.0, 0.0], (0.0, 14.0), (1.67, 0.44))
sol = solve(prob, Tsit5(), saveat = 1.0)
```

Con `Tsit5`, OrdinaryDiffEq 7.8.1 da 20 pasos en los catorce días, y sus enfermos difieren de los de `simula` en menos de 3 chicos (la mayor diferencia, el día 5: 213,2 frente a 210,4). Ajustando con él y con Optim, sale β = 1,6692 y γ = 0,4435: la misma gripe.

**La rejilla, en varios núcleos.** Cada pareja (β, γ) se simula sin mirar a las demás, así que la rejilla es como la sección 1 del capítulo 25: trabajo que se reparte solo. Cada hilo escribe en su propia casilla de `errores`, y nadie se pisa:

```julia
function ajusta_hilos(datos, βs, γs)
    pares = [(β, γ) for β in βs for γ in γs]
    errores = zeros(length(pares))
    Threads.@threads for i in eachindex(pares)
        errores[i] = error2(pares[i]..., datos)
    end
    e, i = findmin(errores)
    return (e, pares[i]...)
end
```

Con una rejilla de milésimas (226 051 parejas) y `julia -t 2`, en el ordenador de pruebas, `ajusta` tardó entre 0,84 y 0,91 segundos y `ajusta_hilos`, entre 0,61 y 0,68: solo 1,3 o 1,4 veces menos, no el doble. La razón es la del capítulo 19: cada simulación crea muchos vectores pequeños, y los dos hilos tienen que esperar al recolector de basura. Una versión que guarda S e I en dos números en lugar de un vector no crea ninguno: tardó 0,10 segundos con un hilo y 0,06 con dos, de 1,7 a 1,9 veces menos. Primero se arregla la memoria; después se reparte. Las dos dan el mismo mínimo: β = 1,676, γ = 0,444.

**Que funcione mañana.** El `Project.toml` del proyecto dice qué paquetes usa, con `[compat] Plots = "1.41"` y `julia = "1.13"`, y el `Manifest.toml`, sus versiones exactas. En otro ordenador, `using Pkg; Pkg.activate("."); Pkg.instantiate()` instala justo esas versiones (capítulo 23). Las rutas se escriben con `joinpath(@__DIR__, …)`, desde la carpeta del archivo, para que funcionen se ejecute desde donde se ejecute. Y el cuaderno guarda dentro su propio `Project.toml` y su `Manifest.toml`.

**Lo que dejamos fuera.** El archivo trae también los chicos convalecientes, que ya no estaban en cama pero aún no volvían a clase. Un modelo con un cuarto grupo, C, los usaría. Y un modelo SEIR añadiría los que se han contagiado pero aún no contagian. Las dos cosas son buenos proyectos para seguir.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso

El ajuste de verdad, con una ecuación diferencial resuelta con precisión y Nelder–Mead para buscar el mínimo, comprobado en los tres lenguajes:

| | Julia | Python | R |
|---|---|---|---|
| El modelo | `ODEProblem(f!, u0, (0.0, 14.0), p)` | `solve_ivp(sir, (0, 14), u0, args = p)` | `ode(u0, 0:14, sir, p)` (deSolve) |
| Buscar el mínimo | `optimize(err, [1.5, 0.5], NelderMead())` (Optim) | `minimize(err, [1.5, 0.5], method = "Nelder-Mead")` (SciPy) | `optim(c(1.5, 0.5), err)` (Nelder–Mead por defecto) |
| Resultado | β = 1,6692, γ = 0,4435, error 4 121,9 | β = 1,6692, γ = 0,4434, error 4 121,9 | β = 1,6692, γ = 0,4434, error 4 121,9 |

Los tres coinciden en cuatro cifras. Los números de la sección 4 son algo distintos (error 4 113,5) porque allí el modelo da un solo paso de Runge–Kutta por día. Lo que Julia añade no es otro resultado: es que la simulación escrita a mano, con bucles, ya es rápida (9 211 simulaciones en centésimas de segundo), sin tener que buscar una biblioteca que la haga por nosotros. En Python y en R, un bucle escrito a mano suele ser mucho más lento: el capítulo 19 lo midió con una suma.
:::

## Conexiones

- **Leer datos** (capítulo 6): `split` y `parse`, con los `SubString` que no son números.
- **Funciones y vectores** (capítulos 2 y 5): `sir` recibe y devuelve vectores, y `.-` y `.^` hacen la cuenta del error día a día.
- **Ecuaciones diferenciales** (capítulo 15): `paso` es el `rk4` del muelle, con dos parámetros más.
- **Optimización** (capítulo 14): la rejilla y Nelder–Mead buscan, como la caja de cartón, el valor que hace más pequeño un número.
- **Datos y estadística** (capítulo 16): la suma de los errores al cuadrado, la misma idea que la recta de mínimos cuadrados.
- **Pruebas, entornos y cuadernos** (capítulos 22, 23 y 24): un proyecto que otro puede repetir, comprobar y mover con deslizadores.
- **Paralelismo y rendimiento** (capítulos 19 y 25): repartir la rejilla, y por qué antes hay que mirar la memoria.

Y lo que el modelo no explica. Al final del brote, los datos bajan más deprisa que el modelo: los chicos salían de la cama antes de lo que dice γ, y pasaban a convalecientes. Y si se deja correr el modelo dos meses, acaban contagiándose 744 de los 763 chicos, pero en cama solo estuvieron 512. Quizá algunos se contagiaron sin llegar a enfermar, o quizá el modelo supone que todos se cruzan con todos, y en un internado no es así. Un modelo sencillo que se equivoca en sitios concretos es útil: dice dónde mirar.

## La grieta

Para escribir `sir`, pensamos a mano cuánto cambia cada grupo. Y Runge–Kutta, Newton (capítulo 14) y casi todo el cálculo científico necesitan derivadas, que siempre hemos hecho a mano o con un paquete. Pero en el capítulo 20 vimos que, para Julia, una expresión como `:(β * S * I / N)` es un árbol que un programa puede recorrer y cambiar. ¿Podría un programa nuestro **derivarla**, como hacemos en clase, regla a regla? ¿Y comprobar si un alumno ha derivado bien? Ese es el proyecto 2.

## Ejercicios

1. **Una rejilla más gruesa.** Ajusta con `ajusta(cama, 1.0:0.1:2.5, 0.2:0.1:0.8)`, de décima en décima. ¿Qué pareja gana? ¿Cuánto mayor es su error que el de la rejilla de centésimas?
2. **La otra lectura.** Ajusta con `otra`, la transcripción de la sección 1. ¿Cambian β y γ? ¿Y el error?
3. **Días en cama.** Con γ = 0,44, ¿cuántos días pasa en cama, de media, un enfermo? ¿Y con γ = 0,5?
4. **El final del brote.** Da 60 pasos de `paso` desde `[762.0, 1.0, 0.0]`, con β = 1,67 y γ = 0,44. ¿Cuántos chicos acaban en R, los que se contagiaron en algún momento? Compáralo con los 512 que estuvieron en cama.
5. **La mitad, vacunados.** Si la mitad de los chicos hubiera estado vacunada, el brote empezaría con 381 sanos, 1 enfermo y 381 «recuperados», que no se contagian. Simula 30 días desde `[381.0, 1.0, 381.0]`. ¿Qué día es el pico y con cuántos enfermos? ¿Cuántos se contagian en total?
6. **Una prueba más.** Sin curas, con γ = 0, los enfermos nunca pueden bajar. Escribe una prueba con `diff` y `all` que lo compruebe para `simula(1.67, 0.0, 14)`.

::::{div}
:class: afondo
7. **Desde lejos.** Ajusta con Optim empezando en `[1.0, 0.3]`. ¿Llega al mismo mínimo que empezando en `[1.67, 0.44]`?
8. **La rejilla en hilos.** Escribe `ajusta_hilos` como en el «A fondo» y comprueba, con `julia -t 2`, que da lo mismo que `ajusta` con la rejilla de centésimas. ¿Por qué no hace falta un `lock` ni un `Atomic`?
::::

## Solucionario

1. Gana β = 1,7, γ = 0,5, con un error de 7 972,6: casi el doble que 4 113,5. Con décimas, la rejilla no puede ver el mínimo verdadero, que está entre ellas; y como β y γ se compensan (si los dos suben, R₀ cambia poco), se va a otra pareja.
2. No cambian: gana otra vez β = 1,67, γ = 0,44. El error es 4 221,1, algo mayor: la misma curva sigue un poco peor a `otra`.
3. 1/γ: con γ = 0,44, 1/0,44 ≈ 2,27 días; con γ = 0,5, 2 días.
4. `u` acaba en `[18.86, 2.8e-7, 744.14]`: se contagian unos 744 chicos y quedan unos 19 sin contagiarse nunca. Son muchos más que los 512 que estuvieron en cama: ver las conexiones.
5. El pico llega el día 14, con 52 enfermos, en lugar del día 6 con 288. En total se contagian unos 288 chicos (`u[3]` acaba en unos 669, menos los 381 vacunados), en lugar de 744. Cada enfermo encuentra la mitad de sanos, y R₀ pasa, en la práctica, de 3,8 a 1,9: el brote es más lento y más pequeño. Si bajara de 1, no habría brote.
6. `@test all(diff(simula(1.67, 0.0, 14)) .>= 0)` pasa. `diff` da las diferencias entre cada día y el anterior; sin curas, ninguna es negativa. Al final, casi todos están enfermos: 762,999.

::::{div}
:class: afondo
7. Sí: `[1.675258551052277, 0.44386460665693456]`, con error 4 086,17, igual que desde `[1.67, 0.44]` en las primeras cifras. Aquí el error tiene un solo valle; en otros problemas, empezar en otro sitio puede llevar a otro mínimo.
8. Da `(4113.470600941394, 1.67, 0.44)`, lo mismo. No hace falta proteger nada porque cada vuelta escribe en su propia casilla, `errores[i]`, y lee datos que nadie cambia: es la sección 4 del capítulo 25. `findmin` se hace después, cuando todos los hilos han terminado.
::::
