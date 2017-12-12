# node-enocean-button
this button is meant to be used with [node-enocean](https://github.com/Holger-Will/node-enocean) 
it implements the f6-02-03 eep
## installation
`npm install node-enocean-button`
## usage
```
var enocean = require("node-enocean"); 
var Button = require("../")
enocean.listen("/dev/ttyUSB0")                 
enocean.on("ready",function(base){ 
	var button = new Button(enocean,1) 
	if(process.argv[2] == "on"){
		button.A1.click() 
	}else{
		button.A0.click()	
	}
	enocean.close()	
});
```
the following buttons are available:

* `.A0`
* `.A1`
* `.B0`
* `.B1`

the following methods can be used to invoke an event.

* `.down()`
* `.up()`
* `.click()`

you can check the generated telegrams with:

* `.B0upCode`
* `.B0downCode`
* `.B1upCode`
* `.B1downCode` 
* `.A0upCode`
* `.A0downCode` 
* `.A1upCode`
* `.A1downCode`

the actual address can be retrieved with

`.address`

see the example for more info.
