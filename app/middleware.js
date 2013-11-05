/* Middleware for checking if a user is logged in */
"use strict";

/*globals $,questions,d3,canvas*/

var models = require('./models');


exports.validateGame = function (req, res, next) {

	// the table name comes from the url
	req.check('tableName', 'Invalid url param').notEmpty().notNull().len(1,25).isAlphanumeric();
	req.sanitize('tableName');

	// validate the name, if its not valid we dont even bother checking the privledges
	if (req.validationErrors()) {
		res.status(404).render('404.ejs', {
			title: '404 - Page Not Found'
		});
	} else {
		// if the input is valid, get the data for the intview being requsted
		models.Games.findOne({ 'name': req.param('tableName') }, function (err, game) {
			if (err) throw err;

			if (!game || game.state === 'END') {
				res.redirect('/game/new');
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
		// groups with the val 0 are users who register during an interview
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
	next();

};