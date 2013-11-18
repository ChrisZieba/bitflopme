"use strict";

var fs = require('fs'),
	utils = require('./utils'),
	helpers = require('./helpers'),
	models = require('../models'),
	poker = require('./headsup');

var Games = {};

// the app param is used for retriving vars via app.get()
exports.listen = function (server, sessionStore, app) {

	var io = require('socket.io').listen(server);

	if (app.settings.env === 'production') {
		// send minified client
		io.enable('browser client minification');
		// apply etag caching logic based on version number
		io.enable('browser client etag');
		// gzip the file
		io.enable('browser client gzip');
		// 24h time out
		io.set('close timeout', 60*60*24);
		// reduce logging
		io.set('log level', 2);
		// ssl support
		io.set('match origin protocol', true);
		io.set('sync disconnect on unload', true);
		// enable all transports (optional if you want flashsocket)
		io.set('transports', [
			'websocket',
			'xhr-polling',
			'htmlfile',
			'jsonp-polling',
			'flashsocket'
		]);
	} else {
		// send minified client
		io.enable('browser client minification');
		// apply etag caching logic based on version number
		io.enable('browser client etag');
		// gzip the file
		io.enable('browser client gzip');
		// 24h time out
		io.set('close timeout', 60*60*24);
		// reduce logging
		io.set('log level', 3);
		// ssl support
		io.set('match origin protocol', true);
		io.set('sync disconnect on unload', true);
		// enable all transports (optional if you want flashsocket)
		io.set('transports', [
			'websocket',
			'xhr-polling',
			'htmlfile',
			'jsonp-polling',
			'flashsocket'
		]);     
	}

	// this is what runs on an oncoming socket request
	// if there is already a session established, accept the socet, otherewise deny it
	io.set('authorization', function (data, accept) {

		
		if (data.headers.cookie) {

			// check if the person connecting has a session attached
			data.sessionID = data.headers.cookie.split('connect.sid=s%3A')[1].split('.')[0];

			// create a new connection to the database, so we can compare the _id field to the cookie sid field
			// these must match in order for a connection to go through
			sessionStore.get(data.sessionID, function (err, session) {

				if (err || !session) return accept(null, false);

				// save the session data
				//data.session = session;
				//data.session.url = data.headers.referer;
				return accept(null, true);

			});                                 

		} else {
			return accept('No cookie transmitted.', false);
		}
	});

	//	Only logged in players can connect to a game via socket.io
	io.sockets.on('connection', function (socket) {

		var sendGameData = function (Game, room, showdown, roundOver, gameOver) {
			// If a player has joined/rejoined a table send all the players their cards again
			// Send the private data to each individual player
			for (var i = 0; i <  Game.game.players.length; i++) {
				io.sockets.in(room + ':' + Game.game.players[i].id).emit('game:data', { 
					uuid: Date.now(), 
					room: {
						id: room,
						players: Game.room.players,
						observers: Game.room.observers
					},
					events: Game.game.events,
					action: {
						dealer: (gameOver) ? null: Game.game.dealer,
						turn: (roundOver || gameOver) ? null: Game.game.turn,
						smallBlind: (gameOver) ? null: Game.game.smallBlind,
						bigBlind: (gameOver) ? null: Game.game.bigBlind,
						pot: ((roundOver && !showdown) || gameOver) ? 0: Game.game.pot,
						state: Game.game.state,
						board: Game.game.board,
						winner: (gameOver) ? Game.game.getWinner() : null
					},
					player: {
						id: Game.game.players[i].id,
						name: Game.game.players[i].name,
						cards: Game.game.players[i].cards,
						chips: Game.game.players[i].chips,
						action: Game.game.players[i].action,
						folded: Game.game.players[i].folded,
						allIn: Game.game.players[i].allIn,
						acted: Game.game.players[i].acted,
						blind: ((roundOver && !showdown) || gameOver) ? null : Game.game.players[i].blind,
						bets: (roundOver || gameOver) ? 0 : Game.game.players[i].bets,
						out: Game.game.players[i].out,
						options: Game.game.players[i].Options(roundOver)
					},
					opponent: {
						id: Game.game.players[(i+1) % 2].id,
						name: Game.game.players[(i+1) % 2].name,
						cards: (showdown) ? Game.game.players[(i+1) % 2].cards : ['00', '00'],
						chips: Game.game.players[(i+1) % 2].chips,
						action: Game.game.players[(i+1) % 2].action,
						folded: Game.game.players[(i+1) % 2].folded,
						allIn: Game.game.players[(i+1) % 2].allIn,
						acted: Game.game.players[(i+1) % 2].acted,
						blind: ((roundOver && !showdown) || gameOver) ? null : Game.game.players[(i+1) % 2].blind,
						bets: (roundOver || gameOver) ? 0 : Game.game.players[(i+1) % 2].bets,
						out: Game.game.players[(i+1) % 2].out,
						options: Game.game.players[(i+1) % 2].Options(roundOver)
					}
				});
			}
		};

		// the game is over. 
		// copy the relevent game data to a completed database, so we can resue the gamname
		// @data is the game document from the database
		var endGame = function (Game, room) {

			// this gets sent to every connection
			io.sockets.in(room).emit('game:end', { 
				uuid: Date.now(), 
				room: {
					id: room,
					players: Game.room.players,
					observers: Game.room.observers
				},
				events: Game.game.events,
				action: {
					dealer: null,
					turn: null,
					smallBlind: null,
					bigBlind: null,
					pot: 0,
					state: "END",
					board: [],
					winner: Game.game.getWinner()
				},
				player: {
					id: Game.game.players[0].id,
					name: Game.game.players[0].name,
					cards: [],
					chips: 0,
					options: Game.game.players[0].Options(true)
				},
				opponent: {
					id: Game.game.players[1].id,
					name: Game.game.players[1].name,
					cards: [],
					chips: 0,
					options: Game.game.players[1].Options(true)
				}
			});

		};

		//	When someone joins the room
		//	It can be a logged in player, or someone who is not logged in, and just wants to rail
		socket.on('join', function(data, callback) {
			//	Get the game data from the database
			models.Games.findOne({ id: data.room}, function (err, game) {
				if (err) throw new Error(501, err);
				if (!game) throw new Error(502, 'Could not make connection to game');

				//	Grab the session data associoated with the socket client/ We will figure out if the client is player1, player2
				sessionStore.get(socket.handshake.sessionID, function (err, session) {
					if (err) throw err;
					if (!session) throw new Error(504, 'Could not make connection to session');

					var playerID = helpers.getPlayerID(session.user.id, game.players);

					// Look up the table to see if it's still in mem, or if we need to create a new one
					if ( ! Games.hasOwnProperty(data.room)) {
						Games[data.room] = {};
						Games[data.room].room = {
							id: data.room,
							players: [],
							observers: [],
							// this array hold data pertaining to camera setup
							peers: []
						};

						// Create the Game object
						Games[data.room].game = new poker.Game(parseInt(game.settings.smallBlind,10), parseInt(game.settings.bigBlind,10), parseInt(game.settings.chipStack,10));
						
					} else {
						// The Game [Object] might have been created by the peer:init
						if ( ! Games[data.room].game) {
							Games[data.room].game = new poker.Game(parseInt(game.settings.smallBlind,10), parseInt(game.settings.bigBlind,10), parseInt(game.settings.chipStack,10));
						}
					}

					// Every connected client gets access to the mainroom
					socket.join(data.room); 

					//	A player joins a special room just for that player	
					if (playerID !== null) {
						socket.join(data.room + ':' + playerID);

						// only push the player if they are not already in the room
						Games[data.room].room.players = helpers.addUserToRoom(Games[data.room].room.players, session.user.id, session.user.name);
						Games[data.room].game.AddEvent('Dealer', session.user.name + ' is ready to play');
					} else {
						// this room is for non-players only
						socket.join(data.room + '::');

						// push the name of the observer
						Games[data.room].room.observers = helpers.addUserToRoom(Games[data.room].room.observers, session.user.id, session.user.name);
						Games[data.room].game.AddEvent('Dealer', '<strong>' + session.user.name + '</strong> has joined the table');
					}

					// Are both players at the table and ready to play?
					// wait until the socket connection is added to its room to check
					var start = helpers.isGameReady(data.room, io.sockets.manager.rooms, game.players);

					// this gets sent to every connection
					io.sockets.in(data.room).emit('game:join', { 
						uuid: Date.now(), 
						room: {
							id: data.room,
							players: Games[data.room].room.players,
							observers: Games[data.room].room.observers
						},
						start: start,
						events: Games[data.room].game.events,
						user: {
							id: session.user.id,
							name: session.user.name
						},
						player: {
							id: playerID
						}
					});

					//	Attach some socket specific data
					// This is later used when a socket disconnects
					socket.set('scope', {
						user: {
							id: session.user.id, 
							name: session.user.name
						},
						player: {
							id: playerID
						},
						room: data.room
					});


					//	Are both players sitting at the table?
					if (start) {

						var rounds = game.rounds;
						var round;

						// has the game started already?
						if (!Games[data.room].game.state) {
							//	The first player added  is index 0 on the player array
							for (var i = 0; i < game.players.length; i++) {
								// it is very important that we use the loop counter for the playerID
								// since the game uses the array index value to keep track of turn, dealer, blinds, etc...
								Games[data.room].game.AddPlayer(i, game.players[i].name, game.settings.chipStack);
							}

							// this can only be called once
							// Shuffle up and Deal!!!
							Games[data.room].game.Start();

							// start a new round
							round = helpers.buildRoundObject(Games[data.room].game);
							// add the current round 
							rounds.push(round);

						} else {
							round = rounds[rounds.length-1]
						}

						// Update the database
						// the reason we keep track of everything in the database is in the case of server disconnects, or both connections get lost
						// that way we can rebuild the game from where it was left off, as nothing happened at all
						game.events = Games[data.room].game.events;
						game.rounds = rounds;
						game.save(function (err) {
							if (err) throw err;
							// sends the cards and any other data
							sendGameData(Games[data.room], data.room, false, false, false);

						});

	

					} 

				});  
			});

		});




		//	When someone joins the room
		//	It can be a logged in player, or someone who is not logged in, and just wants to rail
		socket.on('peer:ready', function (data, callback) {console.log('\n\n\n\n\n----------PEER:INIT\n\n\n\n\n\n\n')
			//	Get the game data from the database
			models.Games.findOne({ id: data.room}, function (err, game) {
				if (err) throw new Error(501, err);
				if (!game) throw new Error(502, 'Could not make connection to game');

				sessionStore.get(socket.handshake.sessionID, function (err, session) {
					if (err) throw err;
					if (!session) throw new Error(504, 'Could not make connection to session');

					// Look up the table to see if it was started by the join
					if (!Games.hasOwnProperty(data.room)) {
						Games[data.room] = {};
						Games[data.room].room = {
							id: data.room,
							players: [],
							observers: [],
							peers: []
						};
					}

					Games[data.room].room.peers = helpers.addUserToRoom(Games[data.room].room.peers, session.user.id, session.user.name);

					var ready = helpers.isCameraReady(Games[data.room].room.peers);
					console.log(Games[data.room].room.peers);
					if (ready) {
						socket.broadcast.to(data.room).emit('peer:init', { 
							uuid: Date.now()
						});
					}
				});

			});
		});


		socket.on('player:action', function (data, callback) {
			//	Get the game data from the database
			models.Games.findOne({ id: data.room}, function (err, game) {
				if (err) throw new Error(501, err);
				if (!game) throw new Error(502, 'Could not make connection to game');

				//	Grab the session data associoated with the socket client/ We will figure out if the client is player1, player2, or just a railbird
				//	If the client is player1 (the person who created the game) then join the main room, and room.player1, which sends only player1 data
				//	If the client is player2 (a player joining the game using the secret pass OR the second connected client if an open table)
				//	then join the main room and room.player2 	
				sessionStore.get(socket.handshake.sessionID, function (err, session) {
					if (err) throw err;
					if (!session) throw new Error(504, 'Could not make connection to session');

					//	This is null if the socket is not a player
					var playerID = helpers.getPlayerID(session.user.id, game.players);
					var ready = helpers.isGameReady(data.room, io.sockets.manager.rooms, game.players);

					// Check if the game object is in memory
					if (!Games.hasOwnProperty(data.room)) {
						Games[data.room] = {};
						Games[data.room].room = {
							id: data.room,
							players: [],
							observers: []
						};
						Games[data.room].game = new poker.Game(parseInt(game.settings.smallBlind,10), parseInt(game.settings.bigBlind,10), parseInt(game.settings.chipStack,10));
					}

					//	Are both players sitting at the table?
					if (ready) {
						switch (data.action.name) {
							case 'BET':
								Games[data.room].game.players[playerID].Bet(parseInt(data.action.amount,10));
								break;
							case 'CALL':
								Games[data.room].game.players[playerID].Call();
								break;
							case 'CHECK':
								Games[data.room].game.players[playerID].Check();
								break;
							case 'RAISE':
								Games[data.room].game.players[playerID].Raise(parseInt(data.action.amount));
								break;
							case 'FOLD':
								Games[data.room].game.players[playerID].Fold();
								break;
							default:
								break;
						}


						var Action = function () {

							// this gets called once before we progress the game, and gain after
							var isRoundOver = Games[data.room].game.checkForEndOfRound();
							var isRedlineRound = Games[data.room].game.checkForRedlineRound();
							var isGameOver = Games[data.room].game.checkForEndOfGame();
							var isRoundStarting =  Games[data.room].game.checkForStartOfRound();
							var isShowdown = Games[data.room].game.checkForShowdown();

							// This will either update to the next betting round, finish the redline round (player folds) 
							// Only call progress if the round is NOT just starting (ie. After a new round)
							if (!isRoundStarting && !isGameOver) {
								console.log('567');
								Games[data.room].game.Progress();

								isRoundOver = Games[data.room].game.checkForEndOfRound();
								isGameOver = Games[data.room].game.checkForEndOfGame();
								isShowdown = Games[data.room].game.checkForShowdown();
							}

							console.log('569');
							var rounds = game.rounds;
							//	A round is just an array of objects that contain game data at a specific time, ie. after a player makes a call
							var round = helpers.buildRoundObject(Games[data.room].game, rounds[rounds.length-1]);

							// Add a new round to the history 
							rounds.push(round);

							// 	Update the database
							game.events = Games[data.room].game.events;
							game.rounds = rounds;
							game.state = (isGameOver) ? 'END' : 'PLAYING'; 
							game.save(function (err) {
								if (err) throw err;

								var gameState = Games[data.room].game.getState();
								var roundData = Games[data.room].game.getRoundData();


								// send out the data to the player
								sendGameData(Games[data.room], data.room, isShowdown, isRoundOver, isGameOver);

								// If a player folded we need to start a new round and send the new cards with Action()
								if (isRedlineRound) {
									Games[data.room].game.NewRound();
									setTimeout(function () {Action();}, 2000);
								} else if (isRoundOver) {

									if (gameState === 'SHOWDOWN') {
										console.log('1\n\n');
										Games[data.room].game.NewRound();
										setTimeout(function () {Action();}, 5000);
									} else if (gameState === 'RIVER') {
										console.log('2\n\n');
										setTimeout(function () {Action();}, 5000);

									} else if (gameState === 'DEAL' || gameState === 'FLOP' || gameState === 'TURN') {
										console.log('3\n\n');
										setTimeout(function () { Action(); }, 1000);
									}
								} else if (isGameOver) {
									setTimeout(function () {
										// once the table ends you cannot go back to it
										endGame(Games[data.room], data.room);
									}, 15000);
								}
							});
						};
						setTimeout(function () {Action();}, 1000);
					}
				});



			});
		});

		// you can't send any data back with the disconnect
		socket.on('disconnect', function (data, callback) {
	console.log('\n\n\n\n\n\n\n\n\n\n\n 550' +JSON.stringify(data,null,4))
			socket.get('scope', function(err, scope) {
				if (err) throw err;

				if (scope) {
					models.Games.findOne({ id: scope.room }, function (err, game) {
						if (err) throw new Error(501, err);
						
						if (game) {

							if (!Games.hasOwnProperty(scope.room)) {
								Games[scope.room] = {};
								Games[scope.room].room = {
									id: scope.room,
									players: [],
									observers: []
								};
								Games[data.room].game = new poker.Game(parseInt(game.settings.smallBlind,10), parseInt(game.settings.bigBlind,10), parseInt(game.settings.chipStack,10));
							};

							Games[scope.room].game.AddEvent('Dealer', scope.user.name + ' has left the table');

							// remove the user from the room
							if (scope.player.id !== null) {
								Games[scope.room].room.players = helpers.removeUserFromRoom(scope.user.id, Games[scope.room].room.players);
								Games[scope.room].room.peers = helpers.removeUserFromRoom(scope.user.id, Games[scope.room].room.observers);
							} else {
								Games[scope.room].room.observers = helpers.removeUserFromRoom(scope.user.id, Games[scope.room].room.observers);
							}

	//console.log('\n\n\n\n\n\n\n\n\n\n\n ' +JSON.stringify(Games[scope.room].room,null,4))
							var ready = helpers.isGameReady(scope.room, io.sockets.manager.rooms, game.players);

							game.events = Games[scope.room].game.events;
							game.save(function (err) {

								if (err) throw err;

								// if a player left then the table the game cannot continue
								// check to make sure the game has started (PLAYING)
								// check that a player actually left the table
								if (!ready && game.state === 'PLAYING' && scope.player.id !== null) {
	console.log('\n\n\n\n\n\n\n\n\n\n\n 555' +JSON.stringify(Games[scope.room].room,null,4))
									for (var i = 0; i < Games[scope.room].game.players.length; i++) {
										console.log('\n\n\n\n\n\n\n\n\n\n\n 566' +JSON.stringify(Games[scope.room].room.players,null,4))
										io.sockets.in(scope.room + ':' + Games[scope.room].game.players[i].id).emit('game:leave', { 
											uuid: Date.now(), 
											room: {
												id: scope.room,
												players: Games[scope.room].room.players,
												observers: Games[scope.room].room.observers
											},
											events: Games[scope.room].game.events,
											action: {
												dealer: null,
												turn: null,
												smallBlind: null,
												bigBlind: null,
												pot: 0,
												state: null,
												board: [],
												winner: Games[scope.room].game.getWinner()
											},
											player: {
												id: Games[scope.room].game.players[(scope.player.id === 0) ? 1 : 0].id,
												name:Games[scope.room].game.players[(scope.player.id === 0) ? 1 : 0].name,
												cards: [],
												chips: 0,
												options: Games[scope.room].game.players[(scope.player.id === 0) ? 1 : 0].Options(true)
											},
											opponent: {
												id: null,
												name: null,
												cards: [],
												chips: 0,
												options: null
											}
										});
									}


								} else {
									io.sockets.in(scope.room).emit('game:leave', { 
										uuid: Date.now(), 
										user: {
											name: scope.user.name
										},
										events: Games[scope.room].game.events,
										room: {
											id: scope.room,
											players: Games[scope.room].room.players,
											observers: Games[scope.room].room.observers
										}
									});
								}


							});
						}
					});
				}
	
			});
		});

		socket.on('peer:send_offer', function (data, callback) {
			console.log('peer:receive_offer');
			socket.broadcast.to(data.room).emit('peer:receive_offer', { 
				sdp: data.sdp,
			});
		});

		socket.on('peer:send_candidate', function (data, callback) {
			console.log('peer:receive_candidate');
			socket.broadcast.to(data.room).emit('peer:receive_candidate', { 
				candidate: data.candidate
			});
		});

		socket.on('peer:send_answer', function (data, callback) {
			console.log('peer:receive_answer');
			socket.broadcast.to(data.room).emit('peer:receive_answer', { 
    			sdp: data.sdp
			});
		});

	});

	return io;
};