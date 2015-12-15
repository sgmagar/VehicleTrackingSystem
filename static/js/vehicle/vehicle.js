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
        $('#collapse_bar').hide(500);
        $('#expandDiv').show(600);
        // $(this).toggleClass('glyphicon-chevron-left');
        // $(this).toggleClass('glyphicon-chevron-right');
        $('#mapContainer').removeClass('col-md-9');
        $('#mapContainer').addClass('fullWidth');
        $('#vehicleBtnGroup').attr('style', 'visibility: hidden;');
            
        setTimeout(function (){
            $('#vehicleBtnGroup').attr('style', 'visibility: visible;');
        }, 600);
    });

    $('#expandBar').click(function(){
        $('#collapse_bar').show(500);
        $('#expandDiv').hide(500);
        $('#mapContainer').addClass('col-md-9');
        $('#mapContainer').removeClass('fullWidth');
        $('#vehicleBtnGroup').attr('style', 'visibility: hidden;');
        
        setTimeout(function (){
            $('#vehicleBtnGroup').attr('style', 'visibility: visible;');
        }, 600);
    });
});


/////////////////////////////----------Bar Chart one--------/////////////////////


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
    listCats.innerHTML='';
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
            corrVeh.setAttribute('id', 'exp' + (i+1)+(j+1));
            corrVeh.classList.add('expClass');
            corrVeh.classList.add('expClass'+(i+1));
            corrVeh.onclick=function(){
                socket.emit('vehicle', {'vehicle':this.innerHTML});
                $('#barAndAct').fadeOut(600);
                for(var k=0;k<document.getElementsByClassName('vehListClass').length;k++){
                    for(var l=0;l<document.getElementsByClassName('expClass'+(k+1)).length;l++){
                        document.getElementById('exp' + (k+1)+(l+1)).removeAttribute('style');
                    }
                }
                
                this.setAttribute('style', 'color: #999;');
                setTimeout(function(){
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
                },100);
                
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
var marker=[];
socket.on('vehicle_map_first', function (data){
    for(var i=0;i<marker.length;i++){
        if(marker[i]){

            map.removeLayer(marker[i]);
        }
    }
    marker=[];
    if(data.length!=0){
        var latt=0, lonn=0;
        for( var i = 0; i < data.length; i++){
            console.log(data[i]);
            lonn+=parseFloat(data[i].longitude);
            latt+=parseFloat(data[i].latitude);
            if(!marker[i]){
                console.log(data[i].latitude);
                marker[i]= L.marker([data[i].latitude,data[i].longitude]).addTo(map).
                    bindPopup("<h4><b>"+data[i].vehicle+"</b></h4><p>");
                marker[i].on('mouseover', function (e) {
                    this.openPopup();
                });
                marker[i].on('mouseout', function (e) {
                    this.closePopup();
                });
            }
            if(i==data.length-1){
                console.log(lonn/data.length);
                map.setView([latt/data.length,lonn/data.length],13);
            }
        }
       
    }
    // console.log(atozPoiList[i]);
});

var vehicle_marker;
var polyline;
var circle=[];
socket.on('vehicle_map_location', function (data){
    for(var i=0;i<marker.length;i++){
        if(marker[i]){

            map.removeLayer(marker[i]);
        }
    }
    marker=[];
    if(vehicle_marker){
        map.removeLayer(vehicle_marker);
    }
    if(polyline){
        map.removeLayer(polyline);
    }
    if(circle){
        for(var i=0;i<circle.length;i++){
        if(circle[i]){

            map.removeLayer(circle[i]);
        }
    }
    circle=[];
    }
    if(data){
        var line_points=[];
        var latSlice = [];
        var longSlice = [];
        var oneLat,oneLong,prevLat,prevLong,count = [];
        for( var i = 0; i < data.length; i++){
            // console.log(data[i]);
            var waypts = [parseFloat(data[i].latitude.trim()), parseFloat(data[i].longitude.trim())];
            line_points.push(waypts);
            oneLat = data[i].latitude.trim().slice(0,6);
            oneLong = data[i].longitude.trim().slice(0,6);
            if((oneLat == prevLat) && (oneLong == prevLong)){
                count[count.length-1]++;
            }else{

                latSlice.push(oneLat);
                longSlice.push(oneLong);
                count.push(1);
                // count[count.length-1]++;
            }
            prevLat = oneLat;
            prevLong = oneLong;
            // console.log(waypts);
            if(i==data.length-1){
                vehicle_marker= L.marker([data[i].latitude,data[i].longitude]).addTo(map);
                vehicle_marker.valueOf()._icon.style.color='red';
                polyline = L.polyline(line_points, {color: '#000'}).addTo(map);
                for ( var j = 0; j < latSlice.length; j++){
                    if (count[j] < 2){
                    // addMarker(eachLat[i], eachLong[i]);
                    }
                    else if (count[j] >= 2){
                        var radius = count[j] * 50;
                        circle[j] = L.circle([latSlice[j], longSlice[j]], radius, {
                            color: 'red',
                            fillColor: '#f03',
                            fillOpacity: 0.5
                        }).addTo(map);  
                    }

                }
            }
        }
        

    }
    
});
var marker_poi=[];
socket.on('vehicle_poi_location', function (data){
    for(var i=0;i<marker_poi.length;i++){
        if(marker_poi[i]){

            map.removeLayer(marker_poi[i]);
        }
    }
    marker_poi=[];
    if(data.length!=0){
        var latt=0, lonn=0;
        for( var i = 0; i < data.length; i++){
            // console.log(data[i]);
            lonn+=parseFloat(data[i].longitude);
            latt+=parseFloat(data[i].latitude);
            if(!marker_poi[i]){
                // console.log(data[i].latitude);
                marker_poi[i]= L.marker([data[i].latitude,data[i].longitude]).addTo(map).
                    bindPopup("<h4><b>"+data[i].poi+"</b></h4><p>"+data[i].detail);
                marker_poi[i].on('mouseover', function (e) {
                    this.openPopup();
                });
                marker_poi[i].on('mouseout', function (e) {
                    this.closePopup();
                });
            }
            if(i==data.length-1){
                // console.log(lonn/data.length);
                map.setView([latt/data.length,lonn/data.length],13);
            }
        }
       
    }
    // console.log(atozPoiList[i]);
});

socket.on('vehicle_activity_info', function (data){
    var actTable = document.getElementById('vehicle_activities_table');
    actTable.innerHTML='';
    var table_header = document.createElement('tr');
    table_header.innerHTML= '<th style = "text-align: center;">'+
        'Location</th><th>Issued Date</th>'+
        ' <th style = "text-align: center;">Status</th>';    
    actTable.appendChild(table_header);   
    if(data){
        for(var i=0;i<data.length;i++){
            var statStr; 
            if(data[i].status == 0){
                statStr = 'Pending';
            }
            else {
                statStr = 'Done'; 
            }
            var dateYMD = data[i].date.slice(0,4)+'-'+data[i].date.slice(4,6)+'-'+data[i].date.slice(6,8);
            var unformattedDate = new Date(dateYMD).toString();
            var formattedDate = unformattedDate.slice(0,15);
            var newTableRow = document.createElement('tr');
            newTableRow.setAttribute('id', 'tr' + (i+1));
            newTableRow.classList.add("tableRows");
            var newTableRow = document.createElement('tr');
            newTableRow.setAttribute('id', 'tr' + (i+1));
            newTableRow.classList.add("tableRows");
            var poi = document.createElement('td');
            poi.innerHTML = data[i].poi;
            // poi.setAttribute('style', 'margin-left:');
            var date = document.createElement('td');
            date.innerHTML=formattedDate;
            // date.setAttribute('align', 'center');
            var status = document.createElement('td');
            status.innerHTML=statStr;
            // status.setAttribute(.setAttribute('align', 'center'););
            newTableRow.appendChild(poi);
            newTableRow.appendChild(date);
            newTableRow.appendChild(status);
            actTable.appendChild(newTableRow);
            newTableRow.onclick=function(){
                for(var j=0;j<document.getElementsByClassName('tableRows').length; j++){
                    document.getElementById('tr'+(j+1)).firstChild.removeAttribute('style');
                }
                socket.emit('vehicle_activity_poi', {'poi':this.firstChild.innerHTML});
                console.log(this.firstChild.innerHTML);
                this.firstChild.setAttribute('style', 'font-weight:bold;');

                var adds_act = document.getElementById('actAddition');
                adds_act.setAttribute('style', 'cursor: pointer; color: #000');
                adds_act.setAttribute('data-target', '#exModal');
                $('#barAndAct').fadeIn(600);
            }

        }
    }
});

function sendActivity(data){

    var actID = document.getElementById('activity_name');
    var actName = actID.value;
    socket.emit('vehicle_activity_poi_newactivity', {'activity':actName});
}

socket.on('vehicle_activity_poi_frequency', function (data){
    if(data){
        var month_array = ['Jan','Feb','March','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        var label=[];
        var count=[];
        for(var i=0;i<data.length;i++){
            label.push(month_array[parseInt(data[i].date.slice(4,6))-1]);
            count.push(data[i].count);

        }
        $(function(){

            var ctx = $('#my-chart').get(0).getContext('2d');
            var data = {
            labels: label,
            datasets: [
              {
                  label: 'Months',
                  fillColor: 'rgba(170,170,170,0.5)',
                  highlightFill: 'rgba(140,140,140,0.5)',
                  data: count
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
    }
    
});

socket.on('vehicle_activity_poi_activity', function (data){
    var poi_actlist=document.getElementById('activity_list');
    poi_actlist.innerHTML='';
    var icount=0;
    (function activity_listt(){
        if(icount<data.length){
            console.log(data[icount]);
            var activity = data[icount].activity;
            var status = data[icount].status;
            var act = document.createElement('input');
            var radSpan = document.createElement('span');
            var newLine = document.createElement('br');
            act.setAttribute('type', 'radio');
            act.classList.add('radioClass');
            radSpan.innerHTML=activity;

            poi_actlist.appendChild(act);
            poi_actlist.appendChild(radSpan);
            if(!status){
                act.setAttribute('disabled', true);
                poi_actlist.appendChild(newLine);
                icount++;
                activity_listt();
            }else{
                act.setAttribute('checked', true);
                poi_actlist.appendChild(newLine);
                icount++;
                activity_listt();
            }   
        }else{

        }
    })();
});


