var express = require("express")
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt')
var enocean = require('node-enocean')({sensorFilePath:__dirname+"/data/sensors.json",configFilePath:__dirname+"/data/config.json",timeout:10})

// Print all supported sensors of node-enocean
if(process.argv[2] == 'list' ){
    console.log("List of supported sensors:", enocean.eepDesc);
    return 0;
}

/* ------------------------- MQTT --------------------------------------------- */
var client  = mqtt.connect('mqtt://192.168.0.12', {username: "digitalhhz", password:""})

/* ------------------------- Enocean ------------------------------------------ */

// Register web socket as event emitter, forwards all node-enocean events to clients
//enocean.emitters.push(io)

/*  When data of known sensors is received:
 *      - emit event with sensor name as event name and raw enocean data as event data
 *      - publish to mqtt topic hhz/125/<sensor type>/<sensor name> with JSON encoded enocean data
 */
enocean.on('known-data', d => {
	io.sockets.emit(d.sensor.title, d);
	client.publish('hhz/125/' + d.sensor.type + '/' + d.sensor.title, JSON.stringify(d))
});

// Debug output to discover events issued by sensors
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

// Listen for sensor data via usb
enocean.listen("/dev/ttyUSB0")

/* ------------------------- Getting Ready ------------------------------------------ */

// Serve static web content
app.use(express.static('webapp'));

// Reply index.html from webapp directory to base URL, e.g. http://localhost:3000
app.get('/', function(req, res){
  res.sendFile(__dirname + '/webapp/index.html');
});

// On new web socket connection, Send event 'init' with all available sensors
io.on('connection', function(socket){
	//enocean.register(socket);
	socket.emit('init', enocean.getSensors());
});

// Listen on port 3000 for http connections
http.listen(3000, function(){
  console.log('listening on *:3000');
});
