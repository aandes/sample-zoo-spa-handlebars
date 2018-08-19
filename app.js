var express = require('express'),
    path = require("path");
    port = parseInt(process.argv[2], 10) || 3000,
    app = express(),

app.use('/', express.static(__dirname));

// all .html requests go to index.html
app.get(/(?:\.html$|\.html\?)/, function(request, response)
{
    response.sendFile(path.join(__dirname,'index.html'));
});

app.listen(port, function()
{ 
    console.log('Server running at', 'http://localhost:' + port);
    console.log('Press Ctrl + C to stop');
});
