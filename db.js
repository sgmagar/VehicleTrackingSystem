var pg = require('pg');
var db_connection = "postgres://saurav:saurav@localhost/vehicleTrack";

function insert(query, value){
	var client=new pg.Client(db_connection);
	client.connect(function (err){
		if(err){
			console.log("could not connect to postgres on insert");
		}
		client.query(query, value, function(err){
			if(err){
				console.log("Insert query error", err);
			}else{
				console.log("Insert query success");
			}
		});
	});
}
function update(query,value){
	var client=new pg.Client(db_connection);
	client.connect(function (err){
		if(err){
			console.log("could not connect to postgres on update");
		}
		client.query(query, value, function(err){
			if(err){
				console.log("Update query error", err);
			}else{
				console.log("Update query success");
			}
		});
	});

}
function select(query,value,callback){
	var client=new pg.Client(db_connection);
	client.connect(function (err){
		if(err){
			console.log("could not connect to postgres on select");
		}
		client.query(query, value, function(err, result){
			if(err){
				console.log("Select query error", err);
				callback(err);
			}else{
				console.log("Select query success");
				
				callback(null,result.rows);
				return result.rows;
			}
		});
	});
}

function delet(query,value){
	var client=new pg.Client(db_connection);
	client.connect(function (err){
		if(err){
			console.log("could not connect to postgres on delet");
		}
		client.query(query, value, function (err){
			if(err){
				console.log("delete query error", err);
			}else{
				console.log("delete query success");
			}
		});
	});
}

module.exports.select = select;
module.exports.insert = insert;
module.exports.update = update;
module.exports.delet = delet;