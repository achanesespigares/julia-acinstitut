---
title: Datos y estadística
subtitle: Las medidas traen ruido; la estadística saca de ellas lo que dicen y cuánto te puedes fiar
kernelspec:
  name: julia
  display_name: Julia
---

```{anywidget} ../widgets/rutas.mjs
{}
```

## Punto de partida

En *Ecuaciones diferenciales* calculaste cómo se enfría un café con la ley de Newton, `T' = −k (T − 20)`, y `k = 0.1` venía dado. En *Probabilidad y simulación* aprendiste a sacar números al azar con `rand` y `randn`, y viste que con muchas repeticiones el azar se vuelve previsible.

## La pregunta

Si mides la temperatura de un café cada dos minutos, ¿cómo sacas de esas medidas el `k` de tu café? Las medidas no caen justo sobre ninguna curva: el termómetro baila un poco. ¿Qué número das, y cuánto te puedes fiar de él?

## La idea

Unos datos se **resumen** con unos pocos números: dónde está su centro (la **media**, la **mediana**) y cuánto se separan de él (la **desviación típica**). Esos resúmenes viven en el paquete **Statistics**, que viene con Julia.

Las medidas reales tienen **ruido**: pequeños errores que unas veces suben y otras bajan. Para sacar un número de ellas, como el `k` del café, se busca el modelo que pasa **más cerca** de todas a la vez. Es el método de los **mínimos cuadrados**, y para una recta se escribe con dos medias y dos sumas.

Y como otras medidas habrían dado un `k` un poco distinto, el resultado no es un número solo, sino un número con su **incertidumbre**. El capítulo la calcula con una idea de *Probabilidad y simulación*: repetir el experimento muchas veces, pero con los datos que ya tienes. Se llama **remuestreo**.

:::{important} Un resultado sin incertidumbre está a medias
Cualquier número calculado a partir de medidas hereda su ruido. Por eso un resultado estadístico se da con su margen: «`k` vale 0,098, y casi seguro está entre 0,094 y 0,104». El número solo dice lo que has medido; el margen dice cuánto te puedes fiar.
:::

## Construcción

### 1 · Resumir unos datos

:::{tip} Predice
Al copiar las notas, alguien escribe 85 en lugar de 8.5. ¿Cuál cambiará más: la media o la mediana?
:::

```{code-cell} julia
using Statistics
notas = [6.5, 7.0, 5.5, 8.0, 9.5, 4.0, 7.5, 6.0, 7.0, 8.5, 3.0, 7.5]
media = mean(notas)
mediana = median(notas)
desviacion = std(notas)
sort(notas)
mal = [notas; 85.0]
mean(mal)
median(mal)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/16-datos-estadistica-1.json","config":{"etiqueta":"mean · median · std","idea":"La media suma y divide; la mediana ordena y se queda con el del medio; la desviación típica mide cuánto se separan los datos de la media. Un dato equivocado mueve mucho la media y casi nada la mediana.","titulo":"Doce notas en tres números"}}
```

`using Statistics` carga las funciones de estadística. **`mean`** es la media de siempre: suma las doce notas y divide entre doce, `6.666666666666667`. **`median`** ordena las notas y se queda con la del medio; con doce hay dos en el medio, las dos de 7, y da su punto medio, `7.0`. `sort(notas)` enseña ese orden.

**`std`** es la desviación típica, `1.8381479480139455`: lo que se separa una nota «típica» de la media. Se calcula con la raíz de la media de las distancias al cuadrado, dividiendo entre `n − 1` en lugar de `n`. Con estas notas, dice que la mayoría están entre 6,67 − 1,84 y 6,67 + 1,84, más o menos entre 4,8 y 8,5.

Después, `[notas; 85.0]` añade al final una nota mal copiada, como `vcat` en *Matrices*. La media salta a `12.692307692307692`, una nota que nadie tiene. La mediana sigue en `7.0`: el 85 se pone el último al ordenar, y el del medio apenas se mueve. Por eso, si los datos pueden tener errores o valores extremos, la mediana es más **robusta**.

### 2 · Medir con ruido

:::{tip} Predice
Un termómetro se equivoca cada vez en medio grado, más o menos. Si haces 10 medidas y das su media, ¿te equivocarás más, menos o lo mismo que con una sola?
:::

```{code-cell} julia
using Statistics, Random
Random.seed!(7)
medidas = 45.75 .+ 0.5 .* randn(10)
mean(medidas)
std(medidas)
std(medidas) / sqrt(10)
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/16-datos-estadistica-2.json","config":{"etiqueta":"el error de la media","idea":"Cada medida es el valor de verdad más un error al azar. Los errores de unas y otras se compensan en parte, y la media se acerca más al valor de verdad que una medida suelta: su error típico es la desviación típica dividida entre la raíz de n.","titulo":"Diez medidas del mismo café"}}
```

Este programa simula un termómetro: el café está de verdad a 45,75 °C, y cada medida le suma un error al azar. `randn(10)` da diez números de la campana de *Probabilidad y simulación*, y multiplicarlos por 0.5 hace que el error típico sea de medio grado.

Las diez medidas van de 45,12 a 46,93: algunas se equivocan en más de un grado. Pero su media, `45.79553831111572`, solo se equivoca en 0,05. Los errores de unas medidas se compensan en parte con los de otras.

`std(medidas)`, `0.5727355037925593`, estima el error de **una** medida: cerca del 0,5 que pusimos. Y dividida entre `√10` da `0.18111486888284922`, el **error típico de la media**: la media de `n` medidas se equivoca unas `√n` veces menos que una sola. Con 10 medidas, unas tres veces menos; para equivocarte diez veces menos, harían falta cien.

### 3 · Las medidas del café

:::{tip} Predice
Si la temperatura baja como `20 + 70 · e^(−kt)`, ¿qué forma tendrá el gráfico de `log(T − 20)`?
:::

```{code-cell} julia
using Plots
t = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
T = [89.7, 76.7, 67.4, 57.8, 51.6, 45.2, 40.0, 36.3, 33.6, 32.7, 29.9]
scatter(t, T, label = "medidas", xlabel = "minutos", ylabel = "°C")
y = log.(T .- 20)
scatter(t, y, label = "log(T − 20)", xlabel = "minutos")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/16-datos-estadistica-3.json","config":{"etiqueta":"scatter · log.","idea":"Las medidas bajan como una curva. Tomando el logaritmo de T − 20, la curva exponencial se convierte en una recta, y una recta es mucho más fácil de ajustar.","titulo":"Once medidas del café"}}
```

Estas once medidas, una cada dos minutos, son las que daría un termómetro de cocina que marca décimas de grado. Para saber qué respuesta es la buena, se han fabricado: son la curva del café con `k = 0.1` más un error al azar de unas ocho décimas de grado, redondeado a décimas. El primer gráfico, con `scatter` (puntos sueltos, como en *Gráficos*), enseña la curva que bajaba en *Ecuaciones diferenciales*, pero con los puntos un poco desordenados: es el ruido.

El truco está en la segunda parte. Si `T = 20 + A · e^(−kt)`, entonces `T − 20 = A · e^(−kt)`, y tomando logaritmos,

$$\log(T - 20) = \log A - k\,t.$$

Es una **recta**, con pendiente `−k`. `log.(T .- 20)` calcula ese logaritmo para cada medida, con el punto de *Índices, filtros y el punto*, y el segundo gráfico lo confirma: los puntos caen casi en línea recta, de `4.2442…` a `2.2925…`. Ahora el problema es encontrar la recta que mejor pasa por ellos.

### 4 · La recta que pasa más cerca

:::{tip} Predice
Las medidas se fabricaron con `k = 0.1`. ¿Saldrá exactamente 0,1?
:::

```{code-cell} julia
using Statistics, Plots
t = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
T = [89.7, 76.7, 67.4, 57.8, 51.6, 45.2, 40.0, 36.3, 33.6, 32.7, 29.9]
y = log.(T .- 20)
function recta(x, y)
    mx = mean(x)
    my = mean(y)
    b = sum((x .- mx) .* (y .- my)) / sum((x .- mx) .^ 2)
    a = my - b * mx
    return a, b
end
a, b = recta(t, y)
k = -b
A = exp(a)
ajuste = [20 + A * exp(-k * s) for s in 0:20]
scatter(t, T, label = "medidas", xlabel = "minutos", ylabel = "°C")
plot!(0:20, ajuste, label = "ajuste")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/16-datos-estadistica-4.json","config":{"etiqueta":"mínimos cuadrados","idea":"La recta de mínimos cuadrados es la que hace más pequeña la suma de los cuadrados de las distancias verticales a los puntos. Su pendiente sale de dos sumas: cómo varían x e y juntas, dividido entre cómo varía x sola.","titulo":"El k de tu café"}}
```

De todas las rectas posibles, la de **mínimos cuadrados** es la que hace más pequeña la suma de los cuadrados de las distancias verticales de los puntos a la recta. Con cálculo se demuestra que su pendiente es

$$b = \frac{\sum (x_i - \bar x)(y_i - \bar y)}{\sum (x_i - \bar x)^2},$$

donde `x̄` e `ȳ` son las medias, y que pasa por el punto `(x̄, ȳ)`. `recta` lo escribe tal cual: `x .- mx` resta la media a cada elemento, `.*` multiplica elemento a elemento y `sum` suma. Y devuelve las dos cosas, `a` y `b`, como una tupla.

Sale `b = -0.098310849167036`, así que `k = 0.098310849167036`, y `A = exp(a) = 68.51889…`. No es 0,1 exacto: con otras once medidas habría salido otro número. Pero se parece mucho, y la curva del ajuste, dibujada con `plot!` encima de las medidas, pasa entre todas ellas.

Una curiosidad: el ajuste dice que el café empezó a `20 + 68,52 = 88,52` grados, y la primera medida decía 89,7. Una sola medida tiene su error; el ajuste usa las once a la vez.

### 5 · ¿Cuánto te puedes fiar?

:::{tip} Predice
El remuestreo repite el ajuste 100 veces con medidas elegidas al azar entre las once que hay. ¿Estará el 0,1 de verdad dentro del margen que sale?
:::

```{code-cell} julia
using Statistics, Random, Plots
t = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
T = [89.7, 76.7, 67.4, 57.8, 51.6, 45.2, 40.0, 36.3, 33.6, 32.7, 29.9]
y = log.(T .- 20)
function recta(x, y)
    mx = mean(x)
    my = mean(y)
    b = sum((x .- mx) .* (y .- my)) / sum((x .- mx) .^ 2)
    return my - b * mx, b
end
Random.seed!(1)
ks = Float64[]
for vuelta in 1:100
    i = rand(1:11, 11)
    a, b = recta(t[i], y[i])
    push!(ks, -b)
end
orden = sort(ks)
orden[3], orden[98]
histogram(ks, label = "k remuestreado")
```

```{anywidget} ../widgets/traza-jl.mjs
{"archivo":"datos/trazas/16-datos-estadistica-5.json","config":{"etiqueta":"remuestreo (bootstrap)","idea":"Cada vuelta elige 11 medidas al azar entre las 11 que hay, pudiendo repetir, y vuelve a ajustar la recta. Los 100 valores de k que salen dicen cuánto podría haber cambiado el resultado con otras medidas.","titulo":"El margen de k"}}
```

Lo ideal sería repetir el experimento del café muchas veces y ver cuánto cambia `k`. No se puede, pero se puede imitar: en cada vuelta, `rand(1:11, 11)` elige once posiciones al azar, **pudiendo repetir**, y `t[i]` e `y[i]` son once medidas sacadas de las que hay. Unas salen dos veces y otras ninguna, como si fuera otro experimento parecido. Se ajusta la recta y se guarda el `k` con `push!`.

Es el **remuestreo** (en inglés, *bootstrap*, la tira de la bota: tirar de uno mismo para levantarse). Los 100 valores de `k` van de 0,0899 a 0,1049. Ordenados, el tercero y el nonagésimo octavo dejan fuera un 2,5 % por cada lado: el **intervalo del 95 %** va de `0.09392872971629712` a `0.10428083514666348`.

Así que la respuesta a la pregunta del capítulo es: **`k` vale 0,098, y casi seguro está entre 0,094 y 0,104**. El 0,1 de verdad está dentro. El histograma, con `histogram` de *Probabilidad y simulación*, enseña cómo se reparten los 100 valores: 61 de ellos caen entre 0,096 y 0,100, y solo 10 se alejan más de 0,005 del 0,098 del ajuste.

::::{div}
:class: afondo
### 6 · Lo que hay detrás

**Por qué `n − 1`.** `std` divide entre `n − 1` y no entre `n` porque las distancias se miden a la media de los propios datos, que está más cerca de ellos que el valor de verdad. Dividir entre `n` daría desviaciones un poco pequeñas, sobre todo con pocos datos. Con `std(notas, corrected = false)` se divide entre `n`. NumPy, en cambio, divide entre `n` por defecto: `np.std(T)` da 18,895 y `np.std(T, ddof = 1)`, 19,817, como `std(T)` de Julia.

**La correlación.** `cor(t, y)` mide si dos cosas suben o bajan juntas, de −1 a 1. Con las medidas del café da `-0.9979293276851381`: casi −1, una recta casi perfecta que baja. Pero una correlación alta no dice que una cosa cause la otra, ni que la relación sea una recta: solo que los puntos se alinean.

**Mínimos cuadrados con una matriz.** La recta también sale con la barra de *Álgebra lineal*: con `X = [ones(11) t]`, `X \ y` resuelve un sistema de 11 ecuaciones y 2 incógnitas que no tiene solución exacta, y Julia da la de mínimos cuadrados (con la factorización QR). Da `[4.227109482547706, -0.09831084916703602]`, lo mismo que `recta` salvo en las últimas cifras. Es la manera de ajustar modelos con muchos parámetros. El laboratorio aún no sabe resolver sistemas que no son cuadrados.

**El logaritmo cambia el peso de cada medida.** Al final, el café está cerca de 20 °C y `T − 20` es pequeño: un error de 0,5 grados en `T − 20 = 10` es un 5 %, y el logaritmo lo agranda. La recta da a esas medidas más peso del que merecen. El paquete **LsqFit** ajusta la curva `20 + A · e^(−kt)` directamente, sin logaritmos, buscando los parámetros con un método como el de Newton de *Ecuaciones y optimización*: da `k = 0.10063758699162902`, más cerca del 0,1 de verdad, con un intervalo del 95 % de 0,0975 a 0,1037. Comprobado con LsqFit 0.16.1.

**Los paquetes de estadística.** `Statistics` trae lo básico (`mean`, `median`, `std`, `var`, `cor`, `quantile`). **StatsBase** añade pesos, modas y muestreo; **GLM** hace regresiones con su tabla de errores e intervalos, como R: `lm(@formula(y ~ t), datos)`. Con estos datos, su intervalo del 95 % para la pendiente va de −0,1031 a −0,0935, es decir, `k` entre 0,0935 y 0,1031: muy parecido al del remuestreo. Comprobado con GLM 1.9.5.

**Y en el laboratorio.** Las cinco construcciones funcionan en el laboratorio con los mismos números que Julia. Hay un detalle: con 16 o más decimales, `sum`, `mean` y `std` de Julia suman en un orden que depende del procesador (para ir más deprisa), y la última cifra puede cambiar de un ordenador a otro. El laboratorio solo las calcula con menos de 16 decimales, o cuando la suma es exacta; si no, te lo dice y te manda a la nube. Por eso los datos de este capítulo tienen menos de 16 valores.
::::

:::{admonition} La misma idea en tres lenguajes
:class: seealso
| | Julia | Python (NumPy, SciPy) | R |
|---|---|---|---|
| Media y mediana | `mean(T)`, `median(T)` | `np.mean(T)`, `np.median(T)` | `mean(T)`, `median(T)` |
| Desviación típica | `std(T)` (entre `n − 1`) | `np.std(T, ddof = 1)` (por defecto, entre `n`) | `sd(T)` (entre `n − 1`) |
| Correlación | `cor(t, y)` | `np.corrcoef(t, y)[0, 1]` | `cor(t, y)` |
| Recta de mínimos cuadrados | `[ones(11) t] \ y`, o `lm` de GLM | `scipy.stats.linregress(t, y)` | `lm(y ~ t)` |
| Ajustar una curva | `curve_fit` de LsqFit | `scipy.optimize.curve_fit` | `nls(T ~ 20 + A * exp(-k * t), …)` |

R es un lenguaje hecho para la estadística, y se nota: `lm(y ~ t)` da la recta, y `confint` su intervalo del 95 % para la pendiente, de −0,1031 a −0,0935. SciPy da la misma pendiente con `linregress` (`-0.09831084916703599`) y el mismo `k` que R con `curve_fit` (0,10064). Comprobado con R 4.3.3 y SciPy 1.18.1.
:::

## Conexiones

- `mean`, `median` y `std` resumen un vector, como `sum`, `maximum` y `count` en *Vectores y rangos*.
- `log.(T .- 20)` y `(x .- mx) .* (y .- my)` son el punto de *Índices, filtros y el punto*.
- `[notas; 85.0]` junta dos vectores, como en *Matrices*.
- Las medidas con ruido se simulan con `randn` y la semilla de *Probabilidad y simulación*; el remuestreo es una simulación con los datos que ya tienes.
- La curva que se ajusta es la solución del café de *Ecuaciones diferenciales*, y el ajuste por mínimos cuadrados es el `A \ b` de *Álgebra lineal* cuando hay más ecuaciones que incógnitas.
- `scatter`, `plot!` e `histogram` son los de *Gráficos* y *Probabilidad y simulación*.

## La grieta

Con este capítulo termina la parte de cálculo científico. Ya sabes resolver sistemas, dibujar, simular, buscar raíces, avanzar ecuaciones diferenciales y ajustar datos. Pero todo el tiempo has usado funciones como `mean`, `sort` o `+` sin preguntarte qué hace Julia con ellas por dentro: ¿por qué la misma `+` sirve para enteros, decimales, fracciones y vectores? ¿Qué es exactamente un `Float64` o un `Vector{Float64}`, y por qué importa? Es la parte siguiente, *Julia por dentro*, que empieza por *El sistema de tipos*.

## Ejercicios

1. **Otra clase.** Las notas de otra clase son `[5.0, 5.5, 6.0, 6.5, 7.0, 7.0, 7.5, 8.0, 8.5, 9.0]`. Calcula su media, su mediana y su desviación típica, y compáralas con las de la sección 1. ¿Qué clase es más homogénea?

2. **Predice.** ¿Qué dan `median([1, 2, 3, 100])` y `mean([1, 2, 3, 100])`? Hazlo de cabeza antes de ejecutarlo.

3. **Más medidas.** Repite la sección 2 con 4 medidas y con 15, sin cambiar la semilla. ¿Cómo cambia el error típico de la media, `std(medidas) / sqrt(n)`? ¿Cuánto se equivoca la media en cada caso?

4. **Horas de estudio.** Seis alumnos estudiaron 1, 2, 3, 4, 5 y 6 horas, y sacaron `[4.5, 5.0, 6.5, 6.0, 7.5, 8.5]`. Usa la función `recta` de la sección 4 para ajustar una recta. ¿Cuánto sube la nota, de media, por cada hora? ¿Qué nota predice para 7 horas? ¿Te fiarías de lo que predice para 20?

5. **Los residuos.** Después de la sección 4, calcula `r = y .- (a .+ b .* t)`, lo que le falta a cada punto para caer en la recta. ¿Cuánto vale `sum(r)`? ¿Qué medida queda más lejos de la recta?

6. **Sin la última medida.** Repite el ajuste de la sección 4 con las diez primeras medidas, `t[1:10]` e `y[1:10]`. ¿Qué `k` sale? ¿Por qué crees que cambia tanto al quitar una sola medida?

::::{div}
:class: afondo
7. **Ajustar sin logaritmos.** Ajusta la curva `20 + A · e^(−kt)` a las temperaturas directamente. Para cada `k` de `0.090:0.0005:0.110`, el mejor `A` es `sum(e .* (T .- 20)) / sum(e .^ 2)`, con `e = exp.(-k .* t)`; calcula la suma de los cuadrados de los errores, `sum((T .- 20 .- A .* e) .^ 2)`, y busca con `findmin` el `k` que la hace más pequeña. Compáralo con el de la sección 4 y con el de LsqFit del «A fondo».

8. **El margen de una media.** Haz el remuestreo de la sección 5 con la media de las diez medidas de la sección 2: 100 vueltas, cada una con `mean(medidas[i])` e `i = rand(1:10, 10)`. Compara el intervalo del 95 % con «la media más o menos dos errores típicos».
::::

## Solucionario

1. Media `7.0`, mediana `7.0` y desviación típica `1.2909944487358056`. La desviación típica es más pequeña que la de la sección 1 (1,84): esta clase es más homogénea, con las notas más juntas alrededor de la media. Además, media y mediana coinciden, porque las notas están repartidas por igual a los dos lados.
2. `median([1, 2, 3, 100])` da `2.5`, el punto medio de 2 y 3. `mean` da `26.5`: el 100 se lleva la media hacia arriba, aunque tres de los cuatro datos no pasen de 3. Es lo mismo que pasó con el 85 de la sección 1.
3. Con 4 medidas, la media es `45.87958598502873` (se equivoca en 0,13) y el error típico, `0.404150228377741`. Con 15, la media es `45.75234019534167` (se equivoca en 0,002) y el error típico, `0.12780381031079294`. El error típico baja de 0,40 a 0,13, unas tres veces: `√(15/4) ≈ 1,9` veces por tener más medidas, y el resto porque la `std` de 4 medidas (0,81) salió alta, y la de 15 (0,49) está cerca del 0,5 de verdad. Con pocas medidas, hasta el error se estima mal.
4. `recta(h, nn)` da `a = 3.633333333333333` y `b = 0.7714285714285715`: cada hora sube la nota unas 0,77. Para 7 horas predice `9.033333333333333`. Para 20, la recta daría más de 19, una nota imposible: la recta solo vale cerca de los datos que la han hecho. Predecir lejos de ellos se llama **extrapolar**, y es peligroso.
5. `sum(r)` da `7.105427357601002e-15`, prácticamente 0: en la recta de mínimos cuadrados, los residuos siempre suman 0 (salvo el redondeo), porque pasa por el punto de las medias. La medida más lejana es la décima, la del minuto 18 (32,7 °C), con un residuo de `0.0840877959234887`: el termómetro marcó de más.
6. Con diez medidas sale `k = 0.09936559109815457`, más cerca de 0,1 que con las once. La última medida, 29,9 °C, está muy cerca de 20 °C, y su logaritmo agranda el error del termómetro, como explica el «A fondo». Por eso pesa tanto en la recta.

::::{div}
:class: afondo
7. El mínimo está en `k = 0.1005`, con una suma de cuadrados de `4.496356809125647`. Está mucho más cerca de 0,1 que el 0,0983 de la recta y casi coincide con el `0.10063…` de LsqFit (la rejilla va de 0,0005 en 0,0005). Ajustar las temperaturas directamente no agranda el ruido de las últimas medidas.
8. El intervalo del remuestreo va de `45.548709262304655` a `46.127881091159146`; la media más o menos dos errores típicos va de `45.43330857335002` a `46.15776804888142`. Los dos contienen el 45,75 de verdad y se parecen, aunque el del remuestreo es algo más estrecho: con solo diez medidas, cien remuestreos dan un margen aproximado.
::::
