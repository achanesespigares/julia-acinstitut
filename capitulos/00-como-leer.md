---
title: Cómo leer este libro
---

Cada capítulo sigue el mismo recorrido, el del método genético-constructivo:

1. Un **punto de partida** cotidiano.
2. La **pregunta** que lo generaliza.
3. La **idea** mínima que lo sostiene.
4. La **construcción** con código.
5. Las **conexiones** con otros temas.
6. Una **grieta**: algo que el capítulo deja abierto y que lleva al siguiente.

## Las dos rutas

Lo que no es imprescindible va en apartados marcados **A fondo**, con su cápsula negra y un filete a la izquierda. Si sigues la ruta base, puedes ocultarlos con el interruptor que hay al principio de cada capítulo. Así lo que lees nunca da un salto.

```{anywidget} ../widgets/rutas.mjs
{}
```

:::{div}
:class: afondo
Esto es un apartado «A fondo». Si eliges la ruta base, desaparece de la página.
:::

## Los visualizadores

Debajo de los programas clave hay un visualizador. Así se usa:

- **Paso ▶** ejecuta la siguiente línea; **◀** vuelve atrás; **Reproducir** avanza solo.
- La línea marcada con **▶** es la que se acaba de ejecutar.
- En **Memoria** aparece cada variable con la etiqueta de su **tipo**: `Int64`, `Float64`, `String`… Un número suelto es una casilla; un vector, una fila de casillas numeradas **desde 1**. Lo que acaba de cambiar se resalta en vino.
- Las variables **locales** de un bucle o de una función llevan el borde discontinuo: existen mientras dura el bucle o la llamada, y después desaparecen.
- Cuando el programa evalúa una condición, la ves en tres tiempos: la expresión, la expresión con los valores de ese momento y el resultado (`true` o `false`).
- La **tabla de traza** se rellena sola, una fila por vuelta del bucle.

Los programas se ejecutan como en el REPL de Julia, la ventana donde se escribe línea a línea. En la consola del visualizador se ve el valor de cada línea que no es una asignación.

## La misma idea en tres lenguajes

En algunos capítulos hay un recuadro con el mismo problema resuelto en Julia, en Python y en R. Sirve para ver qué es propio de Julia y qué es común a todos los lenguajes.
