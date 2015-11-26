
var socket=io();

socket.on('server', function(data){
        //socket.emit('tab2', data);
        //for(dat in data){
            // demo.innerHTML = data.message;
            console.log(data);
        //}

        socket.emit('client','Hello from client');

});

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
socket.on('poi_map_filter', function (data){

});

var activity_list = ['Collect cash from futsal Kirana', 'Deposit 10 gallons of water', 
'Deposit 10 cartoons of chow chow', 'Meet Ram Prasad and talk about cash', 'List note of new orders '];
var stat = [0, 0, 1, 1, 1];

// Sorting names of POI with details 
var poilist = ['Futsal Kirana', 'Bazaarko Restaurant', 'Hariyo Ghar, Anamnagar', 'White Horse Futsal'];
poiDesc = ['Near ARM Futsal', 'Dilli Bazar', 'Anamnagar, ghattekulo Mod', 'Near Laxmi Bank'];

var defaultSort = poilist.sort();
// var ztoaPoiList = atozPoiList.reverse();
// console.log('A-Z: ' + atozPoiList);
// console.log('Z-A: ' + ztoaPoiList);

var poiList = document.getElementById('poiList');
for(i = 0; i < poilist.length; i++){
    var poi = document.createElement('li');

    poi.setAttribute('id', 'poi' + (i+1));
    poi.classList.add('poiClass');
    poi.innerHTML = defaultSort[i]; 
    poiList.appendChild(poi);
    // console.log(atozPoiList[i]);
}

var poiclass = document.getElementsByClassName('poiClass'); 
var poiID = []; 

for(i = 0; i < poiclass.length; i++){

    poiID[i] = document.getElementById('poi'+(i+1));

     poiID[i].onclick = function(){
            // var newDiv = document.createElement('div');

            var data = this.innerHTML;
            var id = this.id;
            // Toggle: hide/show 


                    var active = document.getElementsByClassName('currPOI');
                    for(i = 0; i < active.length; i++){
                        active[i].classList.remove('currPOI');    
                    }
                    this.classList.add('currPOI');
                    $('#actPOI').prop('disabled', false);

            // currentCat = this.id; // Gets the ID of this element

            // alert(data + ', ' + id);  // works 
            // alert(data); 
            
            }

}


var sortKey = document.getElementById('sortKey');
sortKey.onchange = function(){
    poiList.innerHTML = '';
    if (sortKey.value == 'A-Z'){
    // console.log('Sorted in descending order...' + sortKey.value);
        
        var atozPoiList = poilist.sort();
        for(i = 0; i < poilist.length; i++){
            var poi = document.createElement('li');

            poi.setAttribute('id', 'poi' + (i+1));
            poi.classList.add('poiClass');
            poi.innerHTML = atozPoiList[i]; 
            poiList.appendChild(poi);
            // console.log(atozPoiList[i]);
        }
            for(i = 0; i < poiclass.length; i++){

        poiID[i] = document.getElementById('poi'+(i+1));

         poiID[i].onclick = function(){
                // var newDiv = document.createElement('div');

                var data = this.innerHTML;
                var id = this.id;

                    var active = document.getElementsByClassName('currPOI');
                    for(i = 0; i < active.length; i++){
                        active[i].classList.remove('currPOI');    
                    }
                    this.classList.add('currPOI');
                    $('#actPOI').prop('disabled', false);
                // Toggle: hide/show 

                // currentCat = this.id; // Gets the ID of this element

                // alert(data + ', ' + id);  // works 
                // alert(data); 
                
                }

            }
    }
    else if(sortKey.value == 'Z-A'){
        // console.log('Sorted in ascending order...' + sortKey.value);
        
        var fwdPoiList = poilist.sort();
        var ztoaPoiList = fwdPoiList.reverse();
        for(i = 0; i < poilist.length; i++){
            var poi = document.createElement('li');

            poi.setAttribute('id', 'poi' + (i+1));
            poi.classList.add('poiClass');
            poi.innerHTML = ztoaPoiList[i]; 
            poiList.appendChild(poi);
            // console.log(ztoaPoiList[i]);
        }

                for(i = 0; i < poiclass.length; i++){

            poiID[i] = document.getElementById('poi'+(i+1));

             poiID[i].onclick = function(){
                    // var newDiv = document.createElement('div');

                    var data = this.innerHTML;
                    var id = this.id;

                    var active = document.getElementsByClassName('currPOI');
                    for(i = 0; i < active.length; i++){
                        active[i].classList.remove('currPOI');    
                    }
                    this.classList.add('currPOI');
                    $('#actPOI').prop('disabled', false);
                    // Toggle: hide/show 

                    // currentCat = this.id; // Gets the ID of this element

                    // alert(data + ', ' + id);  // works 
                    // alert(data); 
                    
                    }

         }


    }
    else if(sortKey.value == 'Recently Added'){
        console.log('Sorted by: ' + sortKey.value);
    }
    else if(sortKey.value == 'Most Visited'){
        console.log('Sorted by: ' + sortKey.value);
    }
}

// .........  






function sendPoiPopupData(data){
    socket.emit('popupData', data);
    
}



var poi_actlist = document.getElementById('poi_actlist');
for(i = 0; i < activity_list.length; i++){
    var act = document.createElement('input');
    var radSpan = document.createElement('span');
    act.setAttribute('type', 'radio');
    act.classList.add('radioClass');
    if(stat[i] == 0){
        radSpan.classList.add('dimSpan');
        act.setAttribute('checked', true);
    }
    else {
        radSpan.classList.add('spanClass');
    }
    
    // console.log(activity_list[i]);
    act.setAttribute('value', activity_list[i]); 
    act.setAttribute('id', 'radio' + (i + 1)); 
    // desc.innerHTML = activity_list[i];
    poi_actlist.appendChild(act);
    // actList.appendChild(desc); 
    // var radioSpan = document.createElement('span');
    radSpan.innerHTML =  act.value + '<br />';
    poi_actlist.appendChild(radSpan);
}
var abc = document.getElementsByClassName('radioClass');
for(i = 0; i < abc.length; i++){
    abc[i].onclick = function(){
        // console.log('Checked!');
        this.classList.add('spanClass');
    }
}



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
            // console.log(poiName.value);
            // console.log(poiDetails.value);



            var addr = {
                "latitude": clat,
                "longitude": clong, 
                "poi_name": poiName.value,
                "poi_detail": poiDetails.value
            }
            //var jAddr = JSON.stringify(addr);
            //sendPoiPopupData(jAddr); // Works like charm
            socket.emit('poi_map_add',addr);
        }

        var addPoi = document.getElementById('poiAdd');
        addPoi.innerHTML = clat + ', ' + clong;

        // var prmpt = prompt('Enter the name of POI', 'POI name');
        // if(prmpt != ''){
        //  console.log('You wrote ' + prmpt);
        // }
        
        
    }


///////////////////////////////////Reloading datas////////////////////
socket.on('poi_reload', function(){
    socket.emit('poi_map_filter',{'filter':''});
})






