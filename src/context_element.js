import * as utils from './utils';

class ContextElement {
  constructor(grapheme_context, params={}) {
    this.context = grapheme_context;
    this.pixi_app = grapheme_context.pixi_app;
    this.container = new PIXI.Container();
    this.pixi_app.stage.addChild(this.container);

    this.id = utils.getID();
    this.precedence = utils.select(params.precedence, 1);
    this.display = utils.select(params.display, true);
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

export {ContextElement};
