/**
 * JS面向对象实现（参考自https://github.com/ecomfe/oo）
 */
(function (factory, global) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    }
    else if (typeof module === 'object' && module.exports) {
        module.exports = exports = factory();
    }
    else {
        global.BOO = factory();
    }
}(function () {
    var SUPER_CLASS_REFER = '__ooSuperClass__';
    var METHOD_NAME = '__ooMethodName__';

    function Empty() {}

    function Class() {
        return Class.create.apply(Class, arguments);
    }

    Class.create = function (Super, properties) {
        Super = Super || Class;
        properties = properties || {};

        if (typeof Super === 'object') {
            properties = Super;
            Super = Class;
        }

        var Sub = inherit(Super);
        var proto = Sub.prototype;

        for (var key in properties) {
            if (properties.hasOwnProperty(key)) {
                var property = properties[key];
                if (typeof property === 'function') {
                    property[SUPER_CLASS_REFER] = Super;
                    property[METHOD_NAME] = key;
                }
                proto[key] = properties[key];
            }
        }

        return Sub;
    };

    Class.prototype = {
        constructor: function () {},
        $superClass: Object,
        $super: function () {
            var invoker = arguments.callee.caller;
            // 由于可能存在匿名函数，所以不能直接通过`invoker.name`直接获取函数名
            var methodName = invoker[METHOD_NAME];
            // 由于下面的调用`method.apply(this, args)`会导致调用父类的同名方法时，
            // 父类的`this.$super`又指向了当前方法，所以不能直接通过`invoker.$superClass[methodName]`获取父类同名方法
            var Super = invoker[SUPER_CLASS_REFER];
            var method = Super && Super.prototype[methodName];

            if (typeof method !== 'function') {
                throw new TypeError('The super class not exist the method `' + methodName + '`');
            }

            // XXX: 考虑到方法内会有`this.$super(arguments)`这样的调用，因此此处做一下判断
            var args = arguments;
            if (args.length === 1 && args[0].length) {
                args = args[0];
            }

            return method.apply(this, args);
        }
    };

    Class.static = typeof Object.create === 'function'
        ? Object.create
        : function (proto) {
            if (!arguments.length) {
                throw TypeError('Object prototype may only be an Object or null');
            }

            if (!(proto instanceof Object)) {
                throw TypeError('Prototype musb be an object');
            }

            Empty.prototype = proto;

            return new Empty();
        };

    function inherit(Super) {
        function Sub() {
            Sub.prototype.constructor.apply(this, arguments);
        }

        Empty.prototype = Super.prototype;

        var proto = Sub.prototype = new Empty();
        proto.$superClass = Super;

        if (typeof proto.$super !== 'function') {
            proto.$super = Class.prototype.$super;
        }

        return Sub;
    }

    return Class;
}), global);
