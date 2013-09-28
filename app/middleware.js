/* Middleware for checking if a user is logged in */
"use strict";

/*globals $,questions,d3,canvas*/

var models = require('./models');


exports.validateGame = function (req, res, next) {


	req.check('id', 'Invalid urlparam').notEmpty().isInt()
	req.sanitize('id').toInt();
//console.log(req.validationErrors());

	// validate the id, if its not valid we dont even bother checking the provledges
	if (req.validationErrors()) {
		res.status(404).render('404.ejs', {title: '404 - Page Not Found'});
	} else {
		// if the input is valid, get the data for the intview being requsted
		models.Games.findOne({ 'id': req.param('id') }, function (err, game) {
			if (err) throw err;

			if (!game) {
				res.redirect('/');
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