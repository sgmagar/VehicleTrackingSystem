var mycal = document.getElementById('calendar');
var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

var d = new Date();
var isoDate = d.toISOString(d);
var substr = isoDate.substring(0,4);
console.log(substr);

var selection = [[]];


socket.on('poi_activity_detail', function (data){
    if(data){

		selection['lot'] = [];
		selection['much'] = [];
		selection['more'] = [];
		selection['little'] = [];

    	console.log(data);
    	for(i = 0; i < data.length; i++){
    		console.log(data[i].date+" "+data[i].count);
			var month =  data[i].date.slice(4,6);
			var day =	data[i].date.slice(6,8);
			var tag = month + '-' + day;
			console.log(tag);
			// console.log(tag);
			if(data[i].count < 4){
				selection['little'].push(tag);
			}
			else if((data[i].count >= 4) && (data[i].count[i] < 8)){
				selection['more'].push(tag);
			}
			else if((data[i].count >= 8) && (data[i].count[i] < 11)){
				selection['much'].push(tag);
			}
			else if(data[i].count >= 11){
				selection['lot'].push(tag);
			}
		}
		mycal.innerHTML = ''; // Clear the entire table
		dumpSpots(); // Create new table with new dataset 
    }	

});

function isSelected(row,col,type) {
	for(var i=0; i<selection[type].length; i++) {
		split = selection[type][i].split("-");
		if(parseInt(split[0]) == row && parseInt(split[1]) == col) {
			return true;
		}
	}
	return false;	
}

function daysInMonth(month) {
    	return new Date(substr, month, 0).getDate();
}

function dumpSpots(){
	for(var i = 0; i<=12; i++) {
		row = mycal.insertRow(); row.id = "row" + (i+1);
		for(var j = 0; j<=daysInMonth(i+1);j++) {

			if(j == 0 && i<12) {
				col = mycal.rows[i].insertCell(); col.id = "row" + (i+1) + "-col" + j;
				col.innerHTML = months[i];

				col.classList.add('labelRow');
			} else {
				col = mycal.rows[i].insertCell(); col.id = "row" + (i+1) + "-col" + j;
				// col.setAttribute('style', 'border: 1px solid #CCC');
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
					if((j > 0) && (j < 10)) {
						col.innerHTML = '&nbsp;&nbsp;' + parseInt(j);
					}
					else if(j >= 10){
						col.innerHTML = parseInt(j);
					}
					col.setAttribute('style', 'text-align: center;');
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
			var cursorOver = document.getElementsByClassName('hoverRow');
			calCell.onmouseover = function(){
				for(var k = 0; k < cursorOver.length; k++){
					cursorOver[k].classList.remove('hoverRow');
					// cursorOver[k].removeAttribute('style', 'border: 1px solid #CCC');

				}
					this.classList.add('hoverRow');
					// this.setAttribute('style', 'border: 1px solid #CCC');
			}
			calCell.onclick = function (){
				var actscrDate = document.getElementById('actScrDate');
				var clicked = document.getElementsByClassName('clickedRow');
				$("#activityBox").show(300);
				// for (i = 0; i < clicked.length; i++){
					// clicked.classList.remove('clickedRow');
					// actscrDate.innerHTML = ''; 
				// }
				this.classList.add('clickedRow');

				// alert(substr + this.value);
				// $('#add_new_act').show(250);
				var add_act = document.getElementById('add_new_act');
				add_act.setAttribute('style', 'cursor: pointer; color: #000');
				add_act.setAttribute('data-target', '#activityModal');


				var queryDate = substr + this.value;
				var dateYMD = substr + '-' + this.value.slice(0,2) + '-' + this.value.slice(2,4);
				var unformattedDate = new Date(dateYMD).toString();
				var formattedDate = unformattedDate.slice(4,15);
				actscrDate.innerHTML = formattedDate; 
				console.log(queryDate);
				socket.emit('poi_activity_detail_activity', {'date':queryDate});
			};
		}
	}

}
