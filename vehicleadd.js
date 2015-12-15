var express =require('express');
var router = express.Router();

var index = require('./index');
var db = require('./db');

router.get('/device', function (req, res){
	if(req.session.user){
		res.sendFile('/templates/vehicleAdd/device_id.html', {root: __dirname});
	}else{
		res.redirect('/');
	}
	
});
router.get('/devicepin', function (req, res){
	if(req.session.user){
		res.sendFile('/templates/vehicleAdd/device_pin.html', {root: __dirname});
	}else{
		res.redirect('/');
	}
	
});
router.get('/newvehicle', function (req, res){
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
						index.io.on('connection', function(socket){
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


//////////////////////////////////post/////////////////////////////////////////////////////////////
router.post('/device', index.urlencodedparser, function (req, res){
	req.assert('deviceid', "Device Id can't be empty").notEmpty();

	var errors = req.validationErrors();
	if(errors){
		var error_list = [];
		for(error in errors){
			console.log(errors[error].msg);
			error_list.push(errors[error].msg);
		}
		(function sendError(){
			index.io.on('connection', function(socket){
				socket.emit('device_id_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/vehicleadd/device');
		
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
								index.sendMail(company_email, subject, message);
												 	
							 	res.redirect('/vehicleadd/devicepin');

							}
						});	
					}else{
						var error =  ["Device id already taken."];
						(function sendError(){
							
							index.io.on('connection', function(socket){
								socket.emit('device_id_error', error);
								error = [];
							});
							
						}());
						res.redirect('/vehicleadd/device');
						
					}
				}else{
					console.log("Device id does not exists");
						var error =  ["Device id doesnot exist. Enter a valid device id"];
						(function sendError(){
							
							index.io.on('connection', function(socket){
								socket.emit('device_id_error', error);
								error = [];
							});
							
						}());
						res.redirect('/vehicleadd/device');
						
				}
			}
		});

	}
});
router.post('/devicepin', index.urlencodedparser, function (req, res){
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
			index.io.on('connection', function(socket){
				socket.emit('device_pin_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/vehicleadd/devicepin');
		
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
							
							index.io.on('connection', function(socket){
								socket.emit('device_pin_error', error);
								error = [];
							});
							
						}());
						res.redirect('/vehicleadd/devicepin');
					}
				}else{
					var error =  ["Device id doesnot exist. Enter a valid device"];
					(function sendError(){
						
						index.io.on('connection', function(socket){
							socket.emit('device_pin_error', error);
							error = [];
						});
						
					}());
					res.redirect('/vehicleadd/devicepin');
				}
			}
		});
	}
});

router.post('/resendpin', index.urlencodedparser, function (req, res){
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
							index.sendMail(company_email, subject, message);
							res.redirect('/vehicleadd/devicepin');
						}else{
							var error =  ["Invalid device id."];
							(function sendError(){
								
								index.io.on('connection', function(socket){
									socket.emit('device_pin_error', error);
									error = [];
								});
								
							}());
							res.redirect('vehicleadd/devicepin');
						}
					}
				});
			}
		}
	});	

});

router.post('/addcategory', index.urlencodedparser, function (req, res){
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
							res.redirect('/vehicleadd/newvehicle');
						}else{
							var error =  ["category already exists."];
							(function sendError(){
								
								index.io.on('connection', function(socket){
									socket.emit('new_vehicle_error', error);
									error = [];
								});
								
							}());
							res.redirect('/vehicleadd/newvehicle');
						}
					}
				});
			}
		});
	}
	
});
router.post('/newvehicle', index.urlencodedparser, function (req, res){
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
			index.io.on('connection', function(socket){
				socket.emit('new_vehicle_error', error_list);
				error_list = [];
			});
		}());
		res.redirect('/vehicleadd/newvehicle');
		
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
					res.redirect('/vehicleadd/vehicle');
				}

			}
		});
	}
});

module.exports = router;
