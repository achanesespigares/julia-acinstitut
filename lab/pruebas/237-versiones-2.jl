a = VersionNumber(1, 8, 3)
b = VersionNumber(2)
c = VersionNumber("0.16")
v"1" == v"1.0.0"
v"1.2" < v"1.10"
isless(v"0.9.9", v"0.10.0")
a.major
a.minor + 1
VersionNumber(a.major, a.minor + 1)
string(a)
s = "versión $a"
s
d = Dict{String, VersionNumber}()
d["Plots"] = v"1.41.8"
d["CSV"] = v"1.3.0"
d
vs = [v"0.10.17", v"1.0.0", v"0.9.0"]
sort(vs; rev = true)
minimum(vs)
filter(x -> x >= v"0.10", vs)
typeof(vs)
a.prerelaese
