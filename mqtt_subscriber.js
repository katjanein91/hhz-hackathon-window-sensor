var mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://192.168.0.12', {username: "digitalhhz", password:""})
var ical = require('ical')
        , months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
var moment = require('moment')
var nodemailer = require('nodemailer');

// Delay after latest event to sent the notification
var notificationDelay = 1000 * 30;

var location = "125";
var timerCloseNotification = [];
var timerTemperatureNotification = [];
var lastState = [];

//var subject="Raum125 Info";
//var message;

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport({
	host: 'mail.gmx.com',
	port: 587,
	tls: {
		ciphers:'SSLv3',
		rejectUnauthorized: false
	},
	debug:true,
	auth: {
		user: 'hhz_raum125@gmx.de',
		pass: ''
	}
});

var sendMail = (subject, message) => {
	// setup e-mail data with unicode symbols
	var mailOptions = {
		from: '"Herman Hollerith" <hhz_raum125@gmx.de>', // sender address
		to: 'hhz_raum125@gmx.de', // list of receivers
		subject: subject, // Subject line
		text: message, // plaintext body
		html: '<p>'+message+'</p>' // html body
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			return console.log(error);
		}
		console.log('Message sent: ' + info.response);
	});
};

var notify = (msg,sensor) => {
	console.log(msg, sensor.sensor.title);
	sendMail("Room 125 Notification:  " + sensor.sensor.type, msg);
};

var getLatestEventToday = (data,location) => {
	var roomEvents = [];
	for (var k in data)
	{
		if (data.hasOwnProperty(k) && String(data[k].location).includes(location)){
			data[k].end = moment(data[k].end);
			roomEvents.push(data[k]);
		}
	}
	var today = d => ( moment().year() == d.year() && moment().dayOfYear() == d.dayOfYear());
	latestEventToday = roomEvents.filter(d => today(d.end)).reduce(moment().max);

	return latestEventToday;
};

var validSensor = sensor => (sensor.hasOwnProperty("senderId")
		&& sensor.hasOwnProperty("sensor") && sensor.sensor.hasOwnProperty("type") && sensor.sensor.hasOwnProperty("title")
		&& sensor.hasOwnProperty("values") && sensor.values[0].hasOwnProperty("value"));

var handleCloseNotification = sensor => {
	if(validSensor(sensor))
	{
		console.log("Valid message");

		// Clear previous timer
		if(timerCloseNotification.hasOwnProperty(sensor.senderId)){
			console.log("Clearing timer of", sensor.sensor.title);
			clearTimeout(timerCloseNotification[sensor.senderId]);
		}

		// Register new Timer for open event
		if(sensor.values[0].value == 'open'){
			ical.fromURL('https://calendar.google.com/calendar/ical/9fbtqhp79a3oqvq6v0ur434j2s%40group.calendar.google.com/private-6be31897ac099f4dbe5c28245f966a6b/basic.ics'
				, {}, function(err, calendar) {
					console.log("Calendar callback", sensor.senderId);
					latestEventToday = getLatestEventToday(calendar, location);

					console.log("Latest event", latestEventToday.end);
					console.log("Register timer for ", sensor.sensor.title, "in ", Math.max(latestEventToday.end.diff(moment(),'miliseconds',true),0) + notificationDelay, "miliseconds");
					timerCloseNotification[sensor.senderId] = setTimeout(notify, Math.max(latestEventToday.end.diff(moment()),0) + notificationDelay, "Close the window in room 125 ", sensor);
				});
		}
	}
	else{
		console.log("Invalid message");
	}
};

var handleTemperature = sensor => { console.log("Temperature ",sensor);
	if(validSensor(sensor)){
		if(sensor.values[0].value < 20 && lastState.includes("open")){
			timerTemperatureNotification[sensor.senderId] = setTimeout(notify, notificationDelay, "It's cold, close " + sensor.sensor.title + " in room 125", sensor);
		}
		else if(sensor.values[0].value < 20){
			timerTemperatureNotification[sensor.senderId] = setTimeout(notify, notificationDelay, "Windows are closed, but it's still too cold, turn on the heater in room 125", sensor);
			//notify("Windows are closed, but it's still too cold, turn on the heater", sensor);
		}
		else {
			console.log("Temperature is fine, " + sensor.values[0].value);
			if(timerTemperatureNotification.hasOwnProperty(sensor.senderId))clearTimeout(timerTemperatureNotification[sensor.senderId]);

		}
	}
};

var handleLastState = sensor => { 
	if(validSensor(sensor)){
		lastState[sensor.senderId] = sensor.values[0].value;
	}
	console.log("Last States", lastState);
}

client.on('connect', function () {
	client.subscribe(['hhz/125/window/+','hhz/125/door/+', 'hhz/125/temperature/+'])
	//client.publish('hhz/125/window', 'Hello mqtt')
})

client.on('message', function (topic, message) {
	// message is Buffer
	//console.log(message)
	console.log(message.toString())
	//console.log(JSON.parse(message))
	//client.end()

	if(topic.includes("door") || topic.includes("window")) handleCloseNotification(JSON.parse(message));
})

client.on('message', function(topic, message){
	if(topic.includes("temperature"))handleTemperature(JSON.parse(message));
});

client.on('message', function(topic, message){
	if( topic.includes("window")) handleLastState(JSON.parse(message));
});
