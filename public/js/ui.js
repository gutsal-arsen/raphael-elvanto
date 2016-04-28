$(document).ready(() => {

    $('#side-menu').metisMenu();
    /**
     if .icon-bell.badge content changed, we will either show or hide it
     */
    $(".icon-bell .badge").bind('DOMSubtreeModified',(e) => {
	if(parseInt($(e.target).text()) > 0){
	    $(e.target).removeClass('none');
	} else {
	    $(e.target).addClass('none');
	}
    });
});
