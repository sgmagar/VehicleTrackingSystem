var express =require('express');
var router = express.Router();

var index = require('./index');
var db = require('./db');



router.get('/',function (req,res){
	res.sendFile('/templates/userLogin/login.html', {root: __dirname});	
});
router.get('/logout', function (req, res){
	req.session.user=null;
	res.redirect('/');
});
router.get('/signup', function (req, res){
	res.sendFile('/templates/userLogin/signup.html', {root: __dirname});
});
router.get('/editprofile', function (req, res){
	if(req.session.user){
		res.sendFile('/templates/userLogin/profile_edit.html', {root: __dirname});
	}else{
		res.redirect('/');
	}
	
});
router.get('/recover-account', function (req, res){
	res.sendFile('/templates/userLogin/recover_account.html', {root: __dirname});
});
router.get('/userpin', function (req, res){
	res.sendFile('/templates/userLogin/user_pin.html', {root: __dirname});
});
router.get('/newpassword', function (req, res){
	if(req.session.userpin){
		res.sendFile('/templates/userLogin/newpassword.html', {root: __dirname});
	}else{
		res.redirect('/userpin');
	}
});

router.post('/signup', index.urlencodedparser, function (req, res){
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
			index.io.on('connection', function(socket){
				socket.emit('signup_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/signup');
		
	}else {
		var username = req.body.username;
		var email = req.body.email;
		var password = index.crypto.createHmac("sha256", "verySuperSecretKey").update(req.body.password1).digest('hex');

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
						
						index.io.on('connection', function(socket){
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
router.post('/login', index.urlencodedparser, function (req, res){
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
			index.io.on('connection', function(socket){
				socket.emit('login_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/');
		
	}else {
		var username = req.body.username;
		var rememberme = req.body.rememberme;
		var password = index.crypto.createHmac("sha256", "verySuperSecretKey").update(req.body.password).digest('hex');

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
									
									index.io.on('connection', function(socket){
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
						index.io.on('connection', function(socket){
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

router.post('/editprofile',  index.multer({ dest: 'static/images/company_logo'}).single('logo'), function (req, res){
	req.assert('email', "Enter the valid email").isEmail();
	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			index.io.on('connection', function(socket){
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
									
									index.io.on('connection', function(socket){
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
router.post('/recover-account', index.urlencodedparser, function (req, res){
	req.assert('username', "Please enter the username in the blank field.").notEmpty();

	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			index.io.on('connection', function(socket){
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
					index.sendMail(company_email, subject, message);
				 	res.redirect('/userpin');
				}else{
					console.log("user doesnot exists");
					var error =  ["Username doesn't exist. Enter username again."];
					(function sendError(){
						
						index.io.on('connection', function(socket){
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

router.post('/userpin', index.urlencodedparser, function (req, res) {
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
			index.io.on('connection', function(socket){
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
						
						index.io.on('connection', function(socket){
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
router.post('/newpassword', index.urlencodedparser, function (req, res){
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
			index.io.on('connection', function(socket){
				socket.emit('newpassword_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/newpassword');
		
	}else{
		var password = index.crypto.createHmac("sha256", "verySuperSecretKey").update(req.body.password1).digest('hex');
		var username = req.session.userpin;
		db.insert('UPDATE company_detail SET password=$1 WHERE username=$2',[password,username]);
		req.session.userpin=null;
		res.redirect('/');

	}
});	

module.exports = router;
