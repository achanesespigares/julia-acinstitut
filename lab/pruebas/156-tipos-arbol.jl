typeof(1 + 2.0)
typeof(3//1 + 1)
typeof(2^3), typeof(7 ÷ 2), typeof(7 / 2)
for t0 in (Float64, Bool, String)
    t = t0
    while t != Any
        t = supertype(t)
        println(t)
    end
end
supertype(Any)
Signed <: Integer, Int64 <: Signed, Char <: AbstractChar, String <: AbstractString
Integer <: Int64
isabstracttype(Number), isconcretetype(Real), isconcretetype(Float64), isabstracttype(String)
1 isa Signed, 'a' isa AbstractChar, 2.5 isa Real
typeof(Int64), typeof(Real)
