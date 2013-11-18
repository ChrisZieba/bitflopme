/* Middleware for checking if a user is logged in */
"use strict";

/*globals $,questions,d3,canvas*/

var models = require('./models');


exports.validateGame = function (req, res, next) {

	// the table name comes from the url
	req.check('tableID', 'Invalid url param').notEmpty().notNull().isInt();
	req.sanitize('tableID');

	// validate the name, if its not valid we dont even bother checking the privledges
	if (req.validationErrors()) {
		res.status(404).render('404.ejs', {
			title: 'Page Not Found'
		});
	} else {
		// if the input is valid, get the data for the intview being requsted
		models.Games.findOne({ 'id': req.param('tableID') }, function (err, game) {
			if (err) throw err;

			if (!game) {
				res.status(404).render('404.ejs', {
					title: 'Page Not Found'
				});
			} else if (game.state === 'END') {
				res.render('game/done.ejs', { 
					title: 'bitflop.me - Move along, nothin to see here ...',
					user: res.locals.user
				});
			} else {
				// attach the interview data to the locals object, so we dont have to query the dbase again
				res.locals.game = game;
				next();
			}
		});
	}
};

exports.validateUser = function (req, res, next) {

	if (req.session.user) {
		if (req.session.user.authenticated) {
			next();
		} else {
			res.redirect('/login');
		}
	} else {
		res.redirect('/login');
	}

};

//	This attaches the last URL
exports.refererURL = function (req, res, next) {

	req.session.refererURL = req.url || '/';
	console.log(req.url);
	next();

};

//	This attaches the last URL
exports.getUserGames = function (req, res, next) {

	if (req.session.user) {
		if (req.session.user.authenticated) {
			// if the user is logged in grab all the id's of the active games

			models.Games.find({ $and: [
				{ 
					$or: [
						{ 'players.0.id': req.session.user.id },
						{ 'players.1.id': req.session.user.id }
					]
				}, 
				{'state':{$ne : "END"}}
			]}, 'id').exec(function(err, active) {
				if (err) throw err;

				req.session.user.games.active = (active) ? active : [];
				next();
			});

		} else {
			next();
		}
	} else {
		next();
	}

};