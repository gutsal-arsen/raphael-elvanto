// $ = function(param){
//     if(typeof(param) === 'string'){
// 	return [].slice.call(document.querySelectorAll(param)); // turning NodeList returned into an Array
//     }
//     return null;
// };

var handlers = {
  importElvanto: function (e) {
    $.get({
      url: '/crawl',
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

  search: function (e) {
    $.get({
      url: '/search',
      method: 'POST',
      data: {
        search_type: $('select#search_type').val(),
        search_term: $('input#search_term').val()
      },
      beforeSend: function () {
        $('.search_result').fadeOut('slow');
      },
      complete: function (response) {
        $('.search_result').fadeIn('slow');
      },
      success: function (response, status) {
        $('.search_result').html(response);
        $('.search_result').hide();
        console.log(status, response);
      }
    });
  }
};

document.onreadystatechange = function (e) {
  if (e.target.readyState == 'complete') {
    $('*[data-action]').each(function (idx, b) {
      b.onclick = handlers[b.dataset['action']]; // assigning onclick handler
    });
  }
};

function initMap(lng, lat, serializedMarkers) {
  var mapDiv = document.getElementById('map');

  var map = new google.maps.Map(mapDiv, {
    center: {lat: parseFloat(lat), lng: parseFloat(lng)},
    zoom: 8
  });

  var markersArray = serializedMarkers.split(';');
  var markersLength = markersArray.length;
  for (var i = 0; i < markersLength; i++) {
    var markerLngLatTitle = markersArray[i].split(',');
    var lng = parseFloat(markerLngLatTitle[0]),
        lat = parseFloat(markerLngLatTitle[1]),
        title = markerLngLatTitle[2];
    var latLng = {lat: lat, lng: lng};
    var marker = new google.maps.Marker({
      position: latLng,
      map: map,
      title: title
    });
  }
}