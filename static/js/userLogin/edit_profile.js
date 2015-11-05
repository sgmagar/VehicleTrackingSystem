var socket = io();

var edit_profile_error = document.getElementById("edit_profile_error");
edit_profile_error.style.color = "red";
edit_profile_error.style.background = "violet";

socket.on('edit_profile_error', function (datas){
	clear_error();
	for(err in datas){
		show_error(datas[err]);
	}
})

function show_error(err){
	edit_profile_error.innerHTML += err +"<br/>";
	
	// var newElement = document.createElement('div');
	// newElement.innerHTML = err;
	// signup_error.appendChild(newElement);
}

function clear_error(){
	edit_profile_error.innerHTML="";
	// while(signup_error.firstChild) {
 //    	signup_error.removeChild(signup_error.firstChild);
	// }
}
