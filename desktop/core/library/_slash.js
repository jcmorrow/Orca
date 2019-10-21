"use strict";

import Operator from "../operator.js";

const smallToCaps = {
  a: "A",
  b: "B",
  c: "C"
};

export default function OperatorSlash(orca, x, y, passive) {
  Operator.call(this, orca, x, y, "/", passive);
  this.name = "Slash";
  this.info = "Uppercases input operand";

  this.ports.input = { x: -1, y: 0 };
  this.ports.output = { x: 0, y: 1, sensitive: true, unlock: true };

  this.operation = function() {
    const input = this.listen(this.ports.input);

    orca.unlock(this.ports.output.x, this.ports.output.y);

    if (input.toUpperCase) {
      console.log("IF");
      return input.toUpperCase();
    } else {
      console.log("ELSE");
      return this.listen(this.ports.input, true);
    }
  };
}
