## Gridlines

Gridlines won't be too bad. There are six arrays of gridlines, grouped like so:

gridlines_x: {
  s1: {style: {...}, coords: [...]},
  s2: {style: {...}, coords: [...]},
  s3: {style: {...}, coords: [...]}
},
gridlines_y: {
  s1: {style: {...}, coords: [...]},
  s2: {style: {...}, coords: [...]},
  s3: {style: {...}, coords: [...]}
}

There is also the following style information:

scissor: {x0, y0, x1, y1},
scissor_box_style: {...}

style has the following parameters:

display_lines: boolean; do we display the lines or not?
line_thickness: line thickness in pixels
line_color: line hex color
display_ticks: boolean; do we display ticks or not?
tick_thickness: tick thickness in pixels
tick_length: tick length in pixels
tick_style: "i" for protruding into the graph, "o" for protruding out of the graph, "io" for going both ways
tick_color: tick hex color
display_labels: boolean; do we label the coordinates or not?
label_style: {fontFamily, fontSize, fill, align, textBaseline}
label_positions: can be axis, top, bottom, or dynamic (switches between, permitted to modify align/textBaseline accordingly)
label_padding: pixels of label padding

coords is just an array of x/y values in Cartesian space.
scissor is a box around the gridlines which cuts out anything beyond the rectangle (x0, y0) to (x1, y1).
scissor_box_style defines the box around this cut. It has the following properties:

display: boolean; whether to display the scissor box
thickness: line thickness in pixels
color: line color
