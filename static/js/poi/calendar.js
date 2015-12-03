var mycal = document.getElementById('calendar');
var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var d = new Date();
var isoDate = d.toISOString(d);
var substr = isoDate.substring(0,4);
console.log(substr);

var selection = [[]];
selection['lot'] = ["1-2","1-27","2-5","3-23","6-12"];
selection['much'] = ["2-3","3-27","1-5","2-23","4-12"];
selection['more'] = ["3-4","3-17","1-15","2-13","4-16"];
selection['little'] = ["4-5","3-28","1-8","2-12","4-16"];

function isSelected(row,col,type) {
	for(var i=0; i<selection[type].length; i++) {
		split = selection[type][i].split("-");
		if(parseInt(split[0]) == row && parseInt(split[1]) == col) {
			return true;
		}
	}
	return false;	
}


console.log(daysInMonth(2));
function daysInMonth(month) {
	return new Date(substr, month, 0).getDate();
}


for(var i = 0; i<=12; i++) {
	row = mycal.insertRow(); row.id = "row" + (i+1);
	for(var j = 0; j<=daysInMonth(i+1);j++) {

		if(j == 0 && i<12) {
			col = mycal.rows[i].insertCell(); col.id = "row" + (i+1) + "-col" + j;
			col.innerHTML = months[i];
			col.classList.add('labelRow');
		} else {
			col = mycal.rows[i].insertCell(); col.id = "row" + (i+1) + "-col" + j;
			// col.value = (i+1) + '-' + j;
			var eye = (i+1).toString();
			var jey = j.toString();

			// Converting to mm-dd format 

			var mm, dd; 
			if(eye.length == 1){
				mm = '0' + eye;
			}
			else {
				mm = eye;
			}
			if(jey.length == 1){
				dd = '0' + jey;	
			}
			else {
				dd = jey; 
			}
			col.value = mm + dd;


			if(i>=12) {
				col.classList.add('labelRow');
				if(j > 0) col.innerHTML = parseInt(j);
			}


			["lot","much","more","little"].map(function(e) {
				if(isSelected(parseInt(i+1),parseInt(j),e)) {
					col.classList.add(e);
					col.classList.add('selected');
					col.onmouseover = function(e) {
						console.log(e.srcElement.id);
					}
				}
			})
		}
	}
}

for(var i = 1; i <= 12; i++){
	for(var j = 1; j < daysInMonth(i) + 1; j++){
		var calCell = document.getElementById('row' + i + '-col' + j);
		calCell.onclick = function (){
			// alert(substr + this.value);
			var queryDate = substr + this.value;
			socket.emit('poi_activity_detail_activity', {'date':queryDate});
		};
	}
}
