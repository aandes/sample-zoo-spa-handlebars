(function () {
    
    var helpers                                 = {

        '?': function (key, defaultValue) {

            return _.get(this, key, defaultValue);

        },

        concat: function (a, b) {

            return a + b;

        },

        authoring: function (block) {
        
            return app.authoring() ? block.fn(this) : block.inverse(this);

        },

        count: function (object, filter, prefix) {
            
            var count                           = 0;

            switch (arguments.length) {

                case 1: filter                  = '.*';
                case 2: prefix                  = 0; break;

            }

            filter                              = new RegExp(filter);

            if (object) {

                count                           = Object.keys(object).filter(function (key) {return filter.test(key)}).length;

            }

            return prefix + count;

        },

        iterate: function (object, filter, limit, block) {

            var html                            = '',
                data;
                
            switch (arguments.length) {

                case 2:

                    block                       = filter;
                    filter                      = '.*';
                    limit                       = '-1';
                    
                    break;

                case 3:

                    block                       = limit;
                    limit                       = '-1';

                    break;
                    
            }

            data                                = Handlebars.createFrame(block.data || {});
            limit                               = parseInt(limit);
            filter                              = new RegExp(filter);

            if (object) {
            
                Object.keys(object).every(function (key, index) {

                    var proceed                     = limit < 0 || index < limit;                        

                    if (proceed && filter.test(key)) {
                        
                        data.key                    = key;
                        data.index                  = index;

                        html                       += block.fn(object[key], {data: data});

                    }
                    
                    return proceed;

                });

            }
            else {

                html                               += block.inverse(this);

            }

            return html;
            
        },

        contentkey: function (key) {

            if (app.authoring()) {

                return 'data-designmode="' + key + '"';

            }

            return '';

        }

    };

    Object.keys(helpers).forEach(function (helper) {

        Handlebars.registerHelper(helper, helpers[helper]);

    });
    
}());