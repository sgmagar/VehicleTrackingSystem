var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');

var pg = require('pg');
var db_connection = "postgres://saurav:saurav@localhost/vehicleTrack";

var nodemailer = require('nodemailer');
var smtpTransport = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'elanor2050@gmail.com',
		pass: ''
	}
});

var session = require('express-session');
var crypto = require('crypto');
var bodyparser = require('body-parser');
var validator = require('express-validator');
var urlencodedparser = bodyparser.urlencoded({extended: false});

var sessn = {
	secret: 'hello',
	cookie: {}
}

app.use(session(sessn));

app.use(express.static(path.join(__dirname, 'public')));
app.use(validator());


//User login pages...and request

app.get('/',function(req,res){
	res.sendFile('/templates/userLogin/login.html', {root: __dirname});	
});
app.get('/signup', function(req, res){
	res.sendFile('/templates/userLogin/signup.html', {root: __dirname});
});
app.get('/signup-success', function (req, res){
	res.sendFile('/templates/userLogin/signup_success.html', {root: __dirname});
});
app.get('/addprofile', function (req, res){
	res.sendFile('/templates/userLogin/profile_add.html', {root: __dirname});
});
app.get('/recover-account', function (req, res){
	res.sendFile('/templates/userLogin/recover_account.html', {root: __dirname});
});
app.get('/userpin', function (req, res){
	res.sendFile('/templates/userLogin/user_pin.html', {root: __dirname});
});
app.get('/newpassword', function (req, res){
	res.sendFile('/templates/userLogin/newpassword.html', {root: __dirname});
});

//vehicle addition pages and request

app.get('/device', function (req, res){
	res.sendFile('/templates/vehicleAdd/device_id.html', {root: __dirname});
});
app.get('/devicepin', function (req, res){
	res.sendFile('/templates/vehicleAdd/device_pin.html', {root: __dirname});
});
app.get('/newvehicle', function (req, res){
	res.sendFile('/templates/vehicleAdd/new_vehicle.html', {root: __dirname});
});


http.listen(3030, function(){
	console.log('listening on *: ' + 3030);
});

//Functions below this line

function sendMail(email, subjects, texts){
	var mailOptions = {
	    from: 'Maulik Taranga<sender@mail.com>',
	    to: email,
	    subject: subjects,
	    text: texts
	};
	smtpTransport.sendMail(mailOptions, function(err) {
  		console.log('Message sent!');
	});
}

// sendMail('+9779841559663@vtext.com', 'Hello', "what's up man?");
//sendMail('sp.gharti@gmail.com', 'Hello', "what's up man?");


