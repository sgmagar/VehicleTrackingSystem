var socket=io();


//////////////////////////////////jquery///////////////////////////////////////
$(document).ready(function(){
    $("#activityBox").hide();
    $('#actPOI').prop('disabled', true);
    $("#mapPOI").click(function(){
        $('#actPOI').removeClass('currPoiTab');;
        $(this).addClass('currPoiTab');
        $('#poiMap').fadeIn(600);
        $('#poiActs').fadeOut(400);
        socket.emit('poi_map_detail');
    });


    $("#actPOI").click(function(){
        $('#mapPOI').removeClass('currPoiTab');
        $(this).addClass('currPoiTab');
        $('#poiMap').fadeOut(400);
        $('#poiActs').fadeIn(600);
        socket.emit('poi_activity_detail');
    });    

    $('#collapse').click(function(){
        $('#temporaryBar').hide(500);
        $('#expandDiv').show(500);

        $('#poiMapContainer').removeClass('col-md-9');
        $('#poiMapContainer').addClass('fullWidth');
    });

    $('#expandBar').click(function(){
        $('#temporaryBar').show(500);
        $('#expandDiv').hide(500);
        $('#poiMapContainer').addClass('col-md-9');
        $('#poiMapContainer').removeClass('fullWidth');
    });
});


var map = L.map('poiMap',{
                center: [27.68851, 85.33557],
                zoom: 13
            });  
map.on('click', onMapClick);

L.tileLayer('http://{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="#" title="OpenStreetMap" target="_blank">OpenStreetMap</a> contributors Tiles Courtesy of <a href="http://facebook.com/bishes.adhikari" title="MapQuest" target="_blank">Bishes Adhikari<img src="icons/Photo0041.jpg" width="18" height="20"></a>',
          //subdomains: []m
          subdomains: ['otile1','otile2','otile3','otile4']
}).addTo( map );


socket.on('company_poi_info', function (data){
    var company_name_html = document.getElementById('company_name');
    var logo_image = document.getElementById("logo");
    var company_name = data.company_name;
    var logo=data.logo;
    if(company_name || logo){
        company_name_html.innerHTML=company_name;
         logo_image.src=logo;
    }   
});

var marker=[];
var poiList = document.getElementById('poiList');
socket.on('poi_map_filter', function (data){
    if(data.length!=0){
       poiList.innerHTML='';
        console.log(data);
        console.log(data[0].name);
        var latt=0, lonn=0;

        for( var i = 0; i < data.length; i++){
            var poi = document.createElement('b');
            var desc = document.createElement('p');

            poi.setAttribute('id', 'poi' + (i+1));
            // desc.setAttribute('');
            poi.classList.add('poiClass');
            poi.innerHTML = data[i].name;
            desc.innerHTML = data[i].detail;
            poiList.appendChild(poi);
            poiList.appendChild(desc);
            lonn+=parseFloat(data[i].longitude);
            latt+=parseFloat(data[i].latitude);
            if(!marker[i]){
                console.log(data[i].latitude);
                marker[i]= L.marker([data[i].latitude,data[i].longitude]).addTo(map).
                    bindPopup("<h3><b>"+data[i].name+"</b></h3><p>"+data[i].detail+"</p>");
                marker[i].on('mouseover', function (e) {
                    this.openPopup();
                });
                marker[i].on('mouseout', function (e) {
                    this.closePopup();
                });
            }
            if(i==data.length-1){
                console.log(latt);
                map.setView([latt/data.length,lonn/data.length],14);
            }

            poi.onclick=function(){
                socket.emit('poi',{'poi':this.innerHTML});
                for(var j=0;j<document.getElementsByClassName('poiClass').length;j++){
                    document.getElementById('poi' + (j+1)).removeAttribute('style');
                }
                this.setAttribute('style','color:#999;');
                setTimeout(function(){
                    $('#actPOI').prop('disabled', false);
                    $("#activityBox").hide();
                    var currTab=document.getElementsByClassName("currPoiTab")[0].innerHTML;
                    if(currTab.trim()=="Map"){
                        socket.emit('poi_map_detail');
                    }else if(currTab.trim()=="Activities"){
                        console.log(currTab);
                        socket.emit('poi_activity_detail');
                    }
                },100);
               
                // alert(this.innerHTML+" "+document.getElementsByClassName("currPoiTab")[0].innerHTML);
            }
        }
       
    }
    // console.log(atozPoiList[i]);
});

var sortKey = document.getElementById('sortKey');
sortKey.onchange = function(){
    poiList.innerHTML = '';
    for(var i=0;i<marker.length;i++){
        if(marker[i]){

            map.removeLayer(marker[i]);
        }
    }
    marker=[];

    socket.emit('poi_map_filter',{'filter':sortKey.value});
   
}

var poi_marker;
socket.on('poi_map_detail', function (data){
    if(poi_marker){
         map.removeLayer(poi_marker);
    }
   
    console.log(data[0]);
    for(var i=0;i<marker.length;i++){
        if(marker[i]){

            map.removeLayer(marker[i]);
        }
    }
    marker=[];
    map.setView([data[0].latitude,data[0].longitude],14);
    poi_marker= L.marker([data[0].latitude,data[0].longitude]).addTo(map).
                    bindPopup("<h3><b>"+data[0].name+"</b></h3><p>"+data[0].detail+"</p>");
    poi_marker.on('mouseover', function (e) {
        this.openPopup();
    });
    poi_marker.on('mouseout', function (e) {
        this.closePopup();
    });

});

socket.on('poi_name', function (data){
    var poi_header = document.getElementById('actScrHeader');
    poi_header.innerHTML=data;
});
var vehicle_list=[];
socket.on('vehicle_list', function (data){
    if(data){
        vehicle_list=data;
        var actScrSel = document.getElementById('actScrSelect');
        actScrSel.innerHTML='';
        var addOption1 = document.createElement('option');
        addOption1.innerHTML = 'All';
        actScrSel.appendChild(addOption1);
        var addOption2 = document.createElement('option');
        addOption2.innerHTML = 'Not Assigned';
        actScrSel.appendChild(addOption2);
        for(var i=0; i<data.length; i++){
            var addOpt = document.createElement('option');
            addOpt.innerHTML = data[i].name;
            actScrSel.appendChild(addOpt);
            actScrSel.onchange = function(){
                var chosen = this.options[this.selectedIndex].text;
                socket.emit('poi_activity_detail_filter', {filter:chosen});
                //alert('Sorting by: ' + chosen);
            }
        }
    }
});

socket.on("poi_activity_list", function (data){
    var poi_actlist=document.getElementById('poi_actlist');
    poi_actlist.innerHTML='';
    var icount=0;
    (function activity_listt(){
        if(icount<data.length){
            var activity = data[icount].activity;
            var status = data[icount].status;
            var vehicle;
            var vehicle = data[icount].vehicle;
            console.log(activity+ " "+status+" "+vehicle);

            var act = document.createElement('input');
            var radSpan = document.createElement('span');
            var newLine = document.createElement('br');
            act.setAttribute('type', 'radio');
            act.classList.add('radioClass');
            radSpan.innerHTML=activity;

            poi_actlist.appendChild(act);
            poi_actlist.appendChild(radSpan);

            if(!vehicle){
                radSpan.setAttribute('style','color:#999;')
                var spanElem = document.createElement('span');
                spanElem.innerHTML="    ";
                var sel = document.createElement('select');
                sel.classList.add('selectClass');
                var addOption = document.createElement('option');
                addOption.innerHTML = 'Vehicle';
                sel.appendChild(addOption);
                sel.setAttribute('id', 'sel'+(icount+1));
                sel.setAttribute('style', 'border-style: solid; border-radius: 5px; background-color: #FCFCFC;');
                if(vehicle_list){
                    for(var i=0; i<vehicle_list.length; i++){
                        var addOpt = document.createElement('option');
                        addOpt.innerHTML =vehicle_list[i].name;
                        sel.appendChild(addOpt);
                        sel.onchange = function(){
                            var chosen = this.options[this.selectedIndex].text;
                            socket.emit('assign_activity_vehicle', {'vehicle':chosen, 'activity':radSpan.innerHTML});
                            //alert('Sorting by: ' + chosen+ radSpan.innerHTML);
                        }
                    }
                }
                poi_actlist.appendChild(sel);
                act.setAttribute('disabled', true);
                poi_actlist.appendChild(spanElem);
                poi_actlist.appendChild(newLine);
                icount++;
                activity_listt();
            }
            else{
                if(!status){
                    act.setAttribute('disabled', true);
                    var vehicleElem = document.createElement('span');
                    vehicleElem.innerHTML=vehicleElem.innerHTML=" to "+ vehicle;
                    vehicleElem.setAttribute('style', 'color:#999;font-size:10px');
                    poi_actlist.appendChild(vehicleElem);
                    poi_actlist.appendChild(newLine);
                    icount++;
                    activity_listt();
                }else{
                    act.setAttribute('checked', true);
                    var vehicleElem = document.createElement('span');
                    vehicleElem.innerHTML=" to "+ vehicle;
                    vehicleElem.setAttribute('style', 'color:#999;font-size:10px');
                    poi_actlist.appendChild(vehicleElem);
                    poi_actlist.appendChild(newLine);
                    icount++;
                    activity_listt();
                }
            }    
        }else{

        }
    })();
});





/////////////////////////////////////////////old///////////////////////////////////////////////////

// function sendPoiPopupData(data){
//     socket.emit('popupData', data);
    
// }



// var poi_actlist = document.getElementById('poi_actlist');
// for(i = 0; i < activity_list.length; i++){
//     var act = document.createElement('input');
//     var radSpan = document.createElement('span');
//     act.setAttribute('type', 'radio');
//     act.classList.add('radioClass');
//     if(stat[i] == 0){
//         radSpan.classList.add('dimSpan');
//         act.setAttribute('checked', true);
//     }
//     else {
//         radSpan.classList.add('spanClass');
//     }
    
//     // console.log(activity_list[i]);
//     act.setAttribute('value', activity_list[i]); 
//     act.setAttribute('id', 'radio' + (i + 1)); 
//     // desc.innerHTML = activity_list[i];
//     poi_actlist.appendChild(act);
//     // actList.appendChild(desc); 
//     // var radioSpan = document.createElement('span');
//     radSpan.innerHTML =  act.value + '<br />';
//     poi_actlist.appendChild(radSpan);
// }
// var abc = document.getElementsByClassName('radioClass');
// for(i = 0; i < abc.length; i++){
//     abc[i].onclick = function(){
//         // console.log('Checked!');
//         this.classList.add('spanClass');
//     }
// }



///////////////////functions////////////////////////////
function onMapClick(e){
    // alert('You clicked at ' + e.latlng + ': ' + e.latlng.lat + ', ' + e.latlng.lng);
    var clickedLat = e.latlng.lat;
    var lat = clickedLat.toString();
    var clat = lat.slice(0,9);

    var clickedLong = e.latlng.lng;
    var long = clickedLong.toString();
    clong = long.slice(0,9);

    var savePoi = document.getElementById('savePOI');
    savePoi.onclick = function(){
        var poiName = document.getElementById('poi_name');
        var poiDetails = document.getElementById('poi_details');
        var addr = {
            "latitude": clat,
            "longitude": clong, 
            "poi_name": poiName.value,
            "poi_detail": poiDetails.value
        }
        socket.emit('poi_map_add',addr);
    }

    var addPoi = document.getElementById('poiAdd');
    addPoi.innerHTML = clat + ', ' + clong; 
    
}

function addActivity(){
    var activity = document.getElementById("act_name");
    socket.emit('add_activity', {'activity':activity.value});
    activity.value='';
}





///////////////////////////////////Reloading datas////////////////////
socket.on('poi_reload', function(){
    socket.emit('poi_map_filter',{'filter':''});
});

socket.on('reload_vehiclelist', function (data){
    socket.emit('poi_activity_detail_filter',{'filter':'All'});
});






