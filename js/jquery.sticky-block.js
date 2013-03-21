(function ($) {
	
	var StickyObject = (function($el, options) {
		
		var cls = function($el, options) {
		
			var $stickyBlock = $el;
			var $parent = $el.parent();
			var defaultTopOffset = $stickyBlock.offset().top;
			var options = options;
			var margins = {
				height: $parent.height() - $stickyBlock.height(),
				width: $parent.width() - $stickyBlock.width()
			};
			
			this.onResize = function() {
				if(options.margins)
					$stickyBlock.css('width', ($parent.width() - options.margins.width)+'px');
				else
					$stickyBlock.css('width', ($parent.width() - margins.width)+'px');
			};
			
			this.onScroll = function(scroll) {
				if(defaultTopOffset >= scroll)
					$stickyBlock.removeClass('fixed-top');
				else
					$stickyBlock.addClass('fixed-top');
			};
			
			this.onResize();
			this.onScroll($(window).scrollTop());
		};
		
		return cls;
	})();
	
	$.fn.stickyBlock = function (options) {
		
		var options = options || {};
		var stickyObjects = [];
		var isResized;
		
		var resizeTimer = setInterval(function(){
			if(isResized) {
				isResized = false;
				$(stickyObjects).each(function() {
					this.onResize();
				});
			}
		},100);
		
		$(window).scroll(function() {
			$(stickyObjects).each(function() {
				this.onScroll($(window).scrollTop());
			});
		});
		
		$(window).resize(function() {
			isResized = true;
		});
		
		return this.each(function () {
			var stickyObject = new StickyObject($(this), options);
			stickyObjects.push(stickyObject);
        });
    };

 })(jQuery);