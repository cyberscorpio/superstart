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
var EXPORTED_SYMBOLS = [ "ssTodoList" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Ce = Components.Exception;
const Cu = Components.utils;
const ssITodoList = Ci.ssITodoList;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

function ssTodoList() {
	var that = this;
	var logger = this.logger;
	var todoFile = FileUtils.getFile('ProfD', ['superstart', 'todo.json']);
	this.todoList = [];
	load();

	function load() {
		that.todoList = [];
		try {
			if (!todoFile.exists()) {
				if (retry == 0) {
					todoFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
				}
				save();
			} else {
				that.todoList = that.jparse(that.fileGetContents(todoFile));
			}
		} catch (e) {
			logger.logStringMessage(e);
		}
	}

	function save() {
		that.filePutContents(todoFile, that.stringify(that.todoList));
	}



	this.getTodoList = function() {
		var s = this.stringify(this.todoList);
		return this.jparse(s);
	}

	this.getTodo = function(index) {
		if (index < 0 || index >= this.todoList.length) {
			return null;
		} else {
			var s = this.stringify(this.todoList[index]);
			return this.jparse(s);
		}
	}

	this.addTodo = function(type, text, priority) {
		var todo = {
			'type': type,
			'text': text,
			'priority': priority
		};

		var index = this.todoList.length;
		this.todoList.push(todo);
		save();

		this.fireEvent('todo-added', index);
	}

	this.changeTodo = function(index, type, text, priority) {
		if (index < 0 || index >= this.todoList.length) {
			return;
		} else {
			var todo = this.todoList[index];
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
		if (index < 0 || index >= this.todoList.length) {
			return;
		}
		this.todoList.splice(index, 1);
		save();

		this.fireEvent('todo-removed', index);
	}
}

