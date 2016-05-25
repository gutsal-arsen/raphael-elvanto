var express = require('express');
var router = express.Router();
var async = require('async');

var Peoples = require('./models/people');
var mongoose = require('mongoose');

var calculateGMapPosition = function(peoples) {
  // google map center position - first matched user from array, if any :
  if (peoples.length > 0) {
    var centerLng = peoples.reduce(function(sum, person) {
      var personLng = Peoples.getLng(person);
      return (sum + personLng);
    }, 0)/peoples.length;

    var centerLat = peoples.reduce(function(sum, person) {
      var personLat = Peoples.getLat(person);
        return (sum + personLat);
      }, 0)/peoples.length;
    return [centerLng, centerLat];
  }
  return [0,0]
};

var getMarkerName = function(person) {
  return (person.firstname + ' ' + person.lastname + ' at ' + person.home_address);
}

var getPeoplesMarkers = function(peoples, callback) {
  var peoplesLength = peoples.length;
  async.mapSeries(peoples, function(person, peoplesCb) {
    Peoples.getFamilyMembers(person, function (err, families) {
      if (err) return peoplesCb(err);
      var marker = {
        markerTitle: getMarkerName(person),
        lng: Peoples.getLng(person),
        lat: Peoples.getLat(person),
        address: Peoples.getAddressStr(person),
        phone: Peoples.getPhoneStr(person),
        fullName: Peoples.getFullNameStr(person),
        families: Peoples.getFamilyMembersStrArray(families)
      };
      peoplesCb(null, marker);
  });
  }, function(err, peopleMarkers) {
    callback(err, peopleMarkers);
  });
};

var dbErrorRespond = function(res, err) {
  var errorMsg = 'Peoples fetching error: _ERR'.replace('_ERR', err);
  console.error(errorMsg);
  return res.send(errorMsg);
}


/* GET users listing. */
router.get('/', function (req, res) {
  var serverApiKey = process.env.GOOGLE_SERVER_API_KEY;
  res.render('search', {title: 'Visitation Planner', serverApiKey: serverApiKey});
});

/* Render with the given peoples data
   gMapPosition - optional map position, object with {lng:, lat:} properties. If it eq null, map will be auto-centered.
*/
var respondWithSearchResults = function(res, err, peoples, gMapPosition) {
  if (err) return dbErrorRespond(res, err);
  getPeoplesMarkers(peoples, function (err, peopleMarkers) {
    if (err) return dbErrorRespond(res, err);
    var gMapPos = (gMapPosition == null) ? calculateGMapPosition(peoples) : gMapPosition;
    res.render("search_results", {peoples: peoples, peopleMarkers: peopleMarkers, gMapPos: gMapPos});
  });
}

router.get('/getCities', function (req, res) {
    Peoples.allCities(function (err, cities) {
        res.json(cities);
    });
});

router.get('/getZIPs', function (req, res) {
    Peoples.allZIPs(function (err, zips) {
        res.json(zips);
    });
});

router.post('/', function (req, res) {
  var attrHash = req.body;
  var search_type = attrHash['search_type'],
      search_term = attrHash['search_term'];
  if (!search_type.length || !search_term.length) {
      res.status(500).send("Search parameters can't be blank");
      return;
  }
  switch (search_type) {
  case 'zip':
      Peoples.findPeoplesByPostcode(search_term, function (err, peoples) {
          //respondWithSearchResults(res, err, peoples, null);
          res.json(peoples);
      });
      break;
    case 'city':
      Peoples.findPeoplesByCity(search_term, function (err, peoples) {
        //respondWithSearchResults(res, err, peoples, null);
        res.json(peoples);
      });
      break;
    case 'street':
      Peoples.findPeoplesByStreetAddress(search_term, function (err, peoples) {
          //respondWithSearchResults(res, err, peoples, null);
	  res.json(peoples);
      });
      break;
    case 'loc':
      var search_term_params = search_term.split(',');
      if (search_term_params.length != 3) {
        res.send("Incorrect search term syntax used.");
        break;
      }
      var lng = parseFloat(search_term_params[0]),
        lat = parseFloat(search_term_params[1]),
        rad = parseFloat(search_term_params[2]);
      Peoples.findPeoplesByLoc(lng, lat, rad, function (err, peoples) {
        respondWithSearchResults(res, err, peoples, {lng: lng, lat: lat});
      });
      break;
    default:
      res.status(500).send("Undefined search type");
  }
});

module.exports = router;
