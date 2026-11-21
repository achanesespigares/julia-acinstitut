function admite(compat, v)
    if compat.major > 0
        return compat <= v < VersionNumber(compat.major + 1)
    elseif compat.minor > 0
        return compat <= v < VersionNumber(0, compat.minor + 1)
    else
        return compat <= v < VersionNumber(0, 0, compat.patch + 1)
    end
end
admite(v"1.8", v"1.8.3")
admite(v"1.8", v"1.7.1")
admite(v"1.8", v"2.0.0")
admite(v"0.16", v"0.16.1")
admite(v"0.16", v"0.17.0")
for v in [v"0.10.17", v"1.0.0", v"1.3.0"]
    println("CSV ", v, ": ", admite(v"0.10", v) ? "sí" : "no")
end
