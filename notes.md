Ok, so a lot of things are operators (makes sense).


Operators can do... everything that orca does.


Here are some things I was confused by:

When you write this code:

H
A
J


You get this:

H
A
J
A

All good and well. However, if the operator that is taking in the "A" does it as a *value* it will get 10. That's because, as a representation of a numerical set of values, 10 is A in base 36. Another confusing point here is that in base 36 a === A. But, if you are sending MIDI notes, then a != A. Instead, A == 10 and A == 11, because starting at C, A is the 10th note, and A# (denoted as a in orca) is the 11th note.

Note: you can see this at desktop/core/io/midi.js on lines 373-394.

It's also worth noting that in the case of

H
A
J
A

The A's are 10's, not A's as in:

2 A 2
  4
