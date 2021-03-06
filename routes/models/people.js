var mongoose = require('mongoose');

const EARTH_RADIUS = 3963.2; // const value is duplicated in search.js
const FAMILY_RADIUS_MILES = 15;

module.exports = {

  FAMILY_RADIUS_RADIANS: FAMILY_RADIUS_MILES / EARTH_RADIUS,

  People: global.People = global.People || mongoose.model('people', mongoose.Schema({
    elvantoId: 'string',
    googleId: 'string',
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
    birthday: 'string',
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
    service_types: 'array',
    demographics: 'object',
    locations: 'string',
    family: 'object',
    reports_to: 'array',
    loc: 'array'
  })),


  // list of preferred fields for fetching by db-specific module functions
  tableFields: {
    'firstname': true,
    'lastname': true,
    'gender': true,
    'home_city': true,
    'home_address': true,
    'home_postcode': true,
    'picture': true,
    'elvantoId': true,
    'phone': true,
    'mobile': true,
    'loc': true,
    'family': true
  },

  getFullNameStr: function (person) {
    return person.firstname.concat(" ", person.lastname);
  },

  getAddressStr: function (person) {
    return person.home_address;
  },


  /*
  * Database-Specific Methods
  * */

  // family members are the peoples with same surname, who live in the neighborhood of FAMILY_RADIUS_MILES away
  getFamilyMembers: function (person, callback) {
    var db = mongoose.connection,
        personLng = this.getLng(person),
        personLat = this.getLat(person);
    db.collection('peoples').find({
      lastname: person.lastname,
      loc:{$geoWithin: { $centerSphere: [ [personLng, personLat] , this.FAMILY_RADIUS_RADIANS] } }
    }).toArray(callback);
  },

  findPeoplesByPostcode: function(postcodes, callback) {
    var db = mongoose.connection;
    db.collection('peoples').find({home_postcode: {$in: postcodes}}, this.tableFields).
      toArray(callback);
  },

  findPeoplesByCity: function(cities, callback) {
    var db = mongoose.connection;
    db.collection('peoples').find({home_city: {$in: cities}}, this.tableFields).
      toArray(callback);
  },

  findPeoplesByStreetAddress: function(streetAddress, callback) {
    var db = mongoose.connection;
    db.collection('peoples').find({
      'home_address': {$regex: '.*'+streetAddress+'.*', $options:'i'}
    }, this.tableFields).
      toArray(callback);
  },

  findPeoplesByLoc: function(lng, lat, rad, callback) {
    var db = mongoose.connection;
    var radius_radians = rad / EARTH_RADIUS;
    db.collection('peoples').find({
      loc:{$geoWithin: { $centerSphere: [ [lng, lat] , radius_radians] } }
    }, this.tableFields).
      toArray(callback);
  },

  allCities: function(callback) {
    People.find().distinct('home_city', callback);
  },

  allZIPs: function(callback) {
    People.find().distinct('home_postcode', callback);
  },

}
