var express = require("express")
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var enocean = require('node-enocean')({sensorFilePath:__dirname+"/data/sensors.json",configFilePath:__dirname+"/data/config.json",timeout:60})
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

console.log(enocean.eepDesc);

enocean.listen("/dev/ttyUSB0")
enocean.emitters.push(io)
//enocean.eepResolvers.push( (eep, data) => {console.log(eep);})



app.translateRaw = {
	'window': (d) => {
		switch(d.raw){
			case '08': return 0; break
			case '09': return 1; break;
			default: return -1;
		}
	}
}

app.updateData = d => {
	if(d.hasOwnProperty('senderId') && app.sensors.hasOwnProperty(d.senderId)){
		app.sensors[d.senderId].timestamp = d.timestamp;
		app.sensors[d.senderId].value = app.translateRaw[d.type](d);
		return app.sensors[d.senderId];
	}

	return {id: '', timestamp: '', value: -1, type: '', title: '', desc: ''};
};


enocean.on('known-data', d => {
	//var m = app.updateData(d);
	//console.log(m);
	io.sockets.emit(d.sensor.title, d);
});

enocean.on('ready', function(){
	console.log('ready');
	app.sensors = enocean.getSensors();
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


io.on('connection', function(socket){
	console.log('');
	enocean.register(socket);
});

io.on('data', function(data){
	console.log("Data: ", data);
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/webapp/index.html');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
