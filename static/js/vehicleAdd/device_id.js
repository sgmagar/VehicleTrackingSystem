var socket = io();

var device_id_error = document.getElementById("device_id_error");
device_id_error.style.color = "red";
device_id_error.style.background = "violet";

socket.on('device_id_error', function (datas){
	clear_error();
	for(err in datas){
		show_error(datas[err]);
	}
})

function show_error(err){
	device_id_error.innerHTML += err +"<br/>";
	
	// var newElement = document.createElement('div');
	// newElement.innerHTML = err;
	// signup_error.appendChild(newElement);
}

function clear_error(){
	device_id_error.innerHTML="";
	// while(signup_error.firstChild) {
 //    	signup_error.removeChild(signup_error.firstChild);
	// }
}
