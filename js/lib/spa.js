/* global Handlebars */

(function ($) {
    
    function Spa () {
        
        this.document                       = new SpaDocument(this);
        this.view                           = new SpaView(this);

        // get the manifest
        $.getJSON('spa.json')
         .done(init)
         .fail(onError);
        
    }

    function SpaView (spa) {

        this._spa                           = spa;
        this._renderers                     = {};

    }

    function SpaDocument (spa) {

        this._spa                           = spa;

    }

    function SpaViewRenderer (api) {

        if (api) {

            for (var i in api) {

                this[i]                     = api[i];

            }

        }

    }
    
    var spaApi                              = {
        
            templates: {},
            
            userData: {},
            document: null,
            history: null,
            view: null,

            api: {

                SpaViewRenderer: SpaViewRenderer

            },
            
            utils: {
                

                array: {

                    cast: function (arrayLikeObject) {

                        return Array.prototype.slice.call(arrayLikeObject, 0);
                        
                    },
                    
                    loop: function (array, onStep, onComplete, thisArg) {
        
                        var length          = array.length,
                            cursor          = -1;    

                        function next (step) {

                            if (step !== false && ++cursor < length) {

                                onStep.call(thisArg, next, array[cursor], cursor, array);

                            }
                            else {

                                onComplete && onComplete.call(thisArg, array);

                            }

                        }

                        next();

                    }
                    
                }
                
            }
        
        },
        
        spaDocumentApi                      = {

            element: function () {

               return document.querySelector(config.rootElement);

            },

            title: function (value) {

                // getter
                if (arguments.length === 0) {

                    return document.title;

                }

                // setter
                document.title              = value;

                return this._spa;

            },

            path: function (path, data) {
                
                // getter
                if (arguments.length === 0) {

                    path                    = window.location.pathname;

                    if (config.siteContext && path.indexOf(config.siteContext) === 0) {

                        path                = path.substring(config.siteContext.length);

                    }

                    return  (path.length === 0 || path === '/') ? config.siteIndexView : path;

                }

                // setter
                if (config.siteContext && path.indexOf('/') === 0 && path.indexOf(config.siteContext) !== 0) {

                    path                    = config.siteContext + path;

                }

                spa.history.pushState(data, /*title*/null, path);

                return this._spa;

            }
            
        },

        spaViewApi                          = {

            /**
             * @param {String|String[]} pathOrPathList
             * @param {spa.api.SpaViewRenderer} [viewRenderer]
             * @returns {Spa}
             */
            renderer: function (pathOrPathList, viewRenderer) {
                
                var count,
                    path,
                    i;

                // getter
                if (arguments.length === 1) {

                    return this._renderers[pathOrPathList] || null;

                }
                
                // setter
                if (viewRenderer === null || (viewRenderer instanceof spaApi.api.SpaViewRenderer)) {

                    if (Array.isArray(pathOrPathList)) {

                        for (i = 0, count = pathOrPathList.length; i < count; i += 1) {
                            
                            this._renderers[pathOrPathList[i]]
                                             = viewRenderer;


                        }

                    }
                    else {

                        this._renderers[pathOrPathList]
                                            = viewRenderer;

                    }
                    
                    return this._spa;

                }

                onError(new Error("All view renderers must be instances of spa.api.SpaViewRenderer. " + (typeof viewRenderer) + " was provided!"));
                
            },

            refresh: function () {

                loadCurrentView();

                return this._spa;

            }

        },

        spaViewRendererApi                  = {

            render: function (path) {

                return resolvedPromise();

            },

            unrender: function (path) {

                return resolvedPromise();

            }

        },
        
        handleAnchoreHref                   = null,
        loadedAssets                        = {},
        globalConfig                        = "*",
        currentView                         = null,
        manifest                            = null,
        config                              = {},
        spa;
    
    /**
     * Initialize the SPA. 
     * @param {Object} data
     */
    function init (data) {
        
        manifest                            = data;

        if (!manifest) {

            return onError(new Error('The application manifest could not be loaded from spa.json'));

        }

        if (manifest[globalConfig]) {

            config                          = $.extend(config, manifest[globalConfig].config);

            if (manifest[globalConfig].userData)
            {
                spa.userData                = $.extend(spa.userData, manifest[globalConfig].userData);
            }

            if (!manifest[globalConfig].loaded) {

                loadViewAssets(globalConfig).done(function () {

                    onGlobalAssestLoaded();
                    bindEvents();

                    loadCurrentView().fail(onError);
                    
                }).fail(onError);

            }
            
        }
        else {
            
            loadCurrentView().fail(onError);
            
        }
        
    }

    function loadCurrentView () {
        
        var iDeferred                       = $.Deferred(),
            deferred                        = $.Deferred(),
            iPromise                        = iDeferred.promise(),
            promise                         = null,
            path                            = spa.document.path(),
            then;
        
        // is there a renderer for this path?
        if (spa.view.renderer(path)) {
            
            // if so, unrender it
            promise                         = spa.view.renderer(path)
                                                 .unrender(path);

            then                            = function () {

                // continue
                iDeferred.resolve();

                then                        = null;

            };

            // if the unrender call returns a promise,
            // call then, then
            if (promise && promise.then) {

                promise.then(then, iDeferred.reject);

            }
            // call then, now
            else {

                then();

            }
            
        }
        else {

            // nothing to do, just continue
            iDeferred.resolve();

        }

        iPromise.done(function () {

            // now that the revious view has been
            // potentially unrendered and cached,
            // we can load the requested view
            loadView(path).done(deferred.resolve)
                          .fail(deferred.reject);

        }).fail(deferred.reject);

        return deferred.promise();
        
    }
        
    function loadView (path) {
        
        var deferred                        = $.Deferred(),
            originalPath                    = path;

        // the requested page does not exist
        if (!manifest.hasOwnProperty(path)) {

            path                            = config.site404View;

        }
        
        loadViewAssets(path).done(function () {
            
            var promise,
                                            // use the assigned renderer for the path
                renderer                    = spa.view.renderer(path);
            
            // no renderer assigned to this path: error
            if (!renderer) {

                path                        = config.site500View;
                renderer                    = spa.view.renderer(path);

            }

            // render current view
            try {

                // todo create a middleware api for these
                spa.document.element().setAttribute('view', path);

                promise                     = renderer.render(originalPath);

                if (promise && promise.then) {

                    promise.then(deferred.resolve, deferred.reject);

                }
                else {

                    deferred.resolve();

                }

            }
            catch (e) {

                deferred.reject(e);

            }

        }).fail(deferred.reject);

        return deferred.promise();
        
    }
    
    function loadViewAssets (pagePath) {
        
        var deferred                        = $.Deferred(),
            assetLists                      = manifest[pagePath];
        
        if (assetLists) {

            if (assetLists.loaded) {

                deferred.resolve();

            }
            else {

                loadAssets(pagePath).done(function () {
                    
                    assetLists.loaded       = true;
                    
                    deferred.resolve();
                                        
                }).fail(deferred.reject);
                
            }

        }
        else {

            deferred.resolve();

        }

        return deferred.promise();
        
    }
    
    function loadAssets (pagePath) {
        
        var assetLists                      = manifest[pagePath],
            deferred                        = $.Deferred();
        
        if (assetLists) {
            
            spa.utils.array.loop(config.preloadAssets, function (next, type) {

                if (Array.isArray(assetLists[type])) {

                    switch (type) {

                        case "js"   : loadScripts   (assetLists[type]).done(next).fail(deferred.reject); break;
                        case "css"  : loadStyles    (assetLists[type]).done(next).fail(deferred.reject); break;
                        case "img"  : loadImages    (assetLists[type]).done(next).fail(deferred.reject); break;
                        case "tpl"  : loadTemplates (assetLists[type]).done(next).fail(deferred.reject); break;

                    }

                }
                else {

                    next();

                }

            }, deferred.resolve);
            
        }
        else {
            
            deferred.resolve();
            
        }
        
        return deferred.promise();
        
    }
    
    function loadScripts (paths) {
        
        var deferred                        = $.Deferred();
        
        spa.utils.array.loop(paths, function (next, path) {
            
            if (loadedAssets.hasOwnProperty(path)) {
                
                next();
                
            }
            else {
                
                $.getScript(path).done(function () {

                    // todo, must resolve the path before caching
                    loadedAssets[path]      = true;

                    next();

                })
                // todo, jquery script loader does not provide script syntax error messages
                .fail(deferred.reject);
                
            }
            
        }, deferred.resolve);
        
        return deferred.promise();
        
    }
    
    function loadStyles (paths) {
        
        var deferred                        = $.Deferred();
        
        spa.utils.array.loop(paths, function (next, path) {
            
            if (loadedAssets.hasOwnProperty(path)) {
                
                next();
                
            }
            else {
                
                loadStyle(path).done(function () {

                    // todo, must resolve the path before caching
                    loadedAssets[path]      = true;

                    next();

                }).fail(deferred.reject);
                
            }
            
        }, deferred.resolve);
        
        return deferred.promise();
        
    }
    
    function loadStyle (url) {
        
        var img                             = new Image(),
            link                            = document.createElement('link'),
            head                            = document.getElementsByTagName('head')[0],
            deferred                        = $.Deferred();
    
        link.type                           = 'text/css';
        link.rel                            = 'stylesheet';
       
        link.href                           = url;
            
        head.appendChild(link);
            
        img.onerror                         = deferred.resolve;
        img.src                             = url;
           
        return deferred.promise();
        
    }

    function loadImages (paths) {

        var deferred                        = $.Deferred();
        
        spa.utils.array.loop(paths, function (next, path) {
            
            var img;

            if (loadedAssets.hasOwnProperty(path)) {
                
                next();
                
            }
            else {
                
                img                         = new Image();

                img.onerror                 = deferred.reject;
                img.onload                  = next;
                img.src                     = path;

                img                         = null;
                
            }
            
        }, deferred.resolve);
        
        return deferred.promise();

    }
    
    function loadTemplates (paths) {
        
        var deferred                        = $.Deferred();
        
        spa.utils.array.loop(paths, function (next, path) {
            
            if (loadedAssets.hasOwnProperty(path)) {
                
                next();
                
            }
            else {
                
                loadTemplate(path).done(function (source) {
                    
                    compileTemplate(source, path).done(function () {

                        // todo, must resolve the path before caching
                        loadedAssets[path]  = true;

                        next();

                    }).fail(deferred.reject);
                                        
                }).fail(deferred.reject);
                
            }
            
        }, deferred.resolve);
        
        return deferred.promise();
        
    }
    
    function loadTemplate (path) {
        
        return $.ajax({
            
            url     : path,
            dataType: 'text'
            
        });
        
    }
    
    function compileTemplate (source, path) {
        
        var deferred                        = $.Deferred(),
            name                            = getFileName(path);
        
        try {
            
            spa.templates[path]             = Handlebars.compile(source);
            spa.templates[path].source      = source;
            
            if (name.indexOf('_') === 0) {

                // it's a partial, aslo register it as such (without the undescore prefix)
                Handlebars.registerPartial(path, source);

            }

            deferred.resolve();
            
        }
        catch (e) {
            
            deferred.reject(e);
            
        }
        
        return deferred.promise();
        
    };

    function getFileName (filePath) {

        var index                           = filePath.lastIndexOf("/");

        return index !== - 1 ? filePath.substring(index + 1) : filePath;

    }

    function getBaseName (fileName) {
        
        var index                           = fileName.lastIndexOf(".");

        return index !== - 1 ? fileName.substring(0, index) : fileName;

    }

    function createDefaultRenderers () {

        spa.view.renderer(config.site404View, new SpaViewRenderer({render: function (path) {

            spa.document.element().innerHTML= "<h1>Not Found!</h1>The requested page " + path + " was not found.<hr>";

        }}));
        
        spa.view.renderer(config.site500View, new SpaViewRenderer({render: function (path) {

            spa.document.element().innerHTML= "<h1>Internal Error!</h1>The requested page " + path + " cannot be shown at this time.<hr>";

        }}));

    }

    function onGlobalAssestLoaded () {

        spa.history                         = History;

        createDefaultRenderers();

    }

    function bindEvents () {

        spa.history.Adapter.bind(window, 'statechange', loadCurrentView);

        if (config.captureAnchors) {

            if (config.handleAnchoreHref) {

                handleAnchoreHref           = new RegExp(config.handleAnchoreHref);

            }

            $(document).on('click', config.captureAnchors, handleAnchors);

        }

    }

    function handleAnchors (e) {

        if (!handleAnchoreHref || handleAnchoreHref.test(e.target.href)) {
            
            var target = e.target.getAttribute('target');
            
            if (!target || target === '_self') {
                
                if (getOrigin(window.location) === getOrigin(e.target)) {

                    e.preventDefault();

                    spa.document.path(e.target.pathname + e.target.search + e.target.hash);

                }
                
            }            

        }

    }

    function getOrigin (location) {

        return location.origin || (location.protocol + '//' + location.host);

    }

    function resolvedPromise (afterMs, argsArray) {

        var args                            = spaApi.utils.array.cast(arguments);

        args.unshift('resolve');
        
        return doPromise.apply(null, args);

    }

    function rejectedPromise (afterMs, argsArray) {

        var args                            = spaApi.utils.array.cast(arguments);

        args.unshift('reject');
        
        return doPromise.apply(null, args);

    }

    function doPromise (resolution, afterMs, argsArray) {

        var deferred                        = $.Deferred();

        setTimeout(function () {

            if (argsArray) {

                deferred[resolution].apply(deferred, argsArray);

            }
            else {

                deferred[resolution]();
                
            }

            deferred                        = null;

        }, afterMs >= 0 ? afterMs : 1);
        
        return deferred.promise();

    }

    function onError (e) {
        
        if (e && e.responseText) {

            e                               = new Error(e.responseText);

        }

        console.error(e);
        throw e;
        
    }

    Spa.prototype                           = spaApi;
    Spa.prototype.constructor               = Spa;

    SpaView.prototype                       = spaViewApi;
    SpaView.prototype.constructor           = SpaView;

    SpaDocument.prototype                   = spaDocumentApi;
    SpaDocument.prototype.constructor       = SpaDocument;

    SpaViewRenderer.prototype               = spaViewRendererApi;
    SpaViewRenderer.prototype.constructor   = SpaViewRenderer;
    
    window.spa                              = spa = new Spa();
    
})(jQuery, window);