var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');

var events = require('events');
var myEvent = events.EventEmitter;

var pg = require('pg');
var db_connection = "postgres://saurav:saurav@localhost/vehicleTrack";

var db = require('./db.js');

var nodemailer = require('nodemailer');
var smtpTransport = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'elanor2050@gmail.com',
		pass: '###'
	}
});


var session = require('express-session');
var crypto = require('crypto');
var bodyparser = require('body-parser');
var validator = require('express-validator');
var multer = require('multer');
var urlencodedparser = bodyparser.urlencoded({extended: false});

var sessionMiddleware = session({
	secret: 'hello',
	cookie: {}
});
io.use(function(socket, next){
	sessionMiddleware(socket.request, socket.request.res, next);
});
app.use(sessionMiddleware);
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
});
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
	if(req.session.userpin){
		res.sendFile('/templates/userLogin/newpassword.html', {root: __dirname});
	}else{
		res.redirect('/userpin');
	}
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

		db.select('SELECT * FROM company_detail WHERE username=$1',[username], function(err, result){
			if(err){

			}else{
				if(result.length==0){
					console.log("Inside insert block");
					db.insert('INSERT INTO company_detail(username, email, password) VALUES ($1, $2, $3)',[username,email,password]);
						
					res.redirect('/');
						
				}
				else{
					var error =  ['Username already exist. Choose different username.'];
					(function sendError(){
						
						io.on('connection', function(socket){
							socket.emit('signup_error', error);
							error = [];
						});
						
					}());
					res.redirect('/signup');
				}
			}
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
		var rememberme = req.body.rememberme;
		var password = crypto.createHmac("sha256", "verySuperSecretKey").update(req.body.password).digest('hex');

		db.select('SELECT * FROM company_detail WHERE username=$1',[username], function(err,result){
			if(err){

			}else{
				if(result.length!=0){
					db.select('SELECT password,name,logo FROM company_detail where username=$1',[username], function (err, result){
						if(err){

						}else{
							if(result[0].password == password){
								req.session.user=username;
								req.session.company=result[0].name;
								req.session.logo = result[0].logo;
								res.redirect('/vehicle');

							}else{
								var error =  ["Password doesn't match."];
								(function sendError(){
									
									io.on('connection', function(socket){
										socket.emit('login_error', error);
										error = [];
									});
								}());
								res.redirect('/');
							}
						}
					});
					
				}
				else{
					var error =  ["Username doesn't exist. Enter username again."];
					(function sendError(){
						io.on('connection', function(socket){
							socket.emit('login_error', error);
							error = [];
						});
						
					}());
					res.redirect('/');
				}
			}
		});
	}

});

app.post('/editprofile',  multer({ dest: 'static/images/company_logo'}).single('logo'), function (req, res){
	req.assert('email', "Enter the valid email").isEmail();
	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			io.on('connection', function(socket){
				socket.emit('edit_profile_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/editprofile');
		
	}else{
		var name = req.body.name;
		var username = req.body.username;
		var email = req.body.email;
		var logo = req.file;
		if(logo!=undefined){
			logo = logo.destination.substring(7)+'/'+req.file.filename;
		}

		db.select('SELECT name,username,email,logo FROM company_detail WHERE username=$1',[req.session.user], function (err, result){
			if(err){

			}else{
				if(!name){
					name = result[0].name;
				}
				if(!username){
					username = result[0].username;
				}
				if(!email){
					email = result[0].email;
				}
				if(logo==undefined){
					logo = result[0].logo;
				}
				db.select('SELECT username FROM company_detail WHERE username=$1',[username], function (err, result){
					if(err){

					}else{
						if(result.length==0){
							db.update('UPDATE company_detail SET name=$1, username=$2, email=$3, logo=$4 WHERE username=$5',[name,username,email,logo,req.session.user]);
							req.session.user='';
							res.redirect('/');
							
						}else{
							if(result[0].username==req.session.user){
								db.update('UPDATE company_detail SET name=$1, username=$2, email=$3, logo=$4 WHERE username=$5',[name,username,email,logo,req.session.user]);
								req.session.user='';
								res.redirect('/');
								
							}else{
								var error =  ["Username already exists. Choose different username."];
								(function sendError(){
									
									io.on('connection', function(socket){
										socket.emit('edit_profile_error', error);
										error = [];
									});
									
								}());
								res.redirect('/editprofile');
							}
						}
					}
				});
			}
		});
	}
	
});
app.post('/recover-account', urlencodedparser, function (req, res){
	req.assert('username', "Please enter the username in the blank field.").notEmpty();

	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			io.on('connection', function(socket){
				socket.emit('recover_account_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/recover-account');
	}else{
		var username = req.body.username;


		db.select('SELECT id,email FROM company_detail WHERE username=$1',[username], function (err, result){
			if(err){

			}else{
				if(result.length!=0){
					var company_id = result[0].id;
					var company_email = result[0].email
					var pin = (Math.floor(Math.random()*1000000000)).toString().substring(0,6)
					// console.log(company_id);
					// console.log(company_email);
					// console.log(pin);
					var subject = "Account Recovery";
					var message = "<h1>Pin Number</h1><br/><p>Dear Sir,<br/>You had requested for the \
					account recovery.Here is the pin number, you should enter to recover account. \
					</p><br/><b>Pin Number:</b>"+pin;
					// var message = "<html><body><div class='row'><div class='col-sm-6'>Hello man what's up</div><div class='col-sm-6'>This is about me man.</div></div><script src='http://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js'></script></body></html>"
					db.insert('INSERT INTO user_pin(company_id, pin) VALUES ($1, $2)',[company_id, pin]);
					sendMail(company_email, subject, message);
				 	res.redirect('/userpin');
				}else{
					console.log("user doesnot exists");
					var error =  ["Username doesn't exist. Enter username again."];
					(function sendError(){
						
						io.on('connection', function(socket){
							socket.emit('recover_account_error', error);
							error = [];
						});
						
					}());
					res.redirect('/recover-account');
				}
			}
		});
	}
});

app.post('/userpin', urlencodedparser, function (req, res) {
	req.assert('username', "Username field can't be empty").notEmpty();
	req.assert('pinnumber', "Pin Number field can't be empty").notEmpty();

	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			io.on('connection', function(socket){
				socket.emit('user_pin_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/userpin');
		
	}else{
		var username = req.body.username;
		var pin = req.body.pinnumber;

		db.select('SELECT id FROM company_detail WHERE username=$1',[username], function (err, result){
			if(err){

			}else{
				if(result.length!=0){
					var company_id = result[0].id;
					db.select('SELECT pin FROM user_pin WHERE company_id=$1',[company_id], function (err, result){
						if(err){

						}else{
							var row=0;
							(function loop(){
								if (result[row].pin!= pin){
																			
									if(row==result.length-1){
										console.log(row);
										var error =  ["Pin Number doesn't exist."];
										(function sendError(){
											
											io.on('connection', function(socket){
												socket.emit('user_pin_error', error);
												error = [];
											});
											
										}());
										 res.redirect('/userpin');
									}
									row++;
									if(row < result.length) loop();
								}
								else{
									req.session.userpin = username;
									res.redirect('/newpassword');
								}
							})();	
						}
					});
				}else{
					console.log("user doesnot exists");
					var error =  ["Username doesn't exist. Enter username again."];
					(function sendError(){
						
						io.on('connection', function(socket){
							socket.emit('user_pin_error', error);
							error = [];
						});
						
					}());
					res.redirect('/userpin');
				}
			}
		});
	}
});
app.post('/newpassword', urlencodedparser, function (req, res){
	req.assert('password1', "Password field cannot be empty").notEmpty();
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
				socket.emit('newpassword_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/newpassword');
		
	}else{
		var password = crypto.createHmac("sha256", "verySuperSecretKey").update(req.body.password1).digest('hex');
		var username = req.session.userpin;
		db.insert('UPDATE company_detail SET password=$1 WHERE username=$2',[password,username]);
		req.session.userpin=null;
		res.redirect('/');

	}
});	

			//////////////// post end ///////////////////////
///////////////////////////// user login end //////////////////

////////////////////vehicle addition pages and request/////////////////////////
			/////////// get requests ////////////////////////

app.get('/device', function (req, res){
	if(req.session.user){
		res.sendFile('/templates/vehicleAdd/device_id.html', {root: __dirname});
	}else{
		res.redirect('/');
	}
	
});
app.get('/devicepin', function (req, res){
	if(req.session.user){
		res.sendFile('/templates/vehicleAdd/device_pin.html', {root: __dirname});
	}else{
		res.redirect('/');
	}
	
});
app.get('/newvehicle', function (req, res){
	if(req.session.user && req.session.device_id){
		console.log(req.session.device_id);
		db.select('SELECT category.category FROM category INNER JOIN company_detail '+
			'ON category.company_id=company_detail.id WHERE company_detail.username=$1', [req.session.user], function (err, result){
			if(err){

			}else{
				
				if(result.length!=0){
					var category = [];
					for(var i=0; i<result.length; i++){
						category.push(result[i].category);
					}
					(function sendError(){
						io.on('connection', function(socket){
							socket.emit('category', category);
							category = [];
						});
						
					}());
			 		res.sendFile('/templates/vehicleAdd/new_vehicle.html', {root: __dirname});

				}else{
					res.sendFile('/templates/vehicleAdd/new_vehicle.html', {root: __dirname});
			
				}
			}
		});
		
	}else{
		res.redirect('/devicepin');
	}
	
});
			/////////////////// get end ////////////////////

			////////////////// post requests ///////////////////

app.post('/device', urlencodedparser, function (req, res){
	req.assert('deviceid', "Device Id can't be empty").notEmpty();

	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			io.on('connection', function(socket){
				socket.emit('device_id_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/device');
		
	}else{
		device_id = req.body.deviceid;

		db.select('SELECT id,status FROM device_id WHERE device_id=$1',[device_id], function (err, result){
			if(err){

			}else{
				if(result.length!=0){
					var device_id_status = result[0].status;
					var device_id_id = result[0].id;
					if(device_id_status==false){
						db.select('SELECT id,email FROM company_detail WHERE username=$1',[req.session.user], function (err, result){
							if(err){

							}else{
								var company_id = result[0].id;
								var company_email = result[0].email
								var pin = (Math.floor(Math.random()*1000000000)).toString().substring(0,6)
								// console.log(company_id);
								// console.log(company_email);
								// console.log(pin);
								var subject = "Add New Vehicle";
								var message = "<h1>Pin Number</h1><br/><p>Dear Sir,<br/>You had requested for the \
								addition of New Vehilce.Here is the pin number, you must enter to Add New Vehicle. \
								</p><br/><b>Pin Number: </b>"+pin+"<br/>You must enter this device id too.<br/><b>Device Id: </b>"+device_id_id;
								db.insert('INSERT INTO device_pin(company_id, device_id, pin) VALUES ($1, $2, $3)',[company_id, device_id_id, pin]);
								db.update('UPDATE device_id SET status=$1,company_id=$2 WHERE id=$3',[true, company_id, device_id_id]);
								sendMail(company_email, subject, message);
												 	
							 	res.redirect('/devicepin');

							}
						});	
					}else{
						var error =  ["Device id already taken."];
						(function sendError(){
							
							io.on('connection', function(socket){
								socket.emit('device_id_error', error);
								error = [];
							});
							
						}());
						res.redirect('/device');
						
					}
				}else{
					console.log("Device id does not exists");
						var error =  ["Device id doesnot exist. Enter a valid device id"];
						(function sendError(){
							
							io.on('connection', function(socket){
								socket.emit('device_id_error', error);
								error = [];
							});
							
						}());
						res.redirect('/device');
						
				}
			}
		});

	}
});
app.post('/devicepin', urlencodedparser, function (req, res){
	req.assert('deviceid', "Device Id field cannot be empty").notEmpty();
	req.assert('pinnumber', "Pin Number cannot be empty").notEmpty();
	
	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			io.on('connection', function(socket){
				socket.emit('device_pin_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/devicepin');
		
	}else{
		var device_id = parseInt(req.body.deviceid);
		var pin_number = req.body.pinnumber.trim();

		db.select('SELECT device_pin.pin FROM device_pin INNER JOIN company_detail ON '+
			'device_pin.company_id=company_detail.id WHERE company_detail.username=$1 AND '+
			'device_pin.device_id=$2', [req.session.user, device_id], function (err,result){
			if(err){

			}else{
				if(result.length!=0){
					pin = result[0].pin;
					// console.log(pin);
					// console.log(pin_number);
					if(pin==pin_number){
						req.session.device_id=device_id;

						res.redirect('/newvehicle');
					}else{
						var error =  ["Pin Number incorrect. Enter a correct Pin Number"];
						(function sendError(){
							
							io.on('connection', function(socket){
								socket.emit('device_pin_error', error);
								error = [];
							});
							
						}());
						res.redirect('/devicepin');
					}
				}else{
					var error =  ["Device id doesnot exist. Enter a valid device"];
					(function sendError(){
						
						io.on('connection', function(socket){
							socket.emit('device_pin_error', error);
							error = [];
						});
						
					}());
					res.redirect('/devicepin');
				}
			}
		});
	}
});

app.post('/resendpin', urlencodedparser, function (req, res){
	var device_id = parseInt(req.body.deviceid);

	db.select('SELECT pin FROM device_pin WHERE device_id=$1 ',[device_id], function (err, result){
		if(err){

		}else{
			if(result.length==0){
				db.select('SELECT company_detail.email FROM device_pin INNER JOIN company_detail ON'+
					'device_pin.company_id=company_detail.id WHERE company_detail.username=$1 AND '+
					'device_pin.device_id=$2', [req.session.user, device_id], function (err,result){
					if(err){

					}else{
						if(result.length!=0){
							var company_email = result[0].email;
							var pin = (Math.floor(Math.random()*1000000000)).toString().substring(0,6);
							var subject = "Add New Vehicle";
							var message = "<h1>Pin Number</h1><br/><p>Dear Sir,<br/>You had requested for the \
							addition of New Vehilce.Here is the pin number, you must enter to Add New Vehicle. \
							</p><br/><b>Pin Number: </b>"+pin+"<br/>You must enter this device id too.<br/><b>Device Id: </b>"+device_id;
							db.insert('INSERT INTO device_pin(company_id, device_id, pin) VALUES ($1, $2, $3)', [company_id, device_id, pin]);
							sendMail(company_email, subject, message);
							res.redirect('/devicepin');
						}else{
							var error =  ["Invalid device id."];
							(function sendError(){
								
								io.on('connection', function(socket){
									socket.emit('device_pin_error', error);
									error = [];
								});
								
							}());
							res.redirect('/devicepin');
						}
					}
				});
			}
		}
	});	

});

app.post('/addcategory', urlencodedparser, function (req, res){
	var category = req.body.category;
	if(!category){

	}else{
		db.select('SELECT id FROM company_detail WHERE username=$1',[req.session.user], function (err, result){
			if(err){

			}else{
				var company_id=result[0].id;
				db.select('SELECT category FROM category WHERE category=$1 AND company_id=$2',[category, company_id], function (err, result){
					if(err){

					}else{
						if(result.length==0) {
							db.insert('INSERT INTO category(company_id, category) VALUES ($1, $2)', [company_id, category]);
							res.redirect('/newvehicle');
						}else{
							var error =  ["category already exists."];
							(function sendError(){
								
								io.on('connection', function(socket){
									socket.emit('new_vehicle_error', error);
									error = [];
								});
								
							}());
							res.redirect('/newvehicle');
						}
					}
				});
			}
		});
	}
	
});
app.post('/newvehicle', urlencodedparser, function (req, res){
	req.assert('vehicle', "Vehicle Name field cannot be empty").notEmpty();
	req.assert('category', "Select at least one category").notEmpty();

	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			io.on('connection', function(socket){
				socket.emit('new_vehicle_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/newvehicle');
		
	}else{
		var vehicle = req.body.vehicle;
		var category = req.body.category;
		db.select('SELECT category.id, company_detail.id AS company_id FROM category INNER JOIN company_detail '+
			'ON category.company_id=company_detail.id WHERE company_detail.username=$1 AND '+
			'category.category=$2',[req.session.user,category], function (err,result){
			if(err){

			}else{
				if(result.length!=0){
					var company_id = result[0].company_id;
					var category_id = result[0].id;
					db.insert('INSERT INTO vehicle(device_id,company_id,category_id,name,category_name) VALUES ($1,$2,$3,$4,$5)', [req.session.device_id, company_id,category_id, vehicle, category]);
					req.session.device_id='';
					res.redirect('/vehicle');
				}

			}
		});
	}
});

			///////////////// post ends //////////////////////

///////////////////////////vehicle addition ends/////////////////////////////////////

/////////////////////////////////vehicle data/////////////////////////////////////////
			///////////////////vehicle data get///////////////////////

app.get('/vehicledata', function (req, res){
	if(req.session.user){
		res.sendFile('/templates/vehicle/vehicle_data.html', {root: __dirname});
	}else{
		res.redirect('/'); 
	}
})

app.get('/vehicle', function (req, res){
	if(req.session.user){
		db.select('SELECT vehicle.category_name AS category,array_agg(vehicle.name) AS vehicle '+
					'FROM company_detail INNER JOIN vehicle ON company_detail.id=vehicle.company_id '+ 
					'WHERE company_detail.username=$1 '+
					'GROUP BY vehicle.category_name', [req.session.user], function (err, result){
						if(err){

						}else{
							var company_name = req.session.company;
							var logo = req.session.logo;
							var company_info = {
								'company_name':company_name,
								'logo': logo
							}
							io.on('connection', function(socket){
								socket.emit('company_vehicle_info',company_info);
								socket.emit('vehicle_info',result);
								result.rows=[];
								company_info={};
							});
							res.sendFile('/templates/vehicle/vehicle.html',{root: __dirname});

						}
		});
	}else{
		res.redirect('/');
	}
});

app.get('/app_vehicle', function (req,res){
	var query='SELECT vehicle.category_name AS category,array_agg(vehicle.name) AS vehicle '+
				'FROM company_detail INNER JOIN vehicle ON company_detail.id=vehicle.company_id '+ 
				'WHERE company_detail.username=$1 '+
				'GROUP BY vehicle.category_name';
	var data = ["saurav12345"];
	db.select(query,data, function (err,result){
		if(err){
			console.log("Error in select in app_vehicle");
		}else{
			console.log(result);
			res.send(result);
		}
	});
});

app.get('/app_vehicle/vehicle', function (req,res){
	if(req.query.name){
		data=[{"name":"ktm","detail":"this is ktm detail"},{"name":"lalt","detail":"this is lalt detail"}];
		res.send(data);
	}

});

			//////////////////vehcle data get ends////////////////////
			//////////////////vehicle data post///////////////////////

app.post('/vehicledata', urlencodedparser, function (req, res){
	req.assert('deviceid', "deviceid field cannot be empty").notEmpty();
	req.assert('latitude', "latitude field cannot be empty").notEmpty();
	req.assert('longitude', "longitude field cannot be empty").notEmpty();
	
	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		console.log(error_list);
		
	}else{
		var d = new Date();
		var sdd = d.toISOString();
		var sdt = d.toString();
		var date = sdd.substring(0,10).replace(/-/gi,'');
		var time = sdt.substring(16,24).replace(/:/gi,'');
		console.log(date);
		console.log(time);
		var deviceid = req.body.deviceid;
		var latitude = req.body.latitude;
		var longitude = req.body.longitude;
		var fuel = req.body.fuel;
		if(!fuel){
			fuel=null;
		}
		var speed = req.body.speed;
		if(!speed){
			speed=null;
		}
		
		db.select('SELECT device_id.id FROM device_id INNER JOIN company_detail ON '+
			'device_id.company_id=company_detail.id WHERE company_detail.username=$1 '+
			'AND device_id.device_id=$2', [req.session.user, deviceid], function (err, result){
				if(err){

				}else{
					var device_id = result[0].id;
					db.insert('INSERT INTO vehicle_data(latitude,longitude,date,time,fuel,speed,device_id) '+
								'VALUES ($1,$2,$3,$4,$5,$6,$7)',[latitude,longitude,date,time,fuel,speed,device_id]);
					res.redirect('/vehicledata');
				}
		});
	}
});

			/////////////////vehicle data post ends///////////////////
/////////////////////////////////vehicle data end/////////////////////////////////////

/////////////////////////////////poi data///////////////////////////////////////////////

		///////////////////////poi data get///////////////////////////
app.get('/poi', function (req, res){
	if(req.session.user){

		db.select('SELECT poi.name,poi.detail,poi.latitude,poi.longitude FROM company_detail '+
				'INNER JOIN poi ON company_detail.id=poi.company_id WHERE company_detail.username'+
				'=$1 ORDER BY poi.date DESC',[req.session.user], function (err, result){
					if(err){

					}else{
						var company_name = req.session.company;
						var logo = req.session.logo;
						console.log(company_name+" "+logo);
						var company_info = {
							'company_name':company_name,
							'logo': logo
						}
						res.sendFile('/templates/poi/poi.html',{root: __dirname});		
						io.on('connection', function(socket){
							socket.emit('company_poi_info',company_info);
							socket.emit('poi_map_filter',result);
							console.log(result);
							result=[];
							company_info={};
						});
					}
		});
	}else{
		res.redirect('/');
	}
});

		////////////////////poi data get ends////////////////////////

		//////////////////////poi data post/////////////////////////

		//////////////////poi data post ends//////////////////////////
///////////////////////////////poi data end/////////////////////////////////////////////

/////////////////////////////// socket.io parts ///////////////////////////////

io.on('connection', function (socket){

////////////////////////////////////vehicle/////////////////////////////////////
	/////////////////////vehicle and map//////////////////////////////
	socket.on('vehicle', function (data){
		socket.request.session.vehicle_id='';
		socket.request.session.company_id_vehicle = '';
		socket.request.session.device_id ='';
		var vehicle = data.vehicle.trim();
		console.log("The vehicle Clicked: "+vehicle);
		var username =socket.request.session.user;

		db.select('SELECT company_detail.id AS company_id,vehicle.id AS '+
					'vehicle_id,vehicle.device_id FROM company_detail INNER JOIN vehicle ON '+
					'company_detail.id=vehicle.company_id WHERE company_detail.username=$1 '+
					'AND vehicle.name=$2', [username,vehicle], function (err, result){
						if(err){

						}else{
							console.log(result);
							socket.request.session.vehicle_id= result[0].vehicle_id;
							socket.request.session.company_id_vehicle = result[0].company_id;
							socket.request.session.device_id = result[0].device_id;
							console.log(socket.request.session.vehicle_id);  
						}
		});
	});
	
	socket.on('vehicle_map', function(data){
		if(!socket.request.session.vehicle_id){
			var username = socket.request.session.user;
			console.log("vehicle_map without session");

			db.select('SELECT vehicle.name AS vehicle,vehicle.device_id '+
						'AS device_id FROM company_detail INNER JOIN vehicle ON '+
						'company_detail.id=vehicle.company_id  WHERE '+
						'company_detail.username=$1', [username], function (err, result){
							if(err){

							}else{
								var vehicleList=[];
								console.log(result);
								for(var row=0;row<result.length;row++){
									vehicleList.push(result[row]);
								}
								console.log(vehicleList);
								var vehicle_data=[];
								var vehicle_count=0;
								(function getVehicleLocation(){
									if(vehicleList[vehicle_count]){
										db.select('SELECT latitude,longitude FROM vehicle_data WHERE device_id=$1 ORDER BY date DESC,time DESC LIMIT 1',
										 [vehicleList[vehicle_count].device_id], function (err, result){
										 	if(err){

										 	}else{
										 		if(result.length!=0){
													var vehicle_location = result[0];
													vehicle_location.vehicle = vehicleList[vehicle_count].vehicle;
													vehicle_data.push(vehicle_location);
													vehicle_count++;
													getVehicleLocation();
												}else{
													vehicle_count++;
													getVehicleLocation();
												}
										 	}
										 });
										
									}else{
										console.log(vehicle_data);
										socket.emit('vehicle_map_first',vehicle_data);
									}										
								})();
							}
			});
		}else{
			var vehicle_id=socket.request.session.vehicle_id;
			var company_id=socket.request.session.company_id_vehicle;
			var device_id=socket.request.session.device_id;
			console.log("vehicle_map with session");
			var d = new Date();
			var sdd = d.toISOString();
			var date = sdd.substring(0,10).replace(/-/gi,'');

			db.select('SELECT latitude, longitude FROM '+
						'vehicle_data WHERE date=$1 and device_id=$2 ORDER By time', 
						[date, device_id], function (err, result){
							if(err){

							}else{
								if(result.length!=0){
									socket.emit('vehicle_map_location', result);
									console.log(result);
								}else{
									socket.emit('vehicle_map_location');
								}
							}
			});
			db.select('SELECT poi_latitude AS latitude, poi_longitude AS longitude,poi_name as poi,'+
				' poi_detail AS detail FROM '+
				'activity WHERE vehicle_id=$1 GROUP BY poi_latitude, poi_longitude,poi_name, poi_detail '+
				'HAVING bool_and(status)=$2', [vehicle_id, false], function (err, result){
					if(err){

					}else{
						console.log(result);
						socket.emit('vehicle_poi_location', result);
					}
				});
		}
	});
	
	////////////////////vehicle and map end///////////////////////////
	//////////////////////vehicle and activity////////////////////////

	socket.on('vehicle_activity', function(data){
		if(!socket.request.session.vehicle_id){

		}else{
			var vehicle_id=socket.request.session.vehicle_id;
			var company_id=socket.request.session.company_id_vehicle;
			var device_id=socket.request.session.device_id;
			console.log("vehicle_activity with session");
			db.select('SELECT poi_name AS poi,date,bool_and(status) AS status '+
						'FROM activity '+
						'WHERE company_id=$1 AND vehicle_id=$2 GROUP BY poi_name,date',
						[company_id,vehicle_id], function (err, result){
							if(err){

							}else{
								socket.emit('vehicle_activity_info',result);
								console.log(result);

							}
			});
		}
	});
	
	socket.on('vehicle_activity_poi', function (data){
		socket.request.session.vehicle_activity_poi_id=''
		var poi = data.poi;
		var vehicle_id=socket.request.session.vehicle_id;
		var company_id=socket.request.session.company_id_vehicle;
		var device_id=socket.request.session.device_id;

		db.select('SELECT substring(date from 1 for 6) AS date,'+
					'count(DISTINCT CONCAT(poi_name,date)) FROM activity WHERE company_id=$1 AND vehicle_id=$2 AND '+
					'poi_name=$3 GROUP BY substring(date from 1 for 6)',
					[company_id,vehicle_id,poi], function (err,result){
						if(err){

						}else{
							socket.emit('vehicle_activity_poi_frequency', result);
							console.log(result);
						}
		});
		db.select('SELECT poi_id,activity,status FROM activity '+
					'WHERE company_id=$1 AND vehicle_id=$2 AND poi_name=$3 ORDER BY status'
					, [company_id,vehicle_id,poi], function (err,result){
						if(err){

						}else{
							var activity=[];
							socket.request.session.vehicle_activity_poi_id=result[0].poi_id;
							for(var i=0;i<result.length;i++){
								delete result[i].poi_id;
								activity.push(result[i]);
							}
							socket.emit('vehicle_activity_poi_activity', activity);
							console.log(activity);
						}
		});				
	});

	socket.on('vehicle_activity_poi_newactivity', function (data){
		if(socket.request.session.vehicle_id && socket.request.session.vehicle_activity_poi_id){
			var vehicle_id=socket.request.session.vehicle_id;
			var company_id=socket.request.session.company_id_vehicle;
			var poi_id = socket.request.session.vehicle_activity_poi_id;
			var activity = data.activity.trim();
			console.log(activity);

			var d = new Date();
			var sdd = d.toISOString();
			var date = sdd.substring(0,10).replace(/-/gi,'');
			db.select('SELECT name,detail,latitude,'+
						'longitude FROM poi WHERE id=$1'
						,[poi_id], function (err, result){
							if(err){

							}else{
								var poi_name=result[0].name;
								var poi_detail = result[0].detail;
								var poi_latitude = result[0].latitude;
								var poi_longitude = result[0].longitude;
								db.insert('INSERT INTO activity '+
									'(company_id,poi_id,vehicle_id,activity,date,poi_name,'+
									'poi_detail,poi_latitude,poi_longitude) '+
									'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)'
									,[company_id,poi_id,vehicle_id,activity,date,poi_name,poi_detail,poi_latitude,poi_longitude]);
							
							}
			});
		}else{

		}
	});

	/////////////////////vehicle and activity end/////////////////////

	////////////////////vehicle and dashboard/////////////////////////
	socket.on('vehicle_dasboard', function (data){
		if(!socket.request.session.vehicle_id){

		}else{
			console.log("vehicle dash_board with session");
			var from_date = data.from_date;
			var to_date = data.to_date;
			var type = data.type;
			var vehicle_id=socket.request.session.vehicle_id;
			var company_id=socket.request.session.company_id_vehicle;
			var device_id=socket.request.session.device_id;
			var vehicle_dashboard_client = new pg.Client(db_connection);
			var d = new Date();
			var sdd = d.toISOString();
			var date = sdd.substring(0,10).replace(/-/gi,'');
			var year = date.substring(0,4);
			var month = date.substring(4,6);
			var day = date.substring(6);
			var previous_month;
			if(month==1){
				year=year-1;
				previous_month=12;
			}else{
				previous_month=month-1;
			}
			if(!from_date){
				from_date=year+previous_month+day;
			}
			if(!to_date){
				to_date=date;
			}
			console.log(from_date);
			console.log(to_date);
			if(type=="speed"){
				db.select('SELECT date,array_agg(time) AS time,'+
							'array_agg(speed) AS speed,array_agg(latitude) AS latitude,'+
							'array_agg(longitude) AS longitude '+
							'FROM vehicle_data WHERE device_id=$1 AND date BETWEEN '+
							'$2 AND $3 GROUP BY date ORDER BY date',
							[device_id,from_date,to_date], function (err,result){
								if(err){

								}else{
									socket.emit('vehicle_dashboard_speed', result);
								}
			});

			}else if(type="fuel"){
				db.select('SELECT date,array_agg(time) AS time,'+
							'array_agg(fuel) AS fuel,array_agg(latitude) AS latitude,'+
							'array_agg(longitude) AS longitude '+
							'FROM vehicle_data WHERE device_id=$1 AND date BETWEEN '+
							'$2 AND $3 GROUP BY date ORDER BY date',
							[device_id], function (err,result){
								if(err){

								}else{
									socket.emit('vehicle_dashboard_fuel', result);	
								}
				});
			}else{
				db.select('SELECT date,array_agg(time) AS time,'+
							'array_agg(speed) AS speed,array_agg(fuel) AS fuel,array_agg(latitude)'+
							' AS latitude,array_agg(longitude) AS longitude '+
							'FROM vehicle_data WHERE device_id=$1 AND date BETWEEN '+
							'$2 AND $3 GROUP BY date ORDER BY date',
							[device_id,from_date,to_date], function (err,result){
								if(err){

								}else{
									socket.emit('vehicle_dashboard', result);
								}
				});
			}		
		}
	});

	///////////////////vehicle and dashboard/////////////////////////

////////////////////////////////vehicle ends/////////////////////////////////////	
	
///////////////////////////////poi///////////////////////////////////////////////
	/////////////////////////poi and map//////////////////////////////
	socket.on('poi_map_filter',function(data){
		var filter = data.filter;
		var username = socket.request.session.user;
		if(filter=='A-Z'){
			db.select('SELECT poi.name,poi.detail,poi.latitude,poi.longitude FROM poi INNER JOIN '+
						'company_detail ON poi.company_id=company_detail.id WHERE company_detail.'+
						'username=$1 ORDER BY poi.name', [username], function (err, result){
							if(err){

							}else{
								if(result.length!=0){
									socket.emit('poi_map_filter',result);
								}
							}
			});
		}else if(filter=='Z-A'){
			db.select('SELECT poi.name,poi.detail,poi.latitude,poi.longitude FROM poi INNER JOIN '+
						'company_detail ON poi.company_id=company_detail.id WHERE company_detail.'+
						'username=$1 ORDER BY poi.name DESC', [username], function (err, result){
							if(err){

							}else{
								if(result.length!=0){
									socket.emit('poi_map_filter',result);
								}
							}
			});
		}else if(filter=='Most Visited'){
			db.select('SELECT activity.poi_name AS name, activity.poi_detail AS detail,'+
						'activity.poi_latitude AS latitude,activity.poi_longitude AS longitude '+
						'FROM activity INNER JOIN company_detail ON activity.company_id='+
						'company_detail.id WHERE company_detail.username=$1 GROUP BY activity.poi_name,'+
						'activity.poi_detail,activity.poi_latitude,activity.poi_longitude'+
						' ORDER BY COUNT(DISTINCT CONCAT(activity.vehicle_id,activity.date)) DESC',
						[username], function (err, result){
							if(err){

							}else{
								if(result.length!=0){
									socket.emit('poi_map_filter',result);
								}
							}
			});
		}else{
			db.select('SELECT poi.name,poi.detail,poi.latitude,poi.longitude '+
					 	'FROM poi INNER JOIN '+
						'company_detail ON poi.company_id=company_detail.id WHERE company_detail.'+
						'username=$1 ORDER BY date DESC', [username], function (err, result){
							if(err){

							}else{
								if(result.length!=0){
									socket.emit('poi_map_filter',result);
									console.log('poi_map_filter invoked');
								}
							}
			});
		}	
	});
	socket.on('poi', function (data){
		socket.request.session.poi_id_map='';
		socket.request.session.poi_name = ''
		var poi = data.poi;
		console.log(poi);
		var username = socket.request.session.user;
		db.select('SELECT poi.id'+
					' FROM poi INNER JOIN company_detail ON poi.company_id'+
					'=company_detail.id WHERE company_detail.username=$1 AND poi.name=$2',
					[username,poi], function (err, result){
						if(err){

						}else{
							socket.request.session.poi_id_map=result[0].id;
							socket.request.session.poi_name = poi;
							console.log(result)
						}
		});
	});
	socket.on('poi_map_detail', function (data){
		var poi_id = socket.request.session.poi_id_map;
		var username = socket.request.session.user;
		if(!poi_id){
			db.select('SELECT poi.name,poi.detail,poi.latitude,poi.longitude FROM poi '+
					'INNER JOIN company_detail ON poi.company_id=company_detail.id WHERE company_detail.username'+
					'=$1 ORDER BY poi.date DESC',[username], function (err, result){
						if(err){

						}else{
							socket.emit('poi_map_filter',result);	
							console.log(result);
						}
			});
		}else{
			db.select('SELECT poi.name,poi.detail,poi.latitude,poi.longitude '+
						'FROM poi WHERE poi.id=$1', [poi_id], function (err, result){
							if(err){

							}else{
								console.log(result);
								socket.emit('poi_map_detail',result);
							}
			});
		}
		
	});

	socket.on('poi_map_add', function (data){
		var poi_name = data.poi_name;
		console.log(poi_name);
		var poi_detail = data.poi_detail;
		var latitude = data.latitude;
		var longitude = data.longitude;
		var username = socket.request.session.user;
		var d = new Date();
		var sdd = d.toISOString();
		var date = sdd.substring(0,10).replace(/-/gi,'');

		if(poi_name && poi_detail){
			db.select('SELECT id FROM company_detail WHERE username=$1', [username], function (err, result){
				if(err){

				}else{
					var company_id = result[0].id;
					db.insert('INSERT INTO poi(name,detail,latitude,longitude,company_id,date) VALUES ($1,$2,$3,$4,$5,$6)',
						[poi_name,poi_detail,latitude,longitude,company_id,date]);
					console.log("poi addition success");
					socket.emit('poi_reload');
				}
			});
		}else{
			console.log("Enter the poi and detail field");
		}
	});
	///////////////////////poi and map ends////////////////////////////

	/////////////////////poi and activity///////////////////////////
	
	socket.on('poi_activity_detail', function (data){
		var poi_id = socket.request.session.poi_id_map;
		var username = socket.request.session.user;
		db.select('SELECT date,COUNT(activity) FROM activity WHERE '+
				'poi_id=$1 GROUP BY date',[poi_id], function (err, result){
					if(err){

					}else{
						socket.emit('poi_activity_detail', result);
					}
		});
		db.select('SELECT vehicle.name FROM vehicle INNER JOIN company_detail ON '+
			'vehicle.company_id=company_detail.id WHERE company_detail.username=$1',
			[username], function (err, result){
				if(err){
					
				}else{
					socket.emit('vehicle_list', result);
				}
		});
	});
	
	socket.on('poi_activity_detail_activity', function (data){
		socket.request.session.poi_activity_date='';
		var date = data.date;
		console.log(date);
		var username = socket.request.session.user;
		var poi_id = socket.request.session.poi_id_map;

		db.select('SELECT activity.activity,activity.status,'+
					'vehicle.name AS vehicle FROM activity LEFT OUTER JOIN vehicle ON activity.vehicle_id=vehicle.id '+
					'WHERE activity.date=$1 AND activity.poi_id=$2 ORDER BY status',
					[date,poi_id], function (err,result){
						if(err){

						}else{
							socket.request.session.poi_activity_date=date;
							console.log(result);
							socket.emit('poi_name', socket.request.session.poi_name);
							socket.emit('poi_activity_list',result);
						}
		});
	});

	socket.on('poi_activity_detail_filter', function (data){
		var filter = data.filter.trim();
		console.log(filter);
		var username = socket.request.session.user;
		var poi_id = socket.request.session.poi_id_map;
		var date = socket.request.session.poi_activity_date;

		if(filter=='Not Assigned'){
			db.select('SELECT activity,status FROM activity '+
					'WHERE date=$1 AND poi_id=$2 AND vehicle_id IS NULL',
					[date,poi_id], function (err,result){
						if(err){

						}else{
							socket.emit('poi_activity_list',result);
						}
			});
		}else if(filter=='All'){
			db.select('SELECT activity.activity,activity.status,'+
					'vehicle.name AS vehicle FROM activity LEFT OUTER JOIN vehicle ON activity.vehicle_id=vehicle.id '+
					'WHERE activity.date=$1 AND activity.poi_id=$2 ORDER BY activity.status',
					[date,poi_id], function (err,result){
						if(err){

						}else{
							socket.emit('poi_activity_list',result);
						}
			});
		}else{
			db.select('SELECT activity.activity,activity.status,'+
					'vehicle.name AS vehicle FROM activity INNER JOIN vehicle ON activity.vehicle_id=vehicle.id '+
					'WHERE activity.date=$1 AND activity.poi_id=$2 AND vehicle.name=$3 ORDER BY status',
					[date,poi_id,filter], function (err,result){
						if(err){

						}else{
							socket.emit('poi_activity_list',result);
						}
			});
		}
	});

	socket.on('assign_activity_vehicle', function (data){
		var activity = data.activity;
		var vehicle = data.vehicle.trim();
		if(vehicle!='Vehicle'){
			var username = socket.request.session.user;
			var poi_id = socket.request.session.poi_id_map;
			var date = socket.request.session.poi_activity_date;
			db.select('SELECT vehicle.id FROM company_detail '+
						'INNER JOIN vehicle ON company_detail.id=vehicle.company_id WHERE '+
						'company_detail.username=$1 AND vehicle.name=$2', 
						[username,vehicle], function (err, result){
							if(err){

							}else{
								var vehicle_id=result[0].id;
								db.update('UPDATE activity SET vehicle_id=$1 '+
								'WHERE poi_id=$2 AND date=$3 AND activity=$4',
								[vehicle_id,poi_id,date,activity]);
								socket.emit('reload_vehiclelist', {});
							}
			});
		}
	});
	
	socket.on('add_activity', function (data){
		if(socket.request.session.poi_id_map && socket.request.session.poi_activity_date){
			var activity = data.activity;
			if(activity){
				var username = socket.request.session.user;
				var poi_id = socket.request.session.poi_id_map;
				var date = socket.request.session.poi_activity_date;
				db.select('SELECT name,detail,latitude,longitude,company_id '+
							'FROM poi WHERE id=$1', [poi_id], function (err, result){
								if(err){

								}else{
									var poi_name = result[0].name;
									var poi_detail = result[0].detail;
									var poi_latitude = result[0].latitude;
									var poi_longitude = result[0].longitude;
									var company_id = result[0].company_id;
									db.insert('INSERT INTO activity(company_id,poi_id,'+
										'activity,date,poi_name,poi_detail,poi_latitude,poi_longitude) '+
										'VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
										[company_id,poi_id,activity,date,poi_name,poi_detail,
										poi_latitude,poi_longitude]);
									socket.emit('reload_vehiclelist', {});
								}
				});
			}else{
				console.log('activity empty');
			}
			
		}
	});
	/////////////////////poi and activity ends///////////////////////
///////////////////////////poi ends///////////////////////////////////////////////

	socket.on('disconnect', function(){
		socket.request.session.vehicle_id='';
		socket.request.session.company_id_vehicle = '';
		socket.request.session.device_id ='';
		socket.request.session.vehicle_activity_poi_id='';
		socket.request.session.poi_id_map='';
		socket.request.session.poi_activity_date='';
		socket.request.session.poi_name = ''
	});
});

////////////////////////////// socket.io end ///////////////////////////////////

http.listen(3030, function(){
	console.log('listening on *: ' + 3030);
});



//////////////////// Functions below this line //////////////////////////////////

setInterval(pinExpiry, 120000);
function pinExpiry(){
	db.delet("DELETE FROM user_pin WHERE timestamp<NOW()-INTERVAL '1 hour'");
	db.delet("DELETE FROM device_pin WHERE timestamp<NOW()-INTERVAL '1 hour'");
}

function sendMail(email, subjects, htmls){
	var mailOptions = {
	    from: 'Maulik Taranga<sender@mail.com>',
	    to: email,
	    subject: subjects,
	    html: htmls
	};
	smtpTransport.sendMail(mailOptions, function(err) {
  		console.log('Message sent!');
	});
}

// sendMail('+9779841559663@vtext.com', 'Hello', "what's up man?");
//sendMail('sp.gharti@gmail.com', 'Hello', "what's up man?");


////////////////////////////////Testing Here///////////////////////////////

// var pin_expiry_client = new pg.Client(db_connection);
// pin_expiry_client.connect(function (err){
// 	if(err){
// 		console.log('Could not connect to postgres on pin expiry', err);
// 	}
// 	console.log("pin expiry db connection successful");
// 	pin_expiry_client.query('SELECT date,array_agg(time) AS time,array_agg(speed) AS speed, '+
// 		'array_agg(latitude) AS latitude,array_agg(longitude) AS longitude '+
// 		'FROM vehicle_data WHERE device_id=$1 GROUP BY date ORDER BY date', [3],function (err,result){
// 		if(err){
// 			console.log('error running select date  on user_pin expiry', err);
// 			pin_expiry_client.end();
// 		}
// 		else{
// 			console.log(result.rows);
// 		}
// 	});
// });
