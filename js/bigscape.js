var BigscapeFunc = {
  ver: "1.0"
};

function Bigscape(bs_data, bs_families, bs_similarity, network_container, desc_container, options = {}) {
  var graph = Viva.Graph.graph();
  var graphics = Viva.Graph.View.svgGraphics();
  var bs_data = bs_data;
  var bs_families = bs_families;
  var bs_similarity = bs_similarity;
  var bs_to_cl = [];
  var net_ui = $("#" + network_container);
  var desc_ui = $("#" + desc_container);
  var hover_locked = false;
  var highlighted_nodes = [];
  var edge_count = 0;

  // options
  var intra_cutoff = options.intra_cutoff? options.intra_cutoff : 0;
  var inter_cutoff = options.inter_cutoff? options.inter_cutoff : 0.25;
  var fam_colors = options.fam_colors? options.fam_colors : [];

  // public functions
  var showSingletons = function(isOn) { BigscapeFunc.showSingletons(graph, graphics, net_ui, isOn); };
  this.showSingletons = showSingletons;
  var highlightNodes = function(ids, isOn) { BigscapeFunc.highlightNodes(graph, graphics, ids, bs_data, bs_to_cl, bs_families, net_ui, desc_ui, isOn); };
  this.highlightNodes = highlightNodes;

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
      if (!hover_locked) {
        highlightNodes([node.id], true);
        highlighted_nodes = [node.id];
      }
    }, function() { // mouse out
      if (!hover_locked) {
        highlightNodes([node.id], false);
        highlighted_nodes = [];
      }
    });
    $(ui).click(function(){
      if ((hover_locked) && (highlighted_nodes.indexOf(node.id) > -1)) {
        highlightNodes([node.id], false);
        highlighted_nodes = [];
        hover_locked = false;
      } else {
        highlightNodes([node.id], true);
        highlighted_nodes = [node.id];
        hover_locked = true;
      }
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

  // run renderer and forceDirected layout
  showSingletons(false);
  renderer.run();
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
      for (var i = 0; i < perZoom; i++) {
        renderer.zoomOut();
      }
      if ((perZoom > 0) && (zoomCount > 1)) {
        zoomCount = 0;
        perZoom--;
        perZoom--;
      } else {
        zoomCount++;
      }
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
BigscapeFunc.showDescription = function(bs_obj, bs_fam_obj, desc_ui, isOn) {
  desc_ui.html("");
  if (isOn) {
    desc_ui.append("<h2>" + bs_obj["id"] + "</h2>");
    desc_ui.append("<div><img style='max-width: 100%;' src='../../cluster_svg/" + bs_obj["id"] + ".svg' /></div>");
    desc_ui.append("<div>Family: " + bs_fam_obj["id"] + "</div>");
  } else {
    desc_ui.append("Hover on one of the node to see its description, click on it to lock selection.");
  }
}

// ...
BigscapeFunc.highlightNodes = function(graph, graphics, ids, bs_data, bs_to_cl, bs_families, net_ui, desc_ui, isOn) {
  var id = ids[0];
  net_ui.find("svg line").attr("stroke", "gray");
  if (isOn) {
    net_ui.find("svg circle").attr("r", "10");
    var nodeUI = graphics.getNodeUI(id);
    nodeUI.attr("r", "20");
    net_ui.find("svg line").addClass("hidden");
    graph.forEachLinkedNode(id, function(node, link){
        var linkUI = graphics.getLinkUI(link.id);
        if (linkUI) {
          $(linkUI).removeClass("hidden");
          $(linkUI).attr("stroke", "red");
        }
    });
  } else {
   net_ui.find("svg line").removeClass("hidden");
   net_ui.find("svg circle").attr("r", "10");
  }
  BigscapeFunc.showDescription(bs_data[ids[0]], bs_families[bs_to_cl[ids[0]]], desc_ui, isOn);
}
