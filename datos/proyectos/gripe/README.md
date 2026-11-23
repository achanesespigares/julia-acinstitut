# La gripe del internado

Proyecto 1 del libro *Entendiendo Julia, desde dentro* (AC Institut).

Un modelo SIR del brote de gripe de un internado inglés en 1978, ajustado a los 14 días de datos.

- `julia --project=. analisis.jl`: ajusta el modelo, guarda el gráfico en `gripe.svg` y pasa las pruebas.
- `julia --project=. test/runtests.jl`: solo las pruebas.
- `cuaderno.jl`: ábrelo en Pluto (`using Pluto; Pluto.run()`) para mover β y γ con deslizadores.

En otro ordenador, instala antes los paquetes: `julia --project=. -e 'using Pkg; Pkg.instantiate()'`.

## Los datos

`datos/gripe_internado.csv`: chicos en cama y convalecientes, del 22 de enero al 4 de febrero de 1978.

- Fuente original: Anonymous (1978). Influenza in a boarding school. *British Medical Journal*, 4 de marzo de 1978, p. 587.
- Transcripción: paquete de R outbreaks (`influenza_england_1978_school`), que la toma de De Vries y otros (2006), *A Course in Mathematical Biology*, capítulo 9.
