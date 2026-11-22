r = [1:3, 4:6, 7:7]
typeof(r)
r[2]
length.(r)
sum.(r)
[collect(x) for x in r]
s = [i:i+1 for i in 1:2:7]
s[end]
v = [10, 20, 30, 40, 50]
[v[x] for x in [1:2, 3:5]]
