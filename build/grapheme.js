var Grapheme = (function (exports) {
  'use strict';

  function select(opt1, ...opts) {
    // this function takes in a variadic list of arguments and returns the first
    // one that's not undefined lol

    if (opts.length === 0)
      return opt1;
    if (opt1 === undefined) {
      return select(...opts);
    }
    return opt1;
  }

  let id = 0;

  function getID() {
    return id++;
  }

  function assert(statement, error = "Unknown error") {
    if (!statement) {
      throw new Error(error);
    }
  }

  function checkType(obj, type, funcName="") {
    assert(obj instanceof type,
      (funcName ? "Function " + funcName : ": ")
      + "Object must be instanceof " + type);
  }

  // https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects
  function deepEquals(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (
      ok(x).length === ok(y).length &&
        ok(x).every(key => deepEquals(x[key], y[key]))
    ) : (x === y);
  }

  function roundToCanvasCoord(c) {
    return Math.round(c-0.5)+0.5;
  }

  function _ctxDrawPath(ctx, arr) {
    ctx.beginPath();

    for (let i = 2; i < arr.length; i += 2) {
      ctx.lineTo(arr[i], arr[i+1]);
    }

    ctx.stroke();
  }

  function isInteger(z) {
    return Number.isInteger(z); // didn't know about this lol
  }

  function isNonnegativeInteger(z) {
    return Number.isInteger(z) && z >= 0;
  }

  function isPositiveInteger(z) {
    return Number.isInteger(z) && z > 0;
  }

  function isNonpositiveInteger(z) {
    return Number.isInteger(z) && z <= 0;
  }

  function isNegativeInteger(z) {
    return Number.isInteger(z) && z < 0;
  }

  // https://stackoverflow.com/a/34749873
  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  // https://stackoverflow.com/a/34749873
  function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return mergeDeep(target, ...sources);
  }

  function isApproxEqual(v, w, eps=1e-5) {
    return Math.abs(v - w) < eps;
  }
  let mod = function mod(n, m) {
    return ((n % m) + m) % m;
  };

  let dpr = window.devicePixelRatio;

  var utils = /*#__PURE__*/Object.freeze({
    mod: mod,
    select: select,
    getID: getID,
    assert: assert,
    checkType: checkType,
    deepEquals: deepEquals,
    roundToCanvasCoord: roundToCanvasCoord,
    _ctxDrawPath: _ctxDrawPath,
    isInteger: isInteger,
    isNonnegativeInteger: isNonnegativeInteger,
    isNonpositiveInteger: isNonpositiveInteger,
    isNegativeInteger: isNegativeInteger,
    isPositiveInteger: isPositiveInteger,
    mergeDeep: mergeDeep,
    isApproxEqual: isApproxEqual,
    dpr: dpr
  });

  const ADD = function (interval_a, interval_b) {
    return [interval_a[0] + interval_b[0], interval_a[1] + interval_b[1]];
  };

  const SUB = function (interval_a, interval_b) {
    return [interval_a[0] - interval_b[1], interval_a[1] - interval_b[0]];
  };

  const MUL = function (interval_a, interval_b) {
    let m1 = interval_a[0] * interval_b[0];
    let m2 = interval_a[1] * interval_b[0];
    let m3 = interval_a[0] * interval_b[1];
    let m4 = interval_a[1] * interval_b[1];

    return [Math.min(m1,m2,m3,m4), Math.max(m1,m2,m3,m4)];
  };

  const DIV = function (interval_a, interval_b) {
    if (interval_b[0] <= 0 && 0 <= interval_b[1]) { // if b contains 0
      if (!interval_a[0] && !interval_a[1]) { // if a = [0,0]
        if (interval_b[0] === 0 && interval_b[1] === 0)
          return [NaN, NaN];
        return [0, 0]; // though NaN is possible
      }
      return [-Infinity, Infinity];
    }

    if (0 < interval_b[0]) // b is positive
      return [interval_a[0] / interval_b[1], interval_a[1] / interval_b[0]];

    return [interval_a[1] / interval_b[0], interval_a[0] / interval_b[1]];
  };

  const SIN = function (interval) {
    // TODO: optimize!
    if (interval[1] - interval[0] >= 2 * Math.PI)
      return [-1,1];

    let a_rem_2p = mod(interval[0], 2 * Math.PI);
    let b_rem_2p = mod(interval[1], 2 * Math.PI);

    let min_rem = Math.min(a_rem_2p, b_rem_2p);
    let max_rem = Math.max(a_rem_2p, b_rem_2p);

    let contains_1 = (min_rem < Math.PI / 2) && (max_rem > Math.PI / 2);
    let contains_n1 = (min_rem < 3 * Math.PI / 2 && max_rem > 3 * Math.PI / 2);

    if (b_rem_2p < a_rem_2p) {
      contains_1 = !contains_1;
      contains_n1 = !contains_n1;
    }

    if (contains_1 && contains_n1)
      return [-1,1]; // for rapidity

    let sa = Math.sin(a_rem_2p), sb = Math.sin(b_rem_2p);
    return [contains_n1 ? -1 : Math.min(sa, sb), contains_1 ? 1 : Math.max(sa, sb)];
  };

  const COS = function (interval) {
    // TODO: optimize!
    return SIN([interval[0] + Math.PI / 2, interval[1] + Math.PI / 2]); // and I oop
  };

  const TAN = function (interval) {
    // TODO: optimize!
    return DIV(SIN(interval), COS(interval));
  };

  const SEC = function (interval) {
    // TODO: optimize!
    return DIV([1,1], COS(interval));
  };

  const CSC = function (interval) {
    // TODO: optimize!
    return DIV([1,1], SIN(interval));
  };

  const COT = function (interval) {
    // TODO: optimize!
    return DIV(COS(interval), SIN(interval));
  };

  const EXP_B = function (b, interval_n) {
    return [Math.pow(b, interval_n[0]), Math.pow(b, interval_n[1])];
  };

  const EXP_N = function (interval_b, n) {
    if (n === 0)
      return [1,1];
    if (isPositiveInteger(n)) {
      if (n % 2 === 0) {
        let p1 = Math.pow(interval_b[0], n), p2 = Math.pow(interval_b[1], n);
        return (interval_b[0] >= 0 ? [p1, p2] : (interval_b[1] < 0 ? [p2, p1] : [0, Math.max(p1, p2)]));
      } else {
        return [Math.pow(interval_b[0], n), Math.pow(interval_b[1], n)];
      }
    } else if (isInteger(n)) {
      return DIV([1,1], EXP_N(interval_b, -n));
    } else {
      // annoyst, TODO: theorize!!!!
      if (interval_b[1] < 0)
        return [NaN, NaN];
      if (interval_b[0] < 0) interval_b[0] = 0;

      if (n >= 0) {
        return [Math.pow(interval_b[0], n), Math.pow(interval_b[1], n)];
      } else {
        return [Math.pow(interval_b[1], n), Math.pow(interval_b[0], n)];
      }
    }
  };

  const LOG_A = function (a, interval_n) {
    if (a === 1) {
      if (interval_n[0] <= 1 && 1 <= interval_n[1])
        return [-Infinity, Infinity];
      else
        return [NaN, NaN];
    }

    if (interval_n[0] === interval_n[1])
      return Math.log(interval_n[0]) / Math.log(a);

    if (interval_n[1] <= 0) return [NaN, NaN];
    if (interval_n[0] < 0) interval_n[0] = 0;

    if (a > 1) {
      let log_a = Math.log(a);

      return [Math.log(interval_n[0]) / log_a, Math.log(interval_n[1]) / log_a];
    } else {
      let log_a = Math.log(a);

      return [Math.log(interval_n[1]) / log_a, Math.log(interval_n[0]) / log_a];
    }
  };

  const LOG_N = function (interval_a, n) {
    if (interval_a[1] < 0)
      interval_a[0] = 0;
    if (interval_a[0] <= 1 && 1 <= interval_a[1])
      return [-Infinity, Infinity];
  };

  const POW = function (interval_a, interval_b) {
    if (interval_a[0] === interval_a[1]) {
      return EXP_B(interval_a[0], interval_b);
    } else if (interval_b[0] === interval_b[1]) {
      return EXP_N(interval_a, interval_b[0]);
    } else {
      // ANNOYST ANNOYST
      // For now: discard negative a

      if (interval_a[1] < 0)
        return [NaN, NaN]; // ANNNOYSTTT

      if (interval_a[0] < 0)
        interval_a[0] = 0;

      // TODO: THEORIZE
      throw new Error("not supported yet");
    }
  };

  const CONST = function(a) {
    return [a,a];
  };

  const IntervalFunctions = {ADD,SUB,MUL,DIV,SIN,COS,TAN,SEC,CSC,COT,EXP_B,EXP_N,LOG_A,LOG_N,POW,CONST};

  class ContextElement {
    constructor(grapheme_context, params={}) {
      this.context = grapheme_context;
      this.pixi_app = grapheme_context.pixi_app;
      this.container = new PIXI.Container();
      this.pixi_app.stage.addChild(this.container);

      this.id = getID();
      this.precedence = select(params.precedence, 1);
      this.display = select(params.display, true);
      this.lastDrawn = -1;

      this.context.addElement(this);
    }

    draw(info) {
      this.lastDrawn = Date.now();
    }

    destroy() {
      this.remove();
      this.container.removeChild(this.container);
    }

    remove() {
      this.context.removeElement(this);
    }
  }

  class GraphemeContext {
    constructor(params = {}) {
      this.container_div = select(params.container, params.container_div);

      assert(this.container_div.tagName === "DIV",
        "Grapheme Context needs to be given a container div. Please give Grapheme a house to live in! :(");

      this.pixi_app = new PIXI.Application({antialias: true, transparent: false, resolution: dpr});
      this.pixi_app.renderer.autoResize = true;
      this.container_div.appendChild(this.pixi_app.view);

      this.elements = [];

      // x is of the center, y is of the center, width is the total width, height is the total height
      this.viewport = {x: 0, y: 0, width: 1, height: 1};

      this._addResizeEventListeners();
      this.onResize();

      this.backgroundColor = 0xffffff;
    }

    drawFrame() {
      this.elements.forEach(elem => elem.update());
    }

    get backgroundColor() {
      return this.pixi_app.renderer.backgroundColor;
    }

    set backgroundColor(bc) {
      this.pixi_app.renderer.backgroundColor = bc;
    }

    // Element manipulation stuffs

    addElement(element) {
      assert(!this.containsElement(element), "element already added to this context");
      assert(element.context === this, "element cannot be a child of two contexts");

      this.elements.push(element);
    }

    deleteElementById(id) {
      for (let i = 0; i < this.elements.length; ++i) {
        if (this.elements[i].id === id) {
          this.elements.split(i, 1);
          return true;
        }
      }

      return false;
    }

    containsElementById(id) {
      for (let i = 0; i < this.elements.length; ++i) {
        if (this.elements[i].id === id) {
          return true;
        }
      }

      return false;
    }

    containsElement(elem) {
      checkType(elem, ContextElement, "deleteElement");
      return this.containsElementById(elem.id);
    }

    deleteElement(elem) {
      checkType(elem, ContextElement, "deleteElement");
      return this.deleteElementById(elem.id);
    }

    getElementById(id) {
      for (let i = 0; i < this.elements.length; ++i) {
        if (this.elements[i].id === id) {
          return this.elements[i];
        }
      }

      return null;
    }

    sortElementPrecedence() {
      this.elements.sort((a,b) => a.precedence - b.precedence);
    }

    // Canvas management stuff

    _addResizeEventListeners() {
      this.resize_observer = new ResizeObserver(() => this.onResize());
      this.resize_observer.observe(this.container_div);

      window.addEventListener("load", () => this.onResize(), {once: true});
    }

    onResize() {
      this.resizeCanvas();
    }

    resizeCanvas() {
      let boundingRect = this.container_div.getBoundingClientRect();

      this.width = boundingRect.width;
      this.height = boundingRect.height;

      this.pixi_app.renderer.resize(this.width, this.height);
    }

    pixelToCartesian(x,y) {
      return {x: (x / this.width - 0.5) * this.viewport.width + this.viewport.x,
        y: -(y / this.height - 0.5) * this.viewport.height + this.viewport.y};
    }

    pixelToCartesianFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
        arr[i+1] = -(arr[i+1] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToPixel(x,y) {
      return {x: this.width * ((x - this.viewport.x) / this.viewport.width + 0.5),
        y: this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5)};
    }

    cartesianToPixelFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
        arr[i+1] = h * (-(arr[i+1] - vy) / vh + 0.5);
      }

      return arr;
    }

    pixelToCartesianX(x) {
      return (x / this.width - 0.5) * this.viewport.width + this.viewport.x;
    }

    pixelToCartesianXFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (arr[i] / w - 0.5) * vw + vx;
      }

      return arr;
    }

    cartesianToPixelX(x) {
      return this.width * ((x - this.viewport.x) / this.viewport.width + 0.5);
    }

    cartesianToPixelXFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
      }

      return arr;
    }

    pixelToCartesianY(y) {
      return -(y / this.height - 0.5) * this.viewport.height + this.viewport.y;
    }

    pixelToCartesianYFloatArray(arr) {
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = -(arr[i] / h - 0.5) * vh + vy;
      }

      return arr;
    }

    cartesianToPixelY(y) {
      return this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5);
    }

    cartesianToCartesianYFloatArray(arr) {
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = h * (-(arr[i] - vy) / vh + 0.5);
      }

      return arr;
    }

    cartesianToPixelV(x,y) {
      return {x: this.width * x / this.viewport.width, y: -this.height * y / this.viewport.height};
    }

    cartesianToPixelVFloatArray(arr) {
      let wr = this.width / this.viewport.width;
      let hr = -this.height / this.viewport.height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wr * arr[i];
        arr[i+1] = hr * arr[i+1];
      }

      return arr;
    }

    pixelToCartesianV(x,y) {
      return {x: this.viewport.width * x / this.width, y: -this.viewport.height * y / this.height};
    }

    pixelToCartesianVFloatArray(arr) {
      let wrp = this.viewport.width / this.width;
      let hrp = -this.viewport.height / this.height;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = wrp * arr[i];
        arr[i+1] = hrp * arr[i+1];
      }

      return arr;
    }

    cartesianToPixelVX(x) {
      return this.width * x / this.viewport.width;
    }

    cartesianToPixelVXFloatArray(arr) {
      let wr = this.width / this.viewport.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wr * arr[i];
      }

      return arr;
    }

    cartesianToPixelVY(y) {
      return -this.height * y / this.viewport.height;
    }

    cartesianToPixelVYFloatArray(y) {
      let hr = -this.height / this.viewport.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hr * arr[i];
      }

      return arr;
    }

    pixelToCartesianVX(x) {
      return this.viewport.width * x / this.width;
    }

    pixelToCartesianVXFloatArray(arr) {
      let wrp = this.viewport.width / this.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wrp * arr[i];
      }

      return arr;
    }

    pixelToCartesianVY(y) {
      return -this.viewport.height * y / this.height;
    }

    pixelToCartesianVYFloatArray(arr) {
      let hrp = -this.viewport.height / this.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hrp * arr[i];
      }

      return arr;
    }

    // For the GL canvas

    cartesianToGL(x,y) {
      return {x: this.width * ((x - this.viewport.x) / this.viewport.width + 0.5),
        y: this.height * (-(y - this.viewport.y) / this.viewport.height + 0.5)};
    }

    cartesianToGLFloatArray(arr) {
      let w = this.width, vw = this.viewport.width, vx = this.viewport.x;
      let h = this.height, vh = this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = w * ((arr[i] - vx) / vw + 0.5);
        arr[i+1] = h * (-(arr[i+1] - vy) / vh + 0.5);
      }

      return arr;
    }

    cartesianToGLX(x) {
      return 2 * (x - this.viewport.x) / this.viewport.width;
    }

    cartesianToGLXFloatArray(arr) {
      let div_vw = 2 / this.viewport.width, vx = this.viewport.x;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (arr[i] - vx) * div_vw;
      }

      return arr;
    }

    cartesianToGLY(y) {
      return 2 * (y - this.viewport.y) / this.viewport.height;
    }

    cartesianToGLYFloatArray(arr) {
      let div_vh = 2 / this.viewport.height, vy = this.viewport.y;

      for (let i = 0; i < arr.length; ++i) {
        arr[i] = (vy - arr[i]) * div_vh;
      }

      return arr;
    }

    cartesianToGLVX(x) {
      return 2 * x / this.viewport.width;
    }

    cartesianToGLVXFloatArray(arr) {
      let wr = 2 / this.viewport.width;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = wr * arr[i];
      }

      return arr;
    }

    cartesianToGLVY(y) {
      return 2 * y / this.viewport.height;
    }

    cartesianToGLVYFloatArray(y) {
      let hr = 2 / this.viewport.height;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = hr * arr[i];
      }

      return arr;
    }

    GLVXToCartesian(x) {
      return this.viewport.width * x / 2;
    }

    GLVYToCartesian(y) {
      return -this.viewport.height * y / 2;
    }

    pixelToGLVX(x) {
      return 2 * x / this.width;
    }

    pixelToGLVY(y) {
      return 2 * y / this.height;
    }

    minX() {
      return this.viewport.x - this.viewport.width / 2;
    }

    minY() {
      return this.viewport.y - this.viewport.height / 2;
    }

    maxX() {
      return this.viewport.x + this.viewport.width / 2;
    }

    maxY() {
      return this.viewport.y + this.viewport.height / 2;
    }

    cartesianXInView(x) {
      return Math.abs(x - this.viewport.x) <= this.viewport.width / 2;
    }

    cartesianYInView(y) {
      return Math.abs(y - this.viewport.y) <= this.viewport.height / 2;
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
    assert(isInteger(integer), "needs to be an integer");

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

      let prefix = (isApproxEqual(mantissa,1) ? '' :
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

      if (params.style) ;

      this.gridlines_x = {
        s1: {
          style: mergeDeep({label_align: "S", line_thickness: 2}, gridlines_style_default),
          coords: []
        },
        s2: {
          style: mergeDeep({label_align: "S", line_thickness: 1}, gridlines_style_default),
          coords: []
        },
        s3: {
          style: mergeDeep({label_align: "S", line_thickness: 0.5, display_labels: false}, gridlines_style_default),
          coords: []
        }
      };

      this.gridlines_y = {
        s1: {
          style: mergeDeep({label_align: "E", line_thickness: 2}, gridlines_style_default),
          coords: []
        },
        s2: {
          style: mergeDeep({label_align: "E", line_thickness: 1}, gridlines_style_default),
          coords: []
        },
        s3: {
          style: mergeDeep({label_align: "E", line_thickness: 0.5, display_labels: false}, gridlines_style_default),
          coords: []
        }
      };

      this.scissor = {x0: -Infinity, y0: -Infinity, x1: Infinity, y1: Infinity};
      this.scissor_box_style = {display: false, line_thickness: 2, color: 0x000000};

      this._gridlines_x_objs = {s1: null, s2: null, s3: null};
      this._gridlines_y_objs = {s1: null, s2: null, s3: null};
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

  // Helper function: Find the nearest value to val in the array arr
  function findNearestValueIndex(arr, val) {
    let closest = arr[0];

    for (let i = 1; i < arr.length; ++i) {
      if (Math.abs(arr[i] - val) < Math.abs(closest - val)) {
        return i;
      }
    }

    return 0;
  }

  class RegularGridlines extends Gridlines {
    constructor(context, params = {}) {
      super(context, params);

      this.normal = {ideal_dist: 140};
      this.thin = {ideal_dist: 50};

      // Types of finer demarcation subdivisions: default is subdivide into 2, into 5, and into 10
      this.subdivisions = select(params.subdivisions, [
        {normal: 2, thin: [4]},
        {normal: 5, thin: [5, 10]},
        {normal: 1, thin: [5]}
      ]);

      this.gridline_limit = select(params.gridline_limit, 500);
      // force equal thin subdivisions in x and y directions
      this.force_equal_thin_div = true;
    }

    computeGridlines() {
      this.clearGridlines();

      let ideal_xy = this.context.pixelToCartesianV(this.normal.ideal_dist, this.normal.ideal_dist);

      // unpack the values
      let ideal_x_normal_spacing = Math.abs(ideal_xy.x);

      // Math.abs shouldn't ever do anything, but it would be catastrophic
      // if this was somehow negative due to some dumb error of mine
      // (This might happen if the ideal inter-thin distance is negative)
      let ideal_y_normal_spacing = Math.abs(ideal_xy.y);

      let ixns_log10 = Math.log10(ideal_x_normal_spacing);
      let iyns_log10 = Math.log10(ideal_y_normal_spacing);

      let possible_coeffs = this.subdivisions.map(x => x.normal);

      let ixns_base = 10 ** Math.floor(ixns_log10);
      let ixns_coeff_i = findNearestValueIndex(possible_coeffs, ideal_x_normal_spacing / ixns_base);

      let iyns_base = 10 ** Math.floor(iyns_log10);
      let iyns_coeff_i = findNearestValueIndex(possible_coeffs, ideal_y_normal_spacing / ixns_base);

      let true_xn_spacing = possible_coeffs[ixns_coeff_i] * ixns_base;
      let true_yn_spacing = possible_coeffs[iyns_coeff_i] * iyns_base;

      let ideal_x_thin_spacing_denom = this.context.cartesianToPixelVX(true_xn_spacing) / this.thin.ideal_dist;
      let ideal_y_thin_spacing_denom = -this.context.cartesianToPixelVY(true_yn_spacing) / this.thin.ideal_dist;

      // alias for brevity
      let tspt_x = this.subdivisions[ixns_coeff_i].thin;
      let tspt_y = this.subdivisions[iyns_coeff_i].thin;

      // temp values
      let x_denom = tspt_x[0];
      let y_denom = tspt_y[0];

      // go through all potential thin spacing types for x
      for (let i = 0; i < tspt_x.length; ++i) {
        let possible_denom = tspt_x[i];

        // if this is more ideal of an x subdivision, use that!
        if (Math.abs(possible_denom - ideal_x_thin_spacing_denom) <
          Math.abs(x_denom - ideal_x_thin_spacing_denom)) {
          x_denom = possible_denom;
        }
      }

      for (let i = 0; i < tspt_y.length; ++i) {
        let possible_denom = tspt_y[i];

        // if this is more ideal of an y subdivision, use that!
        if (Math.abs(possible_denom - ideal_y_thin_spacing_denom) <
          Math.abs(y_denom - ideal_y_thin_spacing_denom)) {
          y_denom = possible_denom;
        }
      }

      if (this.force_equal_thin_div) {
        // if we force the subdivisions to be equal, we defer to the one that fits better
        if (Math.abs(y_denom - ideal_y_thin_spacing_denom) < Math.abs(x_denom - ideal_x_thin_spacing_denom)) {
          // y is better
          x_denom = y_denom;
        } else {
          // x is better (or they are the same since the inequality is strict)
          y_denom = x_denom;
        }
      }

      let true_xt_spacing = true_xn_spacing / x_denom;
      let true_yt_spacing = true_yn_spacing / y_denom;

      // precomputed for brevity
      let minx = this.context.minX();
      let miny = this.context.minY();
      let maxx = this.context.maxX();
      let maxy = this.context.maxY();

      let thinx_start = Math.ceil(minx / true_xt_spacing);
      let thinx_end = Math.floor(maxx / true_xt_spacing);
      let thiny_start = Math.floor(miny / true_yt_spacing);
      let thiny_end = Math.ceil(maxy / true_yt_spacing);

      // both x and y
      for (let i = 0, start = thinx_start, end = thinx_end, dir = 'x', denom = x_denom, spacing = true_xt_spacing; ++i < 3; start = thiny_start, end = thiny_end, dir = 'y', denom = y_denom, spacing = true_yt_spacing) {
        assert(start <= end, "wtf happened");

        for (let i = start; i <= end; ++i) {
          // we only skip x values corresponding to normal lines if normal lines are being displayed
          if ((i % denom === 0) && this["gridlines_" + dir].s2.display) continue;
          this["gridlines_" + dir].s3.coords.push(i * spacing);
        }
      }

      let normalx_start = Math.ceil(minx / true_xn_spacing);
      let normalx_end = Math.floor(maxx / true_xn_spacing);
      let normaly_start = Math.floor(miny / true_yn_spacing);
      let normaly_end = Math.ceil(maxy / true_yn_spacing);

      // both x and y
      for (let j = 0, start = normalx_start, end = normalx_end, dir = 'x', spacing = true_xn_spacing;
        ++j < 3;
        start = normaly_start, end = normaly_end, dir = 'y', spacing = true_yn_spacing) {
        for (let i = start; i <= end; ++i) {
          if (!i && this["gridlines_" + dir].s1.display) continue;
          this["gridlines_" + dir].s2.coords.push(i * spacing);
        }
      }

      // Axis lines (a.k.a. bold lines) (if applicable)

      // x
      if (this.context.cartesianXInView(0)) {
        this.gridlines_x.s1.coords.push(0);
      }

      // y
      if (this.context.cartesianYInView(0)) {
        this.gridlines_y.s1.coords.push(0);
      }
    }

    update() {
      this.computeGridlines();
      this.updateObjects();
    }
  }

  exports.Context = GraphemeContext;
  exports.ContextElement = ContextElement;
  exports.IntervalFunctions = IntervalFunctions;
  exports.RegularGridlines = RegularGridlines;
  exports.utils = utils;

  return exports;

}({}));
