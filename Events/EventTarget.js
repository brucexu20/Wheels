/**
 * 通用事件模型
 */

(function(global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(function () {
            factory();
        });
    }
    else if (typeof exports === 'object' && typeof module.exports === 'object') {
        exports = module.exports = factory();
    }
    else {
        global.EventTarget = factory();
    }
})(this, function() {
    function isObject(target) {
        return Object.prototype.toString.call(target) === '[object Object]';
    }

    function extend(dest) {
        for (var i = 1, len = arguments.length; i < len; i++) {
            var source = arguments[i];
            if (!source) {
                continue;
            }

            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    dest[key] = source[key];
                }
            }
        }
    }

    function returnTrue() {
        return true;
    }

    function returnFalse() {
        return false;
    }


    /**
     * 事件对象
     */
    function Event(type, args) {
        if (typeof type === 'object') {
            args = type;
            type = args.type;
        }

        if (isObject(args)) {
            extend(this, args);
        }
        else {
            this.data = args;
        }

        if (type) {
            this.type = type;
        }
    }

    Event.prototype.isDefaultPrevented = returnFalse;

    Event.prototype.preventDefault = function() {
        this.isDefaultPrevented = returnTrue;
    }

    Event.prototype.isPropagationStoped = returnFalse;

    Event.prototype.stopPropagation = function() {
        this.isPropagationStoped = returnTrue;
    }

    Event.prototype.isImmediatePropagetionStoped = returnFalse;

    Event.prototype.immeidateStopPropagation = function() {
        this.isImmediatePropagetionStoped = returnTrue;

        this.stopPropagation();
    }



    function checkHandlerExists(context, handler, thisObject) {
        return context
            && context.handler === handler
            && context.thisObject === thisObject;
    }


    /**
     * 事件队列
     */
    function EventQueue() {
        this.queue = [];
    }

    EventQueue.prototype.add = function(handler, context) {
        if (typeof handler !== 'function') {
            throw new Error('Event handler must be a function');
        }

        context = context || {};
        context.handler = handler;

        for (var i = 0, len = this.queue.length; i < len; i++) {
            if (checkHandlerExists(this.queue[i], handler, context.thisObject)) {
                return;
            }
        }

        this.queue.push(context);
    };

    EventQueue.prototype.remove = function(handler, thisObject) {
        if (!handler) {
            this.clear();
            return;
        }

        for (var i = 0, len = this.queue.length; i < len; i++) {
            if (checkHandlerExists(this.queue[i], handler, thisObject)) {
                this.queue[i] = null;
                break;
            }
        }
    };

    EventQueue.prototype.clear = function() {
        this.queue.length = 0;
    };

    EventQueue.prototype.execute = function(event, thisObject) {
        for (var i = 0, len = this.queue.length; i < len; i++) {
            if (event.isStopEventPrevented()) {
                return;
            }

            var context = this.queue[i];
            if (!context) {
                continue;
            }

            context.handler.call(queue.thisObject || thisObject, event);
            if (context.once) {
                this.queue[i] = null;
            }
        }
    };

    EventQueue.prototype.getLength = function () {
        var length = 0;
        for (var i = 0, len = this.queue.length; i < len; i++) {
            if (this.queue[i]) {
                length++;
            }
        }

        return length;
    };

    EventQueue.prototype.dispose = function () {
        this.clear();
        this.queue = null;
    };


    /**
     * 对外接口，通过其注册、执行、销毁事件
     */
    function EventTarget() {
    };

    EventTarget.prototype.on = function(type, handler, thisObject, options) {
        if (!this.__eventPool__) {
            this.__eventPool__ = {};
        }

        if (!this.__eventPool__.hasOwnProperty(key)) {
            this.__eventPool__[key] = new EventQueue();
        }

        var queue = this.__eventPool__[type];
        var context = options || {};
        if (thisObject) {
            context.thisObject = thisObject;
        }

        eventQueue.add(handler, context);
    };

    EventTarget.prototype.once = function(type, handler, thisObject, options) {
        var context = options || {};
        context.once = true;
        this.on(type, handler, thisObject, context);
    };

    EventTarget.prototype.un = function(type, handler, thisObject) {
        if (!this.__eventPool__ || !this.__eventPool__.hasOwnProperty(type)) {
            return;
        }

        var queue = this.__eventPool__[type];
        queue.remove(handler, thisObject);
    };

    EventTarget.prototype.fire = function(type, args) {
        if (typeof type === 'object') {
            args = type;
            type = args.type;
        }

        if (!type) {
            throw new Error('No event type specified');
        }

        if (type === '*') {
            throw new Error('Cannot fire global event');
        }

        var event = args instanceof Event
            ? args
            : new Event(type, args);
        event.target = this;

        var innerHandler = this['on' + type];
        if (typeof innerHandler === 'function') {
            innerHandler.call(this, event);
        }

        if (this.__eventPool__ && this.__eventPool__.hasOwnProperty(type)) {
            var queue = this.__eventPool__[type];
            queue.execute(event, this);
        }

        if (this.__eventPool__ && this.__eventPool__.hasOwnProperty('*')) {
            var globalQueue = this.__eventPool__['*'];
            globalQueue.execute(event, this);
        }

        return event;
    };

    EventTarget.prototype.destoryEvents = function () {
        if (!this.__eventPool__) {
            return;
        }

        for (var key in this.__eventPool__) {
            if (this.__eventPool__.hasOwnProperty(key)) {
                this.__eventPool__[key].dispose();
            }
        }

        this.__eventPool__ = null;
    };

    EventTarget.prototype.enable = function (target) {
        target.__eventPool__ = {};
        extend(target, EventTarget.prototype);
    };

    return EventTarget;
});
