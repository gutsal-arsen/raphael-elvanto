$(document).ready(() => {

  $('#side-menu').metisMenu();
  /**
     if .icon-bell.badge content changed, we will either show or hide it
  */

  $('.dropdown .dropdown-menu .panel .list-group').bind('DOMSubtreeModified', (e) => {
    $(".icon-bell .badge").text($('a', e.target).size());
  })
  $(".icon-bell .badge").bind('DOMSubtreeModified',(e) => {
	  if(parseInt($(e.target).text()) > 0){
	    $(e.target).removeClass('none');
	  } else {
	    $(e.target).addClass('none');
	  }
  });
  $(".icon-bell .badge").text($($('.dropdown .dropdown-menu .panel .list-group a')).size());

});
