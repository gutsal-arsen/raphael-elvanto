function openModal(url, winParams) {
  var winName = winParams.name || '';
  var width = winParams.width || 600;
  var height = winParams.height || 400;
  var left = (screen.width/2)-(width/2);
  var top = (screen.height/2)-(height/2);
  var winStyle = 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+width+', height='+height+', top='+top+', left='+left;
  window.open(url, winName, winStyle);
}

