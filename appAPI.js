var express =require('express');
var router = express.Router();

var index = require('./index');
var db = require('./db');

router.get('/vehicle', function (req,res){
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

router.get('/vehicle/vehicle_detail', function (req,res){
	if(req.query.name){
		data=[{"name":"ktm","detail":"this is ktm detail"},{"name":"lalt","detail":"this is lalt detail"}];
		res.send(data);
	}

});

module.exports = router;
