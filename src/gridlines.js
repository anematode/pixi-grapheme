import {ContextElement} from "./context_element";
import * as utils from "./utils";

/* Function to get the baseline of an anchor string, e.g. "NW".
I was inspired by Asymptote on this one, sorry Brandon. */
function getTextBaseline(anchor) {
  try {
    switch (anchor[0]) {
      case "S":
        return "top";
      case "N":
        return "bottom";
      default:
        return "middle";
    }
  } catch (e) {
    return "middle";
  }
}

/* Same as above, but for getting the text alignment. */
function getTextAlign(anchor) {
  try {
    switch (anchor.substr(-1)) {
      case "E":
        return "left";
      case "W":
        return "right";
      default:
        return "center";
    }
  } catch (e) {
    return "center";
  }
}

/* Unicode characters for exponent signs, LOL */
const exponent_reference = {
  '-': String.fromCharCode(8315),
  '0': String.fromCharCode(8304),
  '1': String.fromCharCode(185),
  '2': String.fromCharCode(178),
  '3': String.fromCharCode(179),
  '4': String.fromCharCode(8308),
  '5': String.fromCharCode(8309),
  '6': String.fromCharCode(8310),
  '7': String.fromCharCode(8311),
  '8': String.fromCharCode(8312),
  '9': String.fromCharCode(8313)
};

/* Convert a digit into its exponent form */
function convert_char(c) {
  return exponent_reference[c];
}

/* Convert an integer into its exponent form (of Unicode characters) */
function exponentify(integer) {
  utils.assert(utils.isInteger(integer), "needs to be an integer");

  let stringi = integer + '';
  let out = '';

  for (let i = 0; i < stringi.length; ++i) {
    out += convert_char(stringi[i]);
  }

  return out;
}

// Credit: https://stackoverflow.com/a/20439411
/* Turns a float into a pretty float by removing dumb floating point things */
function beautifyFloat(f, prec=12) {
  let strf = f.toFixed(prec);
  if (strf.includes('.')) {
    return strf.replace(/\.?0+$/g,'');
  } else {
    return strf;
  }
}

// Multiplication character
const CDOT = String.fromCharCode(183);

const DEFAULT_LABEL_FUNCTION = x => {
  if (x === 0) return "0"; // special case
  else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5)
    // non-extreme floats displayed normally
    return beautifyFloat(x);
  else {
    // scientific notation for the very fat and very small!

    let exponent = Math.floor(Math.log10(Math.abs(x)));
    let mantissa = x / (10 ** exponent);

    let prefix = (utils.isApproxEqual(mantissa,1) ? '' :
      (beautifyFloat(mantissa, 8) + CDOT));
    let exponent_suffix = "10" + exponentify(exponent);

    return prefix + exponent_suffix;
  }
};

const gridlines_style_default = {
  display_lines: true,
  line_color: 0x000000,
  display_ticks: true,
  tick_style: "i",
  tick_thickness: 2,
  tick_length: 10,
  tick_color: 0x000000,
  display_labels: true,
  label_style: {fontFamily: "Arial", fontSize: "10px", fill: 0x000000},
  label_position: "dynamic",
  label_padding: 2,
  label_function: DEFAULT_LABEL_FUNCTION
};

class Gridlines extends ContextElement {
  constructor(context, params={}) {
    super(context);

    if (params.style) {
      // themes eventually
    }

    this.gridlines_x = {
      s1: {
        style: utils.mergeDeep({label_align: "S", line_thickness: 2}, gridlines_style_default),
        coords: []
      },
      s2: {
        style: utils.mergeDeep({label_align: "S", line_thickness: 1}, gridlines_style_default),
        coords: []
      },
      s3: {
        style: utils.mergeDeep({label_align: "S", line_thickness: 0.5, display_labels: false}, gridlines_style_default),
        coords: []
      }
    };

    this.gridlines_y = {
      s1: {
        style: utils.mergeDeep({label_align: "E", line_thickness: 2}, gridlines_style_default),
        coords: []
      },
      s2: {
        style: utils.mergeDeep({label_align: "E", line_thickness: 1}, gridlines_style_default),
        coords: []
      },
      s3: {
        style: utils.mergeDeep({label_align: "E", line_thickness: 0.5, display_labels: false}, gridlines_style_default),
        coords: []
      }
    }

    this.scissor = {x0: -Infinity, y0: -Infinity, x1: Infinity, y1: Infinity};
    this.scissor_box_style = {display: false, line_thickness: 2, color: 0x000000};

    this._gridlines_x_objs = {s1: null, s2: null, s3: null};
    this._gridlines_y_objs = {s1: null, s2: null, s3: null}
    this._scissor_box_obj = null;
    this._text_objs = [];
  }

  clearGridlines() {
    let keys1 = [this.gridlines_x, this.gridlines_y];
    let keys2 = ["s1", "s2", "s3"];

    for (let i = 0; i < 3; ++i) {
      keys1[keys2[i]] = [];
    }
  }

  updateObjects() {
    let styles = ["s1", "s2", "s3"];

    // X
    for (let i = 0; i < styles.length; ++i) {
      let key = styles[i];
      let curr_lines = this._gridlines_x_objs[key];

      if (!curr_lines) {
         curr_lines = this._gridlines_x_objs[key] = new PIXI.Graphics();
         this.container.addChild(curr_lines);
      }

      curr_lines.clear();

      let curr_style = this.gridlines_x[key].style;
      let curr_coords = this.gridlines_x[key].coords;

      curr_lines.lineStyle(curr_style.line_thickness, curr_style.line_color, 1);

      for (let j = 0; j < curr_coords.length; ++j) {
        let cartesian_coord = curr_coords[j];
        let coord = this.context.cartesianToPixelX(cartesian_coord);

        if (coord < this.scissor.x0 || coord > this.scissor.x1) continue;

        curr_lines.moveTo(coord, Math.max(this.scissor.y0, 0));
        curr_lines.lineTo(coord, Math.min(this.scissor.y1, this.context.height));
      }
    }

    // Y
    for (let i = 0; i < styles.length; ++i) {
      let key = styles[i];
      let curr_lines = this._gridlines_y_objs[key];

      if (!curr_lines) {
         curr_lines = this._gridlines_y_objs[key] = new PIXI.Graphics();
         this.container.addChild(curr_lines);
      }

      curr_lines.clear();

      let curr_style = this.gridlines_y[key].style;
      let curr_coords = this.gridlines_y[key].coords;

      curr_lines.lineStyle(curr_style.line_thickness, curr_style.line_color, 1);

      for (let j = 0; j < curr_coords.length; ++j) {
        let cartesian_coord = curr_coords[j];
        let coord = this.context.cartesianToPixelY(cartesian_coord);

        if (coord < this.scissor.y0 || coord > this.scissor.y1) continue;

        curr_lines.moveTo(Math.max(this.scissor.x0, 0), coord);
        curr_lines.lineTo(Math.min(this.scissor.x1, this.context.width), coord);
      }
    }
  }
}

export {Gridlines};
