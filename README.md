# Mirar y ver tu código pensar · Entendiendo Julia, desde dentro

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

Requisitos: Node 18 o superior y Julia 1.12 o superior.

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

## Licencia

Antonio Chanes Espigares · CC BY-NC-SA 4.0
