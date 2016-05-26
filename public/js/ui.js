class Widget {
  // Construct container
  // @param [pTempl] selector string pointing to mustache template script element
  // @param [pSel] parent selector
  // @return constructed element
  constructor(templSel, parentSel, options) {
	  this.templEl = $(templSel);
	  this.parentEl = $(parentSel);

	  this.body = Mustache.render($(this.templEl).html(), options);
	  this.el = $(this.body);

	  $(this.parentEl).append(this.el);

  }
}

class WidgetContainer extends Widget {

  constructor(templSel, parentSel, options){
	  super(templSel, parentSel, options);
	  this.widgets = [];
  }

  onAdded(widget){}
  onRemoved(widget){}


  add(widget){
	  this.widgets.push(widget);
	  this.onAdded(widget);
  }

  remove(widget){
	  this.widgets.splice(this.widgets.indexOf(widget), 1);
	  $(this.widget).remove();
	  this.onRemoved(widget);
  }
}

class NotificationContainer extends WidgetContainer {
  constructor(){
	  super('#list-group', '.dropdown-menu.w-xl.animated.fadeInUp');
  };

  onAdded(widget){
	  $('.icon-bell .badge').text(new String(this.widgets.length))
	  if(this.widgets.length){
	    $(".icon-bell .badge").removeClass('none');
	  } else {
	    $(".icon-bell .badge").addClass('none');
	  }
  };

}
class ProgressWidget extends Widget{
  // Construct container
  // @param [pTempl] selector string pointing to mustache template script element
  // @param [pSel] parent selector
  // @return constructed element
  constructor(templSel, parentSel, options) {
	  super(templSel, parentSel, options)
	  this.total = options.total;
  }

  // Update widget state
  // @param [options] options
  update(o){
	  o.progress = o.progress?o.progress:this.total?(o.current / this.total) * 100:0;
	  o.text && $('span.clear.block.m-b-none > span', this.el).text(o.text);
	  o.progress && $('.progress-bar', this.el).css('width', o.progress/100 * $('.progress-bar', this.el).parent().width())
  }

  done(o){
	  o.text && $('span.clear.block.m-b-none > span', this.el).text(o.text);
	  $('.progress', this.el).remove();
  }

  remove(){
	  $(this.el).remove();
  }
}

$.fn.dataTree = function (data) {
  $(this).data = data || $(this.data);
  if(!data){
    throw new Error('No data loaded'); // data is not loaded
  } else if(typeof data === 'string'){
    throw new Error(data);// data contains error message
  }

  _.each(this, function (it) {
	  var tmpl = $('#profile').html();

    var sortOrder = ['home_address', 'home_city', 'home_postcode'][parseInt($('ul.nav.nav-tabs li.active a').attr('href').replace(/#tab-/, '')) - 1];
    data = _.sortBy(data, sortOrder);
    if($('.sort-alphabetical').hasClass('active')){ // FIXME: optimize that reverse
      data == data.reverse();
    }

    var tabIdx = parseInt($('ul.nav.nav-tabs li.active a').attr('href').replace(/#tab-/, '')) - 1;
    data = _.filter(data, function (it) {
      var matchSel = ['.filter_city', '.filter_address'][tabIdx],
          prop = ['home_city', 'home_address'][tabIdx];


      return _.isEmpty($(matchSel).val())
        ||
        it[prop].match(new RegExp(typeof $(matchSel).val() === 'string'?$(matchSel).val():$(matchSel).val().join('|'), 'i')) != null;
    });


	  var primaries = _.map(data, function(it) {
	    var primary = _.filter(it.family.family_member, _.matches({relationship: 'Primary Contact'}));
	    return _.isEmpty(primary)?null:{id: primary[0].id};
	  });

	  primaries = _.uniqBy(_.without(primaries, null), 'id');
    primaries = _.map(primaries, function (p) {
      return _.find(data, _.matches({elvantoId: p.id}))
    })

    $(it).data('tree', primaries);
	  $(it).html('<h4>' + primaries.length + ' items found</h4>');
	  _.each(primaries, (o) => {
	    var el = $(Mustache.render(tmpl, o?o:{}));

	    $(el).on('click', function (e) {
		    $('.list-group.no-radius', this).toggleClass('none');
	    });
	    $(it).append(el);
	  });
  });
};


$(document).ready(() => {
  $('#side-menu').metisMenu();

  $.ajax({
    url: '/search/getCities',
    method: 'GET',
    success: function (response, status) {
      var html = _.map(response, function (it) {
        return $('<option value="' + it + '">' + it + '</option>');
      });
      $(".search_city,.filter_city").html(html);
    }
  });

  $.ajax({
    url: '/search/getZIPs',
    method: 'GET',
    success: function (response, status) {
      var html = _.map(response, function (it) {
        return $('<option value="' + it + '">' + it + '</option>');
      });
      $(".search_zip").html(html);
    }
  });
});
