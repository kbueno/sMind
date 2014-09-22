var express = require('express');
var app = express();

var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use('/libs', express.static(__dirname + '/libs'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));

// This serves index.html
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');	
});

var data = {};
// Get data from the client
app.post('/data', function(req, res) {
	console.log("This is working, cool");
	console.log(req.body);
	var id = Date.time() + Math.random() * 1000;

	data[id] = res.body;
	res.send(200,{"id": id});
})

// Send data to the client
app.get('/data/:id', function(req, res) {
	if (data[req.params.id] != undefined) {
		res.send(200, data[req.param.id]);
	} else {
		res.send(404)
	}
});


app.listen(8080)
