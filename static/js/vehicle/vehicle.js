"use strict"
var socket=io();
var currentVan = []; // For getting current ID of vehicle to update innerHTML

var is_clicked = 0;

socket.on('company_vehicle_info', function (data){
    var company_name_html = document.getElementById('company_name');
    var logo_image = document.getElementById("logo");
    var company_name = data.company_name;
    var logo=data.logo;
    if(company_name || logo){
        company_name_html.innerHTML=company_name;
        logo_image.src=logo;
    }
});
socket.on('vehicle_info', function (data){
    
});

var d = new Date();
var isoDate = d.toISOString(d);
var substr = isoDate.substring(0,10);


var is_logged; 

// var value = require('./Desktop/Distribution\ Company/init.js');

// var sess;

// console.log(sess.user);

// window.onload = function(){
    // if( name == ''){

        // window.location.href = '/login.html';
    // }
    // else {
    //     window.location.href = '/dashboard.html';
    // }
// }


// function displayVanTasks(){
//     alert(message.data);
// }





// ws.onmessage = function (evt){

//   if(evt.data) {
// //     var message = evt.data;
// //     // var reply = messageHandler[message.cmd](message.msg);
//     var message = evt.data;
//     message = JSON.parse(message);
//     // console.log(message.data[0]);

//     if(message.table == 'session'){
//         console.log(message.is_logged);
//             // document.write('Your session has expired. Please ' + '<a href = "/login.html">Login</a>to continue.');
//             // window.location.href = '/login.html';
//         is_logged = message.is_logged;
//         if(is_logged != 1){
//             // window.location.href = '/login.html';
//         }
//         }
    
//     if(message.table == 'customers'){
//         //update customers div

//         var listClients = document.getElementById('listclients');
//         if(message.data){
//             for(i = 0; i < message.data.length; i++){
//                 var listitem = document.createElement("li");        

//             listitem.innerHTML = 'Customer ID >>' + message.id[i] + ',  Name: ' + message.data[i] + 
//             ', Location: ' + message.lat[i] + ', ' + message.long[i]; 
//             listClients.appendChild(listitem);
//             }    
//         }

               
        
//     }

    

//     if(message.table == 'tasks'){
//         //update tasks div
//             var listJobs = document.getElementById('listjobs');
//         for(i = 0; i < message.data.length; i++){
//             // console.log(substr);
//             // console.log(message.days[i])
//             // tasks for today 
//             if(message.days[i] == substr){
//             // console.log('matched!');   
//             var listitem = document.createElement("li");        

//             listitem.innerHTML = 'Task No. >>' + message.data[i] + ' to ' + message.names[i] + 
//             ' at location ' + message.address[i] + ' today at ' + message.time[i] + '.  <u><b>' + message.stat[i].toUpperCase() + '</b></u>';
//             listJobs.appendChild(listitem);
 
//             }
//             // other days 
//         //     else{
//         //     var jobs = document.getElementById('jobs');
//         //         jobs.innerHTML = jobs.innerHTML + 'Task Number ' + message.data[i] + ' to ' + message.names[i] + 
//         //         ' at location ' + message.address[i] + ' on ' + message.days[i] + ' at ' + message.time[i];
//         //         jobs.innerHTML = jobs.innerHTML + '<br>';
//         //     }
//         // // console.log(message.days[i]);


        
//         }
//     }

//     if(message.table == 'vehicles'){
//         //update vehicles div
//         var listVans = document.getElementById('listvans');
//         if(message.data){
//             for(i = 0; i < message.data.length; i++){
//                 // Display the jobs assigned to vehicles today
//                 var listitem = document.createElement("button"); // Creates a list element 
//                 var newline = document.createElement('p');
//                 listitem.classList.add("vanClass");

//                 // listitem.setAttribute("class", 'vans'+(i+1));
//                 listitem.setAttribute("id", 'van'+(i+1));   // Gives ID to the list element 
//                 // newline.setAttribute("id", 'fill'+(i+1));

//                 listitem.innerHTML = message.data[i];
//                 newline.innerHTML = '\n';

//                 listVans.appendChild(listitem);
//                 listvans.appendChild(newline);

//                 // }

//                 // Other days 
//                 // else{
//                 //     var vans = document.getElementById('vans');
//                 // vans.innerHTML = vans.innerHTML + 'Vehicle Identifier: ' + message.data[i] + 
//                 // ', Task No. ' + message.tasks[i] + ' on ' + message.date[i];
//                 // vans.innerHTML = vans.innerHTML + '<br>';
//                 // }

//             }    
//         }
        

//         // var listVehicles = document.getElementsByClassName("listVehicles");
//         // for(var n = 0; n < listVehicles.length; n++){
//         //     listVehicles[n].id = 'vans_' + (n+1);
//         // }
//         // for(i = 1; i < 10; i++){
//         //     var listID = [];
//         //      listID = document.getElementsByClassName("listVehicles");
//         //      for(i = 0; i < listID.length; i++){
//         //     listID.onclick = function(){
//         //     // alert(listclass.innerHTML);
//         //     alert(listID.innerHTML);
//         //     }
//         // }
        
//         var listID = [];
//         var listClass = document.getElementsByClassName('vanClass');
       
//             // console.log(listClass.length);
       

//         for(i = 0; i < listClass.length; i++){

//             listID[i] = document.getElementById('van'+(i+1));
//         listID[i].onclick = function(){
//             var data = this.innerHTML;
//             currentVan = this.id; // Gets the ID of this element
//             // is_clicked = is_clicked + 1;
//             // alert(data + currentVan);
//             sendData(data); 
            
            
            
//         }    
//         }
        
//         // for(i = 0; i < listClass.length; i++){
//         //     listID[i].onclick = function(){
//         //     alert(this.innerHTML);
//         //     }    
//         // }
        
        


//     }

    



  //   var expand = document.getElementById('expand');

  //   if(message.table == 'vantasks'){
        
            
  //            //Disable updating on clicking twice
  //               var vanid = document.getElementById(currentVan);
  //       if(message.data.length > 0){
  //           // vanid.innerHTML = vanid.innerHTML + '<br>  > Task No. ' + message.data;
  //           // alert(message.data);
  //           expand.innerHTML = '> Vehicle: ' + message.vehicle + '<br> Tasks: ' + message.data;
  //       }
  //       else{
  //           // vanid.innerHTML = vanid.innerHTML + '<br>  > No tasks listed.'
  //           // alert(message.data);
  //           expand.innerHTML = '> Vehicle: ' + message.vehicle + '<br> Tasks: Not assigned';
  //       }
    
            
            
  //   }

  //   var i;

    

  // }
// };


        
       



