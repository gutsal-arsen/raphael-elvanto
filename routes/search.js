var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');

var table_fields = {
  'firstname': true,
  'lastname': true,
  'gender': true,
  'home_city': true,
  'home_address': true
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
  db.collection('peoples').find({loc:{$geoWithin: { $centerSphere: [ [lng, lat] , rad/3963.2] } } }).toArray(function(err, results){
    callback(err, results);
  });
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
        res.render("search_results", {peoples: results});
      });
      break;
    case 'street':
      findPeoplesByStreetAddress(search_term, function (err, results) {
        res.render("search_results", {peoples: results});
      });
      break;
    case 'loc':
      if (search_term.split(',').length != 3) {
        res.send("Incorrect search term syntax used.");
        return;
      }
      var lng = parseFloat(search_term.split(',')[0]),
        lat = parseFloat(search_term.split(',')[1]),
        rad = parseFloat(search_term.split(',')[2]);
      findPeoplesByLoc(lng, lat, rad, function (err, results) {
        res.render("search_results", {peoples: results});
      });
      break;
    default:
      res.send("Undefined search type");
  }
});

module.exports = router;
