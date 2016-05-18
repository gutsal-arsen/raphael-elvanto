var express = require('express');
var request = require('request');
var _ = require('lodash');
var crawl = require('./crawl.js');

var router = express.Router();

router.get('/all', (req, res) => {
  console.log('Entered');
  crawl.db
    .getAll()
    .then(result =>  res.status(200).json(result))
    .catch(err => res.status(500).send(err));
})

module.exports = router;
