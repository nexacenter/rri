function doClouds(mode,json) {

$("#cloud").html("");

var w = new Array();
var done = 0;

$.getJSON(json, function(data) {
    for (var org in data) {
        for (var i = 0; i < data[org].length; i++) {
            done = 0;
            if (w.length === 0) {
                w.push({
                    key: data[org][i].key,
                    score: parseFloat(data[org][i].score),
                    count: 1
                });
            }
            for (var j = 0; j < w.length; j++) {
                if (w[j].key === data[org][i].key) {
                    w[j].score += parseFloat(data[org][i].score);
                    w[j].count++
                    done = 1;
                }
            }
            if (!done) {
                w.push({
                    key: data[org][i].key,
                    score: parseFloat(data[org][i].score),
                    count:1
                });
            }
        }
    }

    if (mode === "score") {
        sortByKey(w, "score");
    } else if (mode === "count") {
        sortByKey(w, "count");
    }

    w = w.slice(0,100); //here you can choose max numbers of word to visualize

    var fill = d3.scale.category20();
    var layout = d3.layout.cloud()
        .size([1000, 500])
        .words(w.map(function(d) {
            return {text: d.key, size: 10 + (d.score * 4)};
    }))
        .padding(2)
        .rotate(function() { return (~~(Math.random() * 6) - 3) * 30; })
        .font("Impact")
        .fontSize(function(d) { return d.size; })
        .on("end", draw);

    layout.start();

    function sortByKey(array, key) { //from highest to lowest
        return array.sort(function(a, b) {
            var x = a[key]; var y = b[key];
            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        });
    }

    function draw(words) {
        d3.select("#cloud").append("svg")
            .attr("width", layout.size()[0])
            .attr("height", layout.size()[1])
            .append("g")
            .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", function(d) { return d.size + "px"; })
            .style("font-family", "Impact")
            .style("fill", function(d, i) { return fill(i); })
            .attr("text-anchor", "middle")
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
      .on("click", function(d, i) { window.open('https://en.wikipedia.org/wiki/'+d.text); })
      .style("cursor", "pointer")
            .text(function(d) { return d.text; });
    }
}); //read json

};
