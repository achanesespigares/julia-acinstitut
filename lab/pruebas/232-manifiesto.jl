admite(compat, v) = compat <= v < VersionNumber(compat.major + 1)
elige(versiones, compat) = maximum(filter(v -> admite(compat, v), versiones))
versiones = Dict(
    "DataFrames" => [v"1.7.1", v"1.8.0", v"1.8.3"],
    "CSV" => [v"0.10.17", v"1.0.0", v"1.3.0"],
    "Tables" => [v"1.8.1", v"1.12.1", v"1.13.0", v"1.14.0"])
proyecto = Dict("DataFrames" => v"1.8", "CSV" => v"1")
manifiesto = Dict{String, VersionNumber}()
for (nombre, compat) in proyecto
    manifiesto[nombre] = elige(versiones[nombre], compat)
end
manifiesto
piden = [v"1.9", v"1.14"]
manifiesto["Tables"] = maximum(filter(v -> all(c -> admite(c, v), piden), versiones["Tables"]))
manifiesto
