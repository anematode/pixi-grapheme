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
      this.pixi_app.addChild(this.container);

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

  exports.Context = GraphemeContext;
  exports.ContextElement = ContextElement;
  exports.IntervalFunctions = IntervalFunctions;
  exports.utils = utils;

  return exports;

}({}));
