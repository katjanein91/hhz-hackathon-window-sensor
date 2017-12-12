var express = require("express")
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt')
var enocean = require('node-enocean')({sensorFilePath:__dirname+"/data/sensors.json",configFilePath:__dirname+"/data/config.json",timeout:10})
//var Button = require('node-enocean-button')
//var Dimmer = require('node-enocean-dimmer')

app.use(express.static('webapp'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/webapp/index.html');
});

/*
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
*/

/* ------------------------- MQTT --------------------------------------------- */
var client  = mqtt.connect('mqtt://192.168.0.12', {username: "digitalhhz", password:""})

/* ------------------------- Enocean ------------------------------------------ */
enocean.listen("/dev/ttyUSB0")
enocean.emitters.push(io)

enocean.on('known-data', d => {
	//var m = app.updateData(d);
	//console.log(m);
	io.sockets.emit(d.sensor.title, d);
	client.publish('hhz/125/' + d.sensor.type + '/' + d.sensor.title, JSON.stringify(d))
});

enocean.on('ready', function(){
	console.log('ready');
});


enocean.on('all-sensors', d => console.log("all-sensors",d));
enocean.on('base', d => console.log("base",d));
enocean.on('forget-error', d => console.log("forget-error",d));
enocean.on('forget-mode-start', d => console.log("forget-mode-start",d));
enocean.on('forget-mode-stop', d => console.log("forget-mode-end",d));
enocean.on('forgotten', d => console.log("forgotten",d));
enocean.on('known-data', (d) => console.log("known data", d));
enocean.on('learn-error', d => console.log("learn-error",d));
enocean.on('learn-mode-start', d => console.log("learn-mode-start",d));
enocean.on('learn-mode-stop', d => console.log("learn-mode-stop",d));
enocean.on('learned', (d) => console.log("learned",d));
enocean.on('ready', d => console.log("ready",d));
enocean.on('response', d => console.log("response",d));
enocean.on('sensor-info', d => console.log("sensor-info",d));
enocean.on('sent', d => console.log("sent",d));
enocean.on('sent-error', d => console.log("sent-error", d));
enocean.on('unknown-data', (d) => console.log("unknown data", d));
enocean.on('unknown-teach-in', (d) => console.log("unknown teach in", d));



/* ------------------------- Getting Ready ------------------------------------------ */
io.on('connection', function(socket){
	//enocean.register(socket);
	socket.emit('init', enocean.getSensors());
});

/*
io.on('data', function(data){
	console.log("Data: ", data);
});
*/

http.listen(3000, function(){
  console.log('listening on *:3000');
});
