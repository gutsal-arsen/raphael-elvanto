var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');

var table_fields = {
  'firstname': true,
  'lastname': true,
  'gender': true,
  'home_city': true,
  'home_address': true,
  'loc': true
};

var findPeoplesByCity = function(city, callback) {
  var db = mongoose.connection;
  db.collection('peoples').find({'home_city': city}, table_fields).toArray(function(err, results){
    callback(err, results);
  });
};

var findPeoplesByStreetAddress = function(streetAddress, callback) {
  var db = mongoose.connection;
  db.collection('peoples').find({'home_address': {'$regex': '.*'+streetAddress+'.*'}}, table_fields).toArray(function(err, results){
    callback(err, results);
  });
};

var findPeoplesByLoc = function(lng, lat, rad, callback) {
  var db = mongoose.connection;
  const EARTH_RADIUS = 3963.2;
  db.collection('peoples').find({loc:{$geoWithin: { $centerSphere: [ [lng, lat] , rad/EARTH_RADIUS] } } }).toArray(function(err, results){
    callback(err, results);
  });
};

var calculateGMapPosition = function(peoples) {
  // google map center position - first matched user from array, if any :
  if (peoples.length > 0) {
    var location = peoples[0].loc;
    if (location.length > 0) {
      var gMapPos = [location[0], location[1]]; // lng, lat
      return gMapPos;
    }
  }
  return [0,0]
};

// Produce peoples markers string in form "lng1,lat1,name1;lng2,lat2,name2" for further easy parsing
var getPeoplesMarkers = function(peoples) {
  var peoplesLength = peoples.length;
  var markers = "";
  for (var i = 0; i < peoplesLength; i++) {
    if (i > 0) markers += ';';
    var lng = peoples[i].loc[0],
        lat = peoples[i].loc[1],
    // quickFix: replace our 'special' symbols if they occurs in concatenated string
        markerName = (peoples[i].firstname + ' ' + peoples[i].lastname + ' at ' + peoples[i].home_address).split(',').join(' ').split(';').join(' ');
    markers += (lng + ',' + lat + ',' + markerName);
  }
  return markers;
};

/* GET users listing. */
router.get('/', function (req, res) {
  res.render('search', {title: 'Search'});
});

router.post('/', function (req, res) {
  var attrHash = req.body;
  var search_type = attrHash['search_type'],
      search_term = attrHash['search_term'];
  if (!search_type.length || !search_term.length) {
    res.send("Search parameters can't be blank");
    return;
  }
  switch (search_type) {
    case 'city':
      findPeoplesByCity(search_term, function (err, results) {
        var gMapPos = calculateGMapPosition(results);
        var markers = getPeoplesMarkers(results);
        res.render("search_results", {peoples: results, gMapPos: gMapPos, markers: markers});
      });
      break;
    case 'street':
      findPeoplesByStreetAddress(search_term, function (err, results) {
        var gMapPos = calculateGMapPosition(results);
        var markers = getPeoplesMarkers(results);
        res.render("search_results", {peoples: results, gMapPos: gMapPos, markers: markers});
      });
      break;
    case 'loc':
      var search_term_params = search_term.split(',');
      if (search_term_params.length != 3) {
        res.send("Incorrect search term syntax used.");
        return;
      }
      var lng = parseFloat(search_term_params[0]),
        lat = parseFloat(search_term_params[1]),
        rad = parseFloat(search_term_params[2]);
      findPeoplesByLoc(lng, lat, rad, function (err, results) {
        var markers = getPeoplesMarkers(results);
        res.render("search_results", {peoples: results, gMapPos: [lng, lat], markers: markers});
      });
      break;
    default:
      res.send("Undefined search type");
  }
});

module.exports = router;
