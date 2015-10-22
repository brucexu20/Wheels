/**
 * @file webapp下拉刷新控件
 * @author Bruce (brucexu20@gmail.com)
 */
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory());
    }
    else if (typeof exports === 'object' && typeof module === 'object') {
        exports = module.exports = factory();
    }
    else {
        global.PullRefresh = factory();
    }
})(this, function () {
    // 当滑动超过10px判断为开始了滑动操作
    var START_THRESHOLD = 20;
    var END_THRESHOLD = 100;

    function PullRefresh(options) {
        this.startY = 0;
        this.isPulling = false;
        this.isLock = false;
        this.isInsert = false;

        init.call(this, options);
    }

    PullRefresh.prototype.finish = function() {
        this.isPulling = false;
        this.containerEl.style.transition = 'transform 300ms';
        this.containerEl.style.transform = 'translateY(0)';
    }

    function init(options) {
        if (typeof options === 'object' && (typeof options.container === 'object' && options.container.nodeType === 1)) {
            this.containerEl = options.container;
        }
        else {
            this.containerEl = document.body;
        }

        bindEvents.call(this);
    }

    function bindEvents() {
        this.containerEl.addEventListener('touchstart', onTouchStart.bind(this), false);
        this.containerEl.addEventListener('touchmove', onTouchMove.bind(this), false);
        this.containerEl.addEventListener('touchend', onTouchEnd.bind(this), false);
        this.containerEl.addEventListener('transitionend', onTransitionEnd.bind(this), false);
    }

    function onTouchStart(e) {
        if (this.isPulling) {
            this.isLock = true;
            return;
        }
        var touch = e.targetTouches[0];
        this.startX = touch.pageX;
        this.startY = touch.pageY;
        this.isPulling = false;
        this.isInsert = false;

        if (document.body.scrollTop > 0) {
            this.isLock = true;
        }
        else {
            this.isLock = false;
        }
    }

    function onTouchMove(e) {
        if (this.isLock) {
            return;
        }

        var touch = e.targetTouches[0];
        var y = touch.pageY;

        var distance = y - this.startY;
        if (distance > START_THRESHOLD) {
            if (!this.isInsert) {
                insertPullingElement.call(this);
            }
            if (distance > END_THRESHOLD) {
                if (!this.isPulling) {
                    this.pullingEl.innerHTML = '<i style="display:inline-block;transform:rotate(-90deg)">→</i>释放更新';
                }
                this.isPulling = true;
            }
            else {
                if (this.isPulling) {
                    this.pullingEl.innerHTML = '<i style="display:inline-block;transform:rotate(90deg)">→</i>下拉刷新';
                }
                this.isPulling = false;
            }
            this.containerEl.style.transform = 'translateY(' + distance / 2 + 'px)';
        }
    }

    function onTouchEnd(e) {
        if (this.isLock) {
            return;
        }

        this.containerEl.style.transition = 'transform 300ms';
        if (this.isPulling) {
            this.containerEl.style.transform = 'translateY(50px)';
            this.pullingEl.innerHTML = '加载中...';
        }
        else {
            this.containerEl.style.transform = 'translateY(0)';
        }

        var that = this;
        setTimeout(function() {
            that.finish();
        }, 3000);
    }

    function onTransitionEnd(e) {
        this.containerEl.style.transition = '';
        if (!this.isPulling) {
            this.pullingEl.remove();
        }
    }

    function insertPullingElement() {
        if (!this.pullingEl) {
            this.pullingEl = document.createElement('div');
            setCssText(this.pullingEl, {
                'position': 'absolute',
                'top': '-50px',
                'line-height': '60px',
                'text-align': 'center',
                'width': '100%',
                'font-size': '12px'
            });
        }
        this.pullingEl.innerHTML = '<i style="display:inline-block;transform:rotate(90deg)">→</i>下拉刷新';

        var children = this.containerEl.children;
        if (children.length) {
            this.containerEl.insertBefore(this.pullingEl, children[0]);
        }
        else {
            this.containerEl.appendChild(this.pullingEl);
        }

        this.isInsert = true;
    }

    function setCssText(element, styles) {
        var cssText = '';
        for (var i in styles) {
            if (styles.hasOwnProperty(i)) {
                cssText += i + ': ' + styles[i] + ';';
            }
        }

        if (typeof element.style.cssText !== 'undefined') {
            element.style.cssText += cssText;
        }
        else {
            element.setAttribute('style', cssText);
        }
    }

    return PullRefresh;
});
