var loki = require('lokijs');
var db = new loki('lappizapps.db');
var store = db.addCollection('routes');
module.exports = store;