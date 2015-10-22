(function(global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory());
    }
    else if (typeof exports === 'object' && typeof module === 'object') {
            exports = module.exports = factory();
    }
    else {
        global.Swipe = factory();
    }
})(this, function() {
    // 当滑动超过10px判断为开始了滑动操作
    var THRESHOLD = 10;

    function Swipe(options) {
        if (!(this instanceof Swipe)) {
            return new Swipe(options);
        }
        this.startX = 0;
        this.startY = 0;
        this.index = 0;
        this.containerEl = null;
        this.wrapperEl = null;
        this.swipeEls = null;
        this.length = 0;
        this.width = 0;
        this.isLocked = false;
        this.isSwiping = false;

        init.call(this, options);
    }

    function init(options) {
        // options.container 为必传参数
        if (typeof options !== 'object'
            || (typeof options.container !== 'object' || options.container.nodeType !== 1)) {
            return;
        }

        this.containerEl = options.container;
        var children = this.containerEl.children;
        if (children.length > 1) {
            var wrapperEl = document.createElement('div');
            wrapperEl.innerHTML = this.containerEl.innerHTML;
            this.containerEl.innerHTML = wrapperEl.outerHTML;
            this.wrapperEl = wrapperEl;
        }
        else {
            this.wrapperEl = children[0];
        }
        this.swipeEls = this.wrapperEl.children;
        this.length = this.swipeEls.length;
        if (this.length < 3) {
            return;
        }
        this.width = this.wrapperEl.offsetWidth;

        this.containerEl.style.overflow = 'hidden';
        this.wrapperEl.style.position = 'relative';
        for (var i = 0, len = this.swipeEls.length; i < len; i++) {
            var swipeEl = this.swipeEls[i];
            swipeEl.style.position = 'absolute';
            swipeEl.style.width = '100%';
        }

        bindEvents.call(this);
        resetIndex.call(this);
    }

    function bindEvents() {
        this.wrapperEl.addEventListener('touchstart', onTouchStart.bind(this));
        this.wrapperEl.addEventListener('touchmove', onTouchMove.bind(this));
        this.wrapperEl.addEventListener('touchend', onTouchEnd.bind(this));
        this.wrapperEl.addEventListener('transitionend', onTransitionEnd.bind(this));
    }

    function onTouchStart(e) {
        var touch = e.targetTouches[0];
        this.startX = touch.pageX;
        this.startY = touch.pageY;
        this.isLocked = false;
        this.isSwiping = false;
    }

    function onTouchMove(e) {
        if (this.isLocked) {
            return;
        }

        var touch = e.targetTouches[0];
        var x = touch.pageX;
        var y = touch.pageY;
        var moveX = Math.abs(x - this.startX);
        var moveY = Math.abs(y - this.startY);

        if (this.isSwiping) {
            e.preventDefault();
            var distance = x - this.startX;
            this.wrapperEl.style.transform = 'translateX(' + (-this.index * this.width + distance) + 'px)';
        } else {
            if (moveX > moveY && moveX > THRESHOLD) {
                this.isSwiping = true;
            } else if (moveY > moveX && moveY > THRESHOLD) {
                this.isLocked = true;
            }
        }
    }

    function onTouchEnd(e) {
        if (this.isSwiping) {
            var touch = e.changedTouches[0];
            var distance = touch.pageX - this.startX;
            if (Math.abs(distance) >= this.width / 3) {
                this.index += distance > 0 ? -1 : 1;
            }
            this.wrapperEl.style.transform = 'translateX(' + -this.index * this.width + 'px)';
            this.wrapperEl.style.transition = 'transform 300ms';
        }
    }

    function onTransitionEnd(e) {
        this.wrapperEl.style.transition = '';
        if (this.index === 1) {
            this.swipeEls[0].style.transform = 'translateX(0)';
            this.swipeEls[this.length - 1].style.transform = 'translateX(' + this.width * (this.length - 1) + 'px)';
        }
        this.index = (this.index + this.length) % this.length;
        if (this.index === 0 || this.index === this.length -1) {
            resetIndex.call(this);
        }
    }

    function resetIndex() {
        for (var i = 0, len = this.length; i < len; i++) {
            this.swipeEls[i].style.transform = 'translateX(' + i * this.width + 'px)';
        }
        if (this.index === 0) {
            this.swipeEls[this.length - 1].style.transform = 'translateX(' + -this.width + 'px)';
        } else if (this.index === this.length - 1) {
            this.swipeEls[0].style.transform = 'translateX(' + this.width * this.length + 'px)';
        }
        this.wrapperEl.style.transform = 'translateX(' + -this.index * this.width + 'px)';
    }

    return Swipe;
});
