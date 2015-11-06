var socket = io();

var new_vehicle_error = document.getElementById("new_vehicle_error");
new_vehicle_error.style.color = "red";
new_vehicle_error.style.background = "violet";

socket.on('new_vehicle_error', function (datas){
	clear_error();
	for(err in datas){
		show_error(datas[err]);
	}
})

function show_error(err){
	new_vehicle_error.innerHTML += err +"<br/>";
	
	// var newElement = document.createElement('div');
	// newElement.innerHTML = err;
	// signup_error.appendChild(newElement);
}

function clear_error(){
	new_vehicle_error.innerHTML="";
	// while(signup_error.firstChild) {
 //    	signup_error.removeChild(signup_error.firstChild);
	// }
}
