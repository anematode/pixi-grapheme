import * as utils from "./utils";
import {ContextElement} from "./context_element";

class GraphemeContext {
  constructor(params = {}) {
    this.container_div = utils.select(params.container, params.container_div);

    utils.assert(this.container_div.tagName === "DIV",
      "Grapheme Context needs to be given a container div. Please give Grapheme a house to live in! :(")

    this.pixi_app = new PIXI.Application({antialias: true, transparent: false, resolution: utils.dpr});
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
    utils.assert(!this.containsElement(element), "element already added to this context");
    utils.assert(element.context === this, "element cannot be a child of two contexts");

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
    utils.checkType(elem, ContextElement, "deleteElement");
    return this.containsElementById(elem.id);
  }

  deleteElement(elem) {
    utils.checkType(elem, ContextElement, "deleteElement");
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

export {GraphemeContext as Context};
