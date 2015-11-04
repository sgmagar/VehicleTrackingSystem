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
var multer = require('multer');
var urlencodedparser = bodyparser.urlencoded({extended: false});

var sessn = {
	secret: 'hello',
	cookie: {}
}

app.use(session(sessn));

app.use(express.static(path.join(__dirname, 'static')));
app.use(validator());


//////////User login pages...and request ////////////////////////////////////////

				//////////////get request////////////////////

app.get('/',function (req,res){
	res.sendFile('/templates/userLogin/login.html', {root: __dirname});	
});
app.get('/logout', function (req, res){
	req.session.user=null;
	res.redirect('/');
})
app.get('/signup', function (req, res){
	res.sendFile('/templates/userLogin/signup.html', {root: __dirname});
});
app.get('/editprofile', function (req, res){
	if(req.session.user){
		res.sendFile('/templates/userLogin/profile_edit.html', {root: __dirname});
	}else{
		res.redirect('/');
	}
	
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

			////////////////////// get end //////////////////////////

			/////////////////////post request /////////////////////////

app.post('/signup', urlencodedparser, function (req, res){
	req.assert('username', "Username can't be empty").notEmpty();
	req.assert('password1', "Password can't be empty").notEmpty();
	req.assert('email', "Email can't be empty").notEmpty();
	req.assert('email', "Enter a valid email").isEmail();
	req.assert('password1', "Password length must be 8 to 20").len(8,20);
	req.assert('password2', "Password don't match").equals(req.body.password1);

	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			io.on('connection', function(socket){
				socket.emit('signup_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/signup');
		
	}else {
		var username = req.body.username;
		var email = req.body.email;
		var password = crypto.createHmac("sha256", "verySuperSecretKey").update(req.body.password1).digest('hex');

		var signup_client = new pg.Client(db_connection);
		signup_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on signup', err);
			}
			console.log("signup db connection successful");
			signup_client.query('SELECT * FROM company_detail WHERE username=$1',[username], function (err, result){
				if(err){
					console.log('error running SELECT user_check query', err);
					signup_client.end();


				}
				else{
					console.log('user_check SELECT query success');
					//console.log(result.rows.length);
					if(result.rows.length==0){
						console.log("Inside insert block");
						signup_client.query('INSERT INTO company_detail(username, email, password) VALUES ($1, $2, $3)',[username,email,password], function (err){
							if(err){
								console.log('error running INSERT user_add query', err);
							}
							else{
								console.log("user_add INSERT query success");
								res.redirect('/');
							}
							signup_client.end();
						});
					}
					else{
						(function sendError(){
							error =  ['Username already exist. Choose different username.'];
							io.on('connection', function(socket){
								socket.emit('signup_error', error);
								error = [];
							});
						}());
						res.redirect('/signup');
						signup_client.end();
					}
				}
				
				
			});
		});

	}
});
app.post('/login', urlencodedparser, function (req, res){
	req.assert('username', "Username can't be empty").notEmpty();
	req.assert('password', "Password can't be empty").notEmpty();

	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			io.on('connection', function(socket){
				socket.emit('login_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/');
		
	}else {
		var username = req.body.username;
		var password = crypto.createHmac("sha256", "verySuperSecretKey").update(req.body.password).digest('hex');

		var login_client = new pg.Client(db_connection);
		login_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on login', err);
			}
			console.log("login db connection successful");
			login_client.query('SELECT * FROM company_detail WHERE username=$1',[username], function (err, result){
				if(err){
					console.log('error running SELECT user_check query', err);
					signup_client.end();


				}
				else{
					console.log('user_check SELECT query success');
					//console.log(result.rows.length);
					if(result.rows.length!=0){
						console.log("Username exists");
						login_client.query('SELECT password FROM company_detail where username=$1',[username], function (err, result){
							if(err){
								console.log('error running INSERT user_add query', err);
							}
							else{
								// console.log(result.rows[0].password);
								// console.log(password);
								if(result.rows[0].password == password){
									req.session.user=username;
									res.send("Login Success");

								}else{
									(function sendError(){
										error =  ["Password doesn't match."];
										io.on('connection', function(socket){
											socket.emit('login_error', error);
											error = [];
										});
									}());
									res.redirect('/');
								}

								
							}
							login_client.end();
						});
					}
					else{
						(function sendError(){
							error =  ["Username doesn't exist. Enter username again."];
							io.on('connection', function(socket){
								socket.emit('login_error', error);
								error = [];
							});
						}());
						res.redirect('/');
						login_client.end();
					}
				}
				
				
			});
		});

	}

});
app.post('/editprofile',  multer({ dest: 'static/images/company_logo'}).single('logo'), function (req, res){
	//console.log(req.body);
	name = req.body.name;
	username = req.body.username;
	email = req.body.email;
	logo = req.file;//.destination.substring(7)+'/'+req.file.filename
	//console.log(logo);
	res.redirect('/editprofile');
	
});
app.post('/newpassword', urlencodedparser, function (req, res){
	
});	
			//////////////// post end ///////////////////////
///////////////////////////// user login end //////////////////

////////////////////vehicle addition pages and request/////////////////////////
			/////////// get requests ////////////////////////

app.get('/device', function (req, res){
	res.sendFile('/templates/vehicleAdd/device_id.html', {root: __dirname});
});
app.get('/devicepin', function (req, res){
	res.sendFile('/templates/vehicleAdd/device_pin.html', {root: __dirname});
});
app.get('/newvehicle', function (req, res){
	res.sendFile('/templates/vehicleAdd/new_vehicle.html', {root: __dirname});
});
			/////////////////// get end ////////////////////

/////////////////////////////// socket.io parts ///////////////////////////////

io.on('connection', function (socket){

});

////////////////////////////// socket.io end ///////////////////////////////////

http.listen(3030, function(){
	console.log('listening on *: ' + 3030);
});



//////////////////// Functions below this line //////////////////////////////////

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


