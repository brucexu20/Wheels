(function (global, factory) {
    if (typeof exports === 'object' && typeof module === 'object') {
        exports = module.exports = factory();
    }
    else if (typeof define === 'function' && define.amd) {
        define(factory);
    }
    else {
        global.tpl = factory();
    }
})(this, function () {

    var guidIndex = 0x2B845;

    function generateGUID() {
        return '__' + guidIndex++;
    }

    function extend(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    function inherit(subClass, superClass) {
        var Empty = new Function();
        Empty.prototype = superClass.prototype;
        subClass.prototype = new Empty();
        subClass.prototype.constructor = subClass;
    }

    function Stack() {
        this.raw = [];
        this.length = 0;
    }

    Stack.prototype = {
        constructor: Stack,

        push: function (item) {
            this.raw[this.length++] = item;
        },

        pop: function () {
            if (this.length) {
                this.raw.length = --this.length;
                return this.raw[this.length];
            }
        },

        top: function () {
            if (this.length) {
                return this.raw[this.length - 1];
            }
        },

        bottom: function () {
            if (this.length) {
                return this.raw[0];
            }
        },

        find: function (condition) {
            for (var i = this.length - 1; i >= 0; i--) {
                var item = this.raw[i];
                if (condition(item)) {
                    return item;
                }
            }
        }
    };

    function stringFormat(source) {
        var args = arguments;
        return source.replace(
            /\{([0-9]+)\}/g,
            function (match, index) {
                return args[index - 0 + 1];
            }
        );
    }

    var HTML_ENTITY = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt',
        '\'': '&#39;',
        '\"': '&quot;'
    };

    function htmlFilterReplacer(c) {
        return HTML_ENTITY[c];
    }

    var DEFAULT_FILTERS = {
        html: function (source) {
            return source.replace(/[&<>'"]/g, htmlFilterReplacer);
        },

        url: encodeURIComponent,

        raw: function (source) {
            return source;
        }
    };

    var TargetState = {
        READING: 1,
        READED: 2,
        APPLIED: 3,
        READY: 4
    };

    var RENDER_STRING_DECLATION = 'var r = "";';
    var RENDER_STRING_ADD_START = 'r += ';
    var RENDER_STRING_ADD_END = ';';
    var RENDER_STRING_RETURN = 'return r;';

    var RENDER_BODY_START = '';

    function beforeOpen(context) {
        var target = context.stack.bottom();
        if (!target) {
            target = new TargetCommand(generateGUID(), context.engine);
        }

        target.open(context);
    }

    function TextNode(value, engine) {
        this.value = value;
        this.engine = engine;
    }

    TextNode.prototype = {
        constructor: TextNode,

        beforeAdd: beforeOpen,

        getRendererBody: function () {
            var value = this.value;
            var options = this.engine.options;

            if (!value || options.strip && /^\s*$/.test(value)) {
                return '';
            }

            return compileVariable(value, this.engine, 1);
        }
    };

    function Command(value, engine) {
        this.children = [];
        this.value = value;
        this.engine = engine;
    }

    Command.prototype = {
        addChild: function (node) {
            this.children.push(node);
        },

        beforeOpen: beforeOpen,

        open: function (context) {
            if (typeof this.beforeOpen === 'function') {
                this.beforeOpen(context);
            }

            var parent = context.stack.pop();
            if (parent) {
                parent.addChild(this);
            }

            context.stack.push(this);
        },

        close: function (context) {
            if (context.stack.top() === this) {
                context.stack.pop();
            }
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
    }

    /* TargetCommand start */
    function TargetCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*(\(\s*master\s*=\s*([a-z0-9\/_-]+)\s*\))?\s*/i.test(value)) {
            throw new Error('Invalid target: `' + value + '`');
        }

        this.name = RegExp.$1;
        this.master = RegExp.$3;
        this.blocks = {};
        Command.call(this, value, engine);
    }

    inherit(TargetCommand, Command);

    TargetCommand.prototype.open = function (context) {
        autoCloseCommand(context);

        context.stack.push(this);
        this.state = TargetState.READING;
        addTargetToContext(this, context);
    };

    TargetCommand.prototype.close = function (context) {
        autoCloseCommand(context);

        Command.prototype.close.call(this, context);
        this.state = this.master ? TargetState.READY : TargetState.APPLIED;
        context.target = null;
    };

    TargetCommand.prototype.getRenderer = function (context) {
        if (this.renderer) {
            return this.renderer;
        }

        if (this.isReady()) {
            var realRenderer = new Function(
                [
                    RENDER_BODY_START,
                    RENDER_STRING_DECLATION,
                    this.getRendererBody(),
                    RENDER_STRING_RETURN
                ].join('')
            );

            var engine = context.engine;
            this.renderer = function (data) {
                return realRenderer(data, engine);
            }

            return this.renderer;
        }

        return null;
    };
    /* TargetCommand end */

    /* ImportCommand start */
    function ImportCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*$/i.test(value)) {
            throw new Error('Invalid import command: `' + value + '`');
        }

        this.name = RegExp.$1;
        Command.call(this, value, engine);
        this.blocks = {};
    }

    inherit(ImportCommand, Command);

    ImportCommand.prototype.open = function (context) {
        Command.prototype.open.call(this, context);
        (context.imp || context.target).blocks[this.name] = this;
    };
    /* ImportCommand end */

    /* BlockCommand start */
    function BlockCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*$/i.test(value)) {
            throw new Error('Invalid block command: `' + value + '`');
        }

        this.name = RegExp.$1;
        Command.call(this, value, engine);
    }

    inherit(BlockCommand, Command);

    BlockCommand.prototype.open = function (context) {
        Command.prototype.open.call(this, context);
        (context.imp || context.target).blocks[this.name] = this;
    };
    /* BlockCommand end */

    /* VarCommand start */
    function VarCommand(value, engine) {
        if (!/^\s*([a-z0-9_]+)\s*=([\s\S]*)$/i.test(value)) {
            throw new Error('Invalid var command: `' + value + '`');
        }

        this.name = RegExp.$1;
        this.expr = RegExp.$2;
        Command.call(this, value, engine);
    }

    inherit(VarCommand, Command);

    VarCommand.prototype.open = function (context) {
        context.stack.top().addChild(this);
    };
    /* VarCommand end */

    /* UseCommand start */
    function UseCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*(\(([\s\S]*)\))?\s*$/i.test(value)) {
            throw new Error('Invalid use command: `' + value + '`');
        }

        this.name = RegExp.$1;
        this.args = RegExp.$3;
        Command.call(this, value, engine);
    }

    inherit(UseCommand, Command);

    UseCommand.prototype.open = function (context) {
        context.stack.top().addChild(this);
    };
    /* UseCommand end */

    /* ForCommand start */
    function ForCommand(value, engine) {
        var regExp = new RegExp(
            stringFormat(
                '^\\s*({0}[\\s\\S]+{1})\\s*as\\s+{0}([a-z0-9_]+){1}\\s*(,\\s*{0}([a-z0-9_]+){1})?\\s*$',
                engine.options.variableOpen,
                engine.options.variableClose
            ),
            'i'
        );
        if (!regExp.test(value)) {
            throw new Error('Invalid for command: `' + value + '`');
        }

        this.list = RegExp.$1;
        this.item = RegExp.$2;
        this.index = RegExp.$4;
        Command.call(this, value, engine);
    }

    inherit(ForCommand, Command);
    /* ForCommand end */

    /* FilterCommand start */
    function FilterCommand(value, engine) {
        if (!/^\s*([a-z0-9_-]+)\s*(\(([\s\S]*)\))?\s*$/i.test(value)) {
            throw new Error('Invalid filter command: `' + value + '`');
        }

        this.name = RegExp.$1;
        this.args = RegExp.$3;
        Command.call(this, value, engine);
    }

    inherit(FilterCommand, Command);
    /* FilterCommand end */

    /* IfCommand start */
    function IfCommand(value, engine) {
        Command.call(this, value, engine);
    }

    inherit(IfCommand, Command);
    /* IfCommand end */

    /* ElifCommand start */
    function ElifCommand(value, engine) {
        Command.call(this, value, engine);
    }

    inherit(ElifCommand, IfCommand);
    /* ElifCommand end */

    /* ElseCommand start */
    function ElseCommand(value, engine) {
        Command.call(this, value, engine);
    }

    inherit(ElseCommand, IfCommand);
    /* ElseCommand end */

    var commandTypes = {};

    function registerCommandTypes(name, CommandType) {
        commandTypes[name] = CommandType;
    }

    registerCommandTypes('target', TargetCommand);
    registerCommandTypes('block', BlockCommand);
    registerCommandTypes('import', ImportCommand);
    registerCommandTypes('use', UseCommand);
    registerCommandTypes('var', VarCommand);
    registerCommandTypes('for', ForCommand);
    registerCommandTypes('if', IfCommand);
    registerCommandTypes('elif', ElifCommand);
    registerCommandTypes('else', ElseCommand);
    registerCommandTypes('filter', FilterCommand);

    function Engine(options) {
        this.options = {
            commandOpen: '<!--',
            commandClose: '-->',
            commandSyntax: /^\s*(\/)?([a-z]+)\s*(?::([\s\S]+))?$/,
            variableOpen: '${',
            variableClose: '}',
            defaultFilter: 'html',
            strip: false,
            namingConflict: ''
        };

        extend(this.options, options);

        this.targets = {};
        this.filters = extend({}, DEFAULT_FILTERS);
    }

    Engine.prototype = {
        constructor: Engine,

        config: function (options) {
            extend(this.options, options);
        },

        compile: function (source) {
            if (source) {
                var targets = parseSource(source, this);
                if (targets.length) {
                    return this.targets[targets[0]].getRenderer();
                }
            }

            return new Function('');
        },

        getRenderer: function (name) {
            var target = this.targets[name];
            if (target) {
                return target.getRenderer();
            }
        },

        render: function (name, data) {
            var renderer = this.getRenderer(name);
            if (renderer) {
                return renderer(data);
            }

            return '';
        },

        addFilter: function (name, filterFn) {
            if (typeof filterFn === 'function') {
                this.filters[name] = filterFn;
            }
        }
    };

    function autoCloseCommand(context, CommandType) {
        var stack = context.stack;
        var commandNode = CommandType
            ? stack.find(
                function (item) {
                    return item instanceof CommandType;
                }
            )
            : stack.bottom();

        if (commandNode) {
            var current;
            while ((current = stack.top()) !== commandNode) {
                if (typeof current.autoClose !== 'function') {
                    throw new Error('Command node `' + current.name + '` must be closed manually');
                }

                current.autoClose(context);
            }

            commandNode.close(context);
        }

        return commandNode;
    }

    function stringLiteralize(source) {
        return '"'
            + source
                .replace(/\x5C/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\x0A/g, '\\n')
                .replace(/\x09/g, '\\t')
                .replace(/\x0D/g, '\\r')
            + '"';
    }


    function parseCommandBlock(source, openText, closeText, onInBlock, onOutBlock) {
        var texts = source.split(openText);
        var closeLen = closeText.length;

        for (var i = 0, len = texts.length; i < len; i++) {
            var text = texts[i];
            var command;

            if (i) {
                var closeIndex = text.indexOf(closeText);
                if (closeIndex < 0) {
                    command = text;
                    text = '';
                }
                else {
                    command = text.slice(0, closeIndex);
                    text = text.slice(closeIndex + 1);
                }

                onInBlock(text.slice(0, closeIndex));
                onOutBlock(text.slice(closeIndex + closeLen));
            }
            else {
                text && onOutBlock(text);
            }
        }
    }

    function compileVariable(source, engine, forText) {
        var options = engine.options;

        var code = [];

        var toStringHead = '';
        var toStringFoot = '';
        var wrapHead = '';
        var wrapFoot = '';
        var defaultFilter;

        if (forText) {
            toStringHead = 'ts(';
            toStringFoot = ')';
            wrapHead = RENDER_STRING_ADD_START;
            wrapFoot = RENDER_STRING_ADD_END;
            defaultFilter = options.defaultFilter;
        }

        parseCommandBlock(
            source,
            options.variableOpen,
            options.variableClose,
            function (text) {
                if (forText && text.indexOf('|') < 0 && defaultFilter) {
                    text += '|' + defaultFilter;
                }

                var filterCharIndex = text.indexOf('|');
                var variableName = (
                        filterCharIndex > 0
                        ? text.slice(0, filterCharIndex)
                        : text
                    ).replace(/^\s+|\s+$/g, '');
                var filterSource = filterCharIndex > 0
                    ? text.slice(filterCharIndex + 1)
                    : '';
            },
            function (text) {
                code.push(
                    wrapHead,
                    forText ? stringLiteralize : text,
                    wrapFoot
                );
            }
        );

        return code.join('');
    }

    function parseTextBlock(source, openText, closeText, onInBlock, onOutBlock) {
        var texts = source.split(openText);
        var closeLen = closeText.length;

        for (var i = 0, len = texts.length; i < len; i++) {
            var text = texts[i];
            var command;

            if (i) {
                var closeIndex = text.indexOf(closeText);
                if (closeIndex < 0) {
                    command = text;
                    text = '';
                }
                else {
                    command = text.slice(0, closeIndex);
                    text = text.slice(closeIndex + 1);
                }

                onInBlock(text.slice(0, closeIndex));
                onOutBlock(text.slice(closeIndex + closeLen));
            }
            else {
                text && onOutBlock(text);
            }
        }
    }

    function parseSource(source, engine) {
        var commandOpen = engine.options.commandOpen;
        var commandClose = engine.options.commandClose;
        var commandSyntax = engine.options.commandSyntax;
        var textBuf = [];
        var stack = new Stack();
        var context = {
            engine: engine,
            targets: [],
            target: null,
            stack: stack
        };

        function flushTextBuf(textBuf) {
            var text;
            if (textBuf.length && (text = textBuf.join(''))) {
                if (engine.options.strip) {
                    text = text.replace(/^\s*|\s*$/, '');
                }
                if (text) {
                    var textNode = new TextNode(text);

                    textNode.beforeAdd();
                    stack.top().addChild(textNode);
                }
            }
        }

        parseTextBlock(
            source,
            commandOpen,
            commandClose,
            function (text) {
                var match = commandSyntax.exec(text);
                var NodeType;

                if (match
                    && NodeType = commandTypes(match[2].toLowerCase())
                    && typeof NodeType === 'function'
                ) {
                    flushTextBuf();

                    if (match[1]) {
                        autoCloseCommand(context, NodeType);
                    }
                    else {
                        var node = new NodeType(text, engine);
                        node.open();
                    }
                }
                else if (!/^\s*\/\/$/.test(text)) {
                    textBuf.push(commandOpen, text, commandClose);
                }
            },
            function (text) {
                textBuf.push(text);
            }
        );

        flushTextBuf(textBuf);
        autoCloseCommand(context);

        return context.targets;
    }

    var tpl = new Engine();
    tpl.Tpl = Tpl;

    return tpl;
});
