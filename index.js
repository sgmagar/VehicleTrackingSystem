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
						login_client.query('SELECT password FROM company_detail where username=$1',[username], function (err, result){
							if(err){
								console.log('error running INSERT user_add query', err);
							}
							else{
								// console.log(result.rows[0].password);
								// console.log(password);
								if(result.rows[0].password == password){
									req.session.user=username;
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
									console.log(pin);
									console.log(pin_number);
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
						device_id_client.query('SELECT id FROM company_detail WHERE username=$1', [req.session.user], function (err, result){
							if(err){
								console.log('device pin resend SELECT user id error', err);
								res.redirect('/devicepin');
								device_id_client.end();
							}else{
								if(result.rows.length!=0){
									company_id = result.rows[0].id;

									var pin = (Math.floor(Math.random()*1000000000)).toString().substring(0,6);
									var subject = "Add New Vehicle";
									var message = "<h1>Pin Number</h1><br/><p>Dear Sir,<br/>You had requested for the \
									addition of New Vehilce.Here is the pin number, you must enter to Add New Vehicle. \
									</p><br/><b>Pin Number: </b>"+pin+"<br/>You must enter this device id too.<br/><b>Device Id: </b>"+device_id_id;
													
			
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
	var category = req.body.category;

	var add_category_client = new pg.Client(db_connection);
	add_category_client.connect(function (err){
			if(err){
				console.log('Could not connect to postgres on add category', err);
			}
			console.log("Connection successful to add category");
			add_category_client.query('SELECT id FROM company_detail WHERE username=$1'[req.session.user], function (err, result){
				if(err){
					console.log("add category SELECT user id error", err);
					add_category_client.end();
				}else{
					if(result.rows.length!=0){
						company_id = result.rows.id;
						add_category_client.query('SELECT category FROM category WHERE category=$1 AND company_id=$2'[category, company_id], function (err, result){
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
});
app.post('/newvehicle', urlencodedparser, function (req, res){
	req.assert('vehicle', "Password field cannot be empty").notEmpty();

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
		vehicle = req.body.vehicle;
		category = req.body.category;
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
						company_id = result.rows[0].id;
						new_vehicle_client.query('SELECT id FROM category WHERE company_id=$1 AND category=$2', [company_id, category], function (err, result){
							if(err){
								console.log('error SELECT id from category in new vehicle', err);
								new_vehicle_client.end();
							}else{
								if(result.rows.length!=0){
									category_id = result.rows[0].id;
									new_vehicle_client.query('INSERT INTO vehicle(device_id,company_id,category_id) VALUES ($1,$2,$3)', [req.session.device_id, company_id,category_id], function (err){
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
	}
});

			///////////////// post ends //////////////////////

///////////////////////////vehicle addition ends/////////////////////////////////////

/////////////////////////////// socket.io parts ///////////////////////////////

io.on('connection', function (socket){

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


