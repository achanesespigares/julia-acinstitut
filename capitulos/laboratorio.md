---
title: Laboratorio
subtitle: Tu propio Julia, de momento con ayuda (en construcción)
---

En los libros de Python y de R, el laboratorio ejecuta tu código en el propio navegador y lo dibuja paso a paso, como los visualizadores de los capítulos. Con Julia todavía no se puede hacer igual. Este laboratorio tiene **lo máximo que se puede tener hoy**, e irá creciendo a medida que lo permita la tecnología.

:::{important} Lo que hay hoy
| | Qué es | Estado |
|---|---|---|
| **Julia en la nube** | Julia de verdad, en un ordenador remoto, sin instalar nada | Funciona |
| **Julia en tu ordenador** | Julia instalado en tu máquina: la forma de trabajar de verdad | Funciona |
| **Julia en el navegador** | Tu programa, ejecutado y dibujado aquí mismo, como en los capítulos | En construcción |
:::

## 1 · Julia en la nube

Este botón abre un cuaderno de Jupyter con **Julia 1.13** en un ordenador de [mybinder.org](https://mybinder.org), un servicio gratuito y sin registro. Escribe en una celda y pulsa **Mayúsculas + Intro**. Los programas del libro se pueden copiar y pegar tal cual.

{button}`Abrir Julia en la nube <https://2i2c.mybinder.org/v2/gh/achanesespigares/julia-acinstitut/laboratorio?urlpath=lab/tree/laboratorio/laboratorio.ipynb>`

Si no arranca, prueba con la [dirección general de Binder](https://mybinder.org/v2/gh/achanesespigares/julia-acinstitut/laboratorio?urlpath=lab/tree/laboratorio/laboratorio.ipynb), que elige uno de sus servidores.

Ten en cuenta tres cosas:

- **Tarda en arrancar.** Binder prepara un ordenador para ti: en nuestras pruebas, unos cuatro minutos. Si el servicio está muy ocupado, puede tardar más o no arrancar; vuelve a intentarlo un rato después.
- **Es temporal.** Si dejas la sesión un rato sin usar, se cierra y lo que hayas escrito se pierde. Para guardarlo, descarga el cuaderno (*File → Download*).
- **No lo hemos hecho nosotros.** mybinder.org es un servicio público de la comunidad de Jupyter, financiado con donaciones. Úsalo con cariño.

## 2 · Julia en tu ordenador

Es la forma de trabajar de verdad, y la que recomienda el propio proyecto Julia. La instalación oficial pone la última versión estable y una herramienta, `juliaup`, para cambiar de versión cuando quieras.

- **Windows**: el instalador oficial está en [install.julialang.org/Julia.appinstaller](https://install.julialang.org/Julia.appinstaller). Si tienes acceso a la Microsoft Store, también puedes escribir en la consola:

  ```text
  winget install --name Julia --id 9NJNWW8PVKMN -e -s msstore
  ```

- **macOS y Linux**: escribe en el terminal:

  ```text
  curl -fsSL https://install.julialang.org | sh
  ```

Después, escribe `julia` y se abre el REPL, la ventana donde se habla con Julia línea a línea. Los programas del libro se ejecutan ahí exactamente igual que en los visualizadores. Las instrucciones completas están en la [página oficial de descargas](https://julialang.org/downloads/).

## 3 · Julia en el navegador (en construcción)

¿Por qué no funciona aquí, como Python y R? Porque Julia no interpreta tu programa: antes de ejecutar cada función, la **compila** a código máquina con un compilador muy grande, LLVM. Es el secreto de su velocidad, y también lo que hoy no cabe en un navegador.

Hay proyectos de la comunidad que lo intentan por dos caminos. Uno es llevar Julia entero al navegador, que de momento no pasa de prototipos antiguos. El otro es compilar programas concretos de Julia a WebAssembly, el lenguaje que ejecutan los navegadores. Por ese camino ya hay cuadernos de Pluto con partes interactivas que funcionan sin servidor, pero solo con una parte limitada del lenguaje y todavía de forma experimental.

Mientras tanto, estamos preparando nuestra propia vía. Será un laboratorio que entienda la parte de Julia que enseña el libro, que dibuje tu programa paso a paso como los visualizadores y que se compruebe programa a programa contra Julia de verdad. Cuando algo no lo sepa hacer, lo dirá y te mandará a la nube, en lugar de inventarse un resultado. Este apartado se irá actualizando.
