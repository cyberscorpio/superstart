/**
 * created on 10/2/2012, on hospital, with my father
 */
"use strict";
(function() {
var tdevts = {
	'todo-added': onNoteAdded
	, 'todo-removed': onNoteRemoved
};
var cfgevts = {
	'todo-hide': onTodoHide
};
evtMgr.register([tdevts, cfgevts], [], []);
evtMgr.ready(function() {
	init();
	onTodoHide('todo-hide', cfg.getConfig('todo-hide'));
});

(function() {
	var li = document.createElement('li');
	li.className = 'note';
	var done = document.createElement('div');
	done.className = 'button done';
	done.setAttribute('title', getString('ssNoteDone'));
	li.appendChild(done);

	tmplMgr.addTmpl('note', li, {
		'.button.done': ['click', onDone]
	});
}())

function onTodoHide(evt, v) {
	var onoff = $$('nbc-notes-onoff');
	if (v) {
		$.addClass($$('notes'), 'hidden');
		$.removeClass(onoff, 'opened');
		onoff.setAttribute('title', getString('ssNotesOpen'));
	} else {
		$.removeClass($$('notes'), 'hidden');
		$.addClass(onoff, 'opened');
		onoff.setAttribute('title', getString('ssNotesClose'));
	}
}

function init() {
	var onoff = $$('nbc-notes-onoff');
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
	var note = tmplMgr.getNode('note');
	updateNote(note, n);
	list.appendChild(note);
}

function updateNote(note, n) {
	note.appendChild(document.createTextNode(n.text));
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
