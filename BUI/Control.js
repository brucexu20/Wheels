/**
 * @file UI控件基类
 * @author Bruce
 */

var ControlStage = {
    NEW: 0,
    INITED: 1,
    RENDERED: 2,
    DESTORIED: 3
};

var BUI_ELEMENT_PREFIX = 'bui';

function Control(options) {
    options = options || {};

    this.setStage('NEW');

    this.children = [];
    this.childrenIndex = {};
    this.

    this.main = options.main || this.createMain(options);

    this.initOptions(options);

    this.initContent();

    this.initEvents();
}

Control.prototype = {
    constructor: Control,

    isStaged: function (stage) {
        if (!ControlStage.hasOwnProperty(stage)) {
            return false;
        }

        if (this.stage >= ControlStage[stage]) {
            return true;
        }

        return false;
    },

    setStage: function (stage) {
        if (!ControlStage.hasOwnProperty(stage)) {
            throw new Error('Invalid stage');
        }
        this.stage = ControlStage[stage];
    },

    createMain: function (options) {
        if (!options.type) {
            return document.createElement('div');
        }

        var nodeName = options.type.replace(/([A-Z])/g, function (matched, letter) {
            return '-' + letter.toLowerCase();
        });
        return document.createElement(BUI_ELEMENT_PREFIX + '-' + nodeName.slice(1));
    },

    initOptions: function (options) {

    },

    initEvents: function () {

    },

    initContent: function () {

    },

    render: function () {

    },

    repaint: function () {

    },


}
