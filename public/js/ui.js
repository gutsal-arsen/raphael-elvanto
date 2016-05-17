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

  }

  add(widget){
    this.widgets = this.widgets || [];

     this.widgets.push(widget);
    $('.icon-bell .badge').text(new String(this.widgets.length))
    if(this.widgets.length){
      $(".icon-bell .badge").removeClass('none');
    } else {
	    $(".icon-bell .badge").addClass('none');
    }
  }
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
    o.progress = o.progress || this.total?(o.current / this.total) * 100:0;
    o.text && $('span.clear.block.m-b-none > span', this.el).text(o.text);
    o.progress && $('.progress-bar', this.el).css('width', o.progress).data('original-title', o.title);
  }

  remove(){
    $(this.el).remove();
  }
}

$(document).ready(() => {

  $('#side-menu').metisMenu();
});
