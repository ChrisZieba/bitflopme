"use strict";

// Players is an array from the database
// if the session-id matches the id of the user from the database game, then we have a player
exports.getPlayerID = function (sid, players) {

	var playerID = null;

	for (var i = 0; i < players.length; i++) {
		if (players[i].id == sid) {
			// the reason we use the loop counter as the playerID is becuase
			// when players are added to the game, they are added to an array, and
			// the index of that array is used to keep track of things like turn, and blinds
			// so we use it as the ID to keep track of player
			playerID = i;
		}
	}

	return playerID;
};

// players is the array of players from the database
exports.checkPlayer = function (sid, players) {

	var isPlayer = false;

	for (var i = 0; i < players.length; i++) {
		if (players[i].id == sid) {
			isPlayer = true;
		}
	}

	return isPlayer;
};

// A game is only ready when each player room has at least one socket connection in it
// Players is an array from the database
exports.isGameReady = function (room, rooms, players) {

	var gameReady = true;

	if (players.length === 2) {
		//	Check if every player has a room, and at least one connection in it
		for (var i = 0; i < players.length; i++) {
			// when a new player joins a room, it is given the index of
			// the players array in the game database record
			// that is why it is ok to use i below 
			var pr = '/' + room + ':' + i;

			if (rooms.hasOwnProperty(pr)) {
				if (rooms[pr].length <= 0) {
					gameReady = false;
				}
			} else {
				gameReady = false;
			}
		}
	} else {
		gameReady = false;
	}


	return gameReady;
};

exports.getSeatedPlayers = function (room, rooms, players) {

	var seatedPlayers = [];

	for (var i = 0; i < players.length; i++) {
		var pr = '/' + room + ':' + i;

		if (rooms.hasOwnProperty(pr)) {
			if (rooms[pr].length > 0) {
				seatedPlayers.push({
					id: players[i].id,
					name: players[i].name
				});
			}
		}
	}



	return gameReady;
};

// If the second arg is not supplied build a new object, otherwise add to it
exports.buildRoundObject = function (game, obj) {
	var round = obj || {
		shared: { 
			//	Each round has a series of actions, ie. call, raise, fold
			actions: [] 
		},
		unshared: { 
			players: [], 
			deck: game.deck 
		},
	};

	round.shared.actions.push({
		dealer: game.dealer,
		turn: game.turn,
		smallBlind: game.smallBlind,
		bigBlind: game.bigBlind,
		pot: game.pot,
		state: game.state,
		board: game.board,
		players: []
	});

	//	Attach the player cards to the round so we can use it later
	for (var i = 0; i < game.players.length; i++) {
		round.shared.actions[round.shared.actions.length-1].players.push({
			id: game.players[i].id,
		    name: game.players[i].name,
			chips: game.players[i].chips,
			cards: ['00', '00'],
			action: game.players[i].action,
			folded: game.players[i].folded,
			allIn: game.players[i].allIn,
			acted: game.players[i].acted,
			blind: game.players[i].blind,
			bets: game.players[i].bets,
			out: game.players[i].out,
			options: game.players[i].Options()
		});

		round.unshared.players.push({
			id: game.players[i].id,
		    cards: game.players[i].cards
		});
	}

	return round;
};