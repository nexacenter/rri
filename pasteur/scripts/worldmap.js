$.getJSON('data/funder.json', function(data) {
    for (var i = 0; i < data.length; i++) {
        var keys = Object.keys(data[i]).concat(keys);
    }
    keys = $.grep(keys, function(v, k){
        return $.inArray(v ,keys) === k;
    });
    console.log(keys.toString());
});
