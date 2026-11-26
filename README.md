# Mirar y ver · Julia · cómo piensa tu código

Aprender Julia viendo cómo se ejecuta cada programa, línea a línea y con la memoria a la vista. Es el tercer libro de la colección, después de los de Python y R. Está hecho con Jupyter Book 2 (motor MyST) y se publica en GitHub Pages.

## Las dos rutas

Cada capítulo tiene una **ruta base** (para el aula y el autoestudio) y apartados **A fondo** (cómo funciona Julia por dentro y cómo se trabaja como profesional), como los niveles SL y HL del IB. Un apartado «A fondo» se escribe así:

```markdown
:::{div}
:class: afondo
### 4 · Cómo guarda Julia un número
…
:::
```

Si el apartado lleva dentro otra directiva (un bloque de código, un visualizador), se abre y se cierra con `::::{div}`. El interruptor `widgets/rutas.mjs`, al principio de cada capítulo, oculta o muestra esos bloques. La elección se recuerda en el navegador.

## Estructura

```
myst.yml                  configuración e índice del libro
index.md                  portada
capitulos/                un fichero por capítulo
widgets/traza-jl.mjs      el visualizador de trazas de Julia
widgets/rutas.mjs         el interruptor de las dos rutas
herramientas/trazar.jl    ejecuta los programas paso a paso y escribe las trazas en datos/trazas/
herramientas/Project.toml el entorno de Julia del generador (JSON)
estilo/ac-institut.css    piel AC Institut (vino, Montserrat, Arimo, IBM Plex Mono) y cápsulas «A fondo»
.github/workflows/        publicación automática en GitHub Pages
```

## Trabajar con el libro

Requisitos: Node 18 o superior y Julia 1.12 o superior (el libro se comprueba con Julia 1.13).

```bash
npm ci                                                   # instala MyST en la versión fijada
julia --project=herramientas -e 'using Pkg; Pkg.instantiate()'   # una vez: el paquete JSON
npm run trazas                                           # regenera las trazas
npm start                                                # vista previa en http://localhost:3000
npm run build                                            # versión estática en _build/html
```

Las trazas se generan en local y se guardan en `datos/trazas/`: la publicación no necesita Julia.

## Añadir un programa visualizado

Detrás de una celda `{code-cell} julia`, una directiva con su configuración:

````markdown
```{anywidget} ../widgets/traza-jl.mjs
{"config":{"titulo":"…","etiqueta":"…","idea":"…","foco":"notas","puntero":"i","columnas":["i","notas[i]"],"fila_en":"fin_iteracion"}}
```
````

Después, `npm run trazas`. Las claves de `config` están explicadas al principio de `herramientas/trazar.jl`.

## El laboratorio: Julia en el navegador

Julia no se puede ejecutar todavía en un navegador, así que el laboratorio (`capitulos/laboratorio.md`) usa un
**intérprete propio** de la parte de Julia que enseña el libro:

```
lab/jl/julia.mjs          el intérprete: ámbitos como el REPL, funciones y marcos, y trazas como trazar.jl
lab/jl/valores.mjs        los valores de Julia (Int64 de 64 bits de verdad, Float64…) y cómo los escribe Julia
lab/jl/primitivas.mjs     la aritmética y las funciones de Base, con los mismos errores
lab/vendor/               web-tree-sitter y la gramática tree-sitter-julia (MIT), copiadas de node_modules
lab/pruebas/*.jl          el banco de pruebas (# config: {...} en la primera línea, si hace falta)
herramientas/conformidad.mjs   compara el intérprete con Julia de verdad, paso a paso
```

`npm run conformidad` ejecuta cada programa de los capítulos y del banco con `trazar.jl` (Julia) y con el
intérprete, y compara las trazas: variables, tipos, consola, tabla y errores. También se ejecuta en GitHub con
cada push (`.github/workflows/conformidad.yml`). Lo que el intérprete no sabe hacer lanza `NoSoportado` y el
laboratorio lo dice; nunca inventa un resultado. Cuando un capítulo nuevo usa algo que el intérprete aún no
sabe, se añade al intérprete y a `lab/pruebas/` hasta que la conformidad vuelva a ser total.

## Licencia

Antonio Chanes Espigares · CC BY-NC-SA 4.0
