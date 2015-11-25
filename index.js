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
		pass: 'thelongestride'
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
								
							}
							res.redirect('/');
							signup_client.end();
						});
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
		var rememberme = req.body.rememberme;
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
					login_client.end();


				}
				else{
					console.log('user_check SELECT query success');
					//console.log(result.rows.length);
					if(result.rows.length!=0){
						console.log("Username exists");
						login_client.query('SELECT password,name,logo FROM company_detail where username=$1',[username], function (err, result){
							if(err){
								console.log('error running INSERT user_add query', err);
							}
							else{
								// console.log(result.rows[0].password);
								// console.log(password);
								if(result.rows[0].password == password){
									req.session.user=username;
									req.session.company=result.rows[0].name;
									req.session.logo = result.rows[0].logo;
									res.redirect('/editprofile');

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
							login_client.end();
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
						login_client.end();
					}
				}
				
				
			});
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
		var editprofile_client = new pg.Client(db_connection);
		editprofile_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on editprofile', err);
			}
			console.log("editprofile db connection successful");
			editprofile_client.query('SELECT name,username,email,logo FROM company_detail WHERE username=$1',[req.session.user], function (err, result){
				if(err){
					console.log('error running SELECT query on company_detail in editprofile', err);
					editprofile_client.end();
				}
				else{
					if(!name){
						name = result.rows[0].name;
					}
					if(!username){
						username = result.rows[0].username;
					}
					if(!email){
						email = result.rows[0].email;
					}
					if(logo==undefined){
						logo = result.rows[0].logo;
					}
					editprofile_client.query('SELECT username FROM company_detail WHERE username=$1',[username], function (err, result){
						if(err){
							console.log('error running SELECT query to check username on company_detail in editprofile', err);
							editprofile_client.end();
						}else{
							if(result.rows.length==0){
								editprofile_client.query('UPDATE company_detail SET name=$1, username=$2, email=$3, logo=$4 WHERE username=$5',[name,username,email,logo,req.session.user],function (err){
									if(err){
										console.log('error running update query when username not exist on company_detail in editprofile', err);
										editprofile_client.end();
									}else{
										res.redirect('/');
										req.session.user='';
										editprofile_client.end();
									}
								});
							}else{
								if(result.rows[0].username==req.session.user){
									editprofile_client.query('UPDATE company_detail SET name=$1, username=$2, email=$3, logo=$4 WHERE username=$5',[name,username,email,logo,req.session.user],function (err){
									if(err){
										console.log('error running update query when username not changed on company_detail in editprofile', err);
										editprofile_client.end();
									}else{
										res.redirect('/');
										req.session.user='';
										editprofile_client.end();
									}
								});
								}else{
									var error =  ["Username already exists. Choose different username."];
									(function sendError(){
										
										io.on('connection', function(socket){
											socket.emit('edit_profile_error', error);
											error = [];
										});
										
									}());
									res.redirect('/editprofile');
									editprofile_client.end();
								}
							}
						}
					});
					
					
					
					
				}
				
				
			});
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

		var recover_account_client = new pg.Client(db_connection);
		recover_account_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on account recovery', err);
			}
			console.log("recover account db connection successful");
			recover_account_client.query('SELECT id,email FROM company_detail WHERE username=$1',[username], function (err, result){
				if(err){
					console.log('error running SELECT get user id email in recover account', err);
					recover_account_client.end();


				}
				else{
					console.log('get user id email in recover account SELECT query success');
					//console.log(result.rows.length);
					if(result.rows.length!=0){

						var company_id = result.rows[0].id;
						var company_email = result.rows[0].email
						var pin = (Math.floor(Math.random()*1000000000)).toString().substring(0,6)
						// console.log(company_id);
						// console.log(company_email);
						// console.log(pin);
						var subject = "Account Recovery";
						var message = "<h1>Pin Number</h1><br/><p>Dear Sir,<br/>You had requested for the \
						account recovery.Here is the pin number, you should enter to recover account. \
						</p><br/><b>Pin Number:</b>"+pin;
						

						
						recover_account_client.query('INSERT INTO user_pin(company_id, pin) VALUES ($1, $2)',[company_id, pin], function (err){
							if(err){
						 		console.log('error running INSERT user_pin add query', err);
						 	}
						 	else{
								sendMail(company_email, subject, message);
							 	
							 	res.redirect('/userpin');
							}
							recover_account_client.end();
						
						});
					}
					else{
						console.log("user doesnot exists");
						var error =  ["Username doesn't exist. Enter username again."];
						(function sendError(){
							
							io.on('connection', function(socket){
								socket.emit('recover_account_error', error);
								error = [];
							});
							
						}());
						res.redirect('/recover-account');
						recover_account_client.end();
					}
				}
				
				
			});
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

		var user_pin_client = new pg.Client(db_connection);
		user_pin_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on user pin', err);
			}
			console.log("user pin db connection successful");
			user_pin_client.query('SELECT id FROM company_detail WHERE username=$1',[username], function (err, result){
				if(err){
					console.log('error running SELECT get user id in user pin', err);
					user_pin_client.end();


				}
				else{
					console.log('get user id in user pin SELECT query success');
					//console.log(result.rows.length);
					if(result.rows.length!=0){

						var company_id = result.rows[0].id;
						
						user_pin_client.query('SELECT pin FROM user_pin WHERE company_id=$1',[company_id], function (err, result){
							if(err){
						 		console.log('error running SELECT get pin in  user_pin query', err);
						 	}
						 	else{
								//console.log(result);
								var row=0;
								(function loop(){
									if (result.rows[row].pin!= pin){
																				
										if(row==result.rowCount-1){
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
										if(row < result.rowCount) loop();
									}
									else{
										req.session.userpin = username;
										res.redirect('/newpassword');
									}
								})();	
							 	
							}
							user_pin_client.end();
						
						});
					}
					else{
						console.log("user doesnot exists");
						var error =  ["Username doesn't exist. Enter username again."];
						(function sendError(){
							
							io.on('connection', function(socket){
								socket.emit('user_pin_error', error);
								error = [];
							});
							
						}());
						res.redirect('/userpin');
						user_pin_client.end();
					}
				}
				
				
			});
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
		var newpassword_client = new pg.Client(db_connection);
		newpassword_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on newpassword', err);
			}
			console.log("newpassword db connection successful");
			newpassword_client.query('UPDATE company_detail SET password=$1 WHERE username=$2',[password,username], function (err){
				if(err){
					console.log('error running UPDATE query on company_detail password', err);
					newpassword_client.end();
				}
				else{
					req.session.userpin=null;
					res.redirect('/');
					newpassword_client.end();
					
				}
				
				
			});
		});

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
		var get_category_client = new pg.Client(db_connection);
		get_category_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on get category new vehicle', err);
				res.sendFile('/templates/vehicleAdd/new_vehicle.html', {root: __dirname});
			}else{
				get_category_client.query('SELECT id FROM company_detail WHERE username=$1', [req.session.user], function (err, result){
					if(err){
						console.log('SELECT user id in newvehicle error', err);
						get_category_client.end();
					}else{
						company_id= result.rows[0].id;
						get_category_client.query('SELECT category FROM category WHERE company_id=$1', [company_id], function (err, result){
							if(err){
								console.log('SELECT category in new vehicle error', err);
								get_category_client.end();
							}else{
								if(result.rows.length!=0){
									var category = [];
									for(var i=0; i<result.rows.length; i++){
										category.push(result.rows[i].category);
									}
									(function sendError(){
										io.on('connection', function(socket){
											socket.emit('category', category);
											category = [];
										});
										
									}());
							 		res.sendFile('/templates/vehicleAdd/new_vehicle.html', {root: __dirname});
							 		get_category_client.end();

								}else{
									res.sendFile('/templates/vehicleAdd/new_vehicle.html', {root: __dirname});
							 		get_category_client.end();
								}
							}
						});
					}
				});
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

		var device_id_client = new pg.Client(db_connection);
		device_id_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on device id', err);
			}
			console.log("device id db connection successful");
			device_id_client.query('SELECT id,status FROM device_id WHERE device_id=$1',[device_id], function (err, result){
				if(err){
					console.log('error running SELECT status  in device id', err);
					device_id_client.end();
				}
				else{
					console.log('get status in device id SELECT query success');
					//console.log(result.rows.length);
					if(result.rows.length!=0){

						var device_id_status = result.rows[0].status;
						var device_id_id = result.rows[0].id;
						console.log(device_id_status);
						console.log(device_id_id);
					if(device_id_status==false){
						device_id_client.query('SELECT id,email FROM company_detail WHERE username=$1',[req.session.user], function (err, result){
								if(err){
									console.log('error running SELECT get user id email in device id', err);
									device_id_client.end();


								}
								else{
									console.log('get user id email in recover account SELECT query success');
									//console.log(result.rows.length);
									var company_id = result.rows[0].id;
									var company_email = result.rows[0].email
									var pin = (Math.floor(Math.random()*1000000000)).toString().substring(0,6)
									// console.log(company_id);
									// console.log(company_email);
									// console.log(pin);
									var subject = "Add New Vehicle";
									var message = "<h1>Pin Number</h1><br/><p>Dear Sir,<br/>You had requested for the \
									addition of New Vehilce.Here is the pin number, you must enter to Add New Vehicle. \
									</p><br/><b>Pin Number: </b>"+pin+"<br/>You must enter this device id too.<br/><b>Device Id: </b>"+device_id_id;
									

									
									device_id_client.query('INSERT INTO device_pin(company_id, device_id, pin) VALUES ($1, $2, $3)',[company_id, device_id_id, pin], function (err){
										if(err){
									 		console.log('error running INSERT device_pin add query', err);
									 		device_id_client.end();
									 	}
									 	else{
									 		device_id_client.query('UPDATE device_id SET status=$1,company_id=$2 WHERE id=$3',[true, company_id, device_id_id], function (err){
												if(err){
											 		console.log('error update status in  device_id query', err);
											 		device_id_client.end();
											 	}
											 	else{
											 		
													sendMail(company_email, subject, message);
												 	
												 	res.redirect('/devicepin');
												}
												device_id_client.end();
											
											});
										}
									
									});
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
							device_id_client.end();
						}
					}else{
						console.log("vehicle id does not exists");
						var error =  ["Device id doesnot exist. Enter a valid device id"];
						(function sendError(){
							
							io.on('connection', function(socket){
								socket.emit('device_id_error', error);
								error = [];
							});
							
						}());
						res.redirect('/device');
						device_id_client.end();
					}
				}
				
				
			});
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
		
		var device_pin_client = new pg.Client(db_connection);
		device_pin_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on device pin', err);
			}
			console.log("device pin db connection successful");
			device_pin_client.query('SELECT id FROM company_detail WHERE username=$1',[req.session.user], function (err, result){
				if(err){
					console.log('error running SELECT get user id in device pin', err);
					device_pin_client.end();
				}
				else{
					console.log('get user id in device pin SELECT query success');
					//console.log(result.rows.length);
					if(result.rows.length!=0){

						var company_id = result.rows[0].id;
						
						device_pin_client.query('SELECT pin FROM device_pin WHERE company_id=$1 AND device_id=$2',[company_id,device_id], function (err, result){
							if(err){
						 		console.log('error running SELECT get pin in  device_pin query', err);
								var error =  ["Enter a valid device id."];
								(function sendError(){
									
									io.on('connection', function(socket){
										socket.emit('device_pin_error', error);
										error = [];
									});
									
								}());
								res.redirect('/devicepin');
						 		device_pin_client.end();
						 	}
						 	else{
								if(result.rows.length!=0){
									pin = result.rows[0].pin;
									// console.log(pin);
									// console.log(pin_number);
									if(pin==pin_number){
										req.session.device_id=device_id;

										res.redirect('/newvehicle');
										device_pin_client.end();
									}else{
										var error =  ["Pin Number incorrect. Enter a correct Pin Number"];
										(function sendError(){
											
											io.on('connection', function(socket){
												socket.emit('device_pin_error', error);
												error = [];
											});
											
										}());
										res.redirect('/devicepin');
										device_pin_client.end();
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
									device_pin_client.end();
								}
							}			
									
						});

					}
					else{
						device_pin_client.end();
					}
				}
				
				
			});
		});
		
	}
});

app.post('/resendpin', urlencodedparser, function (req, res){
	device_id = parseInt(req.body.deviceid);

	var device_id_client = new pg.Client(db_connection);
		device_id_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on resend device pin', err);
			}
			console.log("device pin resend db connection successful");
			device_id_client.query('SELECT pin FROM device_pin WHERE device_id=$1 ',[device_id], function (err, result){
				if(err){
					console.log('error running SELECT status  in device id', err);
					var error =  ["Enter a valid device id."];
					(function sendError(){
						
						io.on('connection', function(socket){
							socket.emit('device_pin_error', error);
							error = [];
						});
						
					}());
					res.redirect('/devicepin');
					device_id_client.end();
				}else{

					if(result.rows.length==0){
						device_id_client.query('SELECT id, email FROM company_detail WHERE username=$1', [req.session.user], function (err, result){
							if(err){
								console.log('device pin resend SELECT user id error', err);
								res.redirect('/devicepin');
								device_id_client.end();
							}else{
								if(result.rows.length!=0){
									company_id = result.rows[0].id;
									company_email = result.rows[0].email;

									device_id_client.query('SELECT device_id FROM device_id WHERE id=$1 AND company_id=$2', [device_id, company_id], function (err, result){
											if(err){
												console.log('SELECT device_id on resend pin error', err);
												device_id_client.end();
											}else{
												if(result.rows.length!=0){
													var pin = (Math.floor(Math.random()*1000000000)).toString().substring(0,6);
													var subject = "Add New Vehicle";
													var message = "<h1>Pin Number</h1><br/><p>Dear Sir,<br/>You had requested for the \
													addition of New Vehilce.Here is the pin number, you must enter to Add New Vehicle. \
													</p><br/><b>Pin Number: </b>"+pin+"<br/>You must enter this device id too.<br/><b>Device Id: </b>"+device_id;
																	
							
														device_id_client.query('INSERT INTO device_pin(company_id, device_id, pin) VALUES ($1, $2, $3)', [company_id, device_id, pin], function (err){
															if(err){
																console.log('device pin resend INSERT error', err);
																res.redirect('/devicepin');
																device_id_client.end();
															}else{
																sendMail(company_email, subject, message);
																res.redirect('/devicepin');
																device_id_client.end();
															}
														});
												}else{
													var error =  ["Invalid device id."];
													(function sendError(){
														
														io.on('connection', function(socket){
															socket.emit('device_pin_error', error);
															error = [];
														});
														
													}());
													res.redirect('/devicepin');
													device_id_client.end();
												}
											}
										});

								}else{
									res.redirect('/devicepin');
									device_id_client.end();
								}

							}
						});
					}else{
						var error =  ["Device pin already exists."];
						(function sendError(){
							
							io.on('connection', function(socket){
								socket.emit('device_pin_error', error);
								error = [];
							});
							
						}());
						res.redirect('/devicepin');
						device_id_client.end();
					}

				}

			});
	});

});

app.post('/addcategory', urlencodedparser, function (req, res){
	var error=0;
	var category = req.body.category;
	console.log(category);
	if(!category){
		error=1;
	}
	if(!error){
		var add_category_client = new pg.Client(db_connection);
		add_category_client.connect(function (err){
				if(err){
					console.log('Could not connect to postgres on add category', err);
				}
				console.log("Connection successful to add category");
				add_category_client.query('SELECT id FROM company_detail WHERE username=$1',[req.session.user], function (err, result){
					if(err){
						console.log("add category SELECT user id error", err);
						add_category_client.end();
					}else{
						if(result.rows.length!=0){
							company_id = result.rows[0].id;
							add_category_client.query('SELECT category FROM category WHERE category=$1 AND company_id=$2',[category, company_id], function (err, result){
								if(err){
									console.log("add category SELECT category error", err);
									add_category_client.end();
								}else{
									if(result.rows.length==0) {
										add_category_client.query('INSERT INTO category(company_id, category) VALUES ($1, $2)', [company_id, category], function (err){
											if(err){
												console.log('add category INSERT error', err);
												add_category_client.end();
											}else{
												res.redirect('/newvehicle');
												add_category_client.end();
											}
										});
									}else{
										var error =  ["category already exists."];
										(function sendError(){
											
											io.on('connection', function(socket){
												socket.emit('new_vehicle_error', error);
												error = [];
											});
											
										}());
										res.redirect('/newvehicle');
										add_category_client.end();
									}
								}
							});

						}else{
							res.redirect('/newvehicle');
							add_category_client.end();
						}
					}
				});
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
		var new_vehicle_client = new pg.Client(db_connection);
		new_vehicle_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on new vehicle', err);
			}
			console.log("Connection successful on new vehicle");
			new_vehicle_client.query('SELECT id FROM company_detail WHERE username=$1', [req.session.user], function (err, result){
				if(err){
					console.log('error SELECT user id in new vehicle', err);
					new_vehicle_client.end();
				}else{
					if (result.rows.length!=0){
						var company_id = result.rows[0].id;
						new_vehicle_client.query('SELECT id FROM category WHERE company_id=$1 AND category=$2', [company_id, category], function (err, result){
							if(err){
								console.log('error SELECT id from category in new vehicle', err);
								new_vehicle_client.end();
							}else{
								if(result.rows.length!=0){
									var category_id = result.rows[0].id;
									new_vehicle_client.query('INSERT INTO vehicle(device_id,company_id,category_id,name,category_name) VALUES ($1,$2,$3,$4,$5)', [req.session.device_id, company_id,category_id, vehicle, category], function (err){
										if(err){
											console.log('INSERT vehicle error in new vehicle', err);
											(function sendError(){
												io.on('connection', function(socket){
													socket.emit('new_vehicle_error', error_list);
													error_list = [];
												});
											}());
											res.redirect('/newvehicle');
											new_vehicle_client.end();
										}else{
											req.session.device_id='';
											res.redirect('/editprofile');
										}
									});

								}else{
									res.redirect('/newvehicle');
									new_vehicle_client.end();
								}
							}
						})
					}else{
						res.redirect('/newvehicle');
						new_vehicle_client.end();
					}
				}
			});
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
		var get_vehicle_client = new pg.Client(db_connection);
		get_vehicle_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on get vehicle', err);
				res.sendFile('/templates/vehicle/vehicle.html', {root: __dirname});
			}else{
				get_vehicle_client.query('SELECT vehicle.category_name AS category,array_agg(vehicle.name) AS vehicle '+
					'FROM company_detail INNER JOIN vehicle ON company_detail.id=vehicle.company_id '+ 
					'WHERE company_detail.username=$1 '+
					'GROUP BY vehicle.category_name', [req.session.user], function (err, result){
					if(err){
						console.log('SELECT user id on vehicle error',err);
						get_vehicle_client.end();
					}else{
						console.log(result.rows);
						console.log(typeof(result.rows[0]));
						var company_name = req.session.company
						var logo = req.session.logo
						var company_info = {
							'company_name':company_name,
							'logo': logo
						}
						io.on('connection', function(socket){
							socket.emit('company_vehicle_info',company_info);
							socket.emit('vehicle_info',result.rows);
							result.rows=[];
							company_info={};
						});
						res.sendFile('/templates/vehicle/vehicle.html',{root: __dirname});
						get_vehicle_client.end();
					}
				});

			}
		
		});
	}else{
		res.redirect('/');
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
		

		var vehicle_data_client = new pg.Client(db_connection);
		vehicle_data_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on vehicle data', err);
			}
			console.log("Connection successful to postgres on vehicle data");
			vehicle_data_client.query('SELECT id FROM company_detail WHERE username=$1',[req.session.user], function (err, result){
				if(err){
					console.log('SELECT user id in vehicle data error', err);
				}else{
					if(result.rows.length!=0){
						var company_id = result.rows[0].id;
						vehicle_data_client.query('SELECT id from device_id WHERE device_id=$1 AND company_id=$2',[deviceid, company_id], function (err, result){
							if(err){
								console.log('error SELECT device_id on vehicle data', err);
							}else{
								if(result.rows.length!=0){
									var device_id = result.rows[0].id;
									vehicle_data_client.query('INSERT INTO vehicle_data(latitude,longitude,date,time,fuel,speed,device_id)\
										 VALUES ($1,$2,$3,$4,$5,$6,$7)',[latitude,longitude,date,time,fuel,speed,device_id], function (err){
										 	if(err){
										 		console.log('error INSERT in vehicle data',err);
										 	}else{
										 		res.redirect('/vehicledata');
										 		vehicle_data_client.end();

										 	}
										 });
								}else{
									res.redirect('/vehicledata');
									vehicle_data_client.end();
								}
							}
						});
					}else{
						
						vehicle_data_client.end();
					}
				}
			});

		});

	}

});

			/////////////////vehicle data post ends///////////////////
/////////////////////////////////vehicle data end/////////////////////////////////////

/////////////////////////////////poi data///////////////////////////////////////////////

		///////////////////////poi data get///////////////////////////
app.get('/poi', function (req, res){
	if(req.session.user){
		var get_poi_client = new pg.Client(db_connection);
		get_poi_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on get poi', err);
				res.sendFile('/templates/poi/poi.html', {root: __dirname});
			}
			console.log("Connection successful to postgres on get poi");
			get_poi_client.query('SELECT poi.name,poi.detail FROM company_detail '+
				'INNER JOIN poi ON company_detail.id=poi.company_id WHERE company_detail.username'+
				'=$1 ORDER BY poi.date DESC;',[req.session.user], function (err, result){
				if(err){
					console.log('Select poi name detail error in get poi ');
					res.sendFile('/templates/poi/poi.html', {root: __dirname});
					get_poi_client.end();
				}else{
					console.log(result.rows)
					var company_name = req.session.company
					var logo = req.session.logo
					var company_info = {
						'company_name':company_name,
						'logo': logo
					}

					io.on('connection', function(socket){
						socket.emit('company_poi_info',company_info);
						socket.emit('poi_info',result.rows);
						result.rows=[];
						company_info={};
					});
					res.sendFile('/templates/poi/poi.html',{root: __dirname});
					get_poi_client.end();
					
				}
			});
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
		var vehicle = data.vehicle;
		var username =socket.request.session.user;
		var vehicle_client = new pg.Client(db_connection);
		vehicle_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on vehicle', err);
			}else{
				vehicle_client.query(' SELECT company_detail.id AS company_id,vehicle.id AS '+
					'vehicle_id,vehicle.device_id FROM company_detail INNER JOIN vehicle ON '+
					'company_detail.id=vehicle.company_id WHERE company_detail.username=$1 '+
					'AND vehicle.name=$2', [username,vehicle], function (err, result){
					if(err){
						console.log('Select company_id, vehicle_id,device_id error in  vehicle', err);
						vehicle_client.end();
					}else{
						console.log(result.rows);
						socket.request.session.vehicle_id= result.rows[0].vehicle_id;
						socket.request.session.company_id_vehicle = result.rows[0].company_id;
						socket.request.session.device_id = device_id;    
						vehicle_client.end();
					}
				});
			}
		});

	});
	
	socket.on('vehicle_map', function(data){
		if(!socket.request.session.vehicle_id){
			var username = socket.request.session.user;
			var device_id_client = new pg.Client(db_connection);
			device_id_client.connect(function (err){
				if(err){
					console.log('Could not connect on postgres on vehicle_map', err);
				}else{
					device_id_client.query(' SELECT vehicle.name AS vehicle,vehicle.device_id '+
						'AS device_id FROM company_detail INNER JOIN vehicle ON '+
						'company_detail.id=vehicle.company_id  WHERE '+
						'company_detail.username=$1', [username], function (err, result){
						if(err){
							console.log('Select user id error in vehicle_map', err);
							device_id_client.end();
						}else{
							var vehicle=[];
							for( row in result.rows.length){
								vehicle.push(result.rows[row]);
							}
							var vehicle_data=[];
							var vehicle_count=0;
							(function getVehicleLocation(){
								if(vehicle[vehicle_count]){
									device_id_client.query('SELECT latitude,longitude FROM vehicle_data WHERE device_id=$1 ORDER BY date DESC,time DESC LIMIT 1', [vehicle[vehicle_count].device_id], function (err, result){
										if(err){
											console.log('Select lat lon error in vehicle map', err);
										}else{
											if(result.rows.length!=0){
												var vehicle_location = result.rows[0];
												vehicle_location.vehicle = vehicle[vehicle_count].name;
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
									socket.emit('vehicle_map_first',vehicle_data);
								}										
							})();
						}
					});
				}
			});
		}else{
			var vehicle_id=socket.request.session.vehicle_id;
			var company_id=socket.request.session.company_id_vehicle;
			var device_id=socket.request.session.device_id;

			var d = new Date();
			var sdd = d.toISOString();
			var date = sdd.substring(0,10).replace(/-/gi,'');

			var vehicle_map_location_client = new pg.Client(db_connection);
			var vehicle_map_poi_client = new pg.Client(db_connection);
			
			vehicle_map_location_client.connect(function (err){
				if(err){
					console.log('Could not connect to postgres by location on vehicle_map', err);
				}else{
					vehicle_map_location_client.query('SELECT latitude, longitude FROM '+
						'vehicle_data WHERE date=$1 and device_id=$2 ORDER By time', 
						[date, device_id], function (err, result){
						if(err){
							console.log('Select lat, lon error in vehicle map location', err);
							vehicle_map_location_client.end();
						}else{	
							if(result.rows.length!=0){
								var location = [];
								for(row in result.rows.length){
									location.push(result.rows[row]);
								}
								socket.emit('vehicle_map_location', location);
								vehicle_map_location_client.end();
							}else{	
								vehicle_map_location_client.end();
							}
						}
					});
				}
			});

			vehicle_map_poi_client.connect(function (err){
				if(err){
					console.log('Could not connect to postgres by poi on vehicle_map',err);
				}else{
					vehicle_map_poi_client.query('SELECT poi_name,poi_detail,date,'+
						'poi_latitude,poi_longitude FROM activity WHERE company_id=$1 AND vehicle_id=$2 '+
						'GROUP BY poi_name,poi_detail,date,poi_latitude,poi_longitude HAVING '+
						'bool_and(status)=$3',
						 [company_id,vehicle_id, null], function (err,result){
						if(err){
							console.log('Select poi details errror from task in vehicle_map_poi error', err);
						}else{
							socket.emit('vehicle_map_poi', result.rows);
							vehicle_map_poi_client.end();
						}
					});
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

			var vehicle_activity_client = new pg.Client(db_connection);
			vehicle_activity_client.connect(function (err){
				if(err){
					console.log('Could not connect to postgres on vehicle_activity', err);
				}else{
					vehicle_activity_client.query('SELECT poi_name,date,bool_and(status) AS status '+
						'FROM activity '+
						'WHERE company_id=$1 AND vehicle_id=$2 GROUP BY poi_name,date',
						[company_id,vehicle_id], function (err, result){
						if(err){
							console.log('SELECT poi_name date status in vehicle activity error', err);
							vehicle_activity_client.end();
						}else{
							socket.emit('vehicle_activity_info',result.rows)

						}
					});
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

		var vehicle_activity_poi_client_freq = new pg.Client(db_connection);
		var vehicle_activity_poi_client_activ = new pg.Client(db_connection);

		vehicle_activity_poi_client_freq.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on vehicle_activity_poi_client_freq', err);
			}else{
				vehicle_activity_poi_client_freq.query('SELECT substring(date from 1 for 6) AS date,'+
					'count(DISTINCT CONCAT(poi_name,date)) FROM activity WHERE company_id=$1 AND vehicle_id=$2 AND '+
					'poi_name=$3 GROUP BY substring(date from 1 for 6)',
					[company_id,vehicle_id,poi], function (err,result){
					if(err){
						console.log('Select date and count error in vehicle_activity_poi',err);
						vehicle_activity_poi_client_freq.end();
					}else{
						socket.emit('vehicle_activity_poi_frequency', result.rows);
						vehicle_activity_poi_client_freq.end();
						
					}
				});
			}
		});

		vehicle_activity_poi_client_activ.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on vehicle_activity_poi_client_activ', err);
			}else{
				vehicle_activity_poi_client_activ.query('SELECT poi_id,activity,status FROM activity '+
					'WHERE company_id=$1 AND vehicle_id=$2 AND poi_name=$3 ORDER BY status'
					, [company_id,vehicle_id,poi], function (err,result){
					if (err) {
						console.log('Select activity and status error in vehicle activity poi');
						vehicle_activity_poi_client_activ.end();
					}else{
						socket.request.session.vehicle_activity_poi_id=result.rows[0].poi_id;
						var activity=[];
						for(row in result.rows.length){
							delete result.rows[row].poi_id;
							activity.push(result.rows[row]);
						}
						socket.emit('vehicle_activity_poi_activity', activity);
						vehicle_activity_poi_client_activ.end();									

					}
				});
			}
		});
				
	});

	socket.on('vehicle_activity_poi_newactivity', function (data){
		if(socket.request.session.vehicle_id && socket.request.session.vehicle_activity_poi_id){
			var vehicle_id=socket.request.session.vehicle_id;
			var company_id=socket.request.session.company_id_vehicle;
			var poi_id = socket.request.session.vehicle_activity_poi_id;
			var activity = data.activity;
			var vehicle_activity_newactivity_client = new pg.Client(db_connection);
			var d = new Date();
			var sdd = d.toISOString();
			var date = sdd.substring(0,10).replace(/-/gi,'');
			vehicle_activity_newactivity_client.connect(function (err){
				if(err){
					console.log('Could not connect to postgres on vehicle_activity_newactivity', err);
				}else{
					vehicle_activity_newactivity_client.query('SELECT name,detail,latitude,'+
						'longitude FROM poi WHERE id=$1'
						,[poi_id], function (err, result){
							if(err){
								console.log('Select info from poi error', err);
							}else{
								var poi_name=result.rows[0].name;
								var poi_detail = result.rows[0].detail;
								var poi_latitude = result.rows[0].latitude;
								var poi_longitude = result.rows[0].longitude;
								vehicle_activity_newactivity_client.query('INSERT INTO activity '+
									'(company_id,poi_id,vehicle_id,activity,date,poi_name,'+
									'poi_detail,poi_latitude,poi_longitude) '+
									'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)'
									,[company_id,poi_id,vehicle_id,activity,date,poi_name,poi_detail,poi_latitude,poi_longitude]
									, function (err){
									if(err){
										console.log('Insert into activity new activity error', err);
									}else{
										vehicle_activity_newactivity_client.end();
									}
								});
							}
					});
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

			vehicle_dashboard_client.query.connect(function (err){
				if(err){
					console.log("Could not connect to postgres on vehicle_dashboard", err);
				}else{
					if(type="speed"){
						vehicle_dashboard_client.query('SELECT date,array_agg(time) AS time,'+
							'array_agg(speed) AS speed,array_agg(latitude) AS latitude,'+
							'array_agg(longitude) AS longitude '+
							'FROM vehicle_data WHERE device_id=$1 AND date BETWEEN '+
							'from_date AND to_date GROUP BY date ORDER BY date',
							[device_id], function (err,result){

							if(err){
								console.log('Select speed detail error in vehicle_dashboard',err);
							}else{
								socket.emit('vehicle_dashboard_speed', result.rows);
								vehicle_dashboard_client.end();
							}
						});
					}else if(type="fuel"){
						vehicle_dashboard_client.query('SELECT date,array_agg(time) AS time,'+
							'array_agg(fuel) AS fuel,array_agg(latitude) AS latitude,'+
							'array_agg(longitude) AS longitude '+
							'FROM vehicle_data WHERE device_id=$1 AND date BETWEEN '+
							'from_date AND to_date GROUP BY date ORDER BY date',
							[device_id], function (err,result){

							if(err){
								console.log('Select fuel detail error in vehicle_dashboard',err);
							}else{
								socket.emit('vehicle_dashboard_fuel', result.rows);
								vehicle_dashboard_client.end();
							}
						});
					}else{
						vehicle_dashboard_client.query('SELECT date,array_agg(time) AS time,'+
							'array_agg(speed) AS speed,array_agg(fuel) AS fuel,array_agg(latitude)'+
							' AS latitude,array_agg(longitude) AS longitude '+
							'FROM vehicle_data WHERE device_id=$1 AND date BETWEEN '+
							'from_date AND to_date GROUP BY date ORDER BY date',
							[device_id], function (err,result){

							if(err){
								console.log('Select speed detail error in vehicle_dashboard',err);
							}else{
								socket.emit('vehicle_dashboard', result.rows);
								vehicle_dashboard_client.end();
							}
						});
					}
					
				}
			});

		}
	});

	///////////////////vehicle and dashboard/////////////////////////

////////////////////////////////vehicle ends/////////////////////////////////////	
	
///////////////////////////////poi///////////////////////////////////////////////
	/////////////////////////poi and map//////////////////////////////
	socket.on('poi_map_filter',function(data){
		var filter = data.filter;
		var username = socket.request.session.user;
		var poi_map_filter_client = new pg.Client(db_connection);
		poi_map_filter_client.connect(function(err){
			if(err){
				console.log('Could connect to postgres on poi map filter');
			}else{
				
				if(!filter){
					
				}
				else if(filter=='A-Z'){
					poi_map_filter_client.query('SELECT poi.name,poi.detail FROM poi INNER JOIN '+
						'company_detail ON poi.company_id=company_detail.id WHERE company_detail.'+
						'username=$1 ORDER BY poi.name', [username], function (err, result){
						if(err){
							console.log('Select name detail error in poi map filter A-Z', err);
						}else{
							if(result.rows.length!=0){
								socket.emit('poi_map_filter',result.rows);
								poi_map_filter_client.end();
							}else{
								poi_map_filter_client.end();
							}
						}
					});
				}else if(filter=='Z-A'){
					poi_map_filter_client.query('SELECT poi.name,poi.detail FROM poi INNER JOIN '+
						'company_detail ON poi.company_id=company_detail.id WHERE company_detail.'+
						'username=$1 ORDER BY poi.name DESC', [username], function (err, result){
						if(err){
							console.log('Select name detail error in poi map filter Z-A', err);
						}else{
							if(result.rows.length!=0){
								socket.emit('poi_map_filter',result.rows);
								poi_map_filter_client.end();
							}else{
								poi_map_filter_client.end();
							}
						}
					});
				}else if(filter=='Most Visited'){
					poi_map_filter_client.query('SELECT activity.poi_name AS name, activity.poi_detail AS detail '+
						'FROM activity INNER JOIN company_detail ON activity.company_id='+
						'company_detail.id WHERE company_detail.username=$1 GROUP BY activity.poi_name,'+
						'activity.poi_detail ORDER BY COUNT(DISTINCT CONCAT(activity.vehicle_id,activity.date))',
						[username], function (err, result){
						if(err){
							console.log('Select name detail error in poi map filter Most Visited', err);
						}else{
							if(result.rows.length!=0){
								socket.emit('poi_map_filter',result.rows);
								poi_map_filter_client.end();
							}else{
								poi_map_filter_client.end();
							}
						}
					});
				}else{
					poi_map_filter_client.query('SELECT poi.name,poi.detail FROM poi INNER JOIN '+
						'company_detail ON poi.company_id=company_detail.id WHERE company_detail.'+
						'username=$1 ORDER BY date DESC', [username], function (err, result){
						if(err){
							console.log('Select name detail error in poi map filter Z-A', err);
						}else{
							if(result.rows.length!=0){
								socket.emit('poi_map_filter',result.rows);
								poi_map_filter_client.end();
							}else{
								poi_map_filter_client.end();
							}
						}
					});
				}
			
				
			}
		});
	});

	socket.on('poi_map_detail', function (data){
		socket.request.session.poi_id_map='';
		var poi = data.poi;
		var username = socket.request.session.user;
		var poi_map_detail_client = new pg.Client(db_connection);
		poi_map_detail_client.connect(function(err){
			if(err){
				console.log('Could connect to postgres on poi map detail');
			}else{
				poi_map_detail_client.query('SELECT poi.id,poi.name,poi.detail,poi.latitude,'+
					'poi.longitude FROM poi INNER JOIN company_detail ON poi.company_id'+
					'=company_detail.id WHERE company_detail.username=$1 AND poi.name=$2', [username,poi], function (err, result){
					if(err){
						console.log('SELECT poi info error in poi map detail', err);
						poi_map_detail_client.end();
					}else{
						socket.request.session.poi_id_map=result.rows[0].id;
						delete result.rows[0].id;
						socket.emit('poi_map_detail',result.rows);
						poi_map_detail_client.end();	
					}
				});
			}
		});
	});

	socket.on('poi_map_add', function (data){
		var poi_name = data.poi_name;
		var poi_detail = data.poi_detail;
		var latitude = data.latitude;
		var longitude = data.longitude;
		var username = socket.request.session.user;
		var d = new Date();
		var sdd = d.toISOString();
		var date = sdd.substring(0,10).replace(/-/gi,'');

		var poi_map_add_client = new pg.Client(db_connection);
		poi_map_add_client.connect(function(err){
			if(err){
				console.log('Could not connect to postgres on poi map add', err);
			}else{
				poi_map_add_client.query('SELECT id FROM company_detail WHERE username=$1', [usernmae], function (err, result){
					if(err){
						console.log('Select user id error in poi map add');
						poi_map_add_client.end();
					}else{
						var company_id = result.rows[0].id;
						poi_map_add_client.query('INSERT INTO poi(name,detail,latitude,longitude,company_id,date) VALUES ($1,$2,$3,$4,$5,$6)'[poi_name,poi_detail,latitude,longitude,company_id,date], function (err){
							if(err){
								console.log('Insert into poi error in poi map add', err);
								poi_map_add_client.end();
							}else{
								poi_map_add_client.end();
							}
						});
					}
				});
			}
		});

	});
	///////////////////////poi and map ends////////////////////////////

	/////////////////////poi and activity///////////////////////////
	
	socket.on('poi_activity_detail', function (data){
		var poi_id = socket.request.session.poi_id_map;
		var poi_activity_detail_client = new pg.Client(db_connection);
		poi_activity_detail_client.connect(function(err){
			if(err){
				console.log('Could connect to postgres on poi activity detail');
			}else{
				poi_activity_detail_client.query('SELECT date,COUNT(activity) FROM activity WHERE '+
				'poi_id=$1 GROUP BY date',[poi_id], function (err, result){
					if(err){
						console.log('Select date,count error in poi_activity detail');
					}else{
						socket.emit('poi_activity_detail', result.rows);
						poi_activity_detail_client.end();
					}
				});
			}
		});
	});
	
	socket.on('poi_activity_detail_activity', function (data){
		socket.request.session.poi_activity_date='';
		var date = data.date;
		var username = socket.request.session.user;
		var poi_id = socket.request.session.poi_id_map;

		var poi_activity_detail_activity_client = new pg.Client(db_connection);
		poi_activity_detail_activity_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on poi_activity_detail_activity ', err);
			}else{
				poi_activity_detail_activity_client.query('SELECT activity.activity,activity.status,'+
					'vehicle.name AS vehicle FROM activity LEFT JOIN vehicle ON activity.vehicle_id=vehicle.id '+
					'WHERE activity.date=$1 AND activity.poi_id=$2 ORDER BY status',
					[date,poi_id], function (err,result){
					if(err){
						console.log('Select activity list error in poi_activity_detail_activity',err);
					}else{
						socket.request.session.poi_activity_date=date;
						socket.emit('poi_activity_list',result.rows);
						poi_activity_detail_activity_client.end();
					}
				});
			}
		})
	});

	socket.on('poi_activity_detail_filter', function (data){
		var filter = data.filter;
		var username = socket.request.session.user;
		var poi_id = socket.request.session.poi_id_map;
		var date = socket.request.session.poi_activity_date;

		var poi_activity_detail_filter_client = new pg.Client(db_connection);
		poi_activity_detail_filter_client.connect(function(err){
			if(err){
				console.log('Could not connect to postgres on poi_activity_detail_filter', err);
			}else{
				if(filter=='Not Assigned'){
					poi_activity_detail_filter_client.query('SELECT activity,status ',+
					'FROM activity '+
					'WHERE date=$1 AND poi_id=$2 AND vehicle_id=$3',
					[date,poi_id,null], function (err,result){
						if(err){
							console.log('Select activity list error in poi_activity_detail_filter',err);
						}else{
							socket.emit('poi_activity_list_filter',result.rows);
							poi_activity_detail_filter_client.end();
						}
					});
				}else if(filter=='All'){
					poi_activity_detail_filter_client.query('SELECT activity.activity,activity.status',+
					'vehicle.name AS vehicle FROM activity LEFT JOIN vehicle ON activity.vehicle_id=vehicle.id '+
					'WHERE activity.date=$1 AND activity.poi_id=$2 ORDER BY status',
					[date,poi_id], function (err,result){
						if(err){
							console.log('Select activity list error in poi_activity_detail_activity',err);
						}else{
							socket.request.session.poi_activity_date=date;
							socket.emit('poi_activity_list_filter',result.rows);
							poi_activity_detail_filter_client.end();
						}
					});
				}else{
					poi_activity_detail_filter_client.query('SELECT activity.activity,activity.status',+
					'vehicle.name AS vehicle FROM activity INNER JOIN vehicle ON activity.vehicle_id=vehicle.id '+
					'WHERE activity.date=$1 AND activity.poi_id=$2 AND vehicle.name=$3 ORDER BY status',
					[date,poi_id,filter], function (err,result){
						if(err){
							console.log('Select activity list error in poi_activity_detail_activity',err);
						}else{
							socket.request.session.poi_activity_date=date;
							socket.emit('poi_activity_list_filter',result.rows);
							poi_activity_detail_filter_client.end();
						}
					});
				}
			}
		});
	});

	socket.on('assign_activity', function (data){
		var activity = data.activity;
		var username = socket.request.session.user;
		var assign_activity_client = new pg.Client(db_connection);
		assign_activity_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on assign_activity', err);
			}else{
				assign_activity_client.query('SELECT vehicle.name FROM vehicle INNER JOIN '+
					'company_detail ON vehicle.company_id=company_detail.id WHERE username=$1', 
					[username], function (err, result){
					if(err){
						console.log('Select vehicle_name error in assign_activity', err);
						assign_activity_client.end();
					}else{
						socket.emit('assign_activity', result.rows);	
					}
				});
			}
		});
	});

	socket.on('assign_activity_vehicle', function (data){
		var activity = data.activity;
		var vehicle = data.vehicle;
		var username = socket.request.session.user;
		var poi_id = socket.request.session.poi_id_map;
		var date = socket.request.session.poi_activity_date;

		var assign_activity_vehicle_client = new pg.Client(db_connection);
		assign_activity_vehicle_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on assign_activity_vehicle', err);
			}else{
				assign_activity_vehicle_client.query('SELECT vehicle.id FROM company_detail '+
					'INNER JOIN vehicle ON company_detail.id=vehicle.company_id WHERE '+
					'company_detail.username=$1 AND vehicle.name=$2', 
					[username,vehicle], function (err, result){
					if(err){
						console.log('Select vehicle id errror in assign_activity_vehicle',err);
					}else{
						var vehicle_id=result.rows[0].id;
						assign_activity_vehicle_client.query('UPDATE activity SET vehicle_id=$1 '+
							'WHERE poi_id=$2 AND date=$3 AND activity=$4',
							[vehicle_id,poi_id,date,activity], function (err){
								if(err){
									console.log('Assign vehicle to activity err',err);
								}else{
									console.log('assign vehicle to activity succcess');
									assign_activity_vehicle_client.end();
								}
							});
					}
				});
			}
		});
	});
	
	socket.on('add_activity', function (data){
		if(socket.request.session.poi_id_map && socket.request.session.poi_activity_date){
			var activity = data.activity;
			var username = socket.request.session.user;
			var poi_id = socket.request.session.poi_id_map;
			var date = socket.request.session.poi_activity_date;

			var add_activity_client = new pg.Client(db_connection);
			add_activity_client.connect(function (err){
				if(err){
					console.log('Could not connect to postgres in add_activity', err);
				}else{
					add_activity_client.query('SELECT name,detail,latitude,longitude,company_id '+
						'FROM poi WHERE id=$1', [poi_id], function (err, result){
						if(err){
							console.log('Select poi_detail error in add_activity',err);
						}else{
							var poi_name = result.rows[0].name;
							var poi_detail = result.rows[0].detail;
							var poi_latitude = result.rows[0].latitude;
							var poi_longitude = result.rows[0].longitude;
							var company_id = result.rows[0].company_id;
							add_activity_client.query('INSERT INTO activity(company_id,poi_id,'+
								'activity,date,poi_name,poi_detail,poi_latitude,poi_longitude) '+
								'VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
								[company_id,poi_id,activity,date,poi_name,poi_detail,
								poi_latitude,poi_longitude], function (err, result){
								if(err){
									console.log('Activity addition error on add_activity',err);
								}else{
									console.log('Activity addition successful');
									add_activity_client.end();
								}
							});
						}
					});
				}
			});
		}else{

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
	});
});

////////////////////////////// socket.io end ///////////////////////////////////

http.listen(3030, function(){
	console.log('listening on *: ' + 3030);
});



//////////////////// Functions below this line //////////////////////////////////

setInterval(pinExpiry, 120000);
function pinExpiry(){
	var pin_expiry_client = new pg.Client(db_connection);
		pin_expiry_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on pin expiry', err);
			}
			console.log("pin expiry db connection successful");
			pin_expiry_client.query("DELETE FROM user_pin WHERE timestamp<NOW()-INTERVAL '1 hour'", function (err){
				if(err){
					console.log('error running DELETE on user_pin expiry', err);
					pin_expiry_client.end();
				}
				else{
					pin_expiry_client.query("DELETE FROM device_pin WHERE timestamp<NOW()-INTERVAL '1 hour'", function (err){
						if(err){
							console.log('error running DELETE on device_pin expiry', err);
							pin_expiry_client.end();
						}else{
							pin_expiry_client.end();
						}
					});
					
				}
				
				
			});
		});
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
