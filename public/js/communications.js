// The WebSocket-Object (with resource + fallback)
var serverWS = new WebSocket ('ws://' + window.location.host + '/');

// WebSocket onerror event triggered also in fallback
serverWS.onerror = (e) => {
  console.log ('Error with WebSocket uid: ' + e.target.uid);
};

serverWS.onopen = () => {
  console.log('WebSocket connection opened');
  serverWS.onmessage = (ws, req) => {
    console.log(serverWS.data);
    var msg = JSON.parse(serverWS.data);

    switch(msg.fn) {
    case 'elvanto_to_db': {
      var szText;

      switch(msg.action){
      case 'started':
      case 'finished': {
        var template = $('#list-group-text').html(),
            sz = Mustache.render(template, {text: 'Elvanto to DB process has been ' + msg.action, small_text:'Just now'});
        $('.dropdown .dropdown-menu .panel .list-group').append($(sz));
        if(msg.fn === 'started'){
          var template = $('#list-group-progress').html(),
              sz = Mustache.render(template, {percent: 0});
          $('.dropdown .dropdown-menu .panel .list-group').append($(sz));
        } else {
          $('#pb').remove();
        }

      };break;
      case 'progress':
        var template = $('#list-group-progress').html(),
        sz = Mustache.render(template, {percent: parseInt(msg.page) * 100/msg.total*100});
        $('#pb').remove();
        $('.dropdown .dropdown-menu .panel .list-group').append($(sz));
      }

    };break;

    }
  }

};
