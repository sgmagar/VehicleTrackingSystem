var express =require('express');
var router = express.Router();

var index = require('./index');
var db = require('./db');
/** Delivers the vehicle page along with vehicle with category and company name and logo
*@typedef vehicle
*/
router.get('/', function (req, res){
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
							index.io.on('connection', function(socket){
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



////////////////////////////////////post////////////////////////////////////////////

module.exports = router;