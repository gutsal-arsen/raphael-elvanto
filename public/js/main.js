// $ = function(param){
//     if(typeof(param) === 'string'){
// 	return [].slice.call(document.querySelectorAll(param)); // turning NodeList returned into an Array
//     }
//     return null;
// };
var notificationContainer;
$(document).ready(function (arg) {
  notificationContiner = new NotificationContainer();
})

var handlers = {
  importElvanto: function (e) {
    serverWS.send(JSON.stringify({fn: 'elvanto_to_db'}), (ret) => {
      console.log('Returned:' + ret);
    })
  },

  importExcel: function (e) {
    $('input[type=file]').click();
  },

  test: function (e) {
    var progressWidget = new ProgressWidget('#list-group-progress',
                                        '.dropdown .dropdown-menu .panel .list-group',
                                        {text: 'Import process started', small_text: 'at: ' + new Date(), progress: 0});
    notificationContiner.add.call(notificationContiner, progressWidget);

    var n = 0
    , i = setInterval(function (e) {
      if(n == 30){
        progressWidget.done.call(progressWidget, {
          text: 'Finished'
        });

        clearInterval(i);
        return;
      }
      progressWidget.update.call(progressWidget, {
        text: 'Updating records(' + n++ + ')',
        progress: parseInt(n)*1/30*100
      });
    }, 500)

  },

  exportGoogleContacts: function (e) {
    // redirect for now
    window.location = '/auth';
  },

  search: function (e) {
    $.ajax({
      url: '/search',
      method: 'POST',
      data: {
        search_type: $('input[name="search_type"]', $(e.target).parent().parent()).val(),
        search_term: $('*[name="search_term"]', $(e.target).parent().parent()).val()
      },
      success: function (response, status) {
        var peoples = response;
        $('.search_result *[type="dataTree"]').dataTree(response);
        // FIX: google map isn't displayed correctly if has been constructed upon hidden state
        //$('.search_result').hide();
        console.log(status, response);
        prepareMap(peoples);
      }
    });
  },

  search_on_enter: function(e) {
    if ( e.which == 13 ) {
      $("button[data-click=search]").click();
    }
  },

};

function getMarkerBubbleContent(bubble_data) {
  var bubble_template = $('#marker_bubble_template').html();
  return Mustache.render(bubble_template, bubble_data);
}

function addMarkerBubble(map, gMapMarker, personMarker) {
  var bubbleData = {
    full_name: personMarker.fullName,
    address: personMarker.address,
    phone: personMarker.phone,
    families: personMarker.families
  };
  gMapMarker['bubble'] = new google.maps.InfoWindow({
    content: getMarkerBubbleContent(bubbleData)
  });

  google.maps.event.addListener(gMapMarker, 'click', function() {
    var bubble = this['bubble'];
    bubble.isOpened === undefined ? bubble.isOpened = false : bubble.isOpened = !bubble.isOpened;
    bubble.isOpened ? bubble.close() : bubble.open(map, this);
  });
}

var calculateGMapPosition = function(peoples) {
  // google map center position - first matched user from array, if any :
  if (peoples.length > 0) {
    var centerLng = _.reduce(peoples, function(sum, person) {
      if(person.loc && person.loc.length){
        return (sum + person.loc[0]);
      } else {
        return sum;
      }
    }, 0)/peoples.length;

    var centerLat = _.reduce(peoples, function(sum, person) {
      if(person.loc && person.loc.length){
        return (sum + person.loc[1]);
      } else {
        return sum;
      }
    }, 0)/peoples.length;
    return [centerLng, centerLat];
  }
  return [0,0]
};


var getPeoplesMarkers = function(peoples) {
  var markers = _.map(peoples, function(person) {
    if(person.loc && person.loc.length){
      var marker = {
        markerTitle: (person.lastname + ', ' + person.firstname + ' at ' + person.home_address),
        lng: person.loc?person.loc[0]:0,
        lat: person.loc?person.loc[1]:0,
        address: person.home_address,
        phone: person.phone?person.phone:person.mobile,
        fullName: person.lastname + ',' + person.firstname,
        families: _.map(person.family.family_member, function (person) {
          return person.lastname + ', ' + person.firstname;
        })
      };
      return marker;
    } else {
      return null;
    }
  });
  return _.without(markers, null);
};

/* Render with the given peoples data
   gMapPosition - optional map position, object with {lng:, lat:} properties. If it eq null, map will be auto-centered.
*/
var prepareMap = function(peoples, gMapPosition) {
  var markers = getPeoplesMarkers(peoples);
  var lngLat = calculateGMapPosition(peoples);
  initMap(lngLat[0], lngLat[1], markers);
}

function initMap(lng, lat, peopleMarkers) {
  var mapDiv = document.getElementById('map');
  var map = new google.maps.Map(mapDiv, {
    center: {lat: parseFloat(lat), lng: parseFloat(lng)},
    zoom: 12
  });
  var googleMarkers = [];
  var peopleMarkersLength = peopleMarkers.length;

  // put markers on the map
  for (var i = 0; i < peopleMarkersLength; i++) {
    var personMarker = peopleMarkers[i];
    var lng = parseFloat(personMarker.lng),
        lat = parseFloat(personMarker.lat),
        title = personMarker.markerTitle;
    var latLng = {lat: lat, lng: lng};

    var gMapMarker = new google.maps.Marker({
      position: latLng,
      map: map,
      title: title
    });

    addMarkerBubble(map, gMapMarker, personMarker);
    googleMarkers.push(gMapMarker);
  }

  if (googleMarkers.length > 0) {
    // Make all markers fit screen
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < googleMarkers.length; i++) {
      bounds.extend(googleMarkers[i].getPosition());
    }
    map.fitBounds(bounds);
    map.setCenter(latLng);
    //map.setZoom(map.getZoom()-1);
  }
}

document.onreadystatechange = function (e) {
  if (e.target.readyState == 'complete') {
    $('*[data-click]').each(function (idx, b) {
      b.onclick = handlers[b.dataset['click']]; // assigning onclick handler
    });
    $('*[data-onkeypress]').each(function (idx, b) {
      b.onkeypress = handlers[b.dataset['onkeypress']]; // assigning onkeypress handler
    });

    $("#search_type").change(function (e) {
      if (e.currentTarget.selectedIndex === 3) { // last item selected
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(showPosition);
        }

        function showPosition(position) {
          $("#search_term").val(position.coords.longitude + "," + position.coords.latitude + ",10");
        }
      }
    });
  }
};
