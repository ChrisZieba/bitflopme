"use strict";

var mongoose = require('mongoose'),
	models = require('./models'),
	middleware = require('./middleware'),
	helpers = require('./lib/helpers'),
	bcrypt = require('bcrypt');

module.exports = function (app) {
	// define the urls, and the handlers for them
	app.get('/', function (req, res) {
		res.render('index.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
	});

	app.get('/login', function (req, res) {
		//	Check if the user is logged in already
		if (res.locals.user.authenticated) {
			res.redirect('/');
		} else {
			res.render('login.ejs', { 
				title: 'bitflop.me',
				user: res.locals.user
			});
		}

	});

	app.post('/login', function (req, res) {
		req.check('username', 'The username is required').notEmpty();
		req.check('password', 'The password is required').notEmpty();
		req.sanitize('username');
		req.sanitize('password');

		var errors = req.validationErrors(); 

		if (!errors) {
			models.Users.findOne({ 'username': req.param('username') }, function (err, user) {
				if (err) throw err;

				if (user) {
					bcrypt.compare(req.param('password'), user.password, function(err, match) {
						if (err) throw err;

						if (match) {
							// the password was found!
							req.session.user = {
								id: user.id,
								name: user.username,
								authenticated: true,
								//	This keeps track of what game rooms the user is in
								rooms: []
							};
							res.redirect(req.session.refererURL || '/');	
						} else {
							res.render('login.ejs', { 
								title: 'bitflop.me',
								errors: {
									'name': 'password',
									'msg': 'the password is not in the database or is wrong'
								}
							});
						}
					});
				} else {
					res.render('login.ejs', { 
						title: 'bitflop.me',
						user: res.locals.user,
						errors: {
							'name': 'password',
							'msg': 'the password is not in the database or is wrong'
						}
					});
				}
			});
		} else {
			// Show the errors on the form
			res.render('login.ejs', { 
				title: 'bitflop.me',
				user: res.locals.user,
				errors: errors
			});
		}

	});

	// execute when a user logs out
	app.get('/logout', [middleware.validateUser], function (req, res) {

		req.session.user = {};
		//req.session = {};
		//req.session.destroy();
		//res.clearCookie('connect.sid', { path: '/' });
		res.redirect('/');
	});

	app.get('/game/join', [middleware.refererURL, middleware.validateUser], function (req, res) {

		//	This is every room that the user has already joined
		var rooms = req.session.user.rooms;

		//	Get all the games that are 'NEW' or show the games the user is part of
		models.Games.find({ 
			$or: [
				{ 'creator.id': req.session.user.id },
				{ $and: [{ 'id': { $in: rooms }}, {'state':'PLAYING'}]},
				{ 'state':'NEW' }
			]
		}).sort('-created').exec(function(err, games) {
			if (err) throw err;

			// 	Show the errors on the form
			res.render('game/join.ejs', { 
				title: 'bitflop.me',
				user: res.locals.user,
				games: games,
				errors: {}
			});

		});
	});

	app.get('/game/new', [middleware.refererURL, middleware.validateUser], function (req, res) {
		res.render('game/new.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user,
			errors: {}
		});
	});

	app.post('/game/join', [middleware.refererURL, middleware.validateUser], function (req, res) {
		// validate the input that came from the form\
		req.check('password', 'The game security code is required').notEmpty();
		req.sanitize('_game');
		req.sanitize('password');

		var errors = req.validationErrors(); 

		// If no errors were found we passed form validation
		if (!errors) {
			// get the current count of the game (auto-increment)
			models.Games.findOne({ 'id': req.param('_game') }, function (err, game) {
				if (err) throw err;

				if (game) {
					// the password was found!
					if (game.password === req.param('password')) {
						// 	Attach the id of the room they joined, only if its not there already
						if (req.session.user.rooms.indexOf(game.id.toString()) == -1) req.session.user.rooms.push(game.id.toString());

						//	Check to see if have room to add a player to the room
						if (game.players.length >= game.settings.minPlayers && game.players.length <= game.settings.maxPlayers) {
							//	Make sure we are not adding the same user onto the players array
							var playerID = helpers.getPlayerID(req.session.user.id, game.players);

							if (playerID === null) {
								// 	Update the database
								models.Games.update({id:game.id}, {$push: { players: {id:req.session.user.id, name: req.session.user.name}}}, function (err) {
									if (err) throw err;

									res.redirect('/game/play/' + game.id);
								});	
							} else {
								//	The person who entered the game is already a player
								res.redirect('/game/play/' + game.id);
							}
						} else {
							//	The game already has the max number of players, so just redirect to the game to the rail
							res.redirect('/game/play/' + game.id);
						}



						
					} else {
						//	Get all the games that are 'NEW'
						models.Games.find({}).where('state').equals('NEW').sort('-created').exec(function(err, games) {
							if (err) throw err;

							// 	Show the errors on the form
							res.render('game/join.ejs', { 
								title: 'bitflop.me',
								user: res.locals.user,
								games: games,
								errors: {
									'name': 'password',
									'msg': 'the password is not in the database or is wrong'
								}
							});
						});
					}
				} else {
					//	Get all the games that are 'NEW'
					models.Games.find({}).where('state').equals('NEW').sort('-created').exec(function(err, games) {
						if (err) throw err;

						// 	Show the errors on the form
						res.render('game/join.ejs', { 
							title: 'bitflop.me',
							user: res.locals.user,
							games: games,
							errors: {
								'name': 'password',
								'msg': 'the password is not in the database or is wrong'
							}
						});

					});



				}
			});
		} else {

			//	Get all the games that are 'NEW'
			models.Games.find({}).where('state').equals('NEW').sort('-created').exec(function(err, games) {
				if (err) throw err;

				// 	Show the errors on the form
				res.render('game/join.ejs', { 
					title: 'bitflop.me',
					user: res.locals.user,
					games: games,
					errors: errors
				});

			});
		}
				

	});

	app.post('/game/new', [middleware.refererURL, middleware.validateUser], function (req, res) {
		// validate the input that came from the form\
		req.check('name', 'The game name is required').notEmpty();
		req.check('password', 'The game security code is required').notEmpty();
		req.sanitize('name');
		req.sanitize('password');

		var errors = req.validationErrors(); 

		// If no errors were found we passed form validation
		if (!errors) {
			// get the current count of the game (auto-increment)
			models.Counters.findOne({}, function (err, counter) {
				var game = new models.Games();
				var id = counter.games + 1;

				game.id = id;
				game.name = req.param('name');
				game.password = req.param('password');
				game.creator = {
					id: req.session.user.id,
					name: req.session.user.name
				};
				//	Player1 is index0
				game.players = [{
					id: req.session.user.id,
					name: req.session.user.name
				}];
				game.settings = {};
				game.history = [];
				game.rounds = [];
				
				game.save(function (err) {
					if (err) throw err;

					//update the counter in the database
					models.Counters.update({games: id}, function (err) {
						if (err) throw err;

						if (req.session.user.rooms.indexOf(game.id.toString()) == -1) req.session.user.rooms.push(game.id.toString());
						res.redirect('/game/play/' + id);

					});	

				});
			});
		} else {
			// Show the errors on the form
			res.render('game/new.ejs', { 
				title: 'bitflop.me',
				user: res.locals.user,
				errors: errors
			});
		}
				

	});

	/* 	The middleware will check that the game exists
		We do not need to check if a user is looged in becuase anyone can view this page, only logged in users can sit and play
	*/
	app.get('/game/play/:id',  [middleware.refererURL, middleware.validateUser, middleware.validateGame], function (req, res) {

		var game = res.locals.game;

		// Show the errors on the form
		res.render('game/play.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user,
			room: res.locals.game.id
		});
		
			
	});

	// The middleware will check that the game exists
	app.get('/account',  [middleware.validateUser], function (req, res) {

		//	Get all the created games for the user 
		models.Games.find({}).where('creator.id').equals(req.session.user.id).sort('-status').exec(function(err, games) {
			if (err) throw err;

			// 	Show the errors on the form
			res.render('account/index.ejs', { 
				title: 'bitflop.me',
				user: res.locals.user,
				games: games
			});

		});

		
			
	});

	// The middleware will check that the game exists
	app.get('/about',  [middleware.refererURL], function (req, res) {

		// 	Show the errors on the form
		res.render('about.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
		
			
	});

	//keep this last!
	app.get('*', function(req, res) {
		//res.send('404 errorsdf', 404);
		res.status(404).render('404.ejs',{
			title: '404',
			user: res.locals.user,
			meta: ''
		});	
	});

};