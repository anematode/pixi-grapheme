import * as utils from "./utils";
import {Gridlines} from "./gridlines";

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
    this.subdivisions = utils.select(params.subdivisions, [
      {normal: 2, thin: [4]},
      {normal: 5, thin: [5, 10]},
      {normal: 1, thin: [5]}
    ]);

    this.gridline_limit = utils.select(params.gridline_limit, 500);
    // force equal thin subdivisions in x and y directions
    this.force_equal_thin_div = true;
  }

  computeGridlines() {
    this.clearGridlines();

    let gridline_count = 0;

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
      utils.assert(start <= end, "wtf happened");

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

export {RegularGridlines};
