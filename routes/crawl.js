var express = require('express');
var request = require('request');
var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');
var cache = require('js-cache');

var xml = require('xml');
var mongoose = require('mongoose');
var elvanto = require('elvanto-api');

require('dotenv').config(); // need it here for tests to pass

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
		    } else {
			console.log("Empty data returned:" + szAddrObj, ',value:' + value + ',data:' + data);
		    }
		    cb();
		});
	    }
	});
	res(arr);
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
		.then(() => tickCb(page, total));
	});
};
// *******************************************************************************
// HTTP handlers

// router.get('/elvanto_to_db', (req, res) => {
//     console.log('Headers', req.headers);
//     router
//     	.elvantoToDb()
//     	.then((success) => {
//     	    res.send('OK ' + success);
//     	})
//     	.catch((err) => {
//     	    res.status(500).send(err);
//     	});
// });

// router.ws('/db_to_google_contacts', (req, res) => {
//     router
// 	.elvantoToDb()
// 	.then((success) => {
// 	    res.send('OK ' + success);
// 	})
// 	.catch((err) => {
// 	    res.status(500).send(err);
// 	});
// });


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
