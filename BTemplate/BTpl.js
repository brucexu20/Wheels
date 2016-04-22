(function (global, factory) {
    if (typeof exports === 'object' && typeof module.exports === 'object') {
        exports = module.exports = factory();
    }
    else if (typeof define === 'function' && define.amd) {
        define(factory);
    }
    else {
        global.BTpl = factory();
    }
}(this, function () {

    var guidIndex = 0x2B845;

    function generateGuid() {
        return ++guidIndex;
    }

    function empty() {}

    function extend(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function inherits(subClass, supClass) {
        var Empty = function () {};
        Empty.prototype = supClass.prototype;
        subClass.prototype = new Empty();
        subClass.constructor = subClass;
    }

    function Stack() {
        this.raw = [];
        this.length = 0;
    }

    Stack.prototype = {
        push: function (item) {
            this.raw[this.length++] = item;
        },

        pop: function () {
            if (this.length) {
                var item = this.raw[this.length - 1];
                this.raw.length = --this.length;
                return item;
            }
        },

        top: function () {
            return this.raw[this.length - 1];
        },

        bottom: function () {
            return this.raw[0];
        },

        find: function (condition) {
            var length = this.length;
            while (--length) {
                var item = this.raw[length];
                if (condition(item)) {
                    return item;
                }
            }

            return null;
        }
    };

    function TextNode(value, engine) {
        this.value = value;
        this.engine = engine;
    }

    TextNode.prototype = {
        getRendererBody: function() {

        },

        clone: function () {
            return this.value;
        }
    };

    function addTargetToContext(target, context) {
        context.engine.targets[target.name] = target;
    }

    function beforeOpen(context) {
        var stack = context.stack;
        if (!stack.bottom()) {
            var target = new TargetCommand(generateGuid());
            stack.push(target);
            addTargetToContext(target);
        }
    }

    function Command(value, engine) {
        this.value = value;
        this.engine = engine;
        this.children = [];
        this.cloneProps = [];
    }

    Command.prototype = {
        addChild: function (child) {
            this.children.push(child);
        },

        open: function (context) {
            beforeOpen(context);

            var stack = context.stack;
            var parent = stack.top();
            if (parent) {
                parent.addChild(this);
            }

            stack.push(this);
        },

        close: function () {

        },

        getRendererBody: function () {
            var buf = [];
            var children = this.children;
            for (var i = 0, len = children.length; i < len; i++) {
                buf.push(children[i].getRendererBody());
            }

            return buf.join('');
        },

        clone: function () {

        }
    };

    /* TargetCommand define start */
    function TargetCommand(value, engine) {
        if (!/^\s*([a-z0-9_-]+)\s*(\(\s*master\s*=\s*([a-z0-9_+]+)\s*\))?\s*$/i.test(value)) {
            throw new Error('Invalid target command: `' + value + '`');
        }

        Command.call(this, value, engine);

        this.name = RegExp.$1;
        this.master = RegExp.$3;
        this.blocks = {};
        this.cloneProps = ['name', 'master'];
    }

    inherits(TargetCommand, Command);

    var renderBodyStart = (
        function () {
            data = data || {};
            var v = {},
                fs = engine.filters,
                hg = typeof data.get === 'function';
            var gv = function (n, ps) {
                var p = ps[0];
                var d = v[p];
                if (d == null) {
                    if (hg) {
                        return data.get(n);
                    }
                    d = data[p];
                }
                for (var i = 1, l = ps.length; i < l; i++) {
                    if (d == null) {
                        break;
                    }
                    d = d[ps[i]];
                }
                return d;
            };
            var ts = function (n) {
                if (typeof n === 'string') {
                    return n;
                }
                if (n == null) {
                    return '';
                }
                return '' + n;
            };
        }
    ).toString();

    var RENDER_BODY_START = renderBodyStart.slice(13, renderBodyStart.length - 1);
    var RENDER_BODY_DECLARTION = 'var r = ""';
    var RENDER_BODY_ADD_START = 'r += ';
    var RENDER_BODY_ADD_END = ';';
    var RENDER_BODY_RETURN = 'return r;';

    TargetCommand.prototype.open = function (context) {

    };

    TargetCommand.prototype.getRenderer = function (target) {
        if (this.renderer) {
            return this.renderer;
        }

        var realRenderer = new Function(
            'data', 'engine',
            [
                RENDER_BODY_START,
                RENDER_BODY_DECLARTION,
                this.getRendererBody(),
                RENDER_BODY_RETURN
            ].join('')
        );

        return function (data) {
            return realRenderer(data, this.engine);
        }
    };
    /* TargetCommand define end */

    /* ImportCommand define start */
    function ImportCommand(value, engine) {
        if (!/^\s*([a-z0-9_-]+)\s*$/i.test(value)) {
            throw new Error('Invalid import command: `' + value + '`');
        }

        Command.call(this, value, engine);

        this.master = RegExp.$1;
        this.blocks = [];
    }

    inherits(ImportCommand, Command);
    /* ImportCommand define end */

    /* UseCommand define start */
    function UseCommand(value, engine) {
        if (!/^\s*([a-z0-9_-]+)\s*(?:\(([\s\S]+)\))?\s*$/i.test(value)) {
            throw new Error('Invalid use command: `' + value + '`');
        }

        Command.call(this, value, engine);

        this.name = RegExp.$1;
        this.args = RegExp.$2;
    }

    inherits(UseCommand, Command);

    UseCommand.prototype.open = empty;
    /* UseCommand define end */

    /* BlockCommand define start */
    function BlockCommand(value, engine) {
        if (!/^\s*([a-z0-9_-]+)\s*$/i.test(value)) {
            throw new Error('Invalid block command: `' + value + '`');
        }

        Command.call(this, value, engine);

        this.name = RegExp.$1;
    }

    inherits(BlockCommand, Command);
    /* BlockCommand define end */

    /* VarCommand define start */
    function VarCommand(value, engine) {
        if (!/^\s*([a-z0-9_]+)\s*=([\s\S]*)$/i.test(value)) {
            throw new Error('Invalid var command: `' + value + '`');
        }

        Command.call(this, value, engine);

        this.name = RegExp.$1;
        this.value = RegExp.$2;
    }

    inherits(VarCommand, Command);

    VarCommand.prototype.open = empty;
    /* VarCommand define end */

    /* IfCommand define start */
    function IfCommand(value, engine) {
        Command.call(this, value, engine);
    }

    inherits(IfCommand, Command);
    /* IfCommand define end */

    /* ElseCommand define start */
    function ElseCommand(value, engine) {
        Command.call(this, value, engine);
    }

    inherits(ElseCommand, IfCommand);

    ElseCommand.prototype.open = function (context) {
        var ifCommand = autoCloseCommand(context, IfCommand);
        ifCommand.addChild(this);
        context.stack.push(this);
    };
    /* ElseCommand define end */

    /* ElifCommand define start */
    function ElifCommand(value, engine) {
        Command.call(this, value, engine);
    }

    inherits(ElifCommand, IfCommand);

    ElifCommand.prototype.open = function (context) {
        var elseCommand = new ElseCommand();
        elseCommand.open(context);

        var ifCommand = autoCloseCommand(context, IfCommand);
        ifCommand.addChild(this);
        context.stack.push(this);
    };
    /* ElifCommand define end */

    /* ForCommand define start */
    function ForCommand(value) {
        Command.call(this, value);
    }

    inherits(ForCommand, Command);
    /* ForCommand define end */

    /* FilterCommand define start */
    function FilterCommand(value) {
        Command.call(this, value);
    }

    inherits(FilterCommand, Command);
    /* FilterCommand define end */

    var commandTypes = {};

    function registerCommandType(name, commandType) {
        commandTypes[name] = commandType;
    }

    registerCommandType('target', TargetCommand);
    registerCommandType('import', ImportCommand);
    registerCommandType('use', UseCommand);
    registerCommandType('block', BlockCommand);
    registerCommandType('var', VarCommand);
    registerCommandType('if', IfCommand);
    registerCommandType('elif', ElifCommand);
    registerCommandType('else', ElseCommand);
    registerCommandType('for', ForCommand);
    registerCommandType('filter', FilterCommand);

    var ESCAPE_ENTITIES = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        '\'': '&#39;'
    };

    function escapeHtml(entity) {
        return ESCAPE_ENTITIES[entity];
    }

    function formatString(text) {
        var args = argumengs;
        return /[<>&'"]/g.replace(escapeHtml);
    }

    var DEFAULT_FILTERS = {
        html: function (text) {
            return formatString(text);
        },

        url: encodeURIComponent,

        raw: function (text) {
            return text;
        }
    };

    function autoCloseCommand(context, CommandType) {
        var stack = context.stack;
        var closeCommand = CommandType
            ? stack.find(function (item) {
                    if (item instanceof CommandType) {
                        return item;
                    }
                })
            : stack.top();

        if (closeCommand) {
            var top = null;
            while ((top = stack.top()) !== closeCommand) {
                if (typeof top.autoClose !== 'function') {
                    throw new Error('Command `' + closeCommand.name + '` must be closed manually');
                }

                top.autoClose();
            }

            closeCommand.close();
        }
    }

    function parseVariable(source, open, close, variableFn, textFn) {
        var texts = source.split(open);
        var closeLen = close.length;
        var level = 0;
        var buf = [];

        for (var i = 0, len = texts.length; i < len; i++) {
            var text = texts[i];
            var closeIndex;
            if (i) {
                level++;

                while (1 && level) {
                    closeIndex = text.indexOf(close);
                    if (closeIndex < 0) {
                        buf.push(text);
                        break;
                    }

                    level--;
                    var variable = text.slice(0, closeIndex);
                    level
                        ? buf.push(open, variable, close)
                        : buf.push(variable);
                    text = text.slice(closeIndex + closeLen);
                }

                if (level === 0) {
                    variableFn(buf.join(''));
                    text && textFn(text);
                    buf = [];
                }
            }
            else {
                text && textFn(text);
            }
        }
    }

    function compileVariable(source, engine, forText) {
        var options = engine.options;
        var variableOpen = options.variableOpen;
        var variableClose = options.variableClose;
        var addStart = '';
        var addEnd = '';
        var buf = [];

        if (forText) {
            addStart = RENDER_BODY_ADD_START;
            addEnd = RENDER_BODY_ADD_END;
        }

        parseVariable(
            source,
            variableOpen,
            variableClose,
            function (text) {
                var filterIndex = text.indexOf('|');
                if (filterIndex > 0) {
                    var variableName = text.slice(0, filterIndex);
                    var variableFilter = text.slice(filterIndex);
                    var filters = variableFilter.split('|');
                    for (var i = 0, len = filters.length; i < len; i++) {
                        var filter =
                    }
                }
                else {
                    if (forText) {
                        text = 'ts(' + text + ')';
                    }
                    buf.push(addStart, text, addEnd);
                }

            },
            function (text) {
                buf.push(addStart, text, addEnd);
            }
        )

        return buf.join('');
    }

    function parseCommand(source, open, close, commandFn, textFn) {
        var texts = source.split(open);
        var closeLen = close.length;

        for (var i = 0, len = texts.length; i < len; i++) {
            var text = texts[i];
            if (i) {
                var closeIndex = text.indexOf(close);
                if (closeIndex < 0) {
                    textFn(open + text);
                }
                else {
                    var command = text.slice(0, closeIndex);
                    text = text.slice(closeIndex + closeLen);

                    commandFn(command);
                    text && textFn(text);
                }
            }
            else {
                text && textFn(text);
            }
        }
    }

    function compileSource(source, engine) {
        var options = engine.options;
        var commandOpen = options.commandOpen;
        var commandClose = options.commandClose;
        var stack = new Stack();
        var buf = [];
        var context = {
            engine: engine,
            stack: stack,
            targets: []
        };

        function flushText() {
            var text = buf.join('');
            if (!text) {
                return;
            }

            var textNode = new TextNode(text);
            beforeOpen(context);
            stack.top().addChild(textNode);
        }

        parseCommand(
            source,
            commandOpen,
            commandClose,
            function (text) {
                var match = commandExp.test(text);
                var CommandType = null;
                if (match && (CommandType = commandTypes[RegExp.$2]) && typeof CommandType === 'function') {
                    flushText();
                    if (RegExp.$1) {
                        autoCloseCommand(context, CommandType);
                    }
                    else {
                        var commandNode = new CommandType(RegExp.$3);
                        commandNode.open(context);
                    }
                }
                else {
                    buf.push(commandOpen, text, commandClose);
                }
            },
            function (text) {
                buf.push(text);
            }
        );

        flushText();
        autoCloseCommand();

        return context.targets;
    }

    function Engine(options) {
        this.options = {
            commandOpen: '<!--',
            commandClose: '-->',
            commandExp: /^\s*(\/)?([a-z]+)\s*(?::([\s\S]+))?$/,
            variableOpen: '${',
            variableClose: '}',
            defaultFilter: 'html'
        };
        this.targets = {};
        this.filters = extend({}, DEFAULT_FILTERS);
        extend(this.options, options);
    }

    Engine.prototype = {
        constructor: Engine,

        config: function (options) {
            extend(this.options, options);
        }

        compile: function (source) {
            var targets = compileSource(source, this);
            if (targets.length) {
                return this.targets[targets[0]].getRenderer();
            }

            return new Function('');
        },

        getRenderer: function (target) {
            target = this.targets[target];
            if (target) {
                return target.getRenderer();
            }
        },

        render: function (target, data) {
            var renderer = this.getRenderer(target);
            if (renderer) {
                return renderer(data);
            }

            return '';
        },

        addFilter: function (name, filter) {
            if (typeof filter === 'function') {
                this.filters[name] = filter;
            }
        }
    };
}));
