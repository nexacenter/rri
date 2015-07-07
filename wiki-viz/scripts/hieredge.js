//XXX nome cognome anziché username

var diameter = 700,
    radius = diameter / 2,
    innerRadius = radius - 120;

var cluster = d3.layout.cluster()
    .size([360, innerRadius]) //from 0 to 360, to have an open circle
    .sort(null);

var bundle = d3.layout.bundle();

var line = d3.svg.line.radial()
    .interpolate("bundle")
    .tension(.9) //from 0 to 1 to change lines curves
    .radius(function(d) { return d.y; })
    .angle(function(d) { return d.x / 180 * Math.PI; });

var svg = d3.select("body").append("svg")
    .attr("width", diameter)
    .attr("height", diameter)
    .append("g")
    .attr("transform", "translate(" + radius + "," + radius + ")");

var link = svg.append("g").selectAll(".link"),
    node = svg.append("g").selectAll(".node");

var persons = [];
var ict = [];
var rri = [];

$.getJSON('data/persons.json', function(data) {
    var i = 0;
    data.results.bindings.forEach(function(person) {
        persons[i] = person.name.value.replace('User:',''); 
        i++;
    });
});

$.getJSON('data/ict-topic.json', function(data) {
    data.results.bindings.forEach(function(topic) {
        ict.push({
            topic: topic.ict.value.replace(/.*Special:URIResolver\//g,''),
            person: topic.name.value.replace('User:','')
        });
    });
});

$.getJSON('data/rri-topic.json', function(data) {
    data.results.bindings.forEach(function(topic) {
        rri.push({
            topic: topic.rri.value.replace(/.*Special:URIResolver\//g,''),
            person: topic.name.value.replace('User:','')
        });
    });
});

setTimeout(function(){ //XXX very bad to go through async
var ll = generateLinksWithWeigth(persons, ict);
console.log(rri);
}, 2000);

d3.json("data/readme-flare-imports 2.json", function(error, classes) {
    if (error) throw error;

    var nodes = cluster.nodes(packageHierarchy(classes)),
        links = packageImports(nodes);

console.log(classes);
console.log(persons);

    link = link
        .data(bundle(links))
        .enter().append("path")
        .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
        .attr("class", "link")
        .attr("d", line)
        .style("stroke-width", function(d) { return 1 }); //TODO use this value

    node = node
        .data(nodes.filter(function(n) { return !n.children; }))
        .enter().append("text")
        .attr("class", "node")
        .attr("dy", ".31em")
        .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
        .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
        .text(function(d) { return d.key; })
        .on("mouseover", mouseovered)
        .on("mouseout", mouseouted);
});

function mouseovered(d) {
    d3.select(this).transition().style("cursor", "pointer");

    node
      .each(function(n) { n.target = n.source = false; });

    link
      .classed("link--target", function(l) { if (l.target === d) return l.source.source = true; })
      .filter(function(l) { return l.target === d || l.source === d; })
      .each(function() { this.parentNode.appendChild(this); });

    node
      .classed("node--source", function(n) { return n.source; });
}

function mouseouted(d) {
    link
      .classed("link--target", false)

    node
      .classed("node--source", false);
}

d3.select(self.frameElement).style("height", diameter + "px");

// Construct clusters from objects names.
function packageHierarchy(classes) {
  var map = {};

  function find(name, data) {
    var node = map[name], i;
    if (!node) {
      node = map[name] = data || {name: name, children: []};
      if (name.length) {
        node.parent = find(name.substring(0, i = name.lastIndexOf(".")));
        node.parent.children.push(node);
        node.key = name.substring(i + 1);
      }
    }
    return node;
  }

  classes.forEach(function(d) {
    find(d.name, d);
  });

  return map[""];
}

function packageImports(nodes) {
    var map = {},
        imports = [];

    // Compute a map from name to node.
    nodes.forEach(function(d) {
        map[d.name] = d;
    });

    // For each import, construct a link from the source to target node.
    nodes.forEach(function(d) {
        if (d.related) d.related.forEach(function(i) {
            imports.push({source: map[d.name], target: map[i], value: 2});
        });
    });

    return imports;
}

function generateNodes(persons, rri) { //XXX codice copiato ma modificato in parte
    var personWithTopic = [];
console.log(persons);
//fare il group by delle persone
//generare i codici per i cluster

    for (var k = 0; k < persons.length; k++) {
        var name = persons[k];
        for (var i = 0; i < rri.length; i++) {
            if (rri[i].person === name) {
                for (var j = 0; j < rri.length; j++) {
                    if (rri[j].topic === ict[i].topic && name !== ict[j].person) { 
                        personWithTopic.push({person: name, target: ict[j].person});
                    }
                }
            }
        }
    }
    return nodes;
}

function generateLinksWithWeigth(persons, ict) {
    var allLinks = [],
        links = [];

    for (var k = 0; k < persons.length; k++) {
        var name = persons[k];
        for (var i = 0; i < ict.length; i++) {
            if (ict[i].person === name) {
                for (var j = 0; j < ict.length; j++) {
                    if (ict[j].topic === ict[i].topic && name !== ict[j].person) { 
                        allLinks.push({source: name, target: ict[j].person});
                    }
                }
            }
        }
    }

    links.push({source: allLinks[0].source, target: allLinks[0].target, size: 1});
    for (i = 1; i < allLinks.length; i++) {
        var flag = 1;
        for (j = 0; j < links.length; j++) {
            if (links[j].source === allLinks[i].source && links[j].target === allLinks[i].target) {
                links[j].size++;
                flag = 0;
            }
        }
        if (flag) {
            links.push({source: allLinks[i].source, target: allLinks[i].target, size: 1});
        }
    }
    return links;
}
