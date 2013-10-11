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
				user: res.locals.user,
				errors: {}
			});
		}

	});

	app.get('/register', function (req, res) {
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
	app.get('/logout', [middleware.validateUser], function (req, res) {

		req.session.user = {};
		res.redirect('/');
	});

	app.get('/game/join', [middleware.refererURL, middleware.validateUser], function (req, res) {

		//	This is every room that the user has already joined
		var rooms = req.session.user.rooms;
		var user = res.locals.user;

		//	Get all the games that are 'NEW' or show the games the user is part of
		models.Games.find({ 
			$or: [
				{ 'creator.id': req.session.user.id },
				{ $and: [{ 'id': { $in: rooms }}, {'state':'PLAYING'}]},
				{ 'state':'NEW' }
			]
		}).sort('-created').exec(function(err, games) {
			if (err) throw err;

			res.render('game/join.ejs', { 
				title: 'bitflop.me',
				user: user,
				games: games
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

	app.post('/login', function (req, res) {

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
								//	This keeps track of what game rooms the user is a player in
								rooms: []
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

	app.post('/register', function (req, res) {

		req.check('registerUsername', 'The username is required.').notEmpty().len(2,15).isAlphanumeric();
		req.check('registerPassword', 'The password is required.').notEmpty().len(6,55);
		req.check('registerPasswordConfirm', 'You must confirm your password.').notEmpty().len(6,55).equals(req.param('registerPassword'));
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
										//	This keeps track of what game rooms the user is in
										rooms: []
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


	app.post('/game/join/:tableName', [middleware.refererURL, middleware.validateUser, middleware.validateGame], function (req, res) {

		var game = res.locals.game;
		var user = res.locals.user;

		if (helpers.getPlayerID(user.id, game.players) === null && game.players.length === 1) {
			// update the database game to hold the new players information
			models.Games.update(
				{
					id:game.id
				}, 
				{
				$push: { 
					players: {
						id:user.id, 
						name: user.name
					}
				}
			}, function (err) {
				if (err) throw err;

				// when the player is redirected back the game, the game will start if both players are there
				res.redirect('/game/play/' + game.name);
			});	
		}
	})

	/*app.post('/game/join', [middleware.refererURL, middleware.validateUser], function (req, res) {
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
				

	});*/

	app.post('/game/new', [middleware.refererURL, middleware.validateUser], function (req, res) {
		// validate the input that came from the form\
		req.check('tableName', 'The table name is required').notEmpty().notNull().len(1,25).isAlphanumeric();
		//req.check('private', 'The game security code is required');
		req.sanitize('tableName');
		//req.sanitize('private');

		// optional field
		//if (req.param('private')) {
			//req.check('passcode', 'The passcode must be at least one character').notEmpty().notNull().len(1,55);
			//req.sanitize('passcode');
		//}

		var errors = req.validationErrors(true); 

		if (!errors) {
			// Check if the tablename is available
			models.Games.findOne({ 'name': req.param('tableName') }, function (err, checkGame) {
				if (err) throw err;

				if (checkGame) {
					res.render('game/new.ejs', { 
						title: 'bitflop.me',
						user: res.locals.user,
						errors: {
							'tableName': {
								'param': 'tableName',
								'msg': 'That table name is in use. Please pick another.'
							}
						}
					});
				} else {
					// the name is available


					if (err) throw err;

					models.Counters.findOne({}, function (err, counter) {

						var game = new models.Games();
						var count = counter.games + 1;	

						game.id = count;
						game.name = req.param('tableName');
						
						//if (req.param('passcode')) {
							//game.passcode = req.param('passcode');
						//}

						game.creator = {
							id: req.session.user.id,
							name: req.session.user.name
						};

						//	Player1 is index0
						game.players = [{
							id: req.session.user.id,
							name: req.session.user.name
						}];
						game.settings = {
					        smallBlind: 50,
					        bigBlind: 100,
					        minPlayers: 2,
					        maxPlayers: 2,
					        minBuyIn: 100,
					        maxBuyIn: 1000,
					        timer: {
					            call: 30
					        }
						};
						game.history = [];
						game.rounds = [];
						
						game.save(function (err) {
							if (err) throw err;

							//update the counter in the database
							models.Counters.update({games: count}, function (err) {
								if (err) throw err;

								var gameID = game.id.toString();

								// here we are pushing a room the user is authorized to enter
								if (req.session.user.rooms.indexOf(gameID) === -1) {
									req.session.user.rooms.push(gameID);
								}

								res.redirect('/game/play/' + game.name);

							});	
						});
					});
				}
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
	app.get('/game/play/:tableName',  [middleware.refererURL, middleware.validateUser, middleware.validateGame], function (req, res) {

		var game = res.locals.game;
		var user = res.locals.user;
		var join = true;

		// the join button is shown only if the user is not already a player, and there is not a full table already
		// The reason for checking the players.length ===1 is to make sure the game has not started. The first player is always the 
		// player who created the game, and if its two the game already started 
		if (helpers.getPlayerID(user.id, game.players) !== null || game.players.length === 2) {
			join = false;
		}
		// Show the errors on the form
		res.render('game/play.ejs', { 
			title: 'bitflop.me',
			user: user,
			room: {
				id: game.id,
				name: game.name
			},
			join: join
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


	app.get('/about',  [middleware.refererURL], function (req, res) {
		// 	Show the errors on the form
		res.render('about.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
	});

	app.get('/faq',  [middleware.refererURL], function (req, res) {
		// 	Show the errors on the form
		res.render('faq.ejs', { 
			title: 'bitflop.me',
			user: res.locals.user
		});
	});

	app.get('/contact',  [middleware.refererURL], function (req, res) {
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
			title: '404',
			user: res.locals.user,
			meta: ''
		});	
	});

};