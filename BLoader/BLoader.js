(function (global) {
    var Staging = {
        PREDEFINED: 1,
        ANALYSISED: 2,
        PREPARED: 3,
        DEFINED: 4
    };

    var requireConf = {
        baseUrl: './',
        paths: {},
        config: {},
        packages: [],
        maps: {},
        waitSeconds: 0,
        urlArgs: {},
        bundles: {}
    };

    var modules = {};

    var pathIndex = [];
    var packageIndex = [];
    var mapIndex = [];
    var urlArgsIndex = [];

    function config(options) {
        if (!options) {
            return;
        }

        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                var oldValue = requireConf[key];
                var newValue = options[key];

                if (!newValue) {
                    continue;
                }

                if (key === 'urlArgs' && typeof newValue === 'string') {
                    requireConf.urlArgs['*'] = newValue;
                }
                else {
                     if (oldValue instanceof Array) {
                        oldValue.push.apply(oldValue, newValue);
                    }
                    else if (typeof oldValue === 'object') {
                        extend(newValue, oldValue);
                    }
                    else {
                        requireConf[key] = newValue;
                    }
                }
            }
        }

        analysisConfig();
    }

    function analysisConfig() {
        requireConf.baseUrl = requireConf.baseUrl.replace(/\/$/, '') + '/';
        pathIndex = createSortedIndex(requireConf.paths);

        mapIndex = createSortedIndex(requireConf.maps);
        each(
            mapIndex,
            function (item) {
                item.v = createSortedIndex(item.v);
            }
        );

        packageIndex = [];
        each(
            requireConf.packages,
            function (item) {
                if (typeof item === 'string') {
                    item = {
                        name: item.split('/')[0],
                        location: item,
                        main: 'main'
                    }
                }
                item.location = item.location || item.name;
                item.main = (item.main || 'main').replace(/\.js$/i, '');
                item.reg = createPrefixReg(item.name);
                packageIndex.push(item);
            }
        );
        packageIndex.sort(descSortIndex);

        urlArgsIndex = createSortedIndex(requireConf.urlArgs, true);
    }

    function isStaged(mod, stage) {
        return mod.stage >= stage;
    }

    function preDefine(modId) {
        var mod = {
            stage: Staging.PREDEFINED,
            deps: [],
            id: modId,
            factory: null,
            factoryDeps: [module, exports, require],
            require: createLocalRequire(modId),
            exports: {}
        };

        modules[modId] = mod;
    }

    function makeLoadedCallback(modIds, callback) {
        return function () {
            var definedMods = [];
            each(
                modIds,
                function (modId) {
                    var mod = modules[modId];
                    if (!mod || mod.stage !== Staging.DEFINED) {
                        return false;
                    }

                    definedMods.push(mod.exports);
                }
            );

            if (definedMods.length === modIds.length) {
                callback.apply(null, definedMods);
            }
        }
    }

    function actualRequire(modIds, callback) {
        if (!(modIds instanceof Array)) {
            return;
        }

        var onScriptLoaded = makeLoadedCallback(modIds, callback);
        each(
            modIds,
            function (modId) {
                loadScript(modId, onScriptLoaded);
            }
        );
    }

    function createLocalRequire(baseId) {
        function req(modId, callback) {
            if (typeof modId === 'string') {
                modules[baseId].deps
            }
        }

        req.toUrl = toUrl;
    }

    function require(modIds, callback) {
        if (typeof modIds === 'string') {
            throw new Error('Invalid require call: Asynchronously loading dependencies should use an array to list the dependencies')
        }

        if (!(modIds instanceof Array)) {
            return;
        }

        actualRequire(modIds, callback);
    }

    require.config = config;

    require.toUrl = toUrl;

    var define = function (id, deps, factory) {
        if (typeof deps === 'function') {
            factory = deps;
            if (id instanceof Array) {
                deps = id;
                id = null;
            }
            else {
                deps = [];
            }
        }
        else if (typeof id === 'function') {
            factory = id;
            id = null;
            deps = [];
        }

        if (typeof factory !== 'function') {
            factory = function () {
                return factory;
            }
        }

        actualRequire(deps, callback);
    };

    /* 工具方法区 */

    /**
     * 扩展对象属性
     */
    function extend() {
        var target = arguments[0];
        if (!target || typeof target !== 'object') {
            return;
        }

        for (var i = 1, len = arguments.length; i < len; i++) {
            var source = arguments[i];
            if (source) {
                for (var key in source) {
                    if (source.hasOwnProperty(key)) {
                        target[key] = source[key];
                    }
                }
            }
        }
    }

    function each(source, iterator) {
        if (source instanceof Array) {
            for (var i = 0, len = source.length; i < len; i++) {
                if (iterator(source[i], i) === false) {
                    break;
                }
            }
        }
    }

    function checkConfigMatch(index, id) {
        var matched = null;
        each(
            index,
            function (item) {
                if (item.reg.test(id)) {
                    matched = item;
                    return false;
                }
            }
        );

        return matched;
    }

    function parseId(modId) {
        var idInfo = modId.split('!');
        if (idInfo[0]) {
            return {
                mod: idInfo[0],
                res: idInfo[1]
            };
        }
    }

    function normalizePath(modId, baseId) {
        if (modId.charAt(0) !== '.') {
            return modId;
        }

        var modIdPath = modId.split('/');
        var baseIdPath = baseId.split('/');
        var modIdLen = modIdPath.length;
        var baseIdLen = baseIdPath.length - 1;
        var upCount = 0;
        var i;

        breakloop: for (i = 0; i < modIdLen; i++) {
            switch (modIdPath[i]) {
                case '..':
                    upCount++;
                    break;
                case '.':
                    break;
                default:
                    break breakloop;
                    break;
            }
        }

        upCount = upCount > baseIdLen ? baseIdLen : upCount;
        modIdPath = baseIdPath.slice(0, baseIdLen - upCount).concat(modIdPath.slice(i));

        return modIdPath.join('/');
    }

    function normalize(modId, baseId) {
        if (!modId) {
            return '';
        }

        var idInfo = parseId(modId);
        if (!idInfo) {
            return modId;
        }

        var normalizedId = normalizePath(idInfo.mod, baseId);

        var mapMatched = checkConfigMatch(mapIndex, baseId);
        if (mapMatched) {
            var mapItemMatched = checkConfigMatch(mapMatched.v, modId);
            if (mapItemMatched) {
                normalizedId.replace(mapItemMatched.k, mapItemMatched.v);
            }
        }

        var packageMatched = checkConfigMatch(packageIndex, normalizedId);
        if (packageMatched) {
            if (packageMatched.name === normalizedId) {
                normalizedId = packageMatched.name + '/' + packageMatched.main;
            }
        }

        var resId = idInfo.res;
        if (resId) {

        }

        return normalizedId;
    }

    function toUrl(modId) {

    }

    function createPrefixReg(prefix) {
        return new RegExp('/^' + prefix + '(\/|$)/');
    }

    function kv2list(obj, allowWildcard) {
        var list = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                list.push({
                    k: key,
                    v: obj[key],
                    reg = key === '*' ? /.*/ : createPrefixReg(key)
                });
            }
        }
    }

    function descSortIndex(a, b) {
        var akey = a.k || a.name;
        var bkey = b.k || b.name;
        if (bkey === '*') {
            return -1;
        }

        if (akey === '*') {
            return 1;
        }

        return bkey.length - akey.length;
    }

    function createSortedIndex(index, allowWildcard) {
        index = kv2list(index, allowWildcard);
        return index.sort(descSortIndex);
    }

    function loadScript(modId, onload) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.setAttribute('data-require-id', modId);
        script.src = toUrl(modId + '.js');
        if (script.readyState) {
            script.onreadystatechange = innerOnload;
        }
        else {
            script.onload = innerOnload;
        }

        function innerOnload() {
            if (typeof script.readystate === 'undefined'
                || script.readystate.match(/^complete|loaded$/)) {
                onload();
                script.onload = script.onreadystatechange = null;
                script = null;
            }
        }

        var parent = document.getElementsByTagName('head')[0] || document.body;
        parent.appendChild(script);
    }

    function parseSyncRequire(factory) {
        var deps = [];
        if (typeof factory === 'function') {
            factory.toString()
                .replace(/\/\/[^\r\n]*|\/\*[\w\W]*\*\//mg, '')
                .replace(/require\(\s*('|")([^'"]+)\1\s*\)/g,
                    function ($0, $1, depId) {
                        deps.push(depId);
                    }
                );
        }

        return deps;
    }

    /* 工具方法区结束 */

    if (typeof global.define !== 'function') {
        global.define = define;
        global.require = require;
    }
}(this));
