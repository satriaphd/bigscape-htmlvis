/* Copyright 2017 Satria Kautsar */

var Arrower = {
    version: "0.0.0",
    required: [
      "svg.js"
    ]
};

Arrower.drawClusterSVG = (function(cluster) {
  var container = $("<div>");
  var draw = SVG(container[0]);
  var height = 40;
  var scale = (function(val) { return parseInt(val / (1000 / height)); })

  // draw line
  draw.line(0, (height / 2), scale(cluster.end - cluster.start), (height / 2)).stroke({width: 1});

  // draw arrows
  if (cluster.hasOwnProperty("orfs")) {
    for (var i in cluster.orfs) {
      var orf = cluster.orfs[i];
      draw.polygon(Arrower.getArrowPoints(orf, cluster, height, scale)).fill("red").stroke({width: 1});
    }
  }

  return container.find("svg");
});

Arrower.getArrowPoints = (function(orf, cluster, height, scale) {
  var points = "";
  switch (orf.strand) {
    case -1:
      break;
    case 1:
      points += scale(orf.start - cluster.start) + "," + ((height / 2) - (height / 3));
      points += " " + (scale(orf.start - cluster.start) + scale(orf.end - orf.start)) + "," + ((height / 2) - (height / 3));
      points += " " + (scale(orf.start - cluster.start) + scale(orf.end - orf.start)) + "," + ((height / 2) + (height / 3));
      points += " " + scale(orf.start - cluster.start) + "," + ((height / 2) + (height / 3));
      console.log(orf.locus_tag + " " + (orf.end - orf.start));
      break;
    default:
      break;
  }
  return points;
});
