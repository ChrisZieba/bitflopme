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

		//	When someone joins the room
		//	It can be a logged in player, or someone who is not logged in, and just wants to rail
		socket.on('join', function(data, callback) {
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

					var playerID = helpers.getPlayerID(session.user.id, game.players)

					// Look up the table to see if it's still in mem, or if we need to create a new one
					if (!Games.hasOwnProperty(data.room)) {
						Games[data.room] = new poker.Game(
							game.settings.smallBlind, 
							game.settings.bigBlind, 
							game.settings.minBuyIn, 
							game.settings.maxBuyIn
						);
					}

					// Every connected client gets access to the mainroom
					socket.join(data.room); 


					//	A player joins a special room just for that player	
					if (playerID !== null) {
						socket.join(data.room + ':' + playerID);
						Games[data.room].AddEvent(session.user.name, 'seated and ready to play');
					} else {
						// this room is for non-players only
						socket.join(data.room + '::');
						Games[data.room].AddEvent('Dealer', '<strong>' + session.user.name + '</strong> is on the rail');
					}

					// Are both players at the table and ready to play?
					// wait until the socket connection is added to its room to check
					var start = helpers.isGameReady(data.room, io.sockets.manager.rooms, game.players);

					// this gets sent to every connection
					io.sockets.in(data.room).emit('game:join', { 
						uuid: Date.now(), 
						room: data.room,
						start: start,
						events: Games[data.room].events,
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
						console.log('_________++++++++++++++++++++++++++++++++++++++++++_)+_+_+')
						var rounds = game.rounds;
						var round;

						// has the game started?
						if (!Games[data.room].state) {
							//	The first player added  is index 0 on the player array
							for (var i = 0; i < game.players.length; i++) {
								// it is very important that we use the loop counter for the playerID
								// since the game uses the array index value to keep track of turn, dealer, blinds, etc...
								Games[data.room].AddPlayer(i, game.players[i].name, game.settings.maxBuyIn);
							}

							// this can only be called once
							// Shuffle up and Deal!!!
							Games[data.room].Start();

							// start a new round
							round = helpers.buildRoundObject(Games[data.room]);
							// add the current round 
							rounds.push(round);

						} else {
							round = rounds[rounds.length-1]
						}

						// Update the database
						// the reason we keep track of everything in the database is in the case of server disconnects, or both connections get lost
						// that way we can rebuild the game from where it was left off, as nothing happened at all
						game.events = Games[data.room].events;
						game.rounds = rounds;
						game.save(function (err) {
							if (err) throw err;

							// If a player has joined/rejoined a table send all the players their cards again
							// Or if a railbird joins send them the game data

								var numberOfPlayers = Games[data.room].players.length;
								// Send the private data to each individual player
								if (numberOfPlayers === 2) {
									for (var i = 0; i < numberOfPlayers; i++) {
										console.log(JSON.stringify(Games[data.room].players[i].id));
										io.sockets.in(data.room + ':' + Games[data.room].players[i].id).emit('player:data', { 
											uuid: Date.now(), 
											room: data.room,
											events: Games[data.room].events,
											round: round.shared,
											player: {
												id: Games[data.room].players[i].id,
												cards: Games[data.room].players[i].cards
											},
											opponent: {
												id: Games[data.room].players[(i+1) % 2].id
												//cards: ['00', '00']
											}
										});
									}
								}

								// 	Tell the non-players
								//io.sockets.in(data.room + '::').emit('railbird:data', { 
									//uuid: Date.now(), 
									//events: Games[data.room].events,
									//round: round.shared
								//});
							
							



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
					var intervalID, intervalMS = 1000;

					if (!Games.hasOwnProperty(data.room)) {
						Games[data.room] = new poker.Game(
							game.settings.smallBlind, 
							game.settings.bigBlind, 
							game.settings.minPlayers, 
							game.settings.maxPlayers, 
							game.settings.minBuyIn, 
							game.settings.maxBuyIn
						);
					}

					//	Are both players sitting at the table?
					if (helpers.isGameReady(data.room, io.sockets.manager.rooms, game.players)) {
						switch (data.action.name) {
							case 'BET':
								Games[data.room].players[playerID].Bet(data.action.amount);
								break;
							case 'CALL':
								Games[data.room].players[playerID].Call();
								break;
							case 'CHECK':
								Games[data.room].players[playerID].Check();
								break;
							case 'RAISE':
								Games[data.room].players[playerID].Raise(data.action.amount);
								break;
							case 'FOLD':
								Games[data.room].players[playerID].Fold();
								break;
							default:
								break;
						}

						// we need to check where the game is
						// if the round ended on an allin on the flop and someone called we need to play out the flop, turn, river and showdown
						// if the round ended on a fold then just move to the next round
						var Action = function (callback) {

							var rounds = game.rounds;
							//	A round is just an array of objects that contain game data at a specific time, ie. after a player makes a call
							var round = helpers.buildRoundObject(Games[data.room], rounds[rounds.length-1]);
							rounds.push(round);

							// 	Update the database
							game.events = Games[data.room].events;
							game.rounds = rounds;
							game.save(function (err) {
								if (err) throw err;

								io.sockets.in(data.room).emit('game:data', { 
									uuid: Date.now(), 
									room: data.room,
									events: Games[data.room].events,
									round: round.shared
								});

								if (typeof callback === 'function') callback();
								
							});

						};


						// run the interval until the hand is over
						intervalID = setInterval(function(){
							//Games[data.room].game.Progress();
							Action(function(){
								
								// The only time we need to preogress again (keep the interval running) is when betting can not continue
								// That means showing the rest of the board, one card at a time
								if (Games[data.room].checkForEndOfRound() && Games[data.room].getState() !== 'END') {

									if (Games[data.room].getState() === 'SHOWDOWN') {
										intervalMS = 5000;
									}
									Games[data.room].Progress();
								} else {
									// && Games[data.room].state !== 'END'
									// stop the interval from running any more
									clearInterval(intervalID);
									//setTimeout(Play, 3000);
								} 
							});

						}, intervalMS);

					}
				});



			});
		});


		socket.on('peer:send_offer', function (data, callback) {
			socket.get('scope', function(err, scope) {
				console.log('\n\n\n\n\n\nreceive offer\n')
				socket.broadcast.to(data.room).emit('peer:receive_offer', { 
					sdp: data.sdp,
				});
			});
		});

		socket.on('peer:send_candidate', function (data, callback) {
			socket.get('scope', function(err, scope) {
				console.log('send:candiate');
				socket.broadcast.to(data.room).emit('peer:receive_candidate', { 
					candidate: data.candidate
				});
			});
		});

		socket.on('peer:send_answer', function (data, callback) {
			socket.get('scope', function(err, scope) {
				console.log('send:anser');
				socket.broadcast.to(data.room).emit('peer:receive_answer', { 
        			sdp: data.sdp
				});
			});
		});


		socket.on('disconnect', function (data, callback) {
			socket.get('scope', function(err, scope) {
				if (err) throw err;

				models.Games.findOne({ id: scope.room }, function (err, game) {
					if (err) throw new Error(501, err);
					if (!game) throw new Error(502, 'Could not make connection to game');

					if (!Games[scope.room]) Games[scope.room] = new poker.game(
						game.settings.smallBlind, 
						game.settings.bigBlind, 
						game.settings.minPlayers, 
						game.settings.maxPlayers, 
						game.settings.minBuyIn, 
						game.settings.maxBuyIn
					);

					Games[scope.room].AddEvent('Dealer', scope.user.name + ' has left the table');


					game.events = Games[scope.room].events;
					game.save(function (err) {

						io.sockets.in(scope.room).emit('game:leave', { 
							uuid: Date.now(), 
							user: {
								name: scope.user.name
							},
							events: Games[scope.room].events
							
						});
					});
				});
			});
		});

	});

	return io;
};