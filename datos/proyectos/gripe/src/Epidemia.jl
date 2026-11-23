# Epidemia: el modelo SIR del brote de gripe del internado (1978)
module Epidemia

export N, leer_datos, sir, paso, simula, error2, ajusta

const N = 763          # los chicos del internado

# Lee la columna en_cama del archivo de datos
function leer_datos(ruta)
    lineas = readlines(ruta)
    cama = Int[]
    for l in lineas[2:end]
        partes = split(l, ",")
        push!(cama, parse(Int, partes[3]))
    end
    return cama
end

# Cuánto cambian sanos (S), enfermos (I) y recuperados (R) en un día
function sir(u, β, γ)
    contagios = β * u[1] * u[2] / N
    curas = γ * u[2]
    return [-contagios, contagios - curas, curas]
end

# Un paso de Runge–Kutta de orden 4 (capítulo 15)
function paso(u, h, β, γ)
    k1 = sir(u, β, γ)
    k2 = sir(u + h / 2 * k1, β, γ)
    k3 = sir(u + h / 2 * k2, β, γ)
    k4 = sir(u + h * k3, β, γ)
    return u + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
end

# Los enfermos de cada día, empezando con un solo enfermo
function simula(β, γ, dias)
    u = [N - 1.0, 1.0, 0.0]
    enfermos = Float64[]
    for d in 1:dias
        u = paso(u, 1.0, β, γ)
        push!(enfermos, u[2])
    end
    return enfermos
end

# Suma de los errores al cuadrado entre el modelo y los datos
error2(β, γ, datos) = sum((simula(β, γ, length(datos)) .- datos) .^ 2)

# Prueba todas las parejas (β, γ) y se queda con la de menor error
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

end
