var express = require('express');
var request = require('request');

var mongoose = require('mongoose');

mongoose.connect("mongodb://localhost/elvanto");
var db = mongoose.connection,
  peopleSchema = mongoose.Schema({
    id: 'string',
    date_added: 'string',
    date_modified: 'string',
    category_id: 'string',
    firstname: 'string',
    preferred_name: 'string',
    lastname: 'string',
    email: 'string',
    phone: 'string',
    mobile: 'string',
    admin: 'number',
    contact: 'number',
    archived: 'number',
    deceased: 'number',
    volunteer: 'number',
    status: 'string',
    username: 'string',
    last_login: 'string',
    country: 'string',
    timezone: 'string',
    picture: 'string',
    family_id: 'number',
    family_relationship: 'string',
    gender: 'string',
    birthday: 'date',
    anniversary: 'string',
    school_grade: 'object',
    marital_status: 'string',
    development_child: 'string',
    special_needs_child: 'string',
    security_code: 'string',
    receipt_name: 'string',
    giving_number: 'string',
    mailing_address: 'string',
    mailing_address2: 'string',
    mailing_city: 'string',
    mailing_state: 'string',
    mailing_postcode: 'string',
    mailing_country: 'string',
    home_address: 'string',
    home_address2: 'string',
    home_city: 'string',
    home_state: 'string',
    home_postcode: 'string',
    home_country: 'string',
    access_permissions: 'object',
    departments: 'string',
    service_types: 'string',
    demographics: 'object',
    locations: 'string',
    family: 'object',
    reports_to: 'string',
    loc: 'array'
  }),
  People = mongoose.model('people', peopleSchema);

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('Database opened:');
});


//
////var People = require("./models/people").collection.initializeOrderedBulkOp();

var geocoderProvider = 'google';
var httpAdapter = 'http';
var geocoder = require('node-geocoder')(geocoderProvider, httpAdapter, {});


var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
  request({
    method: 'GET',
    uri: 'https://api.elvanto.com/v1/people/getAll.json',
    auth: {
      'user': 'ndCR8G79Qakqhhji1OeAQxHJAinI4ZSi:x',
      'pass': '',
      'sendImmediately': true
    },
    json: true
  }, function (error, response, body) {
    if (!error) {
      var to = setInterval(function () {
        var person;
        if (person = body.people.person.pop()) {
          storeOne(person);
        } else {
          clearInterval(to);
        }
      }, 500);

      var storeOne = function (person) {
        request.post({
          uri: 'https://api.elvanto.com/v1/people/getInfo.json',
          auth: {
            'user': 'ndCR8G79Qakqhhji1OeAQxHJAinI4ZSi:x',
            'pass': '',
            'sendImmediately': true
          },
          body: {
            id: person.id,
            fields: [
              'gender',
              'birthday',
              'anniversary',
              'school_grade',
              'marital_status',
              'development_child',
              'special_needs_child',
              'security_code',
              'receipt_name',
              'giving_number',
              'mailing_address',
              'mailing_address2',
              'mailing_city',
              'mailing_state',
              'mailing_postcode',
              'mailing_country',
              'home_address',
              'home_address2',
              'home_city',
              'home_state',
              'home_postcode',
              'home_country',
              'access_permissions',
              'departments',
              'service_types',
              'demographics',
              'locations',
              'family',
              'reports_to'
            ]
          },
          json: true
        }, function (error, response, body) {
          person.info = body.person[0];

          //People.save(person, function(a,b,c){
          //  console.log(a,b,c);
          //})
          var p = body.person[0];

          geocoder.geocode({
            address: p.home_city + ", " + p.home_address + ", " + p.home_address2,
            country: p.home_country,
            zipcode: p.home_postcode
          }, function (value, data) {
            //console.log(value, data);

            if (data.length) {
              p.loc = [data[0].longitude, data[0].latitude];

              new People(p).save(function (err, instance) {
                console.log(err, instance);
              });
            } else {
              console.log("Empty data returned");
            }
          });

          console.log(p.home_city, p.home_address, geocoder);
        })
      };

      res.send("DONE, body length:" + body.length);
    } else {
      res.send("An error occurred:" + error);
    }
  });
});

module.exports = router;
