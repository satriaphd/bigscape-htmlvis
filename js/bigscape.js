var BigscapeFunc = {
  ver: "1.0"
};

function Bigscape(bs_data, bs_families, bs_similarity, network_container, desc_container, options = {}) {
  var bigscape = this;
  var graph = Viva.Graph.graph();
  var graphics = Viva.Graph.View.svgGraphics();
  var bs_data = bs_data;
  var bs_families = bs_families;
  var bs_similarity = bs_similarity;
  var bs_to_cl = [];
  $("#" + network_container).html("<div class='network-layer' style='height: 100%; width: 100%;'><div class='network-overlay' style='display: none; height: 100%; width: 100%; position: absolute; top: 0; left: 0;'>");
  $("#" + network_container).css("position", "relative");
  var net_ui = $("#" + network_container + " .network-layer");
  var desc_ui = $("#" + desc_container);
  var highlighted_nodes = [];
  var selected_node = -1;
  var edge_count = 0;

  // options
  var intra_cutoff = options.intra_cutoff? options.intra_cutoff : 0;
  var inter_cutoff = options.inter_cutoff? options.inter_cutoff : 0.25;
  var fam_colors = options.fam_colors? options.fam_colors : [];

  // public functions
  var showSingletons = function(isOn) { BigscapeFunc.showSingletons(graph, graphics, net_ui, isOn); };
  this.showSingletons = showSingletons;
  var highlightNodes = function(ids) { BigscapeFunc.highlightNodes(graph, graphics, ids, bs_data, bs_to_cl, bs_families, net_ui, desc_ui); };
  this.highlightNodes = highlightNodes;
  this.setHighlightedNodes = function(ids) { highlighted_nodes = ids; };
  this.getHighlightedNodes = function() { return highlighted_nodes; };
  var updateDescription = function(ids, id = -1) {
    if (ids.length > 0) {
      if (id > 0) {
        if (ids.indexOf(id) < 0) {
          id = ids[0];
        }
      } else {
        if (ids.indexOf(selected_node) > 0) {
          id = selected_node;
        } else {
          id = ids[0];
        }
      }
    };
    var calced = BigscapeFunc.updateDescription(id, ids, bs_data, bs_to_cl, bs_families, desc_ui, bigscape);
    net_ui.find("svg circle").attr("stroke-width", "0");
    if (calced > -1) {
      graphics.getNodeUI(calced).attr("stroke", "red");
      graphics.getNodeUI(calced).attr("stroke-width", "5");
    };
    return calced;
  };
  this.updateDescription = updateDescription;
  this.setSelectedNode = function(id) { selected_node = id; };
  this.getSelectedNode = function() { return selected_node; };

  // fill reference values & fam colors
  for (var i = 0; i < bs_data.length; i++) {
    bs_to_cl.push(-1);
  }
  for (var c = 0; c < bs_families.length; c++) {
    if (c >= fam_colors.length) {
      fam_colors.push('rgb('+Math.round(Math.random()*256)+','+
                      Math.round(Math.random()*256)+','+
                      Math.round(Math.random()*256)+')');
    }
    for (var i = 0; i < bs_families[c]["members"].length; i++) {
      var a = bs_families[c]["members"][i];
      bs_to_cl[a] = c;
    }
  }

  // construct the graph
  for (var i = 0; i < bs_data.length; i++) {
    var bs_obj = bs_data[i];
    graph.addNode(i, { id: bs_obj["id"], cl: bs_to_cl[i] });
  }
  for (var a = 0; a < bs_data.length; a++) {
    for (var b = 0; b < bs_data.length; b++) {
      if ((a > b) && (bs_similarity[a][b] > intra_cutoff)) {
        if ((bs_to_cl[a] !== bs_to_cl[b]) && (bs_similarity[a][b] < inter_cutoff)) {
          continue;
        }
        var weight = bs_similarity[a][b];
        graph.addLink(a, b, {weight: weight});
      }
    }
  }

  // set nodes & links behavior & appearance
  graphics.node(function(node) {
   var ui = Viva.Graph.svg('circle')
         .attr('r', 10)
         .attr('fill', (fam_colors[bs_to_cl[node.id]]))
   $(ui).hover(function() { // mouse over
      var temp_highlight = [];
      for (var i in highlighted_nodes) {
        temp_highlight.push(highlighted_nodes[i]);
      }
      if (temp_highlight.indexOf(node.id) < 0) {
        temp_highlight.push(node.id);
      }
      highlightNodes(temp_highlight);
      selected_node = updateDescription(temp_highlight);
    }, function() { // mouse out
      highlightNodes(highlighted_nodes);
      selected_node = updateDescription(highlighted_nodes);
    });
    $(ui).click(function(){
      var new_sel = -1;
      if (highlighted_nodes.indexOf(node.id) > -1) {
        if (node.id === selected_node) {
          highlighted_nodes.splice(highlighted_nodes.indexOf(node.id), 1);
        } else {
          new_sel = node.id;
        }
      } else {
        if (highlighted_nodes.indexOf(node.id) < 0) {
          highlighted_nodes.push(node.id);
          new_sel = node.id;
        }
      }
      highlightNodes(highlighted_nodes);
      selected_node = updateDescription(highlighted_nodes, new_sel);
    });
   return ui;
  }).placeNode(function(nodeUI, pos){
    nodeUI.attr('cx', pos.x).attr('cy', pos.y);
  });

  graphics.link(function(link) {
    return Viva.Graph.svg('line')
            .attr("stroke", "#777")
            .attr("stroke-width", link["data"]["weight"] * 10);
  });

  // set renderer
  var sprLen = 100;
  var layout = Viva.Graph.Layout.forceDirected(graph, {
    springLength: sprLen,
    springCoeff : 0.001,
    gravity : -1,
    springTransform: function (link, spring) {
      spring.length = sprLen - (sprLen * (link.data.weight));
    }
  });

  var renderer = Viva.Graph.View.renderer(graph, {
    container: net_ui[0],
    layout : layout,
    graphics : graphics
  });

  var multiSelectOverlay;
  document.addEventListener('keydown', function(e) {
    if (e.which === 16 && !multiSelectOverlay) { // shift key
      multiSelectOverlay = BigscapeFunc.startMultiSelect(graph, graphics, renderer, layout, bigscape);
    }
  });
  document.addEventListener('keyup', function(e) {
    if (e.which === 16 && multiSelectOverlay) {
      multiSelectOverlay.destroy();
      multiSelectOverlay = null;
    }
  });

  // run renderer and forceDirected layout
  renderer.run();
  showSingletons(false);
  net_ui.find("svg").css("height", "100%").css("width", "100%");
  var countDown = 5 + parseInt(graph.getLinksCount() / 1000);
  var perZoom = 5;
  var zoomCount = 0;
  var info_ui = $("<div class='info-container' style='margin: 0.5em; height: 50px; position: fixed; background-color: white;'>");
  net_ui.prepend(info_ui);
  info_ui.append("<div>Adjusting network layout for... <span class='network-layout-counter'>" + countDown + "</span> second(s) </div>");
  var interval = setInterval(function(){
    countDown--;
    if (countDown > 0) {
      net_ui.find(".network-layout-counter").text(countDown);
      var scale = 1.5 * (graphics.getSvgRoot().getElementsByTagName("g")[0].getBoundingClientRect().width / graphics.getSvgRoot().getBoundingClientRect().width);
      var point = {x: graphics.getSvgRoot().getBoundingClientRect().width / 2,
                  y: graphics.getSvgRoot().getBoundingClientRect().height / 2};
      graphics.scale((1 / scale), point);
    } else {
      net_ui.find(".network-layout-counter").parent().addClass("hidden");
      var nodes_with_edges_count = 0;
      graph.forEachNode(function(node) {
        if (node.links.length > 0) {
          nodes_with_edges_count++;
        }
      });
      info_ui.append("<div>Total nodes: " + graph.getNodesCount() + " (" + (graph.getNodesCount() - nodes_with_edges_count) + " singleton/s), Total links: " + graph.getLinksCount() + "</div>");
      var checkbox = $("<div><input type='checkbox'/> Show singletons</div>");
      checkbox.find("input[type=checkbox]").change(function() { showSingletons($(this).is(":checked")); });
      info_ui.append(checkbox);
      renderer.pause();
      clearInterval(interval);
    }}, 1000);

    return this;
}

// input: VivaGraph graph object, network container jQuery object, on/off
BigscapeFunc.showSingletons = function(graph, graphics, net_ui, isOn) {
  if (!isOn) { // show
    graph.forEachNode(function(node){
      if (node.links.length < 1) {
        var node_ui = graphics.getNodeUI(node.id);
        $(node_ui).addClass("hidden");
      }
    });
  } else { // hide
    net_ui.find("svg circle").removeClass("hidden");
  }
}

// ...
BigscapeFunc.updateDescription = function(id_sel, ids, bs_data, bs_to_cl, bs_families, desc_ui, bigscape) {
  desc_ui.html("");
  if (ids.length > 0) {
    var ul = $("<ul>");
    if (ids.indexOf(id_sel) < 0) {
      id_sel = ids[0];
    }
    for (var i in ids) {
      var id = ids[i];
      var li = $("<li>");
      li.append("<a>" + bs_data[id]["id"] + "</a>");
      if (id == id_sel) {
        li.append("*");
      }
      li.find("a").click({bigscape: bigscape, id: id, ids: ids}, function(handler){
        handler.data.bigscape.setSelectedNode(handler.data.id);
        handler.data.bigscape.updateDescription(handler.data.ids);
      });
      ul.append(li);
    }
    desc_ui.append("<div>Selected: " + ids.length + " BGC" + (ids.length > 1? "s":"") + "</div>");
    desc_ui.append(ul);
  } else {
    id_sel = -1;
    desc_ui.append("Hover on one of the node to see its description, click on it to lock selection.");
  }
  return id_sel;
}

// ...
BigscapeFunc.highlightNodes = function(graph, graphics, ids, bs_data, bs_to_cl, bs_families, net_ui, desc_ui) {
  net_ui.find("svg line").attr("stroke", "gray");
  net_ui.find("svg circle").attr("r", "10");
  for (var i in ids) {
    var id = ids[i];
    var nodeUI = graphics.getNodeUI(id);
    nodeUI.attr("r", "20");
    graph.forEachLinkedNode(id, function(node, link){
        var linkUI = graphics.getLinkUI(link.id);
        if (linkUI) {
          $(linkUI).attr("stroke", "red");
        }
    });
  }
}

// --- highlighter ---
BigscapeFunc.startMultiSelect = function(graph, graphics, renderer, layout, bigscape) {
  var domOverlay = document.querySelector('.network-overlay');
  var overlay = createOverlay(domOverlay);
  overlay.onAreaSelected(handleAreaSelected);

  return overlay;

  function handleAreaSelected(area) {
    var topLeft = toSvgCoordinate(area.x, area.y, graphics.getSvgRoot());
    var bottomRight = toSvgCoordinate(area.x + area.width, area.y + area.height, graphics.getSvgRoot());

    var ids = [];
    graph.forEachNode(function(node){
      var nodeUI = graphics.getNodeUI(node.id);
      if (isInside(node.id, topLeft, bottomRight)) {
        ids.push(node.id);
      }
    });
    bigscape.setHighlightedNodes(ids);
    bigscape.highlightNodes(ids);
    bigscape.setSelectedNode(bigscape.updateDescription(ids));

    return;

    function toSvgCoordinate(x, y, svg) {
      var svgContainer = svg.getElementsByTagName("g")[0];
      var pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = y;
      var svgP = pt.matrixTransform(svgContainer.getCTM().inverse());
      return {x: svgP.x, y: svgP.y};
    }

    function isInside(nodeId, topLeft, bottomRight) {
      var nodePos = layout.getNodePosition(nodeId);
      return (topLeft.x < nodePos.x && nodePos.x < bottomRight.x &&
        topLeft.y < nodePos.y && nodePos.y < bottomRight.y);
    }
  }
}

function createOverlay(overlayDom) {
  var selectionClasName = 'graph-selection-indicator';
  var selectionIndicator = overlayDom.querySelector('.' + selectionClasName);
  if (!selectionIndicator) {
    selectionIndicator = document.createElement('div');
    selectionIndicator.className = selectionClasName;
    selectionIndicator.style.position = "absolute";
    selectionIndicator.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
    selectionIndicator.style.border = "1px solid orange";
    overlayDom.appendChild(selectionIndicator);
  }

  var notify = [];
  var dragndrop = Viva.Graph.Utils.dragndrop(overlayDom);
  var selectedArea = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  var startX = 0;
  var startY = 0;

  dragndrop.onStart(function(e) {
    startX = selectedArea.x = e.clientX;
    startY = selectedArea.y = e.clientY;
    selectedArea.width = selectedArea.height = 0;
    updateSelectedAreaIndicator();
    selectionIndicator.style.display = 'block';
  });

  dragndrop.onDrag(function(e) {
    recalculateSelectedArea(e);
    updateSelectedAreaIndicator();
    notifyAreaSelected();
  });

  dragndrop.onStop(function() {
    selectionIndicator.style.display = 'none';
  });

  overlayDom.style.display = 'block';

  return {
    onAreaSelected: function(cb) {
      notify.push(cb);
    },
    destroy: function () {
      overlayDom.style.display = 'none';
      dragndrop.release();
    }
  };

  function notifyAreaSelected() {
    notify.forEach(function(cb) {
      cb(selectedArea);
    });
  }

  function recalculateSelectedArea(e) {
    selectedArea.width = Math.abs(e.clientX - startX);
    selectedArea.height = Math.abs(e.clientY - startY);
    selectedArea.x = Math.min(e.clientX, startX);
    selectedArea.y = Math.min(e.clientY, startY);
  }

  function updateSelectedAreaIndicator() {
    selectionIndicator.style.left = selectedArea.x + 'px';
    selectionIndicator.style.top = selectedArea.y + 'px';
    selectionIndicator.style.width = selectedArea.width + 'px';
    selectionIndicator.style.height = selectedArea.height + 'px';
  }
}
