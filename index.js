'use strict';
var store     = require("./lib/store"),
    watcher = require('./lib/watcher'),
    http = require('http'),
    httpProxy = require('http-proxy');

//initialize api watcher
watcher();

function getroute(req){
  var appname = req.url.split('/')[1];
  req.url = req.url.replace(`/${appname}`,''); //clean url
  //lookin for port that sould be redirect the request
  return store.findOne({appname: appname});
}

var proxy = httpProxy.createProxyServer({});
var server = http.createServer(function(req, res) {
  var route = getroute(req);
  if(route){
      var target = `http://127.0.0.1:${route.port}`;
      proxy.web(req, res, { target:  target, ws:true});
  }else{
    res.writeHead(404);
    res.end();
  }
});


console.log("running...5050")
server.listen(5050);