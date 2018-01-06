// Load MQTT module
var mqtt = require('mqtt')
// Load ical module for parsing google calendar
var ical = require('ical')
        , months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// Load module to support easier date procressing
var moment = require('moment')
// Load mail module to send email notifications
var nodemailer = require('nodemailer');

/* ---------------------------------- Configuration ---------------------------------------- */

// MQTT Server
mqttServer = 'mqtt://192.168.0.12';
mqttUsername = 'digitalhhz';
mqttPassword = '';

// Delay after latest event to sent the notification
var notificationDelay = 1000 * 30;

// Room/location to filter event locations
var location = "125";

/* --------------------------------- Initialization ---------------------------------------- */
// Create MQTT client and connect to HHZ MQTT broker
var client  = mqtt.connect(mqttServer, {username: mqttUsername, password: mqttPassword});

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

/* ----------------------------- Function definitions ------------------------------------ */

/*  Easily send emails to our test mailbox hhz_raum125@gmx.de.
 *  @subject: Email subject
 *  @message: Plain text message
 */
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

/*  Issue notification, mainily used to prepare the email
 *  and to print a message to console additionally.
 *  @msg: Text message for notification
 *  @sensor: node-enocean sensor information from issuing sensor
 */
var notify = (msg,sensor) => {
	console.log(msg, sensor.sensor.title);
	sendMail("Room 125 Notification:  " + sensor.sensor.type, msg);
};

/*  Filter latest event of the current day and given location from ical data.
 *  @data: ical data
 *  @location: Filter events for only this location
 */
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

/*  Verify existance of minmum required sensor informaton
 *  @sensor: sensor data from node-enocean
 */
var validSensor = sensor => (sensor.hasOwnProperty("senderId")
		&& sensor.hasOwnProperty("sensor") && sensor.sensor.hasOwnProperty("type")
                && sensor.sensor.hasOwnProperty("title") && sensor.hasOwnProperty("values")
                && sensor.values[0].hasOwnProperty("value"));


/* ----------------------------- Sensor rules / MQTT message handlers ------------------------------------ */

/* Dummy handler as example for further rules
 */
var handleDummy = (topic, message) => {

    // Optional, check if correct subtopic is included
    if(topic.includes("window")){

        // Translate MQTT message in JSON to Javascript object
        // Required if data from MQTT message is used
        var sensor = JSON.parse(message);

        // Validate, that all required sensor information are present
        // Required, external data should be validated to ensure stability
        if(validSensor(sensor)){

            // Your rule/action
            // E.g. print sensor id to server screen
            console.log(sensor.senderId);
        }
        // Debug, print all states
        console.log("Last States", lastState);
    }
};

/*  Rule for window sensors:
 *  1.  If window is open and the last event today has ended
 *      -> Send notification to close the windows
 */
var handleCloseNotification = (topic, message) => {

    // Can only handle door or window sensors
    if(topic.includes("door") || topic.includes("window")){

        var sensor = JSON.parse(message);

        if(validSensor(sensor))
        {
            // Clear previous timer to ensure, that for one sensor only one timer is active, s.t. only one/no duplicate notification is sent.
            if(timerCloseNotification.hasOwnProperty(sensor.senderId)){
                console.log("Clearing timer of", sensor.sensor.title);
                clearTimeout(timerCloseNotification[sensor.senderId]);
            }

            // If window is opened, register new timer for a notification to close the window
            // else window was closed and everything is fine.
            if(sensor.values[0].value == 'open'){

                // Request HHZ calendar from Google Calendar
                ical.fromURL('https://calendar.google.com/calendar/ical/9fbtqhp79a3oqvq6v0ur434j2s%40group.calendar.google.com/private-6be31897ac099f4dbe5c28245f966a6b/basic.ics'
                        , {},
                        function(err, calendar) {
                            console.log("Calendar callback", sensor.senderId);

                            // Get the latest event of the day from the requested calendar
                            latestEventToday = getLatestEventToday(calendar, location);

                            console.log("Latest event", latestEventToday.end);
                            console.log("Register timer for ",
                                    sensor.sensor.title, "in ",
                                    Math.max(latestEventToday.end.diff(moment(),'miliseconds',true),0) + notificationDelay
                                    , "miliseconds"
                                    );
                            // Register timer to send a notification after end of last event + some delay
                            timerCloseNotification[sensor.senderId] = setTimeout(
                                    notify,
                                    Math.max(latestEventToday.end.diff(moment()),0) + notificationDelay,
                                    "Close the window in room 125 ",
                                    sensor
                                    );
                        });
            }
        }
        else{
            console.log("Invalid message");
        }
    }
};

/*  Rules for temperatur sensors:
 *  2.  If temperatur < 20 and window(s) open
 *      -> Notification: close window X in room
 *  3.  If temperatur < 20 and all windows closed
 *      -> Notification: Turn on heater
 */
var handleTemperature = (topic,message) => {

    // Can only handle temperature sensors
    if(topic.includes("temperature")){

        var sensor = JSON.parse(message);
        if(validSensor(sensor)){

            // Clear previous notification/timer
            if(timerTemperatureNotification.hasOwnProperty(sensor.senderId))
                clearTimeout(timerTemperatureNotification[sensor.senderId]);

            // Rule 2
            if(sensor.values[0].value < 20 && lastState.includes("open")){
                timerTemperatureNotification[sensor.senderId] = setTimeout(
                    notify,
                    notificationDelay,
                    "It's cold, close " + sensor.sensor.title + " in room 125",
                    sensor
                );
            }
            else
                // Rule 3
                if(sensor.values[0].value < 20){
                    timerTemperatureNotification[sensor.senderId] = setTimeout(
                        notify,
                        notificationDelay,
                        "Windows are closed, but it's still too cold, turn on the heater in room 125",
                        sensor
                    );
                }
                else {
                    // Default, only print notification to server screen
                    console.log("Temperature is fine, " + sensor.values[0].value);
                }
        }
    }
};

/*  Store the value/state of sensors to make the last value/state of a sensor available for other ruls
 */
var handleLastState = (topic, message) => {

    // Check if correct subtopic is included
    if(topic.includes("window")){

        // Translate MQTT message in JSON to Javascript object
        var sensor = JSON.parse(message);

        // Validate, that all required sensor information are present
	if(validSensor(sensor)){
                // Store value/state for this sensor by sensorId
		lastState[sensor.senderId] = sensor.values[0].value;
	}
        // Debug, print all states
	console.log("Last States", lastState);
    }
}


/* ----------------- Register handlers --------------------------------------------------- */

// For debug, print all incoming mqtt messages
client.on('message', function (topic, message) {
	console.log(message.toString())
})

// Register rule handlers for incoming MQTT messages

//client.on('message', handleDummy);
client.on('message', handleCloseNotification);
client.on('message', handleTemperature);
client.on('message', handleLastState);

// When connected to MQTT broker,
// subscribe to MQTT topics window, door and temperature of room 125
client.on('connect', function () {
	client.subscribe(['hhz/125/window/+','hhz/125/door/+', 'hhz/125/temperature/+'])
})

