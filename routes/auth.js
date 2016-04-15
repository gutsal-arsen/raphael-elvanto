var Cookies = require( "cookies" );
var express = require('express');
var router = express.Router();

const
  LAYOUT_TEMPLATE = 'layout',
  LAYOUT_TITLE = 'Authenticating..',
  COOKIES_NAMES = {
    OAUTH_CODE: 'oauth_code',
    OAUTH_TOKENS: 'oauth_tokens'
  },
  DICTIONARY = {
    OAUTH_ERROR: 'OAuth error: _err.',
    EMPTY_TOKENS_ERROR: 'Authentication failed: unable to get google OAuth tokens'
  },
  AUTH_WINDOW_PARAMS = {
    width: 600,
    height: 400,
    name: 'Google API connection..'
  };

var clientId = process.env.GOOGLE_CLIENT_ID;
var clientSecret = process.env.GOOGLE_CLIENT_SECRET;
var serverApiKey = process.env.GOOGLE_SERVER_API_KEY;
var redirectUrl = process.env.GOOGLE_REDIRECT_URL;

var oauth2Client = null;

function getOAuthClient() {
  if (oauth2Client == null) {
    var google = require('googleapis');
    var OAuth2 = google.auth.OAuth2;
    oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
  }
  return oauth2Client;
}

function getAuthUrl(callback) {
  var oauth2Client = getOAuthClient();
  var scope = 'https://www.googleapis.com/auth/contacts';
  var url = oauth2Client.generateAuthUrl({ scope: scope }); //access_type: 'offline',
  callback(url);
}

router.get('/', function (req, res) {
  getAuthUrl(function (authUrl) {
    res.render('auth_popup_open', {authUrl: authUrl, layout: LAYOUT_TEMPLATE, title: LAYOUT_TITLE, winParams: AUTH_WINDOW_PARAMS});
  });
});

router.get('/callback', function (req, res) {
  var cookies = new Cookies(req, res);
  var oauth2Client = getOAuthClient();
  var oauthCode = req.query.code;

  oauth2Client.getToken(oauthCode, function(err, oauthTokens) {
    if (!err) {
      oauth2Client.setCredentials(oauthTokens);
      var serializedOauthTokens = JSON.stringify(oauthTokens);
      cookies.set( COOKIES_NAMES.OAUTH_TOKENS, serializedOauthTokens );
      cookies.set( COOKIES_NAMES.OAUTH_CODE, oauthCode );
      console.log('Result: oauth_code = ' + oauthCode + ', oauth_tokens = ' + serializedOauthTokens);
    }
    res.render('auth_popup_close', {err: err, oauth_code: oauthCode,oauth_tokens: oauthTokens, title: LAYOUT_TITLE, layout: LAYOUT_TEMPLATE, dictionary: DICTIONARY });
  });
});

module.exports = router;


