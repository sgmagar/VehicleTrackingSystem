var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
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
////////////////////////module exports//////////////
module.exports.io=io;
// module.exports.sessionMiddleware = sessionMiddleware;
module.exports.crypto = crypto;
module.exports.urlencodedparser=urlencodedparser;
// module.exports.validator = validator;
module.exports.multer = multer;
module.exports.sendMail = sendMail;



/////////////////module exports end///////////////////
				
var user = require('./user');
var vehicleadd = require('./vehicleadd');
var vehicledata = require('./vehicledata');
var appAPI = require('./appAPI');
var vehicle = require('./vehicle');
var poi = require('./poi');

var db = require('./db');

app.use('/', user);
app.use('/vehicleadd',vehicleadd);
app.use('/vehicledata',vehicledata);
app.use('/api',appAPI);
app.use('/vehicle',vehicle);
app.use('/poi', poi);

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
									//socket.emit('vehicle_dashboard_speed', result);
									console.log(result);
									if(result.length!=0){
										var i=0;
										(function sendSpeed(){
											if(i<result.length){
												var speed=[];
												var time=[];
												var latitude=[];
												var longitude=[];
												for(var j=0;j<result[i].speed.length;j++){
													if((j%(result.length*4))==0){
														speed.push(result[i].speed[j]);
														time.push(result[i].time[j]);
														latitude.push(result[i].latitude[j]);
														longitude.push(result[i].longitude[j]);
													}
												}
												result[i].time=time;
												result[i].speed=speed;
												result[i].latitude=latitude;
												result[i].longitude=longitude;
												i++;
												sendSpeed();
											}else{
												console.log(result);
												socket.emit('vehicle_dashboard_speed',result);
											}
										})();
									}

								}
			});

			}else if(type="fuel"){
				db.select('SELECT date,array_agg(time) AS time,'+
							'array_agg(fuel) AS fuel,array_agg(latitude) AS latitude,'+
							'array_agg(longitude) AS longitude '+
							'FROM vehicle_data WHERE device_id=$1 AND date BETWEEN '+
							'$2 AND $3 GROUP BY date ORDER BY date',
							[device_id,from_date,to_date], function (err,result){
								if(err){

								}else{
									//socket.emit('vehicle_dashboard_fuel', result);
									console.log(result);
									if(result.length!=0){
										var i=0;
										(function sendFuel(){
											if(i<result.length){
												var fuel=[];
												var time=[];
												var latitude=[];
												var longitude=[];
												for(var j=0;j<result[i].fuel.length;j++){
													if((j%(result.length*4))==0){
														fuel.push(result[i].fuel[j]);
														time.push(result[i].time[j]);
														latitude.push(result[i].latitude[j]);
														longitude.push(result[i].longitude[j]);
													}
												}
												result[i].time=time;
												result[i].fuel=fuel;
												result[i].latitude=latitude;
												result[i].longitude=longitude;
												i++;
												sendFuel();
											}else{
												console.log(result);
												socket.emit('vehicle_dashboard_fuel',result);
											}
										})();
									}	
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
									//socket.emit('vehicle_dashboard', result);
									console.log(result);
									if(result.length!=0){
										var i=0;
										(function sendAll(){
											if(i<result.length){
												var speed=[];
												var fuel=[];
												var time=[];
												var latitude=[];
												var longitude=[];
												for(var j=0;j<result[i].fuel.length;j++){
													if((j%(result.length*4))==0){
														speed.push(result[i].speed[j]);
														fuel.push(result[i].fuel[j]);
														time.push(result[i].time[j]);
														latitude.push(result[i].latitude[j]);
														longitude.push(result[i].longitude[j]);
													}
												}
												result[i].time=time;
												result[i].speed=speed;
												result[i].fuel=fuel;
												result[i].latitude=latitude;
												result[i].longitude=longitude;
												i++;
												sendAll();
											}else{
												console.log(result);
												socket.emit('vehicle_dashboard_all',result);
											}
										})();
									}	
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
		var filter = data.filter.trim();
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
						' ORDER BY COUNT(DISTINCT CONCAT(activity.poi_name,activity.date)) DESC',
						[username], function (err, result){
							if(err){

							}else{
								if(result.length!=0){
									console.log(result);
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

http.listen(3000, function(){
	console.log('listening on *: ' + 3000);
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
// populateVehicleData();
function populateVehicleData(){
	var i=0;
	var latitude=27.69161;
	var longitude=85.32936;
	var date='20151218';
	var time='024430';
	var deviceid=3;
	var minute;
	var hour;
	(function populate(){
		if(i<50){
			latitude=latitude+0.002;
			var strlatitude=latitude.toString().slice(0,8);
			console.log(strlatitude);
			longitude=longitude+0.002;
			var strlongitude = longitude.toString().slice(0,8);
			console.log(strlongitude);
			minute=parseInt(time.slice(2,4))+2;
			hour = parseInt(time.slice(0,2));
			minute=minute.toString();
			hour=hour.toString();
			var fuel = Math.floor(Math.random()*100);
			var speed = Math.floor(Math.random()*100);
			if(minute>60){
				minute=0;
				hour = hour+1;
			}
			if(hour.length!=2){
				hour = '0'+hour;
			}
			if(minute.length!=2){
				minute = '0'+minute;
			}
			time=hour+minute+time.slice(4,6);

			db.insert('INSERT INTO vehicle_data(latitude,longitude,fuel,speed,date,time,device_id) '+
				'VALUES ($1,$2,$3,$4,$5,$6,$7)',[strlatitude,strlongitude,fuel,speed,date,time,deviceid]);
			i++;
			populate();
		}else{
			console.log('finished. change date');

		}
	})();
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
