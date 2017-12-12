// # A Button for node-enocean
// created By Holger Will (h.will@klimapartner.de)
// created for [Klimapartner GmbH](http://klimapartner.de/) 
// this code is published under GPL v3.0
// use this function as a constructor for a new Button Object.
// it implements the EEP f6-02-03
// app should be an node-enocean Object,
// and id should be a number between 0 and 255.
module.exports      = function ( app , id ) { 
	// the header for single Byte telegrams is allways the same for all EEPs
	this.head       = "55000707017a" 
	// the address or senderId is the base address of the used sending device plus the id passed to this function
	this.address    = ( parseInt( app.base , 16 ) + parseInt( id ) ).toString( 16 ) 
	// this.DataByte is a little helper function to create the telegram strings for all button states
	this.DataByte   = function ( Byte0 ) {
		// f6 means this is an RPS telegram Byte0 is the state of the button we like to send, 
		// this. address is the senderId 
		// 3001 is fixed for all RPS telegrams, ffffffff is the receiver address. all ff means this is a broudcast telegram.
		// ff00 is signal strength and repeater count. both are fixed to ff and 00 for the send case.
		var tmp     = "f6" + Byte0 + this.address + "3001ffffffffff00"
		// calculating the checksum of the message body 
		tmp        += app.crc( new Buffer( tmp , "hex" ) ).toString(16)
		// return the complete message as a string
		return  this.head + tmp
	}
	// compute the codes for all possible events
	// channel B
	this.B0upCode   = this.DataByte("00") // Button B0 is released
	this.B0downCode = this.DataByte("70") // Button B0 is pressed
	this.B1upCode   = this.DataByte("00") // Button B1 is released
	this.B1downCode = this.DataByte("50") // Button B1 is pressed
	// channel A
	this.A0upCode   = this.DataByte("00") // Button A0 is released
	this.A0downCode = this.DataByte("30") // Button A0 is pressed
	this.A1upCode   = this.DataByte("00") // Button A1 is released
	this.A1downCode = this.DataByte("10") // Button A1 is pressed
	// interface for invoking the Button events
	this.B0 = {
		click : function () {
			// for a click event call down() and the up()
			this.B0.down()            
			this.B0.up()
		}.bind( this ),
		down  : function () {
			// app.send expects a string representation of the enocean telegram we want to send.
			// we have already prepared these string, we just need to send them.
			// here we send the code indication a press event for Button 0 of channel B
			// if our address is aabbccdd then the telegram would look like this: 55000707017af670aabbccdd3001ffffffffff0096
			app.send(this.B0downCode) // sending the prepared string for this event
		}.bind(this),
		up    : function () {
			// respectivly this is the release event of button 0 of channel B. for the EEP (f6-02-03) used here, the release telegram is the same for all 4 buttons.
			// if you receive this code you can not tell which button was released.
			app.send(this.B0upCode)   // sending the prepared string for this event
		}.bind(this)
	}
	//  do the same for the rest of the buttons...
	this.B1 = {
		click : function () {
			this.B1.down()
			this.B1.up()
		}.bind(this),
		down  : function () {
			app.send(this.B1downCode)
		}.bind(this),
		up    : function (){
			app.send(this.B1upCode)
		}.bind(this)
	}

	this.A0 = {
		click : function () {
			this.A0.down()
			this.A0.up()
		}.bind(this),
		down  : function () {
			app.send(this.A0downCode)
		}.bind(this),
		up    : function () {
			app.send(this.A0upCode)
		}.bind(this)
	}

	this.A1 = {
		click : function () {
			this.A1.down()
			this.A1.up()
		}.bind(this),
		down  : function () {
			app.send(this.A1downCode)
		}.bind(this),
		up    : function () {
			app.send(this.A1upCode)
		}.bind(this)
	}
}