var express = require("express")
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var enocean = require('../node-enocean')({sensorFilePath:__dirname+"/data/sensors.json",configFilePath:__dirname+"/data/config.json",timeout:30})
var Button = require('node-enocean-button')
var Dimmer = require('node-enocean-dimmer')

app.use(express.static('webapp'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/webapp/index.html');
});

app.get('/button/:id/:command', function(req, res){
	var button = new Button( enocean , req.params.id ) 
	if(req.params.command == "on" ) {             
		button.A1.click( )
	}else{
		button.A0.click( )	
	}
	res.send("ok")
});

app.get('/dimmer/:id/:command', function(req, res){
  var dimmer = new Dimmer( enocean , req.params.id )
	dimmer.speed = "01" // dimm very fast
	switch( req.params.command ) {
	case "teach" :
		dimmer.teach( ) // 
	break
	case "off":
		dimmer.off( )
	break
	default:
		dimmer.setValue( req.params.command )
	break;
	}
	res.send("ok")
});

enocean.listen("/dev/ttyUSB0")
enocean.emitters.push(io)

io.on('connection', function(socket){
	enocean.register(socket)
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/webapp/index.html');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});