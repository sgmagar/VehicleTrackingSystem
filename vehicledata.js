var express =require('express');
var router = express.Router();

var index = require('./index');
var db = require('./db');
/** delivers the page for addition of vehicle data
*@typedef vehicledata
*/
router.get('/', function (req, res){
	if(req.session.user){
		res.sendFile('/templates/vehicle/vehicle_data.html', {root: __dirname});
	}else{
		res.redirect('/'); 
	}
});
/** deals with the vehicledata request and check validation and if passed then stores in database.
*@typedef vehicledata
*/
router.post('/', index.urlencodedparser, function (req, res){
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


module.exports = router;