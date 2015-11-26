var mycal = document.getElementById('calendar');
	var longestDaysInMonth = 0;
	var selection = ["1-13","1-27","2-5","3-23","6-12"];

	function isSelected(row,col) {
		for(var i=0; i<selection.length; i++) {
			split = selection[i].split("-");
			if(parseInt(split[0]) == row && parseInt(split[1]) == col) {
				return true;
			}
		}
		return false;	
	}

	function daysInMonth(month) {
		if(daysInMonth >= 12) {
			return 31;
		} else {
    		return new Date(2015, month, 0).getDate();
    	}
	}

	
	for(var i = 0; i<=12; i++) {
		row = mycal.insertRow(); row.id = "row" + i;
		if(longestDaysInMonth < daysInMonth(i+1)) { longestDaysInMonth = daysInMonth(i+1);}
		for(var j = 0; j<daysInMonth(i+1);j++) {
			col = mycal.rows[i].insertCell(); col.id = "row" + i + "-col" + j;
			if(i>=12) {
				col.classList.add('lastLine');
				col.innerHTML = parseInt(j+1);
			}

			if(isSelected(parseInt(i+1),parseInt(j+1))) {
				col.classList.add('selected');
			}
		}
	}

	var monthList = document.getElementById("monthName");
	["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(function(e){
		monthList.innerHTML += "<li>" + e + "</li>";
	});