'use strict';

var chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    expect = chai.expect,
    assert = chai.assert,

    elvanto = require('elvanto-api'),
    fs = require('fs'),
    _ = require('lodash'),
    crypto = require('crypto'),
    Crawl = require('../routes/crawl.js'),
    mongoose = require('mongoose'),
    People = require('../routes/models/people.js').People;

describe('Crawl', () => {
    chai.use(chaiAsPromised);
    chai.should();

    const PAGE_SIZE = 25;

    before(() => {
	Crawl.init('mongodb://localhost/elvanto_test');
    });

    after(() => {
    });

    beforeEach(() => {
	// emptying database
	People.remove({});
    });

    afterEach(() => {
	mongoose.connection.close();
    });

    it('elvanto.connect should pass', () => {
	var promise = Crawl.elvanto.connect(process.env.ELVANTO_KEY);
	return promise
	    .then((result) => {
		promise.should.be.fulfilled;
		result.should.be.an('object');
		result.should.have.property('auth');
		result.should.have.property('host');
		result.should.have.property('port');
	    });
    });

    it('elvanto.transformObjects should transform fields', () => {
	return Crawl
	    .transformObjects([{id:'168413f0-b5d5-11e3-a859-2ea7bbb4568f'}])
	    .then((result) => {
		result.should.be.an('array');
		result.should.have.length(1);
		assert.isUndefined(result[0].id);
		result[0]._id.should.have.length(24);
	    });
    });


    it('db.update should properly compare and update items', () => {
	var promise,
	    elvantoResult,
	    dbResult,
	    _id;
	// initializing connection
	return Crawl.elvanto.connect(process.env.ELVANTO_KEY)
	    .then(() => Crawl.elvanto.getAllPeople({ page_size: PAGE_SIZE }))
	    .then((result) => {
		elvantoResult = result;
		result.people.person.should.be.an('array');
		result.people.person.should.have.length(PAGE_SIZE);
		return result.people.person;
	    })
	    .then(Crawl.transformObjects.bind(Crawl))
	    .then((result) => {
		dbResult = result;
		_id = dbResult[20]._id;
		dbResult[20].country = 'XXX';
		result.should.be.an('array');
		result.should.have.length(PAGE_SIZE);
		return dbResult;
	    })
	// Updating all items
	    .then(Crawl.db.update.bind(Crawl))
	    .then((personArr) => {
		personArr.should.be.an('array');
		personArr.should.have.length(PAGE_SIZE);
		return dbResult;
	    })
	// Making sure change applied into DB
	    .then((result) => {
		return People.findOne({_id: _id})
		    .then((it) => {
			expect(it.country).to.be.equal('XXX');
			return dbResult;
		    });
	    })
	// fail to save 2nd time
	    .then((personArr) => {
		promise = People.insertMany(personArr);
		assert.isRejected(promise);
	    });

    }).timeout(15000);

    it.only('PromiseWhile', () => {
	return Crawl.elvantoToDb()
	    .then((it) => {
		console.log('Finished PromiseWhile');
	    });
    }).timeout(30 * 3600 * 1000);
});
