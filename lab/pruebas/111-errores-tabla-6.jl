using DataFrames
df = DataFrame(a = [1.0, 2.0])
df[1, :a] = "x"
