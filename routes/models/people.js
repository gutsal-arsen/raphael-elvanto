var mongoose = require('mongoose');

const EARTH_RADIUS = 3963.2; // const value is duplicated in search.js
const FAMILY_RADIUS_MILES = 15;

module.exports = {

  FAMILY_RADIUS_RADIANS: FAMILY_RADIUS_MILES / EARTH_RADIUS,

  // list of preferred fields for fetching by db-specific module functions
  tableFields: {
    'firstname': true,
    'lastname': true,
    'gender': true,
    'home_city': true,
    'home_address': true,
    'phone': true,
    'mobile': true,
    'loc': true
  },

  getFullNameStr: function (person) {
    var fullNameStr = "FIRSTNAME LASTNAME".
      replace(/FIRSTNAME/g, person.firstname).
      replace(/LASTNAME/g, person.lastname);
    return fullNameStr;
  },

  getAddressStr: function (person) {
    var addressStr = "HOME_ADDRESS".
      replace(/HOME_ADDRESS/g, person.home_address);
    return addressStr;
  },

  // get all phone numbers
  getPhoneNumbers: function (person) {
    var phones = [];
    if (person.mobile !== "") phones.push(person.mobile);
    if (person.phone !== "") phones.push(person.phone);
    return phones;
  },

  // get any phone number
  getPhoneNumber: function (person) {
    var phones = this.getPhoneNumbers(person)
    return phones[0];
  },

  getPhoneStr: function (person) {
    var phone = this.getPhoneNumber(person)
    var phoneStr = "# PHONE".replace(/PHONE/g, phone);
    return phoneStr;
  },

  getFamilyMemberStr: function(familyMember) {
    var familyMemberStr = this.getFullNameStr(familyMember);
    return familyMemberStr;
  },

  getFamilyMembersStrArray: function (families) {
    var that = this;
    return families.map(function(family_member) {
      return that.getFamilyMemberStr(family_member)
    });
  },

  getLng: function (person) {
    return person.loc[0];
  },

  getLat: function (person) {
    return person.loc[1];
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
    }).toArray(function(err, results){
      callback(err, results);
    });
  },

  findPeoplesByCity: function(city, callback) {
    var db = mongoose.connection;
    db.collection('peoples').find({'home_city': city}, this.tableFields).
      toArray(function(err, results){
        callback(err, results);
    });
  },

  findPeoplesByStreetAddress: function(streetAddress, callback) {
    var db = mongoose.connection;
    db.collection('peoples').find({
      'home_address': {'$regex': '.*'+streetAddress+'.*'}
    }, this.tableFields).
      toArray(function(err, results){
        callback(err, results);
    });
  },

  findPeoplesByLoc: function(lng, lat, rad, callback) {
    var db = mongoose.connection;
    var radius_radians = rad / EARTH_RADIUS;
    db.collection('peoples').find({
      loc:{$geoWithin: { $centerSphere: [ [lng, lat] , radius_radians] } }
    }, this.tableFields).
      toArray(function(err, results){
        callback(err, results);
    });
  }
}
