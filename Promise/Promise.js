/**
 * @file Promise实现
 * @author Bruce Xu(brucexu20@gmail.com)
 */

(function (factory, global) {
    if (typeof define === 'factory' && define.amd) {
        define(factory);
    }
    else if (typeof module === 'object') {
        exports = module.exports = factory();
    }
    else {
        global.Promise = factory();
    }
})(function () {
    var Status = {
        PENDING: 0,
        FULLFILLED: 1,
        REJECTED: 2
    };

    /**
     * 判断是否是promise对象
     *
     * @param {Mixed} value 待判断的对象
     * @return {boolean} 标识是否是promise对象的布尔值
     */
    function isPromise(value) {
        return value && typeof value.then === 'function';
    }

    /**
     * promise成功或失败时的回掉
     *
     * @param {Promise} promise promise对象
     */
    function runCallbacks(promise) {
        if (promise.status === Status.PENDING) {
            return;
        }

        var data = null;
        var callbacks = null;
        if (promise.status === Status.FULLFILLED) {
            data = promise.value;
            callbacks = promise.fullfillFns.slice();
        }
        else {
            data = promise.reason;
            callbacks = promise.rejectFns.slice();
        }

        promise.fullfillFns.length = 0;
        promise.rejectFns.length = 0;

        setTimeout(function () {
            for (var i = 0, len = callbacks.length; i < len; i++) {
                var callback = callbacks[i];
                try {
                    callback(data);
                }
                catch (e) {}
            }
        });
    }

    /**
     * promise成功或失败时的回掉（用闭包来保存必要的参数）
     *
     * @param {Promise} promise promise对象
     * @param {Function|Mixed} callback 成功或失败的回调函数，或者为空、对象等其它值。若不为函数时，直接忽略此值，并以前一个promise的值直接resolve/reject当前promise
     * @param {string} type 当前回调的类型，`resolve`或`reject`
     * @return {Function} 生成供promise完成后调用的回调函数
     */
    function callbackFactory(promise, callback, type) {
        return function (data) {
            var resolve = resolveFactory(promise);
            var reject = rejectFactory(promise);
            var actionFn = type === 'resolve' ? resolve : reject;

            try {
                if (typeof callback === 'function') {
                    var returnValue = callback(data);
                    if (returnValue === promise) {
                        reject(new TypeError('The return value of function could not be same with the current promise.'));
                    }
                    else if (isPromise(returnValue)) {
                        returnValue.then(
                            function () {
                                var args = [].slice.call(arguments);
                                resolve.apply(promise, args);
                            },
                            function (reason) {
                                reject(promise, reason);
                            }
                        );
                    }
                    else {
                        actionFn(data);
                    }
                }
                else {
                    actionFn(data);
                }
            }
            catch (e) {
                reject(e);
            }
        }
    }

    /**
     * 生成resolve函数（采用闭包来保存参数promise）
     *
     * @param {Promise} promise promise对象
     * @return {Function} 生成的resolve函数
     */
    function resolveFactory(promise) {
        return function (value) {
            promise.status = Status.FULLFILLED;
            promise.value = value;
            runCallbacks(promise);
        }
    }

    /**
     * 生成reject函数（采用闭包来保存参数promise）
     *
     * @param {Promise} promise promise对象
     * @return {Function} 生成的reject函数
     */
    function rejectFactory(promise) {
        return function (reason) {
            promise.status = Status.REJECTED;
            promise.reason = reason;
            runCallbacks(promise);
        }
    }

    /**
     * Promise构造函数
     *
     * @constructor
     * @param {Function} task 和promise关联的任务函数
     */
    function Promise(task) {
        if (typeof task !== 'function') {
            throw new Error('`task` must be a function');
        }

        if (!(this instanceof Promise)) {
            return new Promise(task);
        }

        this.status = Status.PENDING;
        this.fullfillFns = [];
        this.rejectFns = [];
        this.value = null;
        this.reason = null;

        var resolve = resolveFactory(this);
        var reject = rejectFactory(this);
        task(resolve, reject);
    }

    /**
     * Promise构造函数
     *
     * @public
     * @param {Function} onFullfill promise成功时的回调函数
     * @param {Function} onReject promise失败时的回调函数
     * @return {Promise} 新的promise对象，用于链式调用
     */
    Promise.prototype.then = function (onFullfill, onReject) {
        var promise = new Promise(function () {});

        this.fullfillFns.push(callbackFactory(promise, onFullfill, 'resolve'));
        this.rejectFns.push(callbackFactory(promise, onReject, 'reject'));

        runCallbacks(this);

        return promise;
    };

    /**
     * 仅注册成功回调
     *
     * @public
     * @param {Function} onFullfill promise成功时的回调函数
     * @return {Promise} 新的promise对象，用于链式调用
     */
    Promise.prototype.done = function (onFullfill) {
        return this.then(onFullfill, null);
    };

    /**
     * 仅注册失败回调
     *
     * @public
     * @param {Function} onReject promise失败时的回调函数
     * @return {Promise} 新的promise对象，用于链式调用
     */
    Promise.prototype.fail = function (onReject) {
        return this.then(null, onReject);
    };

    /**
     * 注册失败回调
     *
     * @public
     * @param {Function} onFail promise失败时的回调函数
     * @return {Promise} 新的promise对象，用于链式调用
     */
    Promise.prototype.catch = function (onFail) {
        return this.then(null, onFail);
    };

    /**
     * 创建一个promise对象，并直接用`value` resolve它，并返回promise对象
     *
     * @public
     * @param {Mixed} value 用于resolve promise对象的值
     * @return {Promise} 新的promise对象，用于链式调用
     */
    Promise.resolved = function (value) {
        var promise = new Promise(function (resolve, reject) {
            resolve(value);
        });
        return promise;
    };

    /**
     * 创建一个promise对象，并直接用`reason` reject它，并返回promise对象
     *
     * @public
     * @param {Mixed} reason 用于reject promise对象的原因
     * @return {Promise} 新的promise对象，用于链式调用
     */
    Promise.rejected = function (reason) {
        var promise = new Promise(function (resolve, reject) {
            reject(reason);
        });
        return promise;
    };

    return Promise;
}, this);
