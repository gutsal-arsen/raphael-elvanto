function openModal(url, winParams) {
  var winName = winParams.name || '';
  var width = winParams.width || 600;
  var height = winParams.height || 400;
  var left = (screen.width/2)-(width/2);
  var top = (screen.height/2)-(height/2);
  var winStyle = 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+width+', height='+height+', top='+top+', left='+left;
  window.open(url, winName, winStyle);
}

function processCallback(params) {
  var err = params.err,
    oauthCode = params.oauthCode,
    oauthTokens = params.oauthTokens,
    dictionary = params.dictionary;
  if (err.length > 0) {
    alert(dictionary.OAUTH_ERROR.replace('_err', err));
    console.log(dictionary.OAUTH_ERROR.replace('_err', err));
  } else
  if (oauthTokens.length == 0) {
    //alert('Authentication failed: unable to get google OAuth tokens');
    alert(dictionary.EMPTY_TOKENS_ERROR);
    console.log(dictionary.EMPTY_TOKENS_ERROR);
  } else {
    window.opener.handleOAuthConnection(oauthCode, oauthTokens);
    //window.opener.postMessage(data, '*');
    window.close();
  }
}

function handleOAuthConnection(oauthCode, oauthTokens) {
  $('body').html('oauthCode = ' + oauthCode + '<br/>oauthTokens = ' + oauthTokens +
    'Elvanto to Google Contacts export started. Please wait..');
  $.post({
    url: '/crawl/elvanto_to_google',
    method: 'POST',
    data: {
      oauth_code: oauthCode,
      oauth_tokens: oauthTokens
    },
    complete: function (response) {
    },
    success: function (response, status) {
      $('body').html(response);
      alert('Export finished');
      window.location = '/'
    }
  });
}


