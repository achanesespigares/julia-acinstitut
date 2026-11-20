s = "canción"
n = length(s)
b = ncodeunits(s)
u = lastindex(s)
o = s[6]
z = s[end]
t1 = s[1:5]
t2 = s[6:8]
t3 = s[4:3]
i = nextind(s, 6)
j = prevind(s, 8)
k = thisind(s, 7)
idx = collect(eachindex(s))
for p in eachindex("añ")
    println(p)
end
s[7]
