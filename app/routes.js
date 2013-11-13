"use strict";

var mongoose = require('mongoose'),
	models = require('./models'),
	middleware = require('./middleware'),
	helpers = require('./lib/helpers'),
	bcrypt = require('bcrypt'),
	moment = require('moment');

module.exports = function (app) {
	// define the urls, and the handlers for them
	app.get('/', [middleware.refererURL, middleware.getUserGames], function (req, res) {
		res.render('index.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
	});

	app.get('/login', [middleware.refererURL, middleware.getUserGames], function (req, res) {
		//	Check if the user is logged in already
		if (res.locals.user.authenticated) {
			res.redirect('/');
		} else {
			res.render('login.ejs', { 
				title: 'bitflop.me',
				user: res.locals.user,
				errors: {}
			});
		}

	});

	app.get('/register', [middleware.refererURL, middleware.getUserGames], function (req, res) {
		//	Check if the user is logged in already
		if (res.locals.user.authenticated) {
			res.redirect('/');
		} else {
			res.render('register.ejs', { 
				title: 'bitflop.me',
				user: res.locals.user,
				errors: {}
			});
		}
	});

	// execute when a user logs out
	app.get('/logout', [middleware.validateUser, middleware.getUserGames], function (req, res) {

		req.session.user = {};
		res.redirect('/');
	});

	// show all the games that are available to join
	app.get('/game/join', [middleware.refererURL, middleware.validateUser, middleware.getUserGames], function (req, res) {

		var user = res.locals.user;

		// only show games that the person is NOT already part of, and are NEW (1 person)
		models.Games.find({ $and: [
			{'state':'NEW'},
			{'players.0.id':{$ne : user.id}}
		]}).sort('-created').exec(function(err, open) {

			if (err) throw err;



			//	Get all the active games for the user 		
			models.Games.find({ $and: [
				{ 
					$or: [
						{ 'players.0.id': user.id },
						{ 'players.1.id': user.id }
					]
				}, 
				{'state':{$ne : "END"}}
			]}).sort('-created').exec(function(err, active) {
				if (err) throw err;

				// find any games that the user is in
				res.render('game/join.ejs', { 
					title: 'bitflop.me',
					moment: moment,
					user: user,
					games: {
						open: open,
						active: active
					}
				});

			});




		});
	});

	app.get('/game/new', [middleware.refererURL, middleware.validateUser, middleware.getUserGames], function (req, res) {
		res.render('game/new.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user,
			errors: {}
		});
	});

	app.post('/login', [middleware.refererURL, middleware.getUserGames], function (req, res) {

		req.check('loginUsername', 'The username is required.').notEmpty();
		req.check('loginPassword', 'The password is required.').notEmpty();
		req.sanitize('loginUsername');
		req.sanitize('loginPassword');

		var errors = req.validationErrors(true); 

		if (!errors) {
			models.Users.findOne({ 'username': req.param('loginUsername') }, function (err, user) {
				if (err) throw err;

				if (user) {
					bcrypt.compare(req.param('loginPassword'), user.password, function(err, match) {
						if (err) throw err;

						if (match) {
							// the password was found!
							req.session.user = {
								id: user.id,
								name: user.username,
								authenticated: true,
								games: {
									// this will hold the id's of the active user games
									active: []
								}
							};
							res.redirect(req.session.refererURL || '/');	
						} else {
							res.render('login.ejs', { 
								title: 'bitflop.me',
								errors: {
									'loginPassword': {
										'param': 'loginPassword',
										'msg': 'The password or username entered is incorrect.'
									}
								}
							});
						}
					});
				} else {
					res.render('login.ejs', { 
						title: 'bitflop.me',
						user: res.locals.user,
						errors: {
							'loginUsername': {
								'param': 'loginUsername',
								'msg': 'The username does not exist.'
							}
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

	app.post('/register', [middleware.refererURL, middleware.getUserGames], function (req, res) {

		req.check('registerUsername', 'The username is required and must be between 2 and 15 alphanumeric characters.').is(/^[a-zA-Z0-9\_]+$/i).notEmpty().len(2,15);
		req.check('registerPassword', 'The password is required and must be at least 5 character.').notEmpty().len(5,55);
		req.check('registerPasswordConfirm', 'You must confirm your password.').notEmpty().len(5,55).equals(req.param('registerPassword'));
		//req.check('registerTerms', 'You must agree to our terms in order to register.').notEmpty().notNull();

		req.sanitize('registerUsername');
		req.sanitize('registerPassword');
		req.sanitize('registerPasswordConfirm');
		//req.sanitize('registerTerms');

		if (req.param('registerEmail')) {
			req.check('registerEmail').isEmail();
			req.sanitize('registerEmail');
		}

		var errors = req.validationErrors(true); 

		if (!errors) {
			// Check if the username is available
			models.Users.findOne({ 'username': req.param('registerUsername') }, function (err, checkUser) {
				if (err) throw err;

				if (checkUser) {
					res.render('register.ejs', { 
						title: 'bitflop.me',
						user: res.locals.user,
						errors: {
							'registerUsername': {
								'param': 'registerUsername',
								'msg': 'The username is not available.'
							}
						}
					});
				} else {
					// the username is available
					bcrypt.hash(req.param('registerPassword'), 10, function(err, hash) {

						if (err) throw err;

						models.Counters.findOne({}, function (err, counter) {

							var user = new models.Users;
								// get the current count from the database and increment by to get the next interview
							var count = counter.users + 1;	

							user.id = count;
							user.username = req.param('registerUsername');
							user.password = hash;

							if (req.param('registerEmail')) {
								user.email = req.param('registerEmail');
							}

							user.save(function(err){
								if (err) throw err;

								//update the counter in the database
								models.Counters.update({users: count}, function (err) {
									if (err) throw err;

									req.session.user = {
										id: user.id,
										name: user.username,
										authenticated: true,
										games: {
											active: []
										}
										
									};
									res.redirect(req.session.refererURL || '/account');	
								});	
							});


						});
					});
				}
			});
		} else {
			// Show the errors on the form
			res.render('register.ejs', { 
				title: 'bitflop.me',
				user: res.locals.user,
				errors: errors
			});
		}

	});

	// when in the table, the user clicks the join button at the top and comes here to add themself to the players list
	app.post('/game/join/:tableID', [middleware.refererURL, middleware.validateUser, middleware.getUserGames, middleware.validateGame], function (req, res) {

		var game = res.locals.game;
		var user = res.locals.user;

		// a person can only join if they are NOT a player already and the game has one player only
		if (helpers.getPlayerID(user.id, game.players) === null && game.players.length === 1) {

			var update = {
				state: 'PLAYING',
				$push: { 
					players: {
						id:user.id, 
						name: user.name
					}
				}

			};

			// update the database game to hold the new players information
			models.Games.update({ id:game.id }, update, function (err) {
				if (err) throw err;

				// when the player is redirected back the game, the game will start if both players are there
				res.redirect('/game/play/' + game.id);
			});	
		}
	});


	app.post('/game/new', [middleware.refererURL, middleware.validateUser, middleware.getUserGames], function (req, res) {
		// validate the input that came from the form\
		req.check('smallBlind', 'The small blind is required and cannot be greater than 1000.').notEmpty().notNull().isInt().min(1).max(1000);
		req.sanitize('smallBlind');

		req.check('bigBlind', 'The big blind is required and must be exaclty double the small blind.').notEmpty().notNull().isInt().min(req.param('smallBlind')*2).max(req.param('smallBlind')*2);
		req.sanitize('bigBlind');

		req.check('chipStack', 'The chip stack is required and must be between 5 and 100 big blinds.').notEmpty().notNull().isInt().min(req.param('bigBlind')*5).max(req.param('bigBlind')*100);
		req.sanitize('chipStack');

		req.check('tableTimer', 'The timer is required.').notNull();
		req.sanitize('tableTimer');

		req.check('blindLevel', 'The blind level is required.').notNull();
		req.sanitize('blindLevel');


		// checks to see if the form passed validation
		var errors = req.validationErrors(true); 

		if (!errors) {

			// look up the counter in the database so we can increment accordingly
			models.Counters.findOne({}, function (err, counter) {

				var game = new models.Games();
				var count = counter.games+=1;	

				game.id = count;
				game.creator = {
					id: req.session.user.id,
					name: req.session.user.name
				};
				//	store the ids of the players
				game.players = [{
					id: req.session.user.id,
					name: req.session.user.name
				}];
				game.settings = {
			        smallBlind: req.param('smallBlind'),
			        bigBlind: req.param('bigBlind'),
			        chipStack: req.param('chipStack'),
			        timer: req.param('tableTimer'),
			        level: req.param('blindLevel'),

				};
				game.events = [];
				game.rounds = [];
				
				game.save(function (err) {
					if (err) throw err;
					//update the counter in the database
					models.Counters.update({games: count}, function (err) {
						if (err) throw err;

						var gameID = game.id.toString();

						// here we are pushing a room the user is part of
						if (req.session.user.games.active.indexOf(gameID) === -1) {
							req.session.user.games.active.push(gameID);
						}

						res.redirect('/game/play/' + gameID);

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
	app.get('/game/play/:tableID',  [middleware.refererURL, middleware.validateUser, middleware.getUserGames, middleware.validateGame], function (req, res) {

		var game = res.locals.game;
		var user = res.locals.user;
		var room = {
			id: game.id,
			creator: {
				id: game.creator.id,
				name: game.creator.name
			}
		};

		// if a player is accessing the table
		if (helpers.getPlayerID(user.id, game.players) !== null) {
			res.render('game/play.ejs', { 
				title: 'bitflop.me',
				user: user,
				room: room,
				join: false
			});
		} else {
			// non player accessing the table
			if (game.players.length === 2) {
				res.render('game/full.ejs', { 
					title: 'bitflop.me',
					user: user,
					room: room
				});
			} else {
				// Show the game to a non player who can join if they want
				res.render('game/play.ejs', { 
					title: 'bitflop.me',
					user: user,
					room: room,
					join: true
				});
			}
		}

		
			
	});

	// The middleware will check if the user is logged in
	app.get('/account/games',  [middleware.validateUser, middleware.getUserGames], function (req, res) {

		//	Get all the active games for the user 		
		models.Games.find({ $and: [
			{ 
				$or: [
					{ 'players.0.id': req.session.user.id },
					{ 'players.1.id': req.session.user.id }
				]
			}, 
			{'state':{$ne : "END"}}
		]}).sort('-created').exec(function(err, active) {
			if (err) throw err;

			res.render('account/games.ejs', { 
				title: 'bitflop.me',
				moment: moment,
				user: res.locals.user,
				games: {
					active: active
				}
			});

		});
	});

	// The middleware will check if the user is logged in
	app.get('/account/settings',  [middleware.validateUser, middleware.getUserGames], function (req, res) {

		// look up the user again to get more information
		models.Users.findOne({ 'id': res.locals.user.id }, 'id username created', function (err, profile) {
			if (err) throw err;

			if (!profile) {
				res.status(404).render('404.ejs',{
					title: '404',
					user: res.locals.user,
					meta: ''
				});	
			} else {
				res.render('account/settings.ejs', { 
					title: 'bitflop.me',
					moment: moment,
					user: res.locals.user,
					profile: profile
				});
			}
		});
	});

	// Public profile page for the user
	app.get('/user/:username', [middleware.refererURL, middleware.getUserGames], function (req, res) {

		models.Users.findOne({ 'username': req.param('username') }, 'id username created', function (err, profile) {
			if (err) throw err;

			if (!profile) {
				res.status(404).render('404.ejs',{
					title: '404',
					user: res.locals.user,
					meta: ''
				});	
			} else {
				res.render('user/index.ejs', { 
					title: 'bitflop.me',
					moment: moment,
					user: res.locals.user,
					profile: profile
				});
			}
		});
	});


	app.get('/about',  [middleware.refererURL, middleware.getUserGames], function (req, res) {
		// 	Show the errors on the form
		res.render('about.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
	});

	app.get('/faq',  [middleware.refererURL, middleware.getUserGames], function (req, res) {
		// 	Show the errors on the form
		res.render('faq.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
	});

	app.get('/roadmap',  [middleware.refererURL, middleware.getUserGames], function (req, res) {
		// 	Show the errors on the form
		res.render('roadmap.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
	});

	app.get('/terms',  [middleware.refererURL, middleware.getUserGames], function (req, res) {
		// 	Show the errors on the form
		res.render('terms.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
	});

	app.get('/contact',  [middleware.refererURL, middleware.getUserGames], function (req, res) {
		// 	Show the errors on the form
		res.render('contact.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
	});

	//keep this last!
	app.get('*', function(req, res) {
		//res.send('404 errorsdf', 404);
		res.status(404).render('404.ejs',{
			title: 'Page Not Found',
			user: res.locals.user,
			meta: ''
		});	
	});

};