var express = require('express');
var request = require('request');
var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');
var cache = require('js-cache');

var xml = require('xml');
var xml2js = require('xml2js');
var mongoose = require('mongoose');
var elvanto = require('elvanto-api');

require('dotenv').config(); // need it here for tests to pass

var GoogleContacts = require('google-contacts').GoogleContacts;

var People = require('./models/people').People;

var db;

var geocoderProvider = 'google';
var httpAdapter = 'https';
var geocoder = require('node-geocoder')(geocoderProvider, httpAdapter, {apiKey: process.env.GOOGLE_SERVER_API_KEY});

var router = express.Router();

const PAGE_SIZE = 100;


var promiseWhile = (condition, action) => {
  var cast = (p) => {
	  return (typeof p === 'object') && (p.then !== undefined) ?p:Promise.resolve(p);
  };
  var resolver = Promise.defer();

  var loop = function() {
    if (!condition()) return resolver.resolve();
    return cast(action())
      .then(loop)
      .catch(resolver.reject);
  };

  process.nextTick(loop);

  return resolver.promise;
};

/**
   Internal fuction block
*/
router.elvanto = {
  connect: (apiKey) => {
	  return new Promise((res, rej) => {
	    var ret = elvanto.configure({apiKey:  apiKey});
	    if(ret){
		    res(ret);
	    } else {
		    rej(ret);
	    }
	  });
  },
  getAllPeople: (options) => {
	  // let options be a single page number
	  if(typeof options === 'number'){
	    options = {page: options, page_size: PAGE_SIZE};
	  }


	  return new Promise((res, rej) => {
	    elvanto.apiCall('people/getAll', options || {}, (result) => {
		    if(result) {
		      var FIELDS = [
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
		      ];

		      if(result.people){
			      async.forEachOfLimit(result.people.person, 25, (it, idx, cb) => {
			        elvanto.apiCall('people/getInfo', {id: it.id, fields: FIELDS}, (person) => {
				        console.log('Extending item #' + idx + ", ID:" + it.id + ', keys:' + _.keys(it));
				        if(person.person){
				          _.extend(result.people.person[idx], person.person[0]);
				        }
				        cb();
			        });
			      }, (err) => {
			        if(err){
				        rej(err);
			        } else {
				        console.log('Extended all');
				        res(result);
			        }
			      });
		      } else {
			      console.log(result);
			      rej();
		      }
		    }
	    });
	  });
  }
};

router.db = {
  update: (objects) => {
	  return new Promise((res, rej) => {
	    var results = [];
	    async.forEachOfLimit(objects, 100, (person, idx, cb) => {
		    var _id = person._id;
		    People
		      .findOneAndUpdate({_id:_id}, person, {upsert:true})
		      .then((p) => {
			      results.push(p);
			      cb();
		      })
		      .catch(console.log.bind(console));
	    }, (err) => {
		    if(err){
		      rej(err);
		    } else {
		      console.log('Finished');
		      res(results);
		    }
	    });
	  });
  },

  getAll: () => {
    return new Promise((res, rej) => {
      People
        .find({})
        .then((results) => res(results))
        .catch((err) => rej(err));
    });
  },

  getByIndexes: (arrayOfIndexes) => {
	  return new Promise((res, rej) => {
	    People.find({_id: { $in: arrayOfIndexes}}, (err, docs) => {
		    if(err){
		      rej(err)
		    } else {
		      var dbDocs =  _.map(docs, _.property('_doc'));
		      // simple _id transform
		      _.each(dbDocs, (it) => {
			      it._id = it._id.toString();
			      delete it.__v;
		      });
		      res(dbDocs);
		    }
	    });
	  });
  }
};

router.transformObjects = (arr) => {
  return new Promise((res, rej) => {
	  async.forEachOfLimit(arr, 100, (it, idx, cb) => {
	    var szObjectId = crypto.createHmac('sha1','').update(it.id).digest("hex"); // getting 40 chars string
	    szObjectId = szObjectId.substring(16); // truncating first 16 chars to get 24 hex string
	    it._id = szObjectId;
      it.elvantoId = it.id;
	    delete it.id;

	    it.home_country = it.home_country || 'United States';

	    var addrObj = {
		    address: it.home_city + ", " + it.home_address + ", " + it.home_address2,
		    country: it.home_country,
		    zipcode: it.home_postcode
	    },
		      szAddrObj = JSON.stringify(addrObj);

	    it.loc = cache.get(szAddrObj);
	    if(it.loc){
		    console.log('Got location from cache');
		    cb();
	    } else {
		    geocoder.geocode(addrObj, function (value, data) {
		      if (data && data.length) {
			      it.loc = [data[0].longitude, data[0].latitude];
			      cache.set(szAddrObj, it.loc);
            console.log('Location received:' + it.loc.toString());
		      } else {
			      console.log("Empty data returned:" + szAddrObj, ',value:' + value + ',data:' + data);
		      }
		      cb();
		    });
	    }
	  }, () => {
	    res(arr);
    });
  });
};


router.elvantoToDb = (tickCb) => {
  var page = 0, total = 1; // starting from 1st page

  return promiseWhile(
	  () => {
	    console.log('Page:' + (page * PAGE_SIZE) + ", total:" + total);
	    return (page * PAGE_SIZE) < total;
	  }, // loop while
	  () => {
	    return router.elvanto
		    .getAllPeople({page: ++page, page_size: PAGE_SIZE})
		    .then((result) => {
		      total = result.people.total;
		      return result;
		    })
		    .then((result) => router.transformObjects(result.people.person))
		    .then((results) => {
		      router.db.update(results);
		    })
		    .then(() => tickCb({page: page, page_size: PAGE_SIZE, total:total}));
	  });
};
// Google Contacts ************************************************************************
router.dbToContacts = (accessToken, tickCb) => {
  var num = 0;
  return router.db
    .getAll()
    .then((results) => {
      return new Promise((res, rej) => {
        var total = results.length;

        async.forEachOfLimit(results, 1, (person, idx, cb) => {
	        var xmlString = router.google.createContactEntry(person, 'XXX');

          if(person.googleId){
	          router.google.updateContact(person.googleId, xmlString, accessToken, (err, contact) =>{
              console.log('Updated: ' + contact);
              if(err){
	              console.log(err);
              }
              cb();
	          });
          } else {
            router.google.createContact(xmlString, accessToken, (err, contact) => {
              console.log('Created: ' + num++);
              if(err){
	              console.log('Error:', err);
              } else {
                xml2js.parseString(contact, (err, obj) => {
                  var googleId = obj['entry']?obj['entry']['id'][0]:'';

                  console.log('Looking for:' + person._id.toString());
		              People
		                .findOneAndUpdate({_id:person._id.toString()}, {googleId: googleId}, {upsert:false})
		                .then((p) => {
                      tickCb({ progress: num, total: total});
			                cb();
		                })
                    .catch((err) => console.log('Error on storing:' + err));
                });
              }
	          })
          }
        }, () => {
          // all finished
          res();
        })
      })
    })
    .catch((err) => {
      console.log('oh no,' + err);
    });

}

router.createGoogleContactGroup = function(groupName, accessToken, callback) {
    // TODO: please, make a group <groupName> manually for now!
  callback(null, groupHref);
};

router.google = router.google || {};

router.google.createContactEntry = function(contact, groupHref) {
  // TODO: groupName is not used yet
  /* TODO: Contact as a proxy model for Google contact entity:
     Contact.storeOne(person, function (err, body) {   }); */
  var notesStr = contact.family?_.map(contact.family.family_member, (it) => {
    return it.relationship + ': ' + it.firstname + ' ' + it.lastname;
  }).join('\n'):'';

  var birthday = contact.birthday.match(/\d{4}-\d{2}-\d{2}/);
  if(!birthday){
    console.log('Problem with birthday:' + contact.birthday);
  }

  var xmlString = xml({
	  "atom:entry": [{
	    _attr: {
		    "xmlns:atom": "http://www.w3.org/2005/Atom",
		    "xmlns:gd": "http://schemas.google.com/g/2005"
	    }
	  },{
	    "atom:category": [{
		    _attr: {
		      scheme: "http://schemas.google.com/g/2005#kind",
		      term: "http://schemas.google.com/contact/2008#contact"
		    }
	    }]},
                   {"atom:content": [{_attr: {type:'text'}},
                                     notesStr]},
                   {"id": contact.googleId},
                   contact.email ? {"gd:email": [{ _attr: { label: 'Personal', address: contact.email }}]} : {},
                   contact.phone ? {"gd:phoneNumber": [{ _attr: {rel: "http://schemas.google.com/g/2005#home"}}, contact.phone]} : {},
                   contact.mobile ? {"gd:phoneNumber": [{ _attr: {rel: "http://schemas.google.com/g/2005#mobile"}}, contact.mobile]} : {},
							     birthday? {"gContact:birthday": [{ _attr: {rel: "[http://schemas.google.com/contact/2008", when:birthday}}]}: {},
                   {"gd:structuredPostalAddress": [ {_attr: {rel: "http://schemas.google.com/g/2005#work"}},
							                                      {"gd:city": contact.home_city},
							                                      {"gd:street": contact.home_address + contact.home_address2},
							                                      {"gd:region": contact.home_state},
							                                      {"gd:postcode": contact.home_postcode},
							                                      {"gd:country": contact.home_country},
							                                      {"gd:formattedAddress": contact.home_address + "," + contact.home_address2 + "," + contact.home_city}
						                                      ]},
                   {"gd:name": [
			               {"gd:givenName": contact.firstname},
			               {"gd:familyName": contact.lastname},
			               {"gd:fullName": contact.firstname + " " + contact.lastname}
                   ]},
                   //{"gContact:groupMembershipInfo": [{ _attr: {rel: "[http://schemas.google.com/contact/2008", deleted: false, href: groupHref}}]}
                  ]});

  return xmlString;
};
router.google.createContact = (xmlContact, accessToken, callback) => {
  console.log(accessToken);
  request.post({
	  uri: 'https://www.google.com/m8/feeds/contacts/default/full/',
	  headers: {
	    'Authorization': 'Bearer ' + accessToken,
	    'GData-Version': '3.0',
	    'Content-Type': 'application/atom+xml'
	  },
	  body: xmlContact
  }, function (error, response, body) {
    if(response){
      if(response.statusCode > 300){
	      console.log(error,  response.statusCode, body);
      }
    } else {
      console.log(error, response, body);
    }
	  return callback(error, body);
  });
}

router.google.updateContact = (id, xmlContact, accessToken, callback) => {
  var cid = id.substring(id.lastIndexOf('/'));
  request.put({
	  uri: id.replace('/base/', '/full/').replace(/^http/, 'https'),
	  headers: {
	    'Authorization': 'Bearer ' + accessToken,
	    'GData-Version': '3.0',
	    'Content-Type': 'application/atom+xml',
      'If-Match': '*'
	  },
	  body: xmlContact
  }, function (error, response, body) {
    if(response){
      if(response.statusCode > 300){
	      console.log(error,  response.statusCode, body);
      }
    } else {
      console.log(error, response, body);
    }
	  return callback(error, body);
  });
}


// *******************************************************************************
/**
   Database initialization
*/
router.init = (dbPath) => {
  dbPath = dbPath || "mongodb://localhost/elvanto";
  console.log('Initializing DB using path:' + dbPath);
  mongoose.connect(dbPath);
  db = mongoose.connection;

  db.on('error', console.error.bind(console, 'connection error:'));

  db.once('open', function () {
	  console.log('Database opened:');
  });

  router.elvanto.connect(process.env.ELVANTO_KEY, (authData) => {
	  if(!authData.error){
	    console.log('Connected to Elvanto');
	  }
  });
};


module.exports = router;
