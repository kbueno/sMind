var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());
app.use('/libs', express.static(__dirname + '/libs'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));

// Try to load any saved mind map
var rawData = fs.readFileSync("data.json", {encoding: "utf-8"});
var data = {};
try {
	data = JSON.parse(rawData);
} catch (e) {
	data = {};
}

// This serves index.html
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');	
});

// popupbasic
app.get('/popupbasic.html', function(req, res) {
	res.sendFile(__dirname + '/popupbasic.html');
});

app.get('/docs/*', function(req, res) {
	console.log(req.params)
	res.sendFile(req.params[0]);
});

// Get data from the client
app.get('/data', function(req, res) {

	res.send(200,data);
	//res.status(status).send(body);
});

// Get data from the client
app.post('/data/save', function(req, res) {
	console.log(req.body);
	// Create a unique ID and store in data
	var id = req.body["name"]
	data[id] = req.body["data"];

	// Send response with ID
	res.send(200,{"id": id});
	//res.status(status).send(body);
});

// Send data to the client
app.get('/data/load/:id', function(req, res) {
	// Check if file exists
	if (data[req.params.id] != undefined) {
		res.send(200, data[req.params.id]);
	} else {
		res.send(404);
	}
});

// When process ends, save data to a file
process.on("SIGINT", function () {
	console.log(data);
	fs.writeFileSync("data.json", JSON.stringify(data, null, 4), {encoding: "utf8"});
	process.exit();
});

app.listen(8080)
