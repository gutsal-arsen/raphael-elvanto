var express = require('express');
var router = express.Router();
var async = require('async');
var _ = require('lodash');

var Peoples = require('./models/people');
var mongoose = require('mongoose');


/* GET users listing. */
router.get('/', function (req, res) {
  var serverApiKey = process.env.GOOGLE_SERVER_API_KEY;
  res.render('search', {title: 'Visitation Planner', serverApiKey: serverApiKey});
});

router.get('/getCities', function (req, res) {
    Peoples.allCities(function (err, cities) {
        res.json(_.without(cities, ''));
    });
});

router.get('/getZIPs', function (req, res) {
    Peoples.allZIPs(function (err, zips) {
        res.json(_.without(zips, ''));
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
