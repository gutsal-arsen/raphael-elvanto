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
    default:
      res.send("Undefined search type");
  }
});

module.exports = router;
