"use strict";

const { clipboard } = require("electron");

export default function Cursor(terminal) {
  this.x = 0;
  this.y = 0;
  this.w = 0;
  this.h = 0;

  this.minX = 0;
  this.maxX = 0;
  this.minY = 0;
  this.maxY = 0;
  this.mode = 0;

  this.clampX = x => clamp(x, 0, terminal.orca.w - 1);
  this.clampY = y => clamp(y, 0, terminal.orca.h - 1);
  this.min = (a, b) => (a < b ? a : b);
  this.max = (a, b) => (a > b ? a : b);

  this.updateBox = function() {
    this.minX = this.min(this.x, this.x + this.w);
    this.maxX = this.max(this.x, this.x + this.w);
    this.minY = this.min(this.y, this.y + this.h);
    this.maxY = this.max(this.y, this.y + this.h);
  };

  this.move = function(x, y) {
    if (isNaN(x) || isNaN(y)) {
      return;
    }
    this.x = this.clampX(this.x + parseInt(x));
    this.y = this.clampY(this.y - parseInt(y));
    this.updateBox();
    terminal.update();
  };

  this.moveTo = function(x, y) {
    if (isNaN(x) || isNaN(y)) {
      return;
    }
    this.x = this.clampX(parseInt(x));
    this.y = this.clampY(parseInt(y));
    this.updateBox();
    terminal.update();
  };

  this.scale = function(x, y) {
    if (isNaN(x) || isNaN(y)) {
      return;
    }
    this.w = clamp(this.w + parseInt(x), -this.x, terminal.orca.w - this.x);
    this.h = clamp(this.h - parseInt(y), -this.y, terminal.orca.h - this.y);
    this.updateBox();
    terminal.update();
  };

  // Needs to be fixed up for negative scaling
  this.scaleTo = function(w, h) {
    if (isNaN(w) || isNaN(h)) {
      return;
    }
    this.w = clamp(parseInt(w), -this.x, terminal.orca.w - 1);
    this.h = clamp(parseInt(h), -this.y, terminal.orca.h - 1);
    this.updateBox();
    terminal.update();
  };

  // Needs to be fixed up for negative scaling
  this.resize = function(w, h) {
    if (isNaN(w) || isNaN(h)) {
      return;
    }
    this.w = clamp(parseInt(w), -this.x, terminal.orca.w - this.x);
    this.h = clamp(parseInt(h), -this.y, terminal.orca.h - this.y);
    this.updateBox();
    terminal.update();
  };

  this.drag = function(x, y) {
    if (isNaN(x) || isNaN(y)) {
      return;
    }
    this.mode = 0;
    this.cut();
    this.move(x, y);
    this.paste();
  };

  this.selectAll = function() {
    this.x = 0;
    this.y = 0;
    this.w = terminal.orca.w;
    this.h = terminal.orca.h;
    this.mode = 0;
    this.updateBox();
    terminal.update();
  };

  this.select = function(x = this.x, y = this.y, w = this.w, h = this.h) {
    this.moveTo(x, y);
    this.scaleTo(w, h);
    this.updateBox();
    terminal.update();
  };

  this.reset = function(pos = false) {
    if (pos) {
      this.x = 0;
      this.y = 0;
    }
    this.move(0, 0);
    this.w = 0;
    this.h = 0;
    this.updateBox();
    this.mode = 0;
  };

  this.copy = function() {
    const block = this.getBlock();
    var rows = [];
    for (var i = 0; i < block.length; i++) {
      rows.push(block[i].join(""));
    }
    clipboard.writeText(rows.join("\n"));
  };

  this.cut = function() {
    this.copy();
    this.erase();
  };

  this.paste = function(overlap = false) {
    this.writeBlock(clipboard.readText().split(/\r?\n/), overlap);
  };

  this.read = function() {
    return terminal.orca.glyphAt(this.x, this.y);
  };

  this.write = function(g) {
    if (terminal.orca.write(this.x, this.y, g) && this.mode === 1) {
      this.move(1, 0);
    }
    terminal.history.record(terminal.orca.s);
  };

  this.erase = function() {
    for (let y = this.minY; y <= this.maxY; y++) {
      for (let x = this.minX; x <= this.maxX; x++) {
        terminal.orca.write(x, y, ".");
      }
    }

    terminal.history.record(terminal.orca.s);
  };

  this.rotate = function(rate = 1) {
    if (isNaN(rate)) {
      return;
    }
    const cols = terminal.cursor.getBlock();
    for (const y in cols) {
      for (const x in cols[y]) {
        const g = cols[y][x];
        if (g === ".") {
          continue;
        }
        if (terminal.orca.isSpecial(g)) {
          continue;
        }
        cols[y][x] = terminal.orca.keyOf(
          parseInt(rate) + terminal.orca.valueOf(g),
          sense(g)
        );
      }
    }
    terminal.cursor.writeBlock(cols);
  };

  this.find = function(str) {
    const i = terminal.orca.s.indexOf(str);
    if (i < 0) {
      return;
    }
    const pos = terminal.orca.posAt(i);
    this.w = str.length;
    this.h = 1;
    this.x = pos.x;
    this.y = pos.y;
  };

  this.trigger = function() {
    const operator = terminal.orca.operatorAt(this.x, this.y);
    if (!operator) {
      console.warn("Cursor", "Nothing to trigger.");
      return;
    }
    console.log("Cursor", "Trigger: " + operator.name);
    operator.run(true);
  };

  this.toggleMode = function(val) {
    this.w = 1;
    this.h = 1;
    this.mode = this.mode === 0 ? val : 0;
  };

  this.inspect = function(name = true, ports = false) {
    if (this.w > 1 || this.h > 1) {
      return "multi";
    }
    const port = terminal.portAt(this.x, this.y);
    if (port) {
      return `${port[3]}`;
    }
    if (terminal.orca.lockAt(this.x, this.y)) {
      return "locked";
    }
    return "empty";
  };

  this.comment = function() {
    const block = this.getBlock();
    for (const id in block) {
      block[id][0] = block[id][0] === "#" ? "." : "#";
      block[id][block[id].length - 1] =
        block[id][block[id].length - 1] === "#" ? "." : "#";
    }
    this.writeBlock(block);
  };

  // Block

  this.getBlock = function() {
    const rect = this.toRect();
    const block = [];
    for (let _y = rect.y; _y < rect.y + rect.h; _y++) {
      const line = [];
      for (let _x = rect.x; _x < rect.x + rect.w; _x++) {
        line.push(terminal.orca.glyphAt(_x, _y));
      }
      block.push(line);
    }
    return block;
  };

  this.writeBlock = function(block, overlap = false) {
    if (!block || block.length === 0) {
      return;
    }
    const rect = this.toRect();
    let _y = rect.y;
    for (const x in block) {
      let _x = rect.x;
      for (const y in block[x]) {
        const glyph = block[x][y];
        terminal.orca.write(
          _x,
          _y,
          overlap === true && glyph === "."
            ? terminal.orca.glyphAt(_x, _y)
            : glyph
        );
        _x++;
      }
      _y++;
    }
    terminal.history.record(terminal.orca.s);
  };

  this.toRect = function() {
    return {
      x: this.minX,
      y: this.minY,
      w: this.maxX - this.minX + 1,
      h: this.maxY - this.minY + 1
    };
  };

  function sense(s) {
    return s === s.toUpperCase() && s.toLowerCase() !== s.toUpperCase();
  }
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }
}
