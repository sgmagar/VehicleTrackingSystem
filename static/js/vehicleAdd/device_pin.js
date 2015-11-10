var socket = io();

var device_pin_error = document.getElementById("device_pin_error");
device_pin_error.style.color = "red";
device_pin_error.style.background = "violet";

socket.on('device_pin_error', function (datas){
	clear_error();
	for(err in datas){
		show_error(datas[err]);
	}
})

function show_error(err){
	device_pin_error.innerHTML += err +"<br/>";
	
	// var newElement = document.createElement('div');
	// newElement.innerHTML = err;
	// signup_error.appendChild(newElement);
}

function clear_error(){
	device_pin_error.innerHTML="";
	// while(signup_error.firstChild) {
 //    	signup_error.removeChild(signup_error.firstChild);
	// }
}
