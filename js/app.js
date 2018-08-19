/*global spa, rapid*/

(function($) {

    var api = {

        authoring: function()
        {
            return window.rapid && 
                rapid.mirror().isAuthoringEnabled();
        },

        cmsOrigin: function()
        {
            return spa.userData.cmsOrigin;
        },

        getContent: function(view)
        {
            
            var cfg = spa.userData; // <- see /spa.json
            var path = view.replace(/\.html$/, '');
            var contentUrl = cfg.cmsContentPath.replace(/\$\{path\}/, path);

            return $.ajax({
                dataType: 'json',
                url: api.cmsOrigin() + contentUrl,
                // note that we wouldn't need the
                // following on a publish instance
                xhrFields: { withCredentials: true }
            });
            
        }

    };
    
    // dispatch by the custom components
    window.addEventListener('cmscomponentchange', function(e)
    {   
        e.preventDefault(); // don't reload the page
        spa.view.refresh(); // instead refresh the view
    }, false);
    
    window.app = api;

}(window.jQuery));