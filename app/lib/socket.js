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
			'jsonp-polling'
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
		io.set('log level', 2);
		// ssl support
		io.set('match origin protocol', true);
		io.set('sync disconnect on unload', true);
		// enable all transports (optional if you want flashsocket)
		io.set('transports', [
			'websocket',
			'xhr-polling',
			'htmlfile',
			'jsonp-polling'
		]);     
		//io.set('flash policy port', 3002);
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

		// Games is available to this function
		var disconnect = function (room, user, player) {

			console.log('save 3');
			models.Games.findOne({ id: room }, function (err, game) {
				if (err) throw new Error(501, err);
				if (!game) throw new Error(505, 'Game could not be found');

				if (!Games.hasOwnProperty(room)) {
					Games[room] = {};
					Games[room].room = {
						id: room,
						players: [],
						observers: []
					};
					Games[room].game = new poker.Game(parseInt(game.settings.smallBlind,10), parseInt(game.settings.bigBlind,10), parseInt(game.settings.chipStack,10));
				};

				Games[room].game.AddEvent('Dealer', user.name + ' has left the table');


				// remove the user from the room
				if (player.id !== null) {
					Games[room].room.players = helpers.removeUserFromRoom(user.id, Games[room].room.players);
					Games[room].room.peers = helpers.removeUserFromRoom(user.id, Games[room].room.peers);
				} else {
					Games[room].room.observers = helpers.removeUserFromRoom(user.id, Games[room].room.observers);
				}

				//console.log('peers in room on disconnect' + JSON.stringify(Games[room].room.peers, null,4));

				var ready = helpers.isGameReady(room, io.sockets.manager.rooms, game.players);

				game.events = Games[room].game.events;

				console.log('save 5');
				game.save(function (err) {

					if (err) throw err;
					// if a player left then the table the game cannot continue
					// check to make sure the game has started (PLAYING)
					// check that a player actually left the table


					if (!ready && game.state === 'PLAYING' && player.id !== null) {
						for (var i = 0; i < Games[room].game.players.length; i++) {

							io.sockets.in(room + ':' + Games[room].game.players[i].id).emit('game:leave', { 
								uuid: Date.now(), 
								room: {
									id: room,
									players: Games[room].room.players,
									observers: Games[room].room.observers
								},
								events: Games[room].game.events,
								action: {
									dealer: null,
									turn: null,
									smallBlind: null,
									bigBlind: null,
									pot: 0,
									state: null,
									board: [],
									winner: Games[room].game.getWinner()
								},
								player: {
									id: Games[room].game.players[(player.id === 0) ? 1 : 0].id,
									name:Games[room].game.players[(player.id === 0) ? 1 : 0].name,
									cards: [],
									chips: 0,
									options: Games[room].game.players[(player.id === 0) ? 1 : 0].Options(true)
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
						io.sockets.in(room).emit('game:leave', { 
							uuid: Date.now(), 
							user: {
								name: user.name
							},
							events: Games[room].game.events,
							room: {
								id: room,
								players: Games[room].room.players,
								observers: Games[room].room.observers
							}
						});
					}


				});
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

					// a user must be logged in to play so check if they are authenticated
					if (!session.user.authenticated) {
						// disconnect the player from the table

						return;
					}

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

						// dupliates are allowed
						Games[data.room].room.players.push({
							id: session.user.id,
							name:session.user.name
						});
					} else {
						// this room is for non-players only
						socket.join(data.room + '::');

						// push the name of the observer
						Games[data.room].room.observers.push({
							id: session.user.id,
							name:session.user.name
						});
					}

					Games[data.room].game.AddEvent('Dealer', session.user.name + ' has joined the table');

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


					//	Are both players sitting at the table, and signed in?
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
		socket.on('peer:ready', function (data, callback) {
			//	Get the game data from the database
			models.Games.findOne({ id: data.room}, function (err, game) {
				if (err) throw new Error(501, err);
				if (!game) throw new Error(502, 'Could not make connection to game');
				if (!socket.handshake) throw new Error(503, 'Could not make session connection');
				if (!socket.handshake.sessionID) throw new Error(503, 'Could not make session connection');

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

					Games[data.room].room.peers.push({
						id: session.user.id,
						name: session.user.name
					});

					var ready = helpers.isCameraReady(Games[data.room].room.peers);
					//var playerID = helpers.getPlayerID(session.user.id, game.players);

					//console.log ('\nis camera ready?' + ready);
					//console.log ('peers:' + JSON.stringify(Games[data.room].room.peers));

					if (ready) {
						//console.log(JSON.stringify(io.sockets.manager.rooms,null,4));
						//console.log('data.room:' + data.room);

						//console.log('socket.id:' + socket.id);

						io.sockets.socket(socket.id).emit('peer:init', { 
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

					// a user must be logged in to play so check if they are authenticated
					if (!session.user.authenticated) {
						socket.get('scope', function(err, scope) {
							if (err) throw err;
							if (!scope) return;

							io.sockets.in(data.room + ':' + scope.player.id).emit('game:disconnect', { 
								uuid: Date.now()
							});

							//socket.leave(data.room);
							//socket.leave(data.room + ':' + scope.player.id);
							//disconnect(scope.room, scope.user, scope.player);
							return;
						});

						return;
					}

					//	This is null if the socket is not a player
					var playerID = helpers.getPlayerID(session.user.id, game.players);
					var ready = helpers.isGameReady(data.room, io.sockets.manager.rooms, game.players);

					//	Are both players sitting at the table?
					if (!ready) return;


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

							Games[data.room].game.Progress();

							isRoundOver = Games[data.room].game.checkForEndOfRound();
							isGameOver = Games[data.room].game.checkForEndOfGame();
							isShowdown = Games[data.room].game.checkForShowdown();
						}

						var rounds = game.rounds;
						//	A round is just an array of objects that contain game data at a specific time, ie. after a player makes a call
						var round = helpers.buildRoundObject(Games[data.room].game, rounds[rounds.length-1]);

						// Add a new round to the history 
						rounds.push(round);

						console.log('save 2');
						//if (err) throw err;

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
								// We need to start a new round of the game
								Games[data.room].game.NewRound();
								setTimeout(function () {Action();}, 5000);
							} else if (gameState === 'RIVER') {
								setTimeout(function () {Action();}, 5000);
							} else if (gameState === 'DEAL' || gameState === 'FLOP' || gameState === 'TURN') {
								setTimeout(function () { Action(); }, 1000);
							}
						} else if (isGameOver) {
							setTimeout(function () {
								// once the table ends you cannot go back to it
								endGame(Games[data.room], data.room);
							}, 15000);
						} 

						if (update) {
							// 	Update the database
							game.events = Games[data.room].game.events;
							game.rounds = rounds;
							game.state = (isGameOver) ? 'END' : 'PLAYING'; 

							//console.log('save 1');

							// only save at the end
							game.save(function (err) {
								if (err) throw err;
							});

						}
					};

					// wait 1 second and then run the 
					setTimeout(function () { Action(); }, 1000);

				});



			});
		});


		// you can't send any data back with the disconnect
		socket.on('disconnect', function (data, callback) {
			socket.get('scope', function(err, scope) {
				if (err) throw err;
				if (!scope) return;

				disconnect(scope.room, scope.user, scope.player);
	
			});
		});

		socket.on('peer:send_offer', function (data, callback) {
			//console.log('\npeer:receive_offer\n');
			// broadcast to other player, but not the orginiaton socket connection
			socket.broadcast.to(data.room).emit('peer:receive_offer', { 
				sdp: data.sdp,
			});
		});

		socket.on('peer:send_candidate', function (data, callback) {
			//console.log('\npeer:receive_candidate\n');
			socket.broadcast.to(data.room).emit('peer:receive_candidate', { 
				candidate: data.candidate
			});
		});

		socket.on('peer:send_answer', function (data, callback) {
			//console.log('\npeer:receive_answer\n');
			socket.broadcast.to(data.room).emit('peer:receive_answer', { 
    			sdp: data.sdp
			});
		});

	});

	return io;
};