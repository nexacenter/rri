var http = require('http');
var fs = require('fs');
var csv = require("fast-csv");
var FormData = require('form-data');

var jsonToPrint = {};
var count = 0; // It depends on the number of rows
var countRequest = 0;

var stream = fs.createReadStream("noc_or.csv");

var classifyCSV = function (streamData) {
    var csvStream = csv()
        .on("data", function (csvData) {
            
            // CSV fields
            var title = csvData[0];
            var description = csvData[1];

            // Classify!
            var classOpt = classifyOptions(description); //Choose the CSV field to classify
            classifyRequest(title, classOpt["data"], classOpt["options"]);

            count++;
        })
        .on("end", function () {
             console.log("CSV loaded");
        });
 
    streamData.pipe(csvStream);
}

var classifyOptions = function (text) {
    var data = new FormData();
        console.log(text);
        data.append('text', text); // You have to change this parameter for different classifications
        data.append('numTopics', 7);
        data.append('lang','english');

    var options = {
        host: 'tellmefirst.polito.it',
        port: 2222,
        path: '/rest/classify',
        method: 'POST',
        headers: data.getHeaders()
    }

    var result = {};
    result["data"] = data;
    result["options"] = options
    return result;
}

var classifyRequest = function (title, data, reqOptions) {

    jsonToPrint[title] = [];

    var req = http.request(reqOptions, function (res) {
        res.setEncoding('utf8');
        var result = "";

        res.on('data', function (chunk) {
            result += chunk;
        });

        res.on('end', function () {
            countRequest ++;
            try {
                var json = JSON.parse(result);
                var resources = json["Resources"];

                for (var resource in resources) {
                    var sample = {"key": " ", "score": ""}
                    sample["key"] = resources[resource]["@title"];
                    sample["score"] = resources[resource]["@score"];
                    jsonToPrint[title].push(sample);
                }

            } catch (e) {
                console.info("Error");
                console.info(e);
            }

            if (countRequest == count) {
                var outputFilename = 'organizations.json';

                fs.writeFile(outputFilename, JSON.stringify(jsonToPrint, null, 4), function (err) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("JSON saved to " + outputFilename);
                    }
                }); 

            };   

        });

        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
        });

        req.end();

    });

    data.pipe(req);
}

classifyCSV(stream);