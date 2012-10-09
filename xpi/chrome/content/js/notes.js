/**
 * created on 10/2/2012, on hospital, with my father
 */
(function() {
const Cc = Components.classes;
const Ci = Components.interfaces;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var cfg = ssObj.getService(Ci.ssIConfig);
var todo = ssObj.getService(Ci.ssITodoList);
ssObj = undefined;

var getString = $.getMainWindow().SuperStart.getString;

var cfgevts = {
	'todo-hide': onTodoHide
};
var tdevts = {
	'todo-added': onNoteAdded
	, 'todo-removed': onNoteRemoved
};

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	for (var k in cfgevts) {
		cfg.subscribe(k, cfgevts[k]);
	}
	for (var k in tdevts) {
		todo.subscribe(k, tdevts[k]);
	}

	init();

	if (!cfg.getConfig('todo-hide')) {
		$.removeClass($$('notes'), 'hidden');
		$$('nbc-notes').setAttribute('title', getString('ssNotesClose'));
		layout.placeTodoList();
	}
}, false);
window.addEventListener('unload', function() {
	window.removeEventListener('unload', arguments.callee, false);
	for (var k in cfgevts) {
		cfg.unsubscribe(k, cfgevts[k]);
	}
	for (var k in tdevts) {
		todo.unsubscribe(k, tdevts[k]);
	}
	cfg = null;
	todo = null;
}, false);

function onTodoHide(evt, v) {
	if (v) {
		$.addClass($$('notes'), 'hidden');
		$$('nbc-notes').setAttribute('title', getString('ssNotesOpen'));
	} else {
		$.removeClass($$('notes'), 'hidden');
		$$('nbc-notes').setAttribute('title', getString('ssNotesClose'));
	}
}

function init() {
	var onoff = $$('nbc-notes');
	onoff.onclick = function() {
		if (cfg.getConfig('todo-hide')) {
			cfg.setConfig('todo-hide', false);
		} else {
			cfg.setConfig('todo-hide', true);
		}
	}

	var input = $$('note-edit');
	input.setAttribute('placeholder', getString('ssNotePlaceHolder'));

	input.addEventListener('keypress', function(evt) {
		if (evt.keyCode == 13) { // return
			evt.preventDefault();
			var text = input.value;
			if (text != '') {
				input.value = '';
				todo.addTodo('normal', text, 0);
			}
		}
	}, false);
	input.addEventListener('focus', function(evt) {
		$.removeClass(input, 'init');
	}, false);
	input.addEventListener('blur', function(evt) {
		if (input.value == '') {
			$.addClass(input, 'init');
		}
	}, false);


	var nl = $$('notes-list');
	var ns = todo.getTodoList();
	for (var i = 0; i < ns.length; ++ i) {
		insertNote(ns[i]);
	}
}

function getIndexFromElement(el) {
	while(el != document) {
		if (el.tagName.toLowerCase() == 'li') {
			var children = el.parentNode.children;
			for (var i = 0, l = children.length; i < l; ++ i) {
				if (children[i] == el) {
					return i;
				}
			}
		}
		el = el.parentNode;
	}
	return -1;
}

function onDone() {
	var index = getIndexFromElement(this);
	if (index != -1) {
		todo.removeTodo(index);
	}
}

function insertNote(n) {
	var list = $$('notes-list');
	var li = document.createElement('li');
	var done = document.createElement('div');
	$.addClass(done, 'button');
	$.addClass(done, 'done');
	done.setAttribute('title', getString('ssNoteDone'));
	done.onclick = onDone;
	li.appendChild(done);

	updateNote(li, n);
	list.appendChild(li);
}

function updateNote(li, n) {
	li.appendChild(document.createTextNode(n.text));
}

/// event handlers
function onNoteAdded(evt, i) {
	var n = todo.getTodo(i);
	if (n != null) {
		insertNote(n);
	}
}

function onNoteRemoved(evt, index) {
	var lis = $('#notes-list li');
	if (index >= 0 && index < lis.length) {
		var li = lis[index];
		li.parentNode.removeChild(li);
	}
}

})();
