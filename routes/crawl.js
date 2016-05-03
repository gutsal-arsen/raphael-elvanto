var express = require('express');
var request = require('request');
var async = require('async');

var xml = require('xml');

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
          var p = person.info;

          geocoder.geocode({
            address: p.home_city + ", " + p.home_address + ", " + p.home_address2,
            country: p.home_country,
            zipcode: p.home_postcode
          }, function (value, data) {

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

router.post('/elvanto_to_google', function (req, res) {
  //debugger;
  var attrHash = req.body;
  var oauthCode = attrHash['oauth_code'],
      oauthTokens = attrHash['oauth_tokens'];

  var accessToken = oauthTokens.access_token;
  // TODO: example to real contacts
  getElvantoContacts(function (err, peoples) {
    if (err) {
      return res.send("An error getElvantoContacts: " + err );
    }
    createGoogleContactGroup('elvanto', oauthTokens, function (err, groupName) {
      if (err) {
        return res.send("An error createGoogleContactGroup: " + err );
      }

      var D = 1000;
      var N = 10;

      async.forEachLimit(peoples, N, function (person, callback) {
        createGoogleContact(person, groupName, accessToken, function (err) {
          setTimeout(function() {
            callback(err);
          }, D);
        });
      }, function (err) {
        if (err) return res.send(err);
        return res.send("Ok");
      });

    })
  });
});

// var getExampleElvantoContacts = function(callback) {
//   var table_fields = {
//     '_id': true,
//     'firstname': true,
//     'lastname': true,
//     'email': true,
//     'phone': true,
//     'home_city': true,
//     'home_address': true
//   };
//   People.find({id: "af472139-e8bb-11e4-af42-0673d9c9b5d6"}, table_fields, function(err, peoples) {
//     callback(err, peoples);
//   });
// };

var getElvantoContacts = function (callback) {
  var table_fields = {
    '_id': true,
    'firstname': true,
    'lastname': true,
    'email': true,
    'phone': true,
    'mobile': true,
    'home_city': true,
    'home_state': true,
    'home_country': true,
    'home_address': true,
    'home_address2': true,
    'home_postcode': true,
  };
  People.find({}, table_fields, function(err, peoples) {
    callback(err, peoples);
  });
}

var createGoogleContactGroup = function(groupName, accessToken, callback) {
  // TODO: please, make a group <groupName> manually for now!
  callback(null, groupName);
}

var createGoogleContact = function(contact, groupName, accessToken, callback) {
  // TODO: groupName is not used yet
  /* TODO: Contact as a proxy model for Google contact entity:
     Contact.storeOne(person, function (err, body) {   }); */
  var xmlString = xml({
    "atom:entry": [{
      _attr: {
        "xmlns:atom": "http://www.w3.org/2005/Atom",
        "xmlns:gd": "http://schemas.google.com/g/2005"
      }
    },{
      "atom:category": [{
        _attr: {
          scheme:"http://schemas.google.com/g/2005#kind",
          term:"http://schemas.google.com/contact/2008#contact"
        }
      }]},
                   {"id": contact._id},
                    contact.email ? {"gd:email": [{ _attr: { label: 'Personal', address: contact.email }}]} : {},
                    contact.phone ? {"gd:phoneNumber": [{ _attr: {rel: "http://schemas.google.com/g/2005#home"}}, contact.phone]} : {},
                    contact.mobile ? {"gd:phoneNumber": [{ _attr: {rel: "http://schemas.google.com/g/2005#mobile"}}, contact.mobile]} : {},
                   {"gd:structuredPostalAddress": [ {_attr: {rel: "http://schemas.google.com/g/2005#work"}},
                     {"gd:city": contact.home_city},
                     {"gd:streed": contact.home_address + contact.home_address2},
                     {"gd:region": contact.home_state},
                     {"gd:postcode": contact.home_postcode},
                     {"gd:country": contact.home_country},
                     {"gd:formattedAddress": contact.home_city + "," + contact.home_address + "," + contact.home_address2}
                   ]},
                   {"gd:name": [
                     {"gd:givenName": contact.firstname},
                     {"gd:familyName": contact.lastname},
                     {"gd:fullName": contact.firstname + " " + contact.lastname}
                   ]}
                  ]});

  console.log(xmlString);

  request.post({
    uri: 'https://www.google.com/m8/feeds/contacts/default/full/',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'GData-Version': '3.0',
      'Content-Type': 'application/atom+xml'
    },
    body: xmlString
  }, function (error, response, body) {
    console.log(error,  body);
    response || console.log('Response status message: ' + response.statusMessage);
    return callback(error);
  });
}

module.exports = router;
