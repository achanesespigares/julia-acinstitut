# Derivadas

Proyecto 2 del libro *Entendiendo Julia, desde dentro* (AC Institut).

Un paquete de Julia que deriva expresiones regla a regla (`deriva`), quita lo que sobra (`simplifica`), calcula su valor (`valor`) y comprueba si la derivada que ha escrito un alumno es correcta, la escriba como la escriba (`comprueba`).

```julia
julia> using Derivadas

julia> simplifica(deriva(:(sin(x^2)), :x))
:(cos(x ^ 2) * (2x))

julia> comprueba(:(2 * cos(2x)), :(sin(2x)), :x)
true
```

- Desde esta carpeta: `julia --project=.` y `using Derivadas`.
- Las pruebas: `julia --project=. -e 'using Pkg; Pkg.test()'`.
- `cuaderno.jl`: ábrelo en Pluto (`using Pluto; Pluto.run()`) para comprobar derivadas en clase.

Sabe derivar números, variables, `+`, `-`, `*`, `/`, `^` con exponente fijo, `sin`, `cos`, `exp` y `log`.
