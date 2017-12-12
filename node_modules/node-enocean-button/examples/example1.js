// # Example of using the button
// created By Holger Will (h.will@klimapartner.de)
// created for [Klimapartner GmbH](http://klimapartner.de/) 
// this code is published under GPL v3.0
// call this with a commandline parameter. use:
// "example1.js on" to send a click event on button A1
// "example1.js off" to send a click event on button A0
var enocean = require("node-enocean");           // require node-enocean
var Button = require("../");                     // require the Button impl.

// open the serialport in this case it's an USB Stick. the enocean pi is "/dev/ttyAMA0" and on Windows you would need something like "COM1" 
enocean.listen("/dev/ttyUSB0");                  
enocean.on("ready",function(base){               // when ready
	var button = new Button(enocean,1)       // create a new Button an give it the address 1
	if(process.argv[2] == "on"){
		// if you pass the word "on" via the command line, invoke the click Event
		// this can be use to teach in the button
		button.A1.click()                // if you pass the word "on" via the command line, invoke the click Event on A1
	}else{
		button.A0.click()	         // if you pass the word "off" via the command line, invoke the click Event on A1
	}
	enocean.close()				 // stop listening to the serial port and return
});
