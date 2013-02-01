/**
 * the implements of ssITodoList
 * 
 * format of the todo list:
	[
		{
			'type': normal | urgent,
			'text': text,
			'priority': priority
		},
		...
	]
 * related events:
 */
"use strict";
var EXPORTED_SYMBOLS = [ "ssTodoList" ];

function ssTodoList() {
const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

	let that = this;
	let logger = this.logger;
	let todoFile = FileUtils.getFile('ProfD', ['superstart', 'todo.json']);
	let todoList = [];
	load();

	function load() {
		todoList = [];
		try {
			if (!todoFile.exists()) {
				todoFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
				save();
			} else {
				todoList = that.jparse(that.fileGetContents(todoFile));
			}
		} catch (e) {
			logger.logStringMessage(e);
		}
	}

	function save() {
		that.filePutContents(todoFile, that.stringify(todoList));
	}


	this.reloadTodoList = function() {
		load();
	}

	this.getTodoList = function() {
		let s = this.stringify(todoList);
		return this.jparse(s);
	}

	this.getTodo = function(index) {
		if (index < 0 || index >= todoList.length) {
			return null;
		} else {
			let s = this.stringify(todoList[index]);
			return this.jparse(s);
		}
	}

	this.addTodo = function(type, text, priority) {
		let todo = {
			'type': type,
			'text': text,
			'priority': priority
		};

		let index = todoList.length;
		todoList.push(todo);
		save();

		this.fireEvent('todo-added', index);
	}

	this.changeTodo = function(index, type, text, priority) {
		if (index < 0 || index >= todoList.length) {
			return;
		} else {
			let todo = todoList[index];
			if (todo.type != type || todo.text != text || todo.priority != priority) {
				todo.type = type;
				todo.text = text;
				todo.priority = priority;
				save();

				this.fireEvent('todo-changed', index);
			}
		}
	}

	this.removeTodo = function(index) {
		if (index < 0 || index >= todoList.length) {
			return;
		}
		todoList.splice(index, 1);
		save();

		this.fireEvent('todo-removed', index);
	}
}

