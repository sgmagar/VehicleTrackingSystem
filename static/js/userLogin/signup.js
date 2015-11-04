var socket = io();

var signup_error = document.getElementById("signup_error");
signup_error.style.color = "red";
signup_error.style.background = "violet";

(function(funcName, baseObj) {
	clear_error();
})("docReady", window);



socket.on('signup_error', function (datas){
	clear_error();
	for(err in datas){
		show_error(datas[err]);
	}
})

function show_error(err){
	signup_error.innerHTML += err +"<br/>";
	
	// var newElement = document.createElement('div');
	// newElement.innerHTML = err;
	// signup_error.appendChild(newElement);
}

function clear_error(){
	signup_error.innerHTML="";
	// while(signup_error.firstChild) {
 //    	signup_error.removeChild(signup_error.firstChild);
	// }
}
