"use strict"
var socket=io();

$(document).ready(function(){ 
    socket.emit('vehicle_map');   
    $('#act').hide();
    $('#dash').hide();
    $('#actButton').prop('disabled', true);
    $('#dashButton').prop('disabled', true);
    $("#mapButton").click(function(){
      // $("#map").show();
      $('#dashButton').removeClass('currTab');
      $('#actButton').removeClass('currTab');;
      $(this).addClass('currTab');
      $('#map').show();
      $('#act').hide();
      $('#dash').hide();
      socket.emit('vehicle_map');
    });


    $("#dashButton").click(function(){
        // $("#map").hide();
        // $('#dash').show();
        $('#mapButton').removeClass('currTab');
        $('#actButton').removeClass('currTab');
        $(this).addClass('currTab')
        $('#map').hide();
        $('#act').hide();
        $('#dash').show();
        socket.emit('vehicle_dasboard',{'from_date':'','to_date':'','type':''});
    });
    $("#actButton").click(function(){
      // $("#map").hide();
      // $('#dash').show();
      $('#dashButton').removeClass('currTab');
      $('#mapButton').removeClass('currTab');
      $(this).addClass('currTab');
      $('#map').hide();
      $('#dash').hide();
      $('#act').show();
       socket.emit('vehicle_activity');
    });

    $("#allVehicles").click(function(){
        $('#all_vehicles_div').toggle();
        // $('#glyphicon-play').hide();
    });
    $("#allCategories").click(function(){
        $('#all_categories').toggle();
        // $('#glyphicon-play').hide();
    });

    $('#collapse').click(function(){
        $('#collapse_bar').toggle(500);
        // $('#expandBar').show();
        $(this).toggleClass('glyphicon-chevron-left');
        $(this).toggleClass('glyphicon-chevron-right');
        $('#mapContainer').toggleClass('col-md-9');
        $('#mapContainer').toggleClass('col-md-12');
    });
});


/////////////////////////////----------Bar Chart one--------/////////////////////
$(function(){

    var ctx = $('#my-chart').get(0).getContext('2d');
    var data = {
    labels: [
      'Sep', 'Oct', 'Nov'
    ],
    datasets: [
      {
          label: 'Months',
          fillColor: 'rgba(170,170,170,0.5)',
          highlightFill: 'rgba(140,140,140,0.5)',
          data: [6, 8, 12]
      }
    ]
    };
    var options = {
    barStrokeWidth : 1,
    // responsive: false,
    animation: false,
    barShowStroke: false
    };

    new Chart(ctx).Bar(data, options);
});

///////////////////////////////coding from here/////////////////////

var my_latitude = 27.68851;
var my_longitude = 85.33557;

var popup = L.popup();

var map = L.map('map',{
                center: [my_latitude, my_longitude],
                zoom: 13
            });  

var newmarker; 
var circle; 
var polyLine; 
L.tileLayer('http://{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="#" title="OpenStreetMap" target="_blank">OpenStreetMap</a> contributors Tiles Courtesy of <a href="http://facebook.com/bishes.adhikari" title="MapQuest" target="_blank">Bishes Adhikari<img src="icons/Photo0041.jpg" width="18" height="20"></a>',
          //subdomains: []m
          subdomains: ['otile1','otile2','otile3','otile4']
}).addTo( map );

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
    var listCats = document.getElementById('all_categories');
    for(var i=0;i<data.length;i++){
        var item =  document.createElement("div"); 
        item.classList.add("catClass");
        var itemTitle = document.createElement('h4');
        itemTitle.innerHTML = data[i].category;
        item.appendChild(itemTitle);
        var vehList = document.createElement('ul');
        vehList.classList.add('vehListClass');
        for( var j = 0; j < data[i].vehicle.length; j++){
            var vehName = data[i].vehicle[j];
            // console.log(vehName);
            var corrVeh = document.createElement("li");
            corrVeh.innerHTML = vehName;
            // item.appendChild(corrVeh);
            corrVeh.setAttribute('id', 'exp' + (i+1));
            corrVeh.classList.add('expClass');
            corrVeh.onclick=function(){
                socket.emit('vehicle', {'vehicle':this.innerHTML});
                var menuTab =  document.getElementsByClassName('currTab')[0].innerHTML;
                $('#actButton').prop('disabled', false);
                $('#dashButton').prop('disabled', false);
                if(menuTab=="Map"){
                    socket.emit('vehicle_map');
                }else if(menuTab=="Activities"){
                    socket.emit('vehicle_activity');
                }else if(menuTab=="Dashboard"){
                    socket.emit('vehicle_dasboard',{'from_date':'','to_date':'','type':''});
                }
                //alert(this.innerHTML+" "+ document.getElementsByClassName('currTab')[0].innerHTML);
            }
            vehList.appendChild(corrVeh);
            // if(i==data.length-1 && i==data[i].vehicle.length-1){
            //     var event = new Event("vehicleLoaded");
              
            // }
        }
        item.appendChild(vehList);
        listCats.appendChild(item);
    } 
});

socket.on('vehicle_map_first', function (data){
    console.log(data);
})



    






////////////////toggle///////////////////
$(".catClass").click(function(){
    $('#all_vehicles_div').toggle();
    // $('#glyphicon-play').hide();
});


//////////////////////////////----------------map---------------//////////////////


var marker = L.marker([my_latitude, my_longitude]);
var marker2 = L.marker([office_lat, office_long]);

function onMarkerClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("Location: " + e.latlng.toString())
        .openOn(map);
}

function onCircleClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("Stopped at: " + e.latlng.toString())
        .openOn(map);
}


function addToDeliverMarker(lat, lon, e){
            console.log('Marker function called with ' + lat + ', ' + lon);
            if(newmarker != undefined){
                map.removeLayer(newmarker);
            }
          // console.log('Plotting these: ' + lat + ', ' + lon);
          newmarker = L.marker([lat, lon]); //.addTo(map);  // Plotted 
          // newmarker.valueOf()._icon.style.backgroundColor = 'red';
          // newmarker.bindPopup("Marker at: " + e.latlng);

          newmarker.on('click', onMarkerClick);

          map.addLayer(newmarker);

     }



function init_locations(lat, lon){
    var initMarker = L.marker([lat, lon]);
    map.addLayer(initMarker);
    setTimeout(function(){
        map.removeLayer(initMarker);
    }, 10000);
}




// var circle = L.circle([my_latitude, my_longitude], 250, {
//     color: 'red',
//     fillColor: '#f03',
//     fillOpacity: 0.5
// }).addTo(map);

function stoppage(lat, long, rad, e){
    console.log('Circle function calledc with ' + lat + ', ' + long);
        if(circle != undefined){
            map.removeLayer(circle);
        }   

        circle = L.circle([lat, long], rad, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5
    }); //.addTo(map);  
// circle.bindPopup("Circle at: " + e.latlng);
circle.on('click', onCircleClick);

map.addLayer(circle);
        
}

function drawRoute(waypoints, polyline_options){

        console.log('Polyline function called qith ');
        if(polyLine != undefined){
            map.removeLayer(polyLine);
        }
        // console.log(waypoints);
        polyLine = L.polyline(waypoints, polyline_options); //.addTo(map);
        map.addLayer(polyLine);
}
////////////////////////////////----------jquery-----///////////////////////////


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


        
       



