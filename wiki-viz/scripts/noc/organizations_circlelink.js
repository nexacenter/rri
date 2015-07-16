function doCircle(mode) {

    $("#circle").html("");

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
        .radius(function(d) {
            return d.y;
        })
        .angle(function(d) {
            return d.x / 180 * Math.PI;
        });

    var svg = d3.select("#circle").append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .append("g")
        .attr("transform", "translate(" + radius + "," + radius + ")");

    var link = svg.append("g").selectAll(".link"),
        node = svg.append("g").selectAll(".node");

    var persons = [];
    var topicOfInterest = [];

    var endpoint = "http://public-contracts.nexacenter.org/sparql?default-graph-uri=http://noc-wiki.nexacenter.org"

    var findOrgs = ["", "SELECT DISTINCT ?name WHERE { ?center <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Organization> . ?center <http://www.w3.org/2000/01/rdf-schema#label> ?name . ?center <http://xmlns.com/foaf/0.1/topic_interest> ?topic .}"].join(" ");

    var findTopic = ["", "SELECT DISTINCT ?name ?t WHERE { ?center <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Organization> . ?center <http://www.w3.org/2000/01/rdf-schema#label> ?name . ?center <http://xmlns.com/foaf/0.1/topic_interest> ?t .}"].join(" ");

    $.ajax({
        dataType: "jsonp",
        url: endpoint + "&query=" + encodeURIComponent(findOrgs) + "&format=json",
        success: function(_data) {
            _data.results.bindings.forEach(function(person) {
                persons.push({
                    name: person.name.value.replace('User:', ''),
                    related: new Array()
                });
            });

            $.ajax({
                dataType: "jsonp",
                url: endpoint + "&query=" + encodeURIComponent(findTopic) + "&format=json",
                success: function(_data) {
                    _data.results.bindings.forEach(function(topic) {
                        topicOfInterest.push({
                            topic: topic.t.value.replace(/.*Special:URIResolver\//g, ''),
                            person: topic.name.value.replace('User:', '')
                        });
                    });


                    var nodes = cluster.nodes(packageHierarchy(persons)),
                        lltopicOfInterest = generateLinksWithWeigth(nodes, topicOfInterest),
                        //llall = llict.concat(llssh),
                        ll;

                    switch (mode) {
                        case 'all':
                            ll = llall;
                            break;
                        case 'ssh':
                            ll = lltopicOfInterest;
                            break;
                        default:
                            ll = llall;
                    }

                    link = link
                        .data(bundle(ll))
                        .enter().append("path")
                        .each(function(d) {
                            d.source = d[0], d.target = d[d.length - 1];
                        })
                        .attr("class", "link")
                        .attr("d", line)
                        .style("stroke-width", function(d) {
                            return sizeLink(ll, d.source, d.target);
                        });

                    node = node
                        .data(nodes.filter(function(n) {
                            return !n.children;
                        }))
                        .enter().append("text")
                        .attr("class", "node")
                        .attr("dy", ".31em")
                        .attr("transform", function(d) {
                            return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)");
                        })
                        .style("text-anchor", function(d) {
                            return d.x < 180 ? "start" : "end";
                        })
                        .text(function(d) {
                            return d.key;
                        })
                        .on("mouseover", mouseovered)
                        .on("click", function(d, i) {
                            window.open('http://noc-wiki.nexacenter.org/view/' + d.name);
                        })
                        .on("mouseout", mouseouted);

                    d3.select(self.frameElement).style("height", diameter + "px");

                }
            });
        }
    });


    function mouseovered(d) {
        d3.select(this).transition().style("cursor", "pointer");

        node
            .each(function(n) {
                n.target = n.source = false;
            });

        link
            .classed("link--target", function(l) {
                if (l.target === d) return l.source.source = true;
            })
            .style("opacity", function(l) {
                if (l.target !== d) return 0.1;
            })
            .filter(function(l) {
                return l.target === d || l.source === d;
            })
            .each(function() {
                this.parentNode.appendChild(this);
            });

        node
            .classed("node--source", function(n) {
                return n.source;
            });
    }

    function mouseouted(d) {
        link
            .classed("link--target", false)
            .style("opacity", 1);

        node
            .classed("node--source", false);
    }

    function sizeLink(ll, source, target) {
        for (var i = 0; i < ll.length; i++) {
            if (ll[i].source === source && ll[i].target === target)
                return ll[i].size;
        }
        return 1;
    }

    // Construct clusters from objects names.
    function packageHierarchy(persons) { //TODO da utilizzare gli rri topics
        var map = {};

        function find(name, data) {
            var node = map[name],
                i;
            if (!node) {
                node = map[name] = data || {
                    name: name,
                    children: []
                };
                if (name.length) {
                    node.parent = find(name.substring(0, i = name.lastIndexOf(".")));
                    node.parent.children.push(node);
                    node.key = name.substring(i + 1);
                }
            }
            return node;
        }

        persons.forEach(function(d) {
            find(d.name, d);
        });

        return map[""];
    }

    function generateLinksWithWeigth(nodes, topics) {
        var allLinks = [],
            links = [];

        for (var k = 0; k < nodes.length; k++) {
            var name = nodes[k].name;
            for (var i = 0; i < topics.length; i++) {
                if (topics[i].person === name) {
                    for (var j = 0; j < topics.length; j++) {
                        if (topics[j].topic === topics[i].topic && name !== topics[j].person) {
                            for (var l = 0; l < nodes.length; l++) {
                                if (nodes[l].name == topics[j].person) {
                                    allLinks.push({
                                        source: nodes[k],
                                        target: nodes[l]
                                    });
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        links.push({
            source: allLinks[0].source,
            target: allLinks[0].target,
            size: 1
        });
        for (i = 1; i < allLinks.length; i++) {
            var flag = 1;
            for (j = 0; j < links.length; j++) {
                if (links[j].source === allLinks[i].source && links[j].target === allLinks[i].target) {
                    links[j].size++;
                    flag = 0;
                }
            }
            if (flag) {
                links.push({
                    source: allLinks[i].source,
                    target: allLinks[i].target,
                    size: 1
                });
            }
        }
        return links;
    }
}
