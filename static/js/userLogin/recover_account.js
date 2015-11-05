var socket = io();

var recover_error = document.getElementById("recover_account_error");
recover_error.style.color = "red";
recover_error.style.background = "violet";

socket.on('recover_account_error', function (datas){
	clear_error();
	for(err in datas){
		show_error(datas[err]);
	}
})

function show_error(err){
	recover_error.innerHTML += err +"<br/>";
	
	// var newElement = document.createElement('div');
	// newElement.innerHTML = err;
	// signup_error.appendChild(newElement);
}

function clear_error(){
	recover_error.innerHTML="";
	// while(signup_error.firstChild) {
 //    	signup_error.removeChild(signup_error.firstChild);
	// }
}
