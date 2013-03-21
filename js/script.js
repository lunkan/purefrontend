$(document).ready(function(){

	if (navigator.appVersion.indexOf("MSIE") == -1)
		$('.sticky').stickyBlock({margins:{width:62}});
	else
		$('.sticky').stickyBlock();
});