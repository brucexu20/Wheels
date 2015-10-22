(function(global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    }
    else if (typeof exports === 'object' && typeof module === 'object') {
        exports = module.exports = factory();
    }
    else {
        global.AdaptiveTextarea = factory();
    }
})(this, function() {
    // 默认输入框最大高度，超过时则出现滚动条
    var MIN_HEIGHT = 50;
    var MAX_HEIGHT = 500;
    // IE下为innerText，其它非Firefox浏览器两者皆可，Firefox下为textContent
    var textAttributeName = typeof document.body.textContent === 'undefined' ? 'innerText' : 'textContent';

    function AdaptiveTextarea(options) {
        if (!(this instanceof AdaptiveTextarea)) {
            return new AdaptiveTextarea(options);
        }

        options = options || {};
        if (typeof options.textarea !== 'object') {
            options = {textarea: options};
        }

        var textareaEl = options.textarea;
        if (typeof textareaEl !== 'object' || textareaEl.nodeType !== 1) {
            return;
        }

        var maxHeight = options.maxHeight || MAX_HEIGHT;
        var minHeight = options.minHeight || MIN_HEIGHT;

        var wrapperEl = document.createElement('div');
        setStyle(wrapperEl, {
            position: 'relative',
            paddingBottom: '1em'
        })

        var hidePreEl = document.createElement('pre');
        hidePreEl[textAttributeName] = textareaEl.value;
        setStyle(hidePreEl, {
            width: '100%',
            wordBreak: 'break-word',
            visibility: 'hidden',
            minHeight: minHeight + 'px',
            padding: getComputedStyle(textareaEl, 'padding'),
            margin: getComputedStyle(textareaEl, 'margin'),
            border: getComputedStyle(textareaEl, 'border'),
            fontFamily: getComputedStyle(textareaEl, 'font-family'),
            fontSize: getComputedStyle(textareaEl, 'font-size'),
            lineHeight: getComputedStyle(textareaEl, 'line-height')
        });

        wrapperEl.appendChild(hidePreEl);
        textareaEl.parentElement.insertBefore(wrapperEl, textareaEl);
        wrapperEl.appendChild(textareaEl);

        setStyle(textareaEl, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            maxHeight: maxHeight + 'px'
        });

        addEvent(textareaEl, 'input', onInputHandler.bind(this));

        this.textareaEl = textareaEl;
        this.hidePreEl = hidePreEl;
    }

    function onInputHandler(e) {
        e = e || window.e;
        var targetEl = e.srcElement || e.target;
        this.hidePreEl[textAttributeName] = targetEl.value;

        var height = parseInt(getComputedStyle(targetEl, 'height'), 10);
        if (!isNaN(height) && height > MAX_HEIGHT) {
            removeEvent(targetEl, 'input');
        }
    }

    function setStyle(element, styles) {
        for (var i in styles) {
            if (styles.hasOwnProperty(i)) {
                element.style[i] = styles[i];
            }
        }
    }

    function getComputedStyle(element, name) {
        var computedStyles = element.currentStyle
            ? element.currentStyle
            : window.getComputedStyle(element, null);

        if (computedStyles.getPropertyValue) {
            return computedStyles.getPropertyValue(name);
        }
        else {
            return computedStyles.getAttribute(camelName(name));
        }
    }

    function camelName(name) {
        return name.replace(/-[a-z]/g, function(v) {
            return v.slice(1).toUpperCase();
        });
    }

    function addEvent(element, type, callback) {
        if (element.addEventListener) {
            element.addEventListener(type, callback, false);
        }
        else if (element.attachEvent) {
            element.attachEvent('on' + type, callback);
        }
        else {
            element[on + type] = callback;
        }
    }

    function removeEvent(element, type, callback) {
        if (element.removeEventListener) {
            element.removeEventListener(type, callback, false);
        }
        else if (element.dettachEvent) {
            element.detachEvent('on' + type, callback);
        }
        else {
            element[on + type] = null;
        }
    }

    return AdaptiveTextarea;
});
