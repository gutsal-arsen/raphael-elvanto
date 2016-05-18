require('dotenv').config();
['ELVANTO_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URL', 'GOOGLE_SERVER_API_KEY'].forEach((key, val) => {
  if(process.env[key] === undefined) throw 'Env var ' + key + ' is not defined'
})

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/user');
var crawl = require('./routes/crawl');
var search = require('./routes/search');
var analyze = require('./routes/analyze');
var auth = require('./routes/auth');
var api = require('./routes/api');

var _ = require('lodash');

var app = express();

crawl.init("mongodb://localhost/elvanto");

var env = process.env.NODE_ENV || 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env == 'development';

// view engine setup

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// app.use(favicon(__dirname + '/public/img/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public/allPeople.json')));

app.use('/', routes);
app.use('/users', users);
app.use('/crawl', crawl);
app.use('/search', search);
app.use('/analyze', analyze);
app.use('/auth', auth);
app.use('/api', api);

var expressWs = require('express-ws')(app);

app.use(function (req, res, next) {
  console.log('middleware');
  req.testing = 'testing';
  return next();
});

app.ws('/', (ws, req) => {
  ws.on('message', (szMsg) => {
    var  msg = JSON.parse(szMsg);
    switch(msg.fn){
    case 'elvanto_to_db': {
      ws.send(JSON.stringify({fn: msg.fn, action: 'started' }))
      crawl
        .elvantoToDb((opts) => {
          ws.send(JSON.stringify(_.extend(opts, {fn: msg.fn, action: 'progress'})));
        })
        .then((success) => {
          ws.send(JSON.stringify({fn: msg.fn, action: 'finished'}))
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    };break;
    case 'db_to_google': {
      //ws.send(JSON.stringify({fn: msg.fn, action: 'started' }))
      crawl
        .dbToContacts(msg.accessToken, (opts) => {
          //ws.send(JSON.stringify(_.extend(opts, {fn: msg.fn, action: 'progress'})));
        })
        .then((success) => {
          //ws.send(JSON.stringify({fn: msg.fn, action: 'finished'}))
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    }
    default: console.log(JSON.stringify(msg));
    }
  })
});

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace

if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err,
      title: 'error'
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {},
    title: 'error'
  });
});


module.exports = app;
