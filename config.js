"use strict";

exports.development = {
	base_location: "/home/zieba/Projects/node/bitflopme/",
	base_url:'http://bitflopme.local:3001',
	base_url_ssl:'http://bitflopme.local:3001',
	base_vhost:'bitflopme.local',
	mongo_url:'mongodb://localhost/bitflopme',
};

exports.production = {
	base_location: "/srv/www/bitflop.me/",
	base_url:'https://bitflop.me',
	base_url_ssl:'https://bitflop.me',
	base_vhost:'bitflop.me',
	mongo_url:'mongodb://localhost/bitflopme',
};