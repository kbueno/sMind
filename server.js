var express = require('express');
var busboy = require('connect-busboy');
var fs = require('fs');
var bodyParser = require('body-parser');
var gm = require('gm');

var app = express();
app.use(busboy());
app.use(bodyParser.json());
app.use('/libs', express.static(__dirname + '/libs'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/img', express.static(__dirname + '/img'));

// Try to load any saved mind map
var rawData = fs.readFileSync("data.json", {encoding: "utf-8"});
var data = {};
try {
	data = JSON.parse(rawData);
} catch (e) {
	data = {};
}

// For saving to disk
var tmpData = {};

// This serves index.html
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');	
});

// TODO: How to open up in a new window?
app.get('/docs/*', function(req, res) {
	console.log(req.params)
	res.sendFile("/"+req.params[0]);
});

// Get data from the client
app.get('/data', function(req, res) {
	res.send(200,data);
	//res.status(status).send(body);
});

// Post data from the client
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

// Store the file info to be downloaded
app.post('/download/file', function(req,res) {
	console.log(req.body);
	// Create a unique ID and store in data
	var id = Date.now()
	tmpData[id] = req.body["data"];

	// Send response with ID
	res.send(200,{"id": id});
	//res.status(status).send(body);
});

// Downloads the file
app.get('/download/file/:id', function(req, res) {
	// Check if file exists
	if (tmpData[req.params.id] != undefined) {
		res.header("Content-Type","application/force-download");
		res.header("Content-Disposition", "attachment");
		res.send(200, tmpData[req.params.id]);
	} else {
		res.send(404);
	}
});

// Uploads an image to the img folder
app.post('/upload/image', function(req, res) {
	var fstream;
	req.pipe(req.busboy)
	req.busboy.on('file', function(fieldname, file, filename) {
		console.log(filename);

		// Path where image will be uploaded
		fstream = fs.createWriteStream(__dirname + "/img/" + filename);

		gm(file, filename)
		.resize('50', '50')
		.stream()
		.pipe(fstream);

		fstream.on('close', function() {
			console.log("Finished laoding");
			res.send(200, {"imagePath": 'img/'+filename})
		});
	});
});

// Uploads a file to sMind
app.post('/upload/file', function(req, res) {
	req.pipe(req.busboy)
	req.busboy.on('file', function(fieldname, file, filename) {
		console.log(filename);
		file.pipe(res);
	});
});

// When process ends, save data to a file
process.on("SIGINT", function () {
	console.log(data);
	fs.writeFileSync("data.json", JSON.stringify(data, null, 4), {encoding: "utf8"});
	process.exit();
});

app.listen(8080)
