(function ($) {

    var api                         = {

        authoring: function () {

            return document.querySelector("head script[src*='/~rapid/edit/']") !== null
            && (typeof rapidBeta === 'function')
            && !!rapidBeta('project.data.cms.page.getResourcePath');

        },

        getContent: function (view) {

            if (api.authoring()) {

                return $.getJSON(rapidBeta('project.data.cms.page.getResourcePath')() + '.infinity.json');

            }
            
            return $.getJSON('data' + view.replace('.html', '.json'));
            
        }

    };
    
    window.app                          = api;

} (jQuery));