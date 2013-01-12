"use strict";

let clientInfo = {
	'w': 1280,
	'h': 720,
	'r': 1
};
(function() {
	let w = $.getMainWindow().gBrowser.selectedBrowser.contentWindow;
	clientInfo.w = w.innerWidth;
	clientInfo.h = w.innerHeight;
	if (clientInfo.w < 640 || clientInfo.h < 480) {
		clientInfo.w = 640;
		clientInfo.h = 480;
	}
}());

let buttonMap = {
	'cstm-select-image': selectImage,
	'cstm-clear-image': clearImage
};

function selectImage() {
	let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, getString('ssSelectImage'), nsIFilePicker.modeOpen);
	fp.appendFilters(nsIFilePicker.filterImages);
	let res = fp.show();
	if (res == nsIFilePicker.returnOK) {
		let bgImg = $$('cstm-bg-image');
		bgImg.setAttribute('src', getUrlFromFile(fp.file));
		bgImg.style.backgroundImage = 'url(' + getUrlFromFile(fp.file) + ')';
<<<<<<< HEAD

		checkImageStatus();
=======
>>>>>>> 31bf700bfcce533bc2e889cb690888709d8a9e3a
	}
}

function clearImage() {
	let bgImg = $$('cstm-bg-image');
	bgImg.removeAttribute('src');
	bgImg.style.backgroundImage = '';
<<<<<<< HEAD

	checkImageStatus();
=======
>>>>>>> 31bf700bfcce533bc2e889cb690888709d8a9e3a
}

evtMgr.ready(function() {
	for (let id in buttonMap) {
		let fn = buttonMap[id];
		let c = $$(id);
		c && c.addEventListener('command', fn, false);
	}
});

evtMgr.clear(function() {
	for (let id in buttonMap) {
		let fn = buttonMap[id];
		let c = $$(id);
		c && c.removeEventListener('command', fn, false);
	}
});

<<<<<<< HEAD
function checkImageStatus() { // enable / disable some controls if necessary
	var ids = ['cstm-clear-image', 'cstm-bg-repeat', 'cstm-bg-size', 'cstm-bg-position'];
	var disable = false;
	if ($$('cstm-bg-image').getAttribute('src') == '' ||  $$('cstm-select-image').getAttribute('disabled') == 'true') {
		disable = true;
	}

	ids.forEach(function(id) {
		disable ? $$(id).setAttribute('disabled', true) : $$(id).removeAttribute('disabled');
	});
};

=======
>>>>>>> 31bf700bfcce533bc2e889cb690888709d8a9e3a
function setupBgImageSize(bgImg) {
	bgImg.style.width = clientInfo.w + 'px';
	bgImg.style.height = clientInfo.h + 'px';

	clientInfo.r = (200 / clientInfo.w);
	
	let wrapper = $$('cstm-bg-image-wrapper');
	wrapper.style.width = '200px';
	wrapper.style.height = Math.floor(clientInfo.h * 200 / clientInfo.w) + 'px';

	bgImg.style.transform = 'scale(' + clientInfo.r + ')';
}

function initBgImage(bg) {
	let bgImg = $$('cstm-bg-image');

	setupBgImageSize(bgImg);
	if (bg['background-image'] && bg['background-image'] != 'none') {
		bgImg.setAttribute('src', bg['background-image']);
<<<<<<< HEAD
		// if the image is not available, for example, deleted, then the dialog won't show up.
		// Seems like the dialog will show up only after the 'load' event.
		// So we must delay the operation and set it after the dialog shows up.
		window.setTimeout(function() {
			bgImg.style.backgroundImage = 'url(' + bg['background-image'] + ')';
		}, 0);
=======
		bgImg.style.backgroundImage = 'url(' + bg['background-image'] + ')';
>>>>>>> 31bf700bfcce533bc2e889cb690888709d8a9e3a
	}
	bgImg.addEventListener('mousemove', onMouseMove, false);
	bgImg.addEventListener('mouseout', onMouseOut, false);
	evtMgr.clear(function() {
		let bgImg = $$('cstm-bg-image');
		bgImg.removeEventListener('mousemove', onMouseMove, false);
		bgImg.removeEventListener('mouseout', onMouseOut, false);
	});

	initBackgroundPopupMenu(bg['background-repeat'], 'repeat', 'cstm-bg-repeat-menu', updateBgRpt, onBgRptCmd);
	initBackgroundPopupMenu(bg['background-size'], 'auto', 'cstm-bg-size-menu', updateBgSize, onBgSzCmd);
	initBackgroundPosition(bg['background-position']);
<<<<<<< HEAD

	checkImageStatus();
=======
>>>>>>> 31bf700bfcce533bc2e889cb690888709d8a9e3a
}

function saveBgImage(bg) {
	let bgi = $$('cstm-bg-image').getAttribute('src');
	if (bgi != '') {
		bg['background-image'] = bgi;

		let repeat = $$('cstm-bg-repeat-menu').getAttribute('bgValue');
		if (repeat != '') {
			bg['background-repeat'] = repeat;
		}

		let size = $$('cstm-bg-size-menu').getAttribute('bgValue');
		if (size != '') {
			bg['background-size'] = size;
		}

		let x = parseInt($$('cstm-bg-x-pos').value);
		let y = parseInt($$('cstm-bg-y-pos').value);
		if (x != 0 || y != 0) {
			bg['background-position'] = x + '% ' + y + '%';
		}
	}
}

function initBackgroundPopupMenu(value, vDef, popupid, fnUpdate, onCmd) {
	if (value === undefined || value == '') {
		value = vDef;
	}

	let menu = $$(popupid);
	menu.setAttribute('bgValue', value);
	let items = menu.getElementsByTagName('menuitem');
	[].forEach.call(items, function(m) {
		if (m.value == value) {
			m.setAttribute('checked', true);
		}
		m.addEventListener('command', onCmd, false);
	});

	evtMgr.clear(function() {
		let items = $$(popupid).getElementsByTagName('menuitem');
		[].forEach.call(items, function(m) {
			m.removeEventListener('command', onCmd, false);
		});
	});

	fnUpdate(value);
}

function onBgRptCmd() {
	let value = this.getAttribute('value');
	this.parentNode.setAttribute('bgValue', value);
	updateBgRpt(value);
}
function onBgSzCmd() {
	let value = this.getAttribute('value');
	this.parentNode.setAttribute('bgValue', value);
	updateBgSize(value);
}

function onPosChanged() {
	let x = parseInt($$('cstm-bg-x-pos').value);
	let y = parseInt($$('cstm-bg-y-pos').value);
	$$('cstm-bg-x-pos-value').value = x + '%';
	$$('cstm-bg-y-pos-value').value = y + '%';

	let bgImg = $$('cstm-bg-image');
	bgImg.style.backgroundPosition = x + '% ' + y + '%';
}

function initBackgroundPosition(pos) {
	if (pos === undefined || pos == '') {
		pos = '0% 0%';
	}
	let ps = pos.split(' ');
	if (ps.length == 1) {
		ps.push(ps[0]);
	}
	let x = parseInt(ps[0]);
	let y = parseInt(ps[1]);
	let scaleX = $$('cstm-bg-x-pos');
	let scaleY = $$('cstm-bg-y-pos');
	scaleX.addEventListener('change', onPosChanged, false);
	scaleY.addEventListener('change', onPosChanged, false);
	scaleX.value = x;
	scaleY.value = y;

	onPosChanged();

	evtMgr.clear(function() {
		$$('cstm-bg-x-pos').removeEventListener('change', onPosChanged, false);
		$$('cstm-bg-y-pos').removeEventListener('change', onPosChanged, false);
	});
}

function updateBgRpt(rpt) {
	let bgImg = $$('cstm-bg-image');
	rpt = rpt || '';
	bgImg.style.backgroundRepeat = rpt;
}

function updateBgSize(size) {
	let bgImg = $$('cstm-bg-image');
	size = size || ''
	bgImg.style.backgroundSize = size;
}

function onMouseMove(evt) {
	let bgImg = $$('cstm-bg-image');
	if (bgImg.getAttribute('disabled') == 'true') {
		return;
	}
	let wrapper = $$('cstm-bg-image-wrapper');
	let x = evt.clientX;
	let y = evt.clientY;
	x = x - wrapper.boxObject.x;
	y = y - wrapper.boxObject.y;
	let top = y * (clientInfo.w - 200) / 200;
	let left = x * (clientInfo.w - 200) / 200;
	bgImg.style.top = '-' + top + 'px';
	bgImg.style.left = '-' + left + 'px';
}
function onMouseOut() {
	let bgImg = $$('cstm-bg-image');
	bgImg.style.top = '';
	bgImg.style.left = '';
}
