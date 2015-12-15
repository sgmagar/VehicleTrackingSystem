              $(function() {
                  $('input[name="datefilter"]').daterangepicker({
                      singleDatePicker: true,
                      showDropdowns: true
                  }, 
                  function(start, label) {
                      var years = moment().diff(start, 'years');
                      
                  });
              });
   // canvas chart
   window.onload = function () {


    var fuelData = [//array
         { x: new Date(2012, 00, 30), y: 20, lat: 27.12345, lng: 85.23451},
        { x: new Date(2012, 01, 3), y: 38, lat: 27.12875, lng: 85.27851},
        { x: new Date(2012, 02, 5), y: 43, lat: 27.18945, lng: 85.09451},
        { x: new Date(2012, 09, 27), y: 60, lat: 27.09120, lng: 85.12981}
      ];


    var chart = new CanvasJS.Chart("chartContainer",
    {
      //zoomEnabled: true,
      //title:{
       // text: "Simple Date-Time Chart"
  //  },
   backgroundColor:"black",
   
     toolTip:{
     content:"{name}:{y}",
     backgroundColor: "white"
    },
    axisX:{
       // title: "timeline",
       // gridThickness: 2,
       valueFormatString: "MMM",
       tickLength: 0,
      //gridColor: "#FFFFFF",
      labelFontColor: "white",
      labelFontSize: 15
    },
    axisY: {
      interval: 50,
      //  title: "Downloads",
        tickLength: 1,
        gridColor: "white",
        gridThickness: "null",
       // interlacedColor:"black"
        //includeZero: false
       // interval: 5,
       labelFontColor: "white",
       labelFontSize: 15,
       suffix: " %"
    },
    

    

    data: [
    {        
       type: "spline",
       toolTipContent: "<img src = 'adminSource/canvasFiles/images.jpg' width = '18' height = '18'>{lat},{lng}<br>{y}%",
       name:"fuel",
        dataPoints: fuelData
    }
    ]
});

    chart.render();

    //Second chart



    var speedData = [//array
        { x: new Date(2012, 00, 30), y: 20, lat: 27.12345, lng: 85.77451},
        { x: new Date(2012, 01, 3), y: 38, lat: 27.78345, lng: 85.12451},
        { x: new Date(2012, 02, 5), y: 43, lat: 27.45345, lng: 85.45451},
        { x: new Date(2012, 09, 27), y: 60, lat: 27.00345, lng: 85.88451}

        ];

    var newChart = new CanvasJS.Chart("chartContainer2",
    {
      //zoomEnabled: true,
      //title:{
       // text: "Simple Date-Time Chart"
  //  },
   backgroundColor:"black",
   
    toolTip:{
     content:"{name}:{y}",
     backgroundColor: "white"
     },
    axisX:{
       // title: "timeline",
       // gridThickness: 2
       valueFormatString: "MMM",
       tickLength: 0,
      //gridColor: "#FFFFFF",
      labelFontColor: "white",
      labelFontSize: 15
    },
    axisY: {
      interval: 50,
      //  title: "Downloads",
        tickLength: 1,
        gridColor: "white",
        gridThickness: "null",
       // interlacedColor:"black"
        //includeZero: false
       // interval: 5,
       labelFontColor: "white",
       labelFontSize: 15,
       suffix: " kmph"
    },
    
    


    data: [
    {        
       type: "spline",
       toolTipContent: "<img src = 'adminSource/canvasFiles/images.jpg' width = '18' height = '18'>{lat},{lng}<br>{y} Kmph",
       name:"Speed",
        dataPoints: speedData
    }
    ]
});

    newChart.render();

}
