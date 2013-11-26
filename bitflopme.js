"use strict";

var 
	express = require('express'),
	app = module.exports = express(),
	config = require('./config');

// set the development variables
app.configure('development', function () {
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 

	for(var setting in config.development) {
		app.set(setting, config.development[setting]);
	}
});

// set the production variables
app.configure('production', function () {
	//log = fs.createWriteStream('/srv/www/logicpull.com/logs/express.log', {flags: 'a'}); //use {flags: 'w'} to open in write mode
	app.use(express.errorHandler()); 

	for(var setting in config.production) {
		app.set(setting, config.production[setting]);
	}
});

var 
	mongo = require('connect-mongo')(express),
	session = new mongo({url:app.get('mongo_url'), auto_reconnect: true}),
	server = require('http').createServer(app),
	socket = require('./app/lib/socket'),
	validator = require('express-validator');



// these settings are common to both environments
app.configure(function () {
	app.use(express.favicon(app.get('base_location') + 'public/favicon.ico'));
	app.use(express.static(app.get('base_location') + 'public/'));
	app.set('view engine', 'ejs');
	app.set('views', __dirname + '/app/views');
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());

	// this attaches the session to the req object
	app.use(express.session({
		store: session,
		secret: '076ee61d643ba10a125ea872411e433b2',
		cookie: {  
			path: '/',  
			httpOnly: true,  
			maxAge: 1000*60*60*24*30*12,
			//secure: true,
			domain: '.' + app.get('base_vhost')
		}
	}));

	app.use(validator());
	app.use(express.csrf());

	// generae a toekn for the form...the form input must be created
	app.use(function(req, res, next){
		res.locals.token = req.session._csrf || (req.session._csrf = uid(24));console.log(res.locals.token);
		next();
	});

	app.use(function(req, res, next) {

		if (req.session.user) {
			res.locals.user = req.session.user;
		} else {
			res.locals.user = {
				authenticated: false
			}
		}

		next();
	});

	app.use(app.router);

});

//	Load the routing
require('./app/routes')(app);

// run the server with sockets
server.listen(3001);
socket.listen(server, session, app);
