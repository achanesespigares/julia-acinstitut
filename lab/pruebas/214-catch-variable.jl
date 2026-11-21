function que_error(f, x)
    try
        f(x)
        return "nada"
    catch e
        return string(typeof(e))
    end
end
r1 = try parse(Float64, "x") catch e e end
r1.msg
typeof(r1)
r1 isa Exception
r2 = try Dict(1 => 2)[5] catch e e end
r2.key
r3 = try sqrt(-9) catch e e end
r3.val
r3.msg
r4 = try div(7, 0) catch e e end
r5 = try factorial(21) catch e e end
r5.msg
r6 = try [1, 2] + [1, 2, 3] catch e e end
supertype(typeof(r6))
