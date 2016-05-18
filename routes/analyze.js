var express = require('express');

var router = express.Router();

var mongoose = require('mongoose');


router.get('/', function (req, res) {
  res.render('analyze', {title: 'Analyzis'});
});


module.exports = router;
