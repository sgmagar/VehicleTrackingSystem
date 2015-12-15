var express =require('express');
var router = express.Router();

var index = require('./index');
var db = require('./db');

router.get('/', function (req, res){
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
						index.io.on('connection', function(socket){
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

module.exports = router;