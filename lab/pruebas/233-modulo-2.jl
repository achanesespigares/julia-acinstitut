module Curso
export alumnos, total
const NOMBRE = "1.º B"
alumnos = ["Ana", "Biel"]
total() = length(alumnos)
function saluda(n)
    s = "Hola, " * n
    return s * " (" * NOMBRE * ")"
end
end
Curso
typeof(Curso)
println(Curso)
string(Curso)
using .Curso
total()
Curso.saluda("Ana")
f = Curso.saluda
f("Biel")
alumnos
Curso.NOMBRE
Curso.notas
