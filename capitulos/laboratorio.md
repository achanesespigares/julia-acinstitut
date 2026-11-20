---
title: Laboratorio
subtitle: Tu propio Julia, paso a paso, en el navegador (en construcción)
---

En los libros de Python y de R, el laboratorio ejecuta tu código en el propio navegador y lo dibuja paso a paso, como los visualizadores de los capítulos. En Julia eso no venía hecho: no existe todavía un Julia completo para el navegador. Así que lo estamos construyendo nosotros. Este laboratorio tiene **lo máximo que se puede tener hoy**, e irá creciendo con el libro.

:::{important} Lo que hay hoy
| | Qué es | Estado |
|---|---|---|
| **Julia en el navegador** | Tu programa, ejecutado y dibujado aquí mismo, como en los capítulos | Funciona con la parte de Julia de los capítulos publicados; crece con el libro |
| **Julia en la nube** | Julia de verdad, completo, en un ordenador remoto, sin instalar nada | Funciona |
| **Julia en tu ordenador** | Julia instalado en tu máquina: la forma de trabajar de verdad | Funciona |
:::

## 1 · Julia en el navegador

Escribe tu programa, o elige un ejemplo, y pulsa **Ejecutar y ver paso a paso**. Si quieres seguir algunas variables en la tabla de traza, escríbelas separadas por comas.

```{anywidget} ../widgets/traza-jl.mjs
{"config":{"tipo":"laboratorio"}}
```

:::{note} Cómo funciona por dentro
Julia no se puede ejecutar todavía en un navegador: antes de ejecutar cada función la compila con LLVM, un compilador enorme que no cabe aquí. Este laboratorio es un **intérprete propio**: lee tu programa con la gramática de Julia de [tree-sitter](https://tree-sitter.github.io/) y lo ejecuta siguiendo las reglas de Julia. Los enteros son de 64 bits y dan la vuelta como en Julia, los decimales usan el mismo estándar y los errores salen con el mismo texto.

Para que no se aparte ni un milímetro de Julia, cada programa de los capítulos y un banco de pruebas se ejecutan con el intérprete y con Julia de verdad, y las dos trazas se comparan paso a paso: variables, tipos, consola y errores. Cuando algo no lo sabe hacer, **lo dice** y te manda a la nube, en lugar de inventarse un resultado. La parte que entiende crece con cada capítulo nuevo.
:::

## 2 · Julia en la nube

Para lo que el laboratorio del navegador aún no sabe hacer, este botón abre un cuaderno de Jupyter con **Julia 1.13** completo en un ordenador de [mybinder.org](https://mybinder.org), un servicio gratuito y sin registro. Escribe en una celda y pulsa **Mayúsculas + Intro**. Los programas del libro se pueden copiar y pegar tal cual.

{button}`Abrir Julia en la nube <https://2i2c.mybinder.org/v2/gh/achanesespigares/julia-acinstitut/laboratorio?urlpath=lab/tree/laboratorio/laboratorio.ipynb>`

Si no arranca, prueba con la [dirección general de Binder](https://mybinder.org/v2/gh/achanesespigares/julia-acinstitut/laboratorio?urlpath=lab/tree/laboratorio/laboratorio.ipynb), que elige uno de sus servidores.

Ten en cuenta tres cosas:

- **Tarda en arrancar.** Binder prepara un ordenador para ti: en nuestras pruebas, unos cuatro minutos. Si el servicio está muy ocupado, puede tardar más o no arrancar; vuelve a intentarlo un rato después.
- **Es temporal.** Si dejas la sesión un rato sin usar, se cierra y lo que hayas escrito se pierde. Para guardarlo, descarga el cuaderno (*File → Download*).
- **No lo hemos hecho nosotros.** mybinder.org es un servicio público de la comunidad de Jupyter, financiado con donaciones. Úsalo con cariño.

## 3 · Julia en tu ordenador

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
