'use strict';

angular.module('sedApp')
  .controller('MapCtrl', function($scope, FollowUp, contactFactory) {
    $scope.title = 'Map';

    $scope.initiateMap = function() {
      var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        osmAttrib = 'Map data © OpenStreetMap contributors',
        osm = L.tileLayer(osmUrl, {minZoom: 6, maxZoom: 18, attribution: osmAttrib}),
        markers = {

          Event: {
            green: L.AwesomeMarkers.icon({
              icon: 'circle',
              markerColor: 'green',
              prefix: 'icon'
            }),
            red: L.AwesomeMarkers.icon({
              icon: 'circle',
              markerColor: 'red',
              prefix: 'icon'
            }),
            grey: L.AwesomeMarkers.icon({
              icon: 'circle',
              markerColor: 'grey',
              prefix: 'icon'
            })
          }
        };

      function selectIcon(event_class, updateStatus) {
        switch (updateStatus) {
          case 'lastDay':
            return markers[event_class].green;
          case 'within48Hours':
            return markers[event_class].grey;
          case 'outdated':
            return markers[event_class].red;
        }
        // Unknown event type?
        return markers[event_class].red;

      }

      function markerPopup(marker_properties) {
        var date = new Date(marker_properties.timestamp), infoText = '<p>' + marker_properties.name +'</p><p>'+date+'</p>';

        return infoText;
      }

      function createEventsLayer(events) {
        return L.geoJson(events, {
          style: {
            "weight": 1,
            "opacity": 0.3,
          },
          pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
              icon: selectIcon('Event', feature.properties.updateStatus),
            });
          },
          onEachFeature: function(feature, layer) {
            /*
            var events = document.getElementById('events'),
              featureDiv = document.createElement('div');
            featureDiv.classList.add('event-div');
            $(featureDiv).html(feature.properties.name);
            events.insertBefore(featureDiv, events.firstChild.nextSibling);
            */
            if (feature.properties && feature.properties.name) {
              layer.bindPopup(markerPopup(feature.properties));
            }
          }
        });
      }

      // function createVehicleDriveLayer(data) {
      //   var locations = data.features, polylines = [];
      //   if (locations.length > 0) {
      //     var driver = locations[0].properties.driver, i = 0 , linepoints = [];
      //     while (i < locations.length) {
      //
      //       if (locations[i].properties.driver != driver) {
      //         driver = locations[i].properties.driver;
      //         polylines.push(linepoints);
      //         linepoints = [];
      //       }
      //       linepoints.push([locations[i].geometry.coordinates[1], locations[i].geometry.coordinates[0]]);
      //       i++;
      //     }
      //     polylines.push(linepoints);
      //   }
      //   var colorOptions = ['red', 'blue', 'green', 'yellow'], colorChoice = 0;
      //   var layer = L.layerGroup(), pline;
      //   for (j = 0; j < polylines.length; j++) {
      //     pline = new L.Polyline(polylines[j], {
      //       color: colorOptions[colorChoice],
      //       weight: 5,
      //       smoothFactor: 10
      //
      //     });
      //     layer.addLayer(pline);
      //     colorChoice++;
      //     if (colorChoice > 3) {
      //       colorChoice = 0;
      //     }
      //   }
      //   return layer;
      // }

      // Facilities GeoJSON Layer
      var events, clonedEvents, eventsLayer;

      requestUpdatedJson('couchdb', function (events) {
        clonedEvents = _.clone(events);
        eventsLayer = createEventsLayer(events);
        eventsLayer.addTo(map);
        var overlayMaps = {
          "Events": eventsLayer,
//        "Vehicle positions": vehiclePositionsLayer,
        };
//      map.fitBounds(eventsLayer.getBounds());
        L.control.layers(baseMaps, overlayMaps, {collapsed: false}).addTo(map);
      });//,
        //vehiclePositions = requestUpdatedJson('/latest_vehicle_locations/600/'),
        //clonedVehiclePositions = _.clone(vehiclePositions),
        //vehiclePositionsLayer = createVehicleDriveLayer(vehiclePositions);

      setInterval(function() {
        requestUpdatedJson('couchdb', function (newEvents) {
          if (!(_.isEqual(clonedEvents, newEvents))) {
            console.log('events have changed');
            events = newEvents;
            clonedEvents = _.clone(events);
            map.removeLayer(eventsLayer);
            eventsLayer = createEventsLayer(events);
            eventsLayer.addTo(map);
            L.control.layers(baseMaps, overlayMaps, {collapsed: false}).addTo(map);
          }
        });
      }, 300000);

      // setInterval(function() {
      //   var newVehiclePositions = requestUpdatedJson('/latest_vehicle_locations/600/');
      //   if (!(_.isEqual(clonedVehiclePositions, newVehiclePositions))) {
      //     console.log('vehicle positions have changed');
      //     vehiclePositions = newVehiclePositions;
      //     clonedVehiclePositions = _.clone(vehiclePositions);
      //     map.removeLayer(vehiclePositionsLayer);
      //     vehiclePositionsLayer = createVehicleDriveLayer(vehiclePositions);
      //     vehiclePositionsLayer.addTo(map);
      //   }
      // }, 5000);

      var map = L.map('map', {
        center: new L.LatLng(6.5, 3.3),
        zoom: 10,
        minZoom: 1,
        maxZoom: 18,
        layers: [osm]
      });

      var baseMaps = {
        "Map": osm
      };

    }


function getService(serviceName) {
  if (serviceName=='followup') {
    return FollowUp;
  } else {
    return contactFactory;
  }
}
// function getDriver(driverId) {
//     return "Driver " + driverId;
// }
//    function getBubbleName(f) {
//      return ""//"Driver: " + "<b>" + f.driver_phone + "</b>" + "<br>" + f.lat + ", " + f.lon + "<br>" + "Event Code: " + f.event_code + "<br>" + f.event_name + "<br>" + new Date(f.timestamp * 1000);
//    }

    function requestUpdatedJson(serviceName, callback) {
      getService(serviceName).all().then(function(response) {
        callback(parseResponseJsonData(response));
      });
    }

    function parseResponseJsonData(data) {
      var items = [];
      //var events_array = [];
      $.each(data.rows, function(i, g) {
        var f = g["doc"];
        if (f["dailyVisits"] && f["dailyVisits"].length > 0) {
          var item = {},
          lastDailyVisit = _.last(_.sortBy(f["dailyVisits"], 'dateOfVisit')),
          timeDelta = new Date() - new Date(lastDailyVisit["dateOfVisit"]),
          updateStatus = 'outdated';


          if (timeDelta > 172800000) {
            updateStatus = 'outdated';
          } else if (timeDelta > 86400000 ) {
            updateStatus = 'within48Hours';
          } else {
            updateStatus = 'lastDay';
          }

          if (lastDailyVisit["geoInfo"]["coords"]) {
            item.properties = {
              name: f["OtherNames"]+" "+f["Surname"],
              timestamp: lastDailyVisit["dateOfVisit"],
              updateStatus: updateStatus
            };
            item.geometry = {
              type: "Point",
              coordinates: [parseFloat(lastDailyVisit["geoInfo"]["coords"]["longitude"]), parseFloat(lastDailyVisit["geoInfo"]["coords"]["latitude"])]
            };
            item.type = "Feature";
            items.push(item);
          }
       }
      });

      // return the FeatureCollection
      return { type: "FeatureCollection", features: items };
    }
  });
