// The WebSocket-Object (with resource + fallback)
var serverWS = new WebSocket ('ws://' + window.location.host + '/');
var NotificationContiner;

$(document).ready(function (e) {
  NotificationContiner = new WidgetContainer('#list-group', '.dropdown-menu.w-xl.animated.fadeInUp');
})


// WebSocket onerror event triggered also in fallback
serverWS.onerror = (e) => {
  console.log ('Error with WebSocket uid: ' + e.target.uid);
};

serverWS.onopen = () => {
  var progressWidget;
  console.log('WebSocket connection opened');

  serverWS.onmessage = (message) => {
    var msg = JSON.parse(message.data);
    switch(msg.fn) {
    case 'elvanto_to_db': {
      switch(msg.action){
      case 'started':{
        progressWidget = new ProgressWidget('#list-group-progress',
                                   '.dropdown .dropdown-menu .panel .list-group',
                                   {text: 'Import process started', small_text: 'at: ' + new Date(), progress: 0});
        NotificationContiner.add(progressWidget);
      };break;
      case 'finished': {
        progressWidget.done({
          text: 'Update completed',
        });
      };break;
      case 'progress':
      progressWidget.update({
        text: 'Updating records(' + msg.page + ')',
        progress: parseInt(msg.page) * msg.page_size/msg.total*100,
      });

      }

    };break;

    }
  }

};
