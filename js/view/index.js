/*global spa, app, _ */

spa.view.renderer('/index.html', new spa.api.SpaViewRenderer({

    render: function(path)
    {
        app.getContent(path).done(function(data)
        {
            
            // set page title
            spa.document.title(_.get(data, 'jcr:title', path));

            // render page
            spa.document.element().innerHTML = spa.templates[
                'tpl/layouts/index.html'](data['jcr:content']);

        });
    }

}));