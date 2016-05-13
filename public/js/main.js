// $ = function(param){
//     if(typeof(param) === 'string'){
// 	return [].slice.call(document.querySelectorAll(param)); // turning NodeList returned into an Array
//     }
//     return null;
// };

var handlers = {
  importElvanto: function (e) {
    $.ajax({
      url: '/crawl/elvanto_to_db',
      method: 'GET',
      beforeSend: function () {
        $(document.body).fadeOut('slow');
      },
      complete: function () {
        $(document.body).fadeIn('slow');
      },
      success: function (response, status) {
        console.log(status, response);
      }
    });
  },

  importExcel: function (e) {
    $('input[type=file]').click();
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
        search_type: $('select#search_type').val(),
        search_term: $('input#search_term').val()
      },
      beforeSend: function () {
        //$('.search_result').fadeOut('slow');
      },
      complete: function (response) {
        //$('.search_result').fadeIn('slow');
      },
      success: function (response, status) {
        $('.search_result').html(response);
        // FIX: google map isn't displayed correctly if has been constructed upon hidden state
        //$('.search_result').hide();
        console.log(status, response);
      }
    });
  },

  search_on_enter: function(e) {
    if ( e.which == 13 ) {
      $("button[data-click=search]").click();
    }
  }
};

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

function initMap(lng, lat, peopleMarkers) {
  var mapDiv = document.getElementById('map');
  var map = new google.maps.Map(mapDiv, {
    center: {lat: parseFloat(lat), lng: parseFloat(lng)},
    zoom: 8
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
