(function() {
var SuperStart = $.getMainWindow().SuperStart;
var getString = SuperStart.getString;
 
var gEvts = {
	'scroll': onScroll,
	'dblclick': onDblClick
};
for (var k in gEvts) {
	window.addEventListener(k, gEvts[k], false);
}
window.addEventListener('unload', function() {
	window.removeEventListener('unload', arguments.callee, false);
	for (var k in gEvts) {
		window.removeEventListener(k, gEvts[k], false);
	}
}, false);

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);

	var add = $$('site-add');
	add.onclick = function() { showAddSite(); };
	add.setAttribute('title', getString('ssSiteAddNew'));
	$.removeClass(add, 'hidden');
}, false);



var urlDialogs = {};
function showAddSite() {
	var index = -1;
	if (urlDialogs[index] != null) {
		urlDialogs[index].focus();
	} else {
		var dlg = window.openDialog('chrome://superstart/content/url.xul',
			'',
			'chrome,dialog,dependent=yes,centerscreen=yes,resizable=yes', index, urlDialogs);
		urlDialogs[index] = dlg;
	}
}


// event handler
function onScroll() {
	var mask = $$('mask');
	mask.style.top = window.scrollY + 'px';
	mask.style.left = window.scrollX + 'px';
}

function onDblClick(e) {
	var t = e.target;
	if (t.tagName == 'HTML') {
		showAddSite();
	}
}

})();
