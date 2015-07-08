var http = require('http');
var fs = require('fs');
var csv = require("fast-csv");
var xml2js = require('xml2js');
var Iconv = require('iconv').Iconv;

var parser = new xml2js.Parser();
var iconv = new Iconv('ISO-8859-1', 'utf-8');

// Create Semantic Media Wiki templates from XML data

var wikiFile = "wiki.txt"
fs.writeFile(wikiFile, '***** Wiki templates for RRI project*****\n\n\n', function(err) {
    if (err) throw err;
    console.log("Wiki file is created!");
})

var i = 0; // Counter to delay XML requests 

var getXML = function() {

    i += 1;

    var streamData = fs.createReadStream("cordis-sample.csv");
    var csvStream = csv()
        .on("data", function(csvData) {
            var projectTemplate = "";
            projectTemplate += "{{Project\n"
            projectTemplate += "|homepage=" + csvData[12] + "\n";

            var xmlLink = csvData[9].split("http://cordis.europa.eu")[1];
            if (xmlLink != undefined) {
                xmlLink = xmlLink.replace("html", "xml");
                var options = {
                    host: "cordis.europa.eu",
                    path: xmlLink
                };

                // Here you choose how to export data from XML files
                setTimeout(function() {
                    fromXMLToWikiTemplate(options, projectTemplate, function callback() {

                    })
                }, 1000 * i);
            }
        })
        .on("end", function() {
            console.log("Reading CSV for fromXMLToJSON done!");
        });

    streamData.pipe(csvStream);
}

var fromXMLToWikiTemplate = function(options, projectTemplate, callback) {

    http.request(options).on("response", function(res) {
        var str = '';

        res.on('data', function(chunk) {
            var buffer = iconv.convert(chunk);
            str += buffer.toString('utf8');
        });

        res.on('end', function() {

            parser.parseString(str, function(err, result) {
                if (err) {
                    return console.log(err);
                } else {

                    projectTemplate += "|acronym=" + result["project"]["acronym"][0] + "\n";
                    projectTemplate += "|title=" + result["project"]["title"][0] + "\n";
                    projectTemplate += "|description=" + result["project"]["objective"][0] + "\n";
                    projectTemplate += "|startdate=" + result["project"]["startDate"][0].split("-").join("/") + "\n";
                    projectTemplate += "|enddate=" + result["project"]["endDate"][0].split("-").join("/") + "\n";
                    projectTemplate += "|coordinator=[[" + result["project"]["relations"][0]
                        ["associations"][0]
                        ["organization"][0]["shortName"][0] + "]]\n";

                    var participantIndex = 1;
                    var participants = result["project"]["relations"][0]
                        ["associations"][0]
                        ["organization"]

                    projectTemplate += "|partners="

                    while (participants[participantIndex] != undefined) {
                        projectTemplate += "[[" + participants[participantIndex]["shortName"][0] + "]],"
                        participantIndex++;
                    }
                    projectTemplate += "\n"
                    projectTemplate += "|subjects=\n";
                    projectTemplate += "|fundedBy=European Commission\n";
                    projectTemplate += "|call=" + result["project"]["relations"][0]
                        ["associations"][0]
                        ["call"][0]["identifier"][0] + "\n";
                }
            });

            projectTemplate += "}}\n\n\n"

            fs.appendFile(wikiFile, projectTemplate, function(err) {
                if (err) throw err;
                console.log('Wiki Template is saved in the file!');
            });
        });
    }).end();

}

getXML();