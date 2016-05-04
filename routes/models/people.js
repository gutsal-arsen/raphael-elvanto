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
    'loc': true,
    'home_postcode': true
  },

  getFullNameStr: function (person) {
    return person.firstname.concat(" ", person.lastname);
  },

  getAddressStr: function (person) {
    return person.home_address;
  },

  // get all phone numbers
  getPhoneNumbers: function (person) {
    return [person.mobile, person.phone];
  },

  // get any phone number
  getPhoneNumber: function (person) {
    return this.getPhoneNumbers(person)[0];
  },

  getPhoneStr: function (person) {
    return  "# ".concat(this.getPhoneNumber(person));
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
    }).toArray(callback);
  },

  findPeoplesByPostcode: function(postCode, callback) {
    var db = mongoose.connection;
    db.collection('peoples').find({'home_postcode': postCode}, this.tableFields).
      toArray(callback);
  },

  findPeoplesByCity: function(city, callback) {
    var db = mongoose.connection;
    db.collection('peoples').find({'home_city': city}, this.tableFields).
      toArray(callback);
  },

  findPeoplesByStreetAddress: function(streetAddress, callback) {
    var db = mongoose.connection;
    db.collection('peoples').find({
      'home_address': {'$regex': '.*'+streetAddress+'.*'}
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
  }
}
