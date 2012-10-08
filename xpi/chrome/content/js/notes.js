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
	} else {
		$.removeClass($$('notes'), 'hidden');
	}
}

function init() {
	var input = $$('note-edit');
	input.setAttribute('placeholder', getString('ssTodoPlaceHolder'));

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

function insertNote(n) {
	var list = $$('notes-list');
	var li = document.createElement('li');
	updateNote(li, n);
	list.appendChild(li);
}

function updateNote(li, n) {
	// n.text = sU.escapeHTML(n.text);
	// n.star = (n.priority || 0) ? 'star' : 'nostar';
	// li.innerHTML = xl.utils.template(tmplTodo, todo);
	li.appendChild(document.createTextNode(n.text));

	/*
	var map = {'star' : todoRemoveStar, 'nostar' : todoAddStar};
	for (var k in map) {
		var btn = li.getElementsByClassName(k);
		if (btn.length > 0) {
			for (var i = 0; i < btn.length; ++ i) {
				btn[i].setAttribute('title', map[k]);
			}
		}
	}
	*/
}

/// event handlers
function onNoteAdded(evt, i) {
        var n = todo.getTodo(i);
        if (n != null) {
                insertNote(n);
        }
}

})();
