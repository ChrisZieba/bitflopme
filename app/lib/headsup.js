function Game (smallBlind, bigBlind, buyIn) {
	this.dealer = -1;
	this.smallBlind = smallBlind;
	this.bigBlind = bigBlind;
	this.minPlayers = 2;
	this.maxPlayers =  2;
	this.setPlayers = 2;
	this.buyIn = buyIn;
	this.events = [];
	this.rounds = [];
	// whos turn is it
	this.turn = -1;
	this.pot = null;
	this.winners = [];
	this.state = null;
	this.deck = [];
	this.board = [];
	this.players = [];

}

function Player (id, name, chips, game) {
	this.id = id;
	this.name = name;
	this.blind = false;
	this.cards = [];
	this.chips = chips;
	this.folded = false;
	this.allIn = false;
	// raise,fold,call,check
	this.action = null;
	// if a player is out of the game
	// this is better than removing from the array since we need to keep the index elements
	this.out = false;
	//  Has a player acted yet
	this.acted = false;
	// Keep track of the players betting in rounds
	this.bets = null;
	this.roundBets = null;
	//Circular reference to allow reference back to parent object.
	this.game = game; 
	
}

function Log (id, game) {
	console.log('\n');

	console.log('++++++++++++++++++++++++++++++++++++++++++++++++++');
	console.log(id);
	console.log('--------------------------------------------------');

	console.log('maxbet: ' + getMaxBet(game.players) + '\n');

	console.log('-- PLAYER DATA -----------------------------------');
	for (var i = 0; i < game.players.length; i += 1) {
		console.log('\tname: ' + game.players[i].name + ', chips: ' + game.players[i].chips + ', allin: ' + game.players[i].allIn + ', folded: ' + game.players[i].folded + ', acted: ' + game.players[i].acted + ', bets: ' + game.players[i].bets + ', roundbets: ' + game.players[i].roundBets  + ', callAmount: ' + (getMaxBet(game.players) - game.players[i].bets) + ', raisemount: ' + Math.min((getMaxBet(game.players) - game.players[i].bets)*2, game.players[i].chips) + '\n');

	}

	

	console.log('getNumberOfPlayersInRoundAllIn: ' + getNumberOfPlayersInRoundAllIn(game));
	console.log('getNumberOfPlayersInRoundFolded: ' + getNumberOfPlayersInRoundFolded(game));
	console.log('getNumberOfPlayersInRoundActed: ' + getNumberOfPlayersInRoundActed(game));
	console.log('check for the end of round: ' + game.checkForEndOfRound());
	console.log('game state: ' + game.getState());


	console.log('++++++++++++++++++++++++++++++++++++++++++++++++++');

	console.log('\n');
}

Game.prototype.Start = function () {

	this.state = 'START'
	this.AddEvent('Dealer', 'Beginning Match');
	this.NewRound();
};

// A round is is over when the action cannot continue any further with the cards that were dealt.
// This occurs when:
//      1. A player has more chips  
Game.prototype.checkForEndOfRound = function () {
	var endOfRound = false;

	if (this.state === 'SHOWDOWN') {
		endOfRound = true;
	}

	if (getNumberOfPlayersInRoundAllIn(this) === 2 || getNumberOfPlayersInRoundFolded(this) > 0) {
		endOfRound = true;
	}

	// if one player is allin and both players have matched bets
	if (getNumberOfPlayersInRoundAllIn(this) === 1 && checkIfBetsEqual(this)) {
		endOfRound = true;
	}


	return endOfRound;
};


// If a round just started 
Game.prototype.checkForStartOfRound = function () {
	var startOfRound = false;

	if (getNumberOfPlayersInRoundActed(this) === 0 && this.state === 'DEAL') {
		startOfRound = true;
	}

	return startOfRound;
};

Game.prototype.checkForEndOfGame = function () {
	var endOfGame = false;

	if (this.state === 'END') {
		endOfGame = true;
	}
	return endOfGame;
};

// When a player folds the round is over and we do not need to go any further
Game.prototype.checkForRedlineRound = function () {

	var numberOfPlayersInRoundFolded = getNumberOfPlayersInRoundFolded(this);
	var isRedlineRound = false;

	if (numberOfPlayersInRoundFolded === 1) {
		isRedlineRound = true;
	} 

	return isRedlineRound;

};

// When a player makes a call for all their chips and we want to open up the cards
Game.prototype.checkForShowdown = function () {

	var isShowdown = false;
	var numberOfPlayersInRoundActed = getNumberOfPlayersInRoundActed(this);
	var numberOfPlayersInRoundAllIn = getNumberOfPlayersInRoundAllIn(this);
	var numberOfPlayersInRoundFolded = getNumberOfPlayersInRoundFolded(this);
	var isBettingRoundOver = checkForEndOfBettingRound(this);
	var gameState = this.state;

	if (isBettingRoundOver) {
		if (numberOfPlayersInRoundFolded === 0) {
			isShowdown = true;
		}
	}


	return isShowdown;

};

Game.prototype.getWinner = function () {

	var winner = null;

	if (this.state === 'END') {
		for (var i = 0; i < this.players.length; i += 1) {
			if (this.players[i].chips === (this.buyIn*2)) {
				winner = this.players[i].name;
			}
		}
	} 

	return winner;
};

Game.prototype.getState = function () {
	return this.state;
};

Game.prototype.setState = function (state) {
	this.state = state;
};

Game.prototype.NewRound = function() {

	// Can only start a new round if we have 2 players in the game still
	if (getPlayerCount(this) === this.maxPlayers) {

		var smallBlind, bigBlind;
		var playerCount = getPlayerCount(this);

		initRound(this);

		this.AddEvent('Dealer','Starting new round');
		this.AddEvent('Dealer','Dealing hold cards');

		//Deal 2 cards to each player
		for (var i = 0; i < this.players.length; i += 1) {
			this.players[i].cards.push(this.deck.pop());
			this.players[i].cards.push(this.deck.pop());
		}

		//  Identify Small and Big Blind player indexes
		smallBlind = this.dealer;
		
		if (smallBlind >= playerCount) {
			smallBlind -= playerCount;
		}

		bigBlind = this.dealer + 1;
		
		if (bigBlind >= playerCount) {
			bigBlind -= playerCount;
		}

		// Heads up has different blinds positions (sb=dealer and acts first at the start)
		this.turn = this.dealer;

		if (this.turn > playerCount) {
			this.turn -= playerCount;
		}


Log('before we adjust the blinds', this);
		// force small blind
		// check if the small blind is forced allin
		this.players[smallBlind].blind = 'small';

		// does the player have enough to cover the smallblind
		if (this.players[smallBlind].chips <= this.smallBlind) {

			this.players[smallBlind].bets = this.players[smallBlind].chips;
			this.players[smallBlind].chips = 0;
			this.players[smallBlind].acted = true;
			this.players[smallBlind].allIn = true;

			// Set the big blind as acted since they already have enough chips in (BB) to cover the small blind, and
			// will force the round to be over
			this.players[bigBlind].acted = true;

			this.AddEvent(this.players[smallBlind].name, 'posts small blind of ' + this.players[smallBlind].bets);
			this.AddEvent(this.players[smallBlind].name, 'is forced allin');



		} else {
			this.players[smallBlind].chips -= this.smallBlind;
			this.players[smallBlind].bets = this.smallBlind;
			this.AddEvent(this.players[smallBlind].name, 'posts small blind of ' + this.smallBlind);
		}


		// force big blind
		this.players[bigBlind].blind = 'big';

		// check if the bib blind has enough chips to cover the blind
		if (this.players[bigBlind].chips <= this.bigBlind) {
			this.players[bigBlind].bets = this.players[bigBlind].chips;
			this.players[bigBlind].chips = 0;
			this.players[bigBlind].acted = true;
			this.players[bigBlind].allIn = true;

			this.AddEvent(this.players[bigBlind].name, 'posts big blind of ' + this.players[bigBlind].bets);
			this.AddEvent(this.players[bigBlind].name, 'is forced allin');

			// check to see if the big blind had enough chips to cover the smallblind,
			// otherwise the smallBlind needs to make a call still
			if (this.players[bigBlind].bets <= this.smallBlind) {

				// match up the blinds
				this.players[smallBlind].bets = this.players[bigBlind].bets 

				// give the smallBlind the extra he put in the middle (ie sidePot)
				this.players[smallBlind].chips += this.smallBlind - this.players[bigBlind].bets;

				// set the other player to acted since they have more money in the pot than the big blind 
				this.players[smallBlind].acted = true;
			}
		} else {
			this.players[bigBlind].chips -= this.bigBlind;
			this.players[bigBlind].bets = this.bigBlind;
			this.AddEvent(this.players[bigBlind].name, 'posts big blind of ' + this.bigBlind);
		}
	Log('after we adjust the blinds', this);	

	} else {

		// game over
		this.AddEvent('Dealer', 'Match is over');
		this.state = 'END';
	}


};

Game.prototype.AddPlayer = function (id, name, chips) {
	if (this.players.length < this.maxPlayers && chips == this.buyIn) {
		var player = new Player(id, name, chips, this);
		this.players.push(player);
	}
};

Game.prototype.AddEvent = function (owner, event) {
	this.events.push({
		time: Date.now(), 
		owner: owner,
		event: event
	});
};

Game.prototype.getRoundData = function () {

	return {
		playersFolded: getNumberOfPlayersInRoundFolded(this)
	}
}
// Attempt to move the game along to the next round
// This gets called after each player makes a move, or a round ends
Game.prototype.Progress = function () {
//Log('Beginning of progress',this);

	console.log('667');
	var numberOfPlayersInRoundFolded = getNumberOfPlayersInRoundFolded(this);
	var numberOfPlayersInRoundActed = getNumberOfPlayersInRoundActed(this);
	var numberOfPlayersInRoundAllIn = getNumberOfPlayersInRoundAllIn(this);
	var isRoundOver = checkForEndOfBettingRound(this);
	
	if (isRoundOver) {
		console.log('ggh');
		moveBetsToPot(this);

		// if theres only person left with cards the chips are given to the player who is still in the hand
		if (numberOfPlayersInRoundFolded === 1) {
			finishRedlineRound(this);
		} else {
			nextBettingRound(this);
		}
	} else {
		// The betting round is not yet over, since all players have not acted yet
		//
		// Since all players need to act for a betting round to be over we need to check the case where a 
		// player decides to fold a small blind in heads up, or if they decide to fold under the gun
		//
		if (numberOfPlayersInRoundFolded === 1) {
			console.log('ppo');
			moveBetsToPot(this);
			finishRedlineRound(this);
		} else {
			console.log('jhy');
			// it is the next players turn to act so update accordingly
			updateTurn(this);
		}
	}

Log('End of progress',this);

};

function checkForEndOfBettingRound (game) {
	var endOfBettingRound = true;
	var maxBet = getMaxBet(game.players);
	var isRoundOver = game.checkForEndOfRound();

	// a betting round is automaticaly over if the round is over
	if (!isRoundOver) {
		// For each player, check if they are still in the hand
		for (var i = 0; i < game.players.length; i += 1) {
			if (game.players[i].folded === false) {
				// If the player has not acted yet OR they have not matched the highest bet yet
				if (game.players[i].acted === false || game.players[i].bets !== maxBet) {
					if (game.players[i].allIn === false) {
						endOfBettingRound = false;
					}
				}
			} 
		}
	}

	return endOfBettingRound;
}

function nextBettingRound (game) {


	if (game.state === 'RIVER') {
		game.state = 'SHOWDOWN';
		game.AddEvent('Dealer', '** Showdown **');

		//Evaluate each hand
		for (var j = 0; j < game.players.length; j += 1) {
			// join the cards with the board into the full 7 cards
			var cards = game.players[j].cards.concat(game.board);
			game.players[j].hand = rankHand({
				cards: cards
			});
		}

		checkForWinner(game);
		checkForBankrupt(game);

		// If we still have enough players start a new round
		// checkforBankrupt removes any players that have no chips left
		//game.NewRound();

	} else if (game.state === 'TURN') {
		game.state = 'RIVER';
		game.AddEvent('Dealer', 'Dealing river card');
		//Burn a card
		game.deck.pop();
		// Turn a card
		game.board.push(game.deck.pop());
		initBettingRound(game);
	} else if (game.state === 'FLOP') {
		game.state = 'TURN';
		game.AddEvent('Dealer', 'Dealing turn card');
		// Burn a card
		game.deck.pop(); 
		// Turn a card
		game.board.push(game.deck.pop()); 
		initBettingRound(game);
	} else if (game.state === 'DEAL') {
		game.state = 'FLOP';
		game.AddEvent('Dealer', 'Dealing flop');
		// Burn a card
		game.deck.pop(); 

		// Flop three cards
		for (var i = 0; i < 3; i += 1) { 
			game.board.push(game.deck.pop());
		}

		initBettingRound(game);

	} 
}

//  Returns an array or the possible plays a player has [call,bet,raise,check,fold]
Player.prototype.Options = function (roundOver) {
	
	// Default options
	var options = {
		'FOLD': {
			allowed: false
		},
		'CHECK': {
			allowed: false
		},
		'CALL': {
			allowed: false
		},
		'BET': {
			allowed: false
		},
		'RAISE': {
			allowed: false
		}
	};

	//  If its not the players turn return an empty array since they have no options yet
	if (this.game.turn === this.id && !roundOver) {
		if (this.canFold()) {
			options['FOLD'] = {
				allowed: true,
				name: 'FOLD'
			}
		} 

		if (this.canCheck()) {
			options['CHECK'] = {
				allowed: true,
				name: 'CHECK'
			}
		} 

		if (this.canCall()) {
			var maxBet = getMaxBet(this.game.players);
			var callAmount = Math.min(maxBet - this.bets, this.chips);

			options['CALL'] = {
				allowed: true,
				name: 'CALL',
				amount: callAmount
			}
		} 

		if (this.canBet()) {
			options['BET'] = {
				allowed: true,
				name: 'BET',
				min: Math.min(this.game.bigBlind, this.chips),
				max: this.chips,
				amount: Math.min(this.game.bigBlind, this.chips)
			}
		} 

		if (this.canRaise()) {
			var maxBet = getMaxBet(this.game.players);
			var callAmount = maxBet - this.bets;
			// a player must raise at least twice the size of the current bet plus the amount to call, 
			// or all thier chips if they cant cover that
			var raiseAmount = Math.min(callAmount*2, this.chips);
Log('canraise',this.game);


			options['RAISE'] = {
				allowed: true,
				name: "RAISE",
				// in the big blind the callamount is 0 so we need to set the min to the heighest of these amount
				// also make sure the min is not higher than the 
				min: (callAmount === 0) ? Math.min(Math.max(maxBet, raiseAmount),this.chips) : raiseAmount,
				max: this.chips,
				amount: (callAmount === 0) ? Math.min(Math.max(maxBet, raiseAmount),this.chips) : raiseAmount
			}
		} 

	}


	return options;

};

// A check is allowed if all bets in the pot are equal or the other player is allin for less in the blind round
Player.prototype.canCheck = function() {
	var canCheck = true;

	// if the 
	//if (getPlayersInRoundNotAllIn(this.game) < 2) {
		//canCheck = true;
	//} else {

		// this loop is to get the first bet in the players array
		for (var i = 0; i < this.game.players.length; i++) {
			if (this.game.players[i].out === false) {
				var tmp = this.game.players[i].bets;
				break;
			}
		}

		for (var i = 0; i < this.game.players.length; i++) {
			if (this.game.players[i].out === false) {
				if (tmp !== this.game.players[i].bets) {
					canCheck = false;
				}
			}
		}
	//}

	return canCheck;

};

Player.prototype.canBet = function() {
	var canBet = true;

	// A player can make a bet if no other bets are active. Otherwise it would be a raise.
	for (var i = 0; i < this.game.players.length; i += 1) {
		if (this.game.players[i].out === false) {
			if (this.game.players[i].bets !== 0) {
				canBet = false;
			}
		}
	}
	
	return canBet;
};


Player.prototype.canRaise = function() {

	var canRaise = true;
	var maxBet = getMaxBet(this.game.players);


	// if the other player is allin, a raise is not possible
	if (getNumberOfPlayersInRoundAllIn(this.game) === 1) {
		canRaise = false;
	} else {
		// Can raise if a bet has been made to the pot
		// raise. The player will be given an opportunity to raise if his bet is
		// lower than the highest bet on the table or if he did not yet talk in this
		// betting round (for instance if he payed the big blind or a late blind).
		canRaise = (maxBet !== 0 && this.chips > (maxBet - this.bets) && (this.acted === false || this.bets < maxBet ));
	}



	return canRaise;
};

Player.prototype.canCall = function() {

	var canCheck = this.canCheck();
	var canCall = true;

	canCall = (this.chips > 0 && canCheck == false);

	// as long as a player has one chip, and there is a bet in the pot, they can make a call
	return canCall;
};

Player.prototype.canFold = function() {
	// A player can fold at any stage during the game, if it's their turn of course
	return true
};

Player.prototype.Check = function() {

	// Only set this to 0 if not checking on the big blind
	if (this.blind !== 'big') {
		this.bets = 0;
	}
	this.action = 'check';
	this.acted = true;

	this.game.AddEvent(this.name, 'checks');

};

Player.prototype.Bet = function (bet) {

	this.bets += bet;
	this.chips -= bet;
	this.acted = true;
	this.action = 'bet';
	this.game.AddEvent(this.name, 'bets ' + bet);
	
};


Game.prototype.adjustBet = function (id, diff) {
	// add the chips to the players stack

	diff = parseInt(diff, 10);

	this.players[id].chips += diff;
	this.players[id].bets -= diff;
	//this.players[id].roundBets -= diff;

};


Player.prototype.Raise = function (bet) {
Log('raise', this.game);
	// check to see if the raise is all the players chips
	if (this.chips === bet) {
		this.bets += this.chips;
		this.chips = 0;
		this.allIn = true;
		
	} else {
		this.bets += bet;
		this.chips -= bet;
	}

	this.action = 'raise';
	this.acted = true;
	this.game.AddEvent(this.name, 'raises ' + bet);



};


Player.prototype.Call = function() {
	var maxBet = getMaxBet(this.game.players);
Log('call', this.game);

	// move the bets the player has already put put back into their stack
	if (this.bets >= 0) {
		this.chips += this.bets;
	}

	// if the player can cover the bet
	if (this.chips > maxBet) {
		// take the chips from the players stack
		this.chips -= maxBet;
		this.bets = maxBet;
	} else {
		// the player is forced allin with the call

		// give the rest back the other player, and adjust the pot and his bet
		this.game.adjustBet(getOtherPlayerID(this.game, this.id), (maxBet - this.chips));

		this.bets = this.chips;
		this.chips = 0;
		this.allIn = true;
		
	}
	this.action = 'call';
	this.acted = true;
Log('call', this.game);
	this.game.AddEvent(this.name, 'calls');


};

Player.prototype.AllIn = function() {

	if (this.game.players[i].chips !== 0) {
		this.table.game.bets[i] += this.table.players[i].chips;
		this.table.players[i].chips = 0;

		this.allIn = true;
		this.acted = true;
	}

	// Attemp to progress the game
	//this.table.game.Progress();

};

Player.prototype.Fold = function() {
	var bet = parseInt(this.bets, 10);
	this.bets = 0;
	// Move any bet the player has to the pot
	this.game.pot += bet;
	this.acted = true;
	//Mark the player as folded
	this.folded = true;
	this.action = 'fold';
	this.game.AddEvent(this.name, 'folds');
};

// How many players are sitting at a table
function getPlayerCount (game) {
	var playerCount = 0;

	for (var i = 0; i < game.players.length; i += 1) {
		// a player is out when they lose all their chips
		if (game.players[i].out === false) {
			playerCount += 1;
		}
	}

	return playerCount;
}

// dealer is the player index who currently has the button
function updateTurn (game, dealer) {

	console.log('\n\n\n--UPDATETURN--\n\n\n')
	var playerCount = getPlayerCount(game);

	// if the round is over, no player has a turn left
	if (game.checkForEndOfRound()) {
		game.turn = null;
	} else {
		// if a dealer position is passed in, then we want to reset the turn to whoever is set to after the button
		if (typeof dealer !== 'undefined') {
			// move the button one position
			game.turn = dealer + 1;
		} else {
			game.turn += 1;
		}

		if (game.turn >= playerCount) {
			game.turn -= playerCount;
		}
	}


}

// This gets called when a new round is started. ie. after a showdown.
// A round is a full hand from start to finish, for example, if a player raises the small blind, 
// then player 2 calls, a flop comes down, and player 1 bets and player 2 folds, that is a round
function initRound (game) {

	console.log('init nrw round------');
		game.state = 'DEAL';
		game.pot = 0;
		game.deck.splice(0, game.deck.length);
		game.board.splice(0, game.board.length);

		for (var i = 0; i < game.players.length; i += 1) {
			game.players[i].folded = false;
			game.players[i].acted = false;
			game.players[i].allIn = false;
			game.players[i].cards.splice(0, game.players[i].cards.length);
			game.players[i].bets = 0;
			game.players[i].roundBets = 0;
			game.players[i].blind = false;
		}

		// Move the button
		game.dealer += 1;

		if (game.dealer >= getPlayerCount(game)) {
			game.dealer = 0;
		}

		updateTurn(game, game.dealer);
		fillDeck(game.deck);
}

// A redline round is one that ends without a showdown
function finishRedlineRound (game) {
console.log('finsih redline round')
	// Give the remaining player the chips in the pot
	for (var i = 0; i < game.players.length; i += 1) {
		if (game.players[i].out === false) {
			if (game.players[i].folded === false) {

				game.players[i].chips += game.pot;
				game.AddEvent('Dealer', '** Hand Over **' + game.players[i].name + ' wins ' + game.pot);
			}
		}
	}

	//game.NewRound();
}

function initBettingRound (game) {
	console.log('init betting round')
	for (var i = 0; i < game.players.length; i += 1) {
		if (game.players[i].out === false) {
			game.players[i].bets = 0;
			game.players[i].acted = false;
		}
	}

	// Set the turn to the first position after the dealer
	updateTurn(game, game.dealer);
}

function fillDeck (deck) {
	deck.push('AS');
	deck.push('KS');
	deck.push('QS');
	deck.push('JS');
	deck.push('TS');
	deck.push('9S');
	deck.push('8S');
	deck.push('7S');
	deck.push('6S');
	deck.push('5S');
	deck.push('4S');
	deck.push('3S');
	deck.push('2S');
	deck.push('AH');
	deck.push('KH');
	deck.push('QH');
	deck.push('JH');
	deck.push('TH');
	deck.push('9H');
	deck.push('8H');
	deck.push('7H');
	deck.push('6H');
	deck.push('5H');
	deck.push('4H');
	deck.push('3H');
	deck.push('2H');
	deck.push('AD');
	deck.push('KD');
	deck.push('QD');
	deck.push('JD');
	deck.push('TD');
	deck.push('9D');
	deck.push('8D');
	deck.push('7D');
	deck.push('6D');
	deck.push('5D');
	deck.push('4D');
	deck.push('3D');
	deck.push('2D');
	deck.push('AC');
	deck.push('KC');
	deck.push('QC');
	deck.push('JC');
	deck.push('TC');
	deck.push('9C');
	deck.push('8C');
	deck.push('7C');
	deck.push('6C');
	deck.push('5C');
	deck.push('4C');
	deck.push('3C');
	deck.push('2C');

	//Shuffle the deck array with Fisher-Yates
	for (var i = 0; i < deck.length; i += 1) {
		var j = Math.floor(Math.random() * (i + 1));
		var tempi = deck[i];
		var tempj = deck[j];
		deck[i] = tempj;
		deck[j] = tempi;
	}
}

function getMaxBet (players) {
	var maxBet = 0;

	for (var i = 0; i < players.length; i += 1) {
		if (players[i].bets > maxBet) {
			maxBet = players[i].bets;
		}
	}

	return maxBet;
}


// How many players in the round have not yet folded
function getNumberOfPlayersInRoundFolded (game) {
	var noOfPlayersInRoundFolded = 0;

	// For each player, check if they are still in the hand
	for (var i = 0; i < game.players.length; i += 1) {
		if (game.players[i].out === false) {
			if (game.players[i].folded === true) {
				noOfPlayersInRoundFolded += 1;
			}
		}
	}

	return noOfPlayersInRoundFolded;
}


// How many players in the round have chips and havent folded
function getNumberOfPlayersInRoundAllIn (game) {
	var noOfPlayersInRoundAllIn = 0;

	// For each player, check if they are still in the hand
	for (var i = 0; i < game.players.length; i += 1) {
		if (game.players[i].out === false) {
			if (game.players[i].folded === false && game.players[i].allIn === true && game.players[i].chips === 0) {
				noOfPlayersInRoundAllIn += 1;
			}
		}
	}

	return noOfPlayersInRoundAllIn;
}

// Check to see if every player has the same in the middle
function checkIfBetsEqual (game) {
	var areBetsEqual = true;

	// For each player, check if the bets they have in the middle are equal
	for (var i = 1; i < game.players.length; i += 1) {
		if (game.players[i].bets !== game.players[0].bets) {
			areBetsEqual = false;
			break;
		}
	}

	return areBetsEqual;
}

// How many players in the round have acted yet
function getNumberOfPlayersInRoundActed (game) {
	var noOfPlayersInRoundActed = 0;

	// For each player, check if they are still in the hand
	for (var i = 0; i < game.players.length; i += 1) {
		if (game.players[i].out === false) {
			if (game.players[i].acted === true) {
				noOfPlayersInRoundActed += 1;
			}
		}
	}

	// if this is 0 then all players have acted in the round
	return noOfPlayersInRoundActed;
}

function rankHand (hand) {
	var myResult = rankHandInt(hand);
	hand.rank = myResult.rank;
	hand.message = myResult.message;

	return hand;
}

function rankHandInt (hand) {
	var rank, message, handRanks, handSuits, ranks, suits, cards, result, i;

	rank = 0.0000;
	message = '';
	handRanks = [];
	handSuits = [];

	for (var i = 0; i < hand.cards.length; i += 1) {
		// number
		handRanks[i] = hand.cards[i].substr(0, 1);
		// suit
		handSuits[i] = hand.cards[i].substr(1, 1);
	}

	ranks = handRanks.sort().toString().replace(/\W/g, "");
	suits = handSuits.sort().toString().replace(/\W/g, "");
	cards = hand.cards.toString();

	// Four of a kind
	if (rank === 0) {
		if (ranks.indexOf('AAAA') > -1) {rank = 292 + rankKickers(ranks.replace('AAAA', ''), 1); }
		if (ranks.indexOf('KKKK') > -1 && rank === 0) {rank = 291 + rankKickers(ranks.replace('KKKK', ''), 1); }
		if (ranks.indexOf('QQQQ') > -1 && rank === 0) {rank = 290 + rankKickers(ranks.replace('QQQQ', ''), 1); }
		if (ranks.indexOf('JJJJ') > -1 && rank === 0) {rank = 289 + rankKickers(ranks.replace('JJJJ', ''), 1); }
		if (ranks.indexOf('TTTT') > -1 && rank === 0) {rank = 288 + rankKickers(ranks.replace('TTTT', ''), 1); }
		if (ranks.indexOf('9999') > -1 && rank === 0) {rank = 287 + rankKickers(ranks.replace('9999', ''), 1); }
		if (ranks.indexOf('8888') > -1 && rank === 0) {rank = 286 + rankKickers(ranks.replace('8888', ''), 1); }
		if (ranks.indexOf('7777') > -1 && rank === 0) {rank = 285 + rankKickers(ranks.replace('7777', ''), 1); }
		if (ranks.indexOf('6666') > -1 && rank === 0) {rank = 284 + rankKickers(ranks.replace('6666', ''), 1); }
		if (ranks.indexOf('5555') > -1 && rank === 0) {rank = 283 + rankKickers(ranks.replace('5555', ''), 1); }
		if (ranks.indexOf('4444') > -1 && rank === 0) {rank = 282 + rankKickers(ranks.replace('4444', ''), 1); }
		if (ranks.indexOf('3333') > -1 && rank === 0) {rank = 281 + rankKickers(ranks.replace('3333', ''), 1); }
		if (ranks.indexOf('2222') > -1 && rank === 0) {rank = 280 + rankKickers(ranks.replace('2222', ''), 1); }
		if (rank !== 0) {
			message = 'Four of a kind'; 
		}
	}

	// Full House
	if (rank === 0) {
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('KK') > -1) {rank = 279; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 278; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 277; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 276; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 275; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 274; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 273; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 272; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 271; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 270; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 269; }
		if (ranks.indexOf('AAA') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 268; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 267; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 266; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 265; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 264; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 263; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 262; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 261; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 260; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 259; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 258; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 257; }
		if (ranks.indexOf('KKK') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 256; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 255; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 254; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 253; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 252; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 251; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 250; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 249; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 248; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 247; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 246; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 245; }
		if (ranks.indexOf('QQQ') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 244; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 243; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 242; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 241; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 240; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 239; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 238; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 237; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 236; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 235; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 234; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 233; }
		if (ranks.indexOf('JJJ') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 232; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 231; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 230; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 229; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 228; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 227; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 226; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 225; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 224; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 223; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 222; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 221; }
		if (ranks.indexOf('TTT') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 220; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 219; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 218; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 217; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 216; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 215; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 214; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 213; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 212; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 211; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 210; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 209; }
		if (ranks.indexOf('999') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 208; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 207; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 206; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 205; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 204; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 203; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 202; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 201; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 200; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 199; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 198; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 197; }
		if (ranks.indexOf('888') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 196; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 195; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 194; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 193; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 192; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 191; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 190; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 189; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 188; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 187; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 186; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 185; }
		if (ranks.indexOf('777') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 184; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 183; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 182; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 181; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 180; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 179; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 178; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 177; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 176; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 175; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 174; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 173; }
		if (ranks.indexOf('666') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 172; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 171; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 170; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 169; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 168; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 167; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 166; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 165; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 164; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 163; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 162; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 161; }
		if (ranks.indexOf('555') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 160; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 159; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 158; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 157; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 156; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 155; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 154; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 153; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 152; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 151; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 150; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 149; }
		if (ranks.indexOf('444') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 148; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 147; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 146; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 145; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 144; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 143; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 142; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 141; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 140; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 139; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 138; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 137; }
		if (ranks.indexOf('333') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 136; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('AA') > -1 && rank === 0) {rank = 135; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('KK') > -1 && rank === 0) {rank = 134; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 133; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 132; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 131; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 130; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 129; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 128; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 127; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 126; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 125; }
		if (ranks.indexOf('222') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 124; }
		if (rank !== 0) {
			message = 'Full House'; 
		}
	}

	//Flush
	if (rank === 0) {
		if (suits.indexOf('CCCCC') > -1 || suits.indexOf('DDDDD') > -1 || suits.indexOf('HHHHH') > -1 || suits.indexOf('SSSSS') > -1) {rank = 123; message = 'Flush';}

		// Royal flush
		if (cards.indexOf('TC') > -1 && cards.indexOf('JC') > -1 && cards.indexOf('QC') > -1 && cards.indexOf('KC') > -1 && cards.indexOf('AC') > -1 && rank === 123) {rank = 302; message = 'Royal Flush';}
		if (cards.indexOf('TD') > -1 && cards.indexOf('JD') > -1 && cards.indexOf('QD') > -1 && cards.indexOf('KD') > -1 && cards.indexOf('AD') > -1 && rank === 123) {rank = 302; message = 'Royal Flush';}
		if (cards.indexOf('TH') > -1 && cards.indexOf('JH') > -1 && cards.indexOf('QH') > -1 && cards.indexOf('KH') > -1 && cards.indexOf('AH') > -1 && rank === 123) {rank = 302; message = 'Royal Flush';}
		if (cards.indexOf('TS') > -1 && cards.indexOf('JS') > -1 && cards.indexOf('QS') > -1 && cards.indexOf('KS') > -1 && cards.indexOf('AS') > -1 && rank === 123) {rank = 302; message = 'Royal Flush';}

		// Straight Flush
		if (cards.indexOf('9C') > -1 && cards.indexOf('TC') > -1 && cards.indexOf('JC') > -1 && cards.indexOf('QC') > -1 && cards.indexOf('KC') > -1 && rank === 123) {rank = 301; message = 'Straight Flush';}
		if (cards.indexOf('9D') > -1 && cards.indexOf('TD') > -1 && cards.indexOf('JD') > -1 && cards.indexOf('QD') > -1 && cards.indexOf('KD') > -1 && rank === 123) {rank = 301; message = 'Straight Flush';}
		if (cards.indexOf('9H') > -1 && cards.indexOf('TH') > -1 && cards.indexOf('JH') > -1 && cards.indexOf('QH') > -1 && cards.indexOf('KH') > -1 && rank === 123) {rank = 301; message = 'Straight Flush';}
		if (cards.indexOf('9S') > -1 && cards.indexOf('TS') > -1 && cards.indexOf('JS') > -1 && cards.indexOf('QS') > -1 && cards.indexOf('KS') > -1 && rank === 123) {rank = 301; message = 'Straight Flush';}
		if (cards.indexOf('8C') > -1 && cards.indexOf('9C') > -1 && cards.indexOf('TC') > -1 && cards.indexOf('JC') > -1 && cards.indexOf('QC') > -1 && rank === 123) {rank = 300; message = 'Straight Flush';}
		if (cards.indexOf('8D') > -1 && cards.indexOf('9D') > -1 && cards.indexOf('TD') > -1 && cards.indexOf('JD') > -1 && cards.indexOf('QD') > -1 && rank === 123) {rank = 300; message = 'Straight Flush';}
		if (cards.indexOf('8H') > -1 && cards.indexOf('9H') > -1 && cards.indexOf('TH') > -1 && cards.indexOf('JH') > -1 && cards.indexOf('QH') > -1 && rank === 123) {rank = 300; message = 'Straight Flush';}
		if (cards.indexOf('8S') > -1 && cards.indexOf('9S') > -1 && cards.indexOf('TS') > -1 && cards.indexOf('JS') > -1 && cards.indexOf('QS') > -1 && rank === 123) {rank = 300; message = 'Straight Flush';}
		if (cards.indexOf('7C') > -1 && cards.indexOf('8C') > -1 && cards.indexOf('9C') > -1 && cards.indexOf('TC') > -1 && cards.indexOf('JC') > -1 && rank === 123) {rank = 299; message = 'Straight Flush';}
		if (cards.indexOf('7D') > -1 && cards.indexOf('8D') > -1 && cards.indexOf('9D') > -1 && cards.indexOf('TD') > -1 && cards.indexOf('JD') > -1 && rank === 123) {rank = 299; message = 'Straight Flush';}
		if (cards.indexOf('7H') > -1 && cards.indexOf('8H') > -1 && cards.indexOf('9H') > -1 && cards.indexOf('TH') > -1 && cards.indexOf('JH') > -1 && rank === 123) {rank = 299; message = 'Straight Flush';}
		if (cards.indexOf('7S') > -1 && cards.indexOf('8S') > -1 && cards.indexOf('9S') > -1 && cards.indexOf('TS') > -1 && cards.indexOf('JS') > -1 && rank === 123) {rank = 299; message = 'Straight Flush';}
		if (cards.indexOf('6C') > -1 && cards.indexOf('7C') > -1 && cards.indexOf('8C') > -1 && cards.indexOf('9C') > -1 && cards.indexOf('TC') > -1 && rank === 123) {rank = 298; message = 'Straight Flush';}
		if (cards.indexOf('6D') > -1 && cards.indexOf('7D') > -1 && cards.indexOf('8D') > -1 && cards.indexOf('9D') > -1 && cards.indexOf('TD') > -1 && rank === 123) {rank = 298; message = 'Straight Flush';}
		if (cards.indexOf('6H') > -1 && cards.indexOf('7H') > -1 && cards.indexOf('8H') > -1 && cards.indexOf('9H') > -1 && cards.indexOf('TH') > -1 && rank === 123) {rank = 298; message = 'Straight Flush';}
		if (cards.indexOf('6S') > -1 && cards.indexOf('7S') > -1 && cards.indexOf('8S') > -1 && cards.indexOf('9S') > -1 && cards.indexOf('TS') > -1 && rank === 123) {rank = 298; message = 'Straight Flush';}
		if (cards.indexOf('5C') > -1 && cards.indexOf('6C') > -1 && cards.indexOf('7C') > -1 && cards.indexOf('8C') > -1 && cards.indexOf('9C') > -1 && rank === 123) {rank = 297; message = 'Straight Flush';}
		if (cards.indexOf('5D') > -1 && cards.indexOf('6D') > -1 && cards.indexOf('7D') > -1 && cards.indexOf('8D') > -1 && cards.indexOf('9D') > -1 && rank === 123) {rank = 297; message = 'Straight Flush';}
		if (cards.indexOf('5H') > -1 && cards.indexOf('6H') > -1 && cards.indexOf('7H') > -1 && cards.indexOf('8H') > -1 && cards.indexOf('9H') > -1 && rank === 123) {rank = 297; message = 'Straight Flush';}
		if (cards.indexOf('5S') > -1 && cards.indexOf('6S') > -1 && cards.indexOf('7S') > -1 && cards.indexOf('8S') > -1 && cards.indexOf('9S') > -1 && rank === 123) {rank = 297; message = 'Straight Flush';}
		if (cards.indexOf('4C') > -1 && cards.indexOf('5C') > -1 && cards.indexOf('6C') > -1 && cards.indexOf('7C') > -1 && cards.indexOf('8C') > -1 && rank === 123) {rank = 296; message = 'Straight Flush';}
		if (cards.indexOf('4D') > -1 && cards.indexOf('5D') > -1 && cards.indexOf('6D') > -1 && cards.indexOf('7D') > -1 && cards.indexOf('8D') > -1 && rank === 123) {rank = 296; message = 'Straight Flush';}
		if (cards.indexOf('4H') > -1 && cards.indexOf('5H') > -1 && cards.indexOf('6H') > -1 && cards.indexOf('7H') > -1 && cards.indexOf('8H') > -1 && rank === 123) {rank = 296; message = 'Straight Flush';}
		if (cards.indexOf('4S') > -1 && cards.indexOf('5S') > -1 && cards.indexOf('6S') > -1 && cards.indexOf('7S') > -1 && cards.indexOf('8S') > -1 && rank === 123) {rank = 296; message = 'Straight Flush';}
		if (cards.indexOf('3C') > -1 && cards.indexOf('4C') > -1 && cards.indexOf('5C') > -1 && cards.indexOf('6C') > -1 && cards.indexOf('7C') > -1 && rank === 123) {rank = 295; message = 'Straight Flush';}
		if (cards.indexOf('3D') > -1 && cards.indexOf('4D') > -1 && cards.indexOf('5D') > -1 && cards.indexOf('6D') > -1 && cards.indexOf('7D') > -1 && rank === 123) {rank = 295; message = 'Straight Flush';}
		if (cards.indexOf('3H') > -1 && cards.indexOf('4H') > -1 && cards.indexOf('5H') > -1 && cards.indexOf('6H') > -1 && cards.indexOf('7H') > -1 && rank === 123) {rank = 295; message = 'Straight Flush';}
		if (cards.indexOf('3S') > -1 && cards.indexOf('4S') > -1 && cards.indexOf('5S') > -1 && cards.indexOf('6S') > -1 && cards.indexOf('7S') > -1 && rank === 123) {rank = 295; message = 'Straight Flush';}
		if (cards.indexOf('2C') > -1 && cards.indexOf('3C') > -1 && cards.indexOf('4C') > -1 && cards.indexOf('5C') > -1 && cards.indexOf('6C') > -1 && rank === 123) {rank = 294; message = 'Straight Flush';}
		if (cards.indexOf('2D') > -1 && cards.indexOf('3D') > -1 && cards.indexOf('4D') > -1 && cards.indexOf('5D') > -1 && cards.indexOf('6D') > -1 && rank === 123) {rank = 294; message = 'Straight Flush';}
		if (cards.indexOf('2H') > -1 && cards.indexOf('3H') > -1 && cards.indexOf('4H') > -1 && cards.indexOf('5H') > -1 && cards.indexOf('6H') > -1 && rank === 123) {rank = 294; message = 'Straight Flush';}
		if (cards.indexOf('2S') > -1 && cards.indexOf('3S') > -1 && cards.indexOf('4S') > -1 && cards.indexOf('5S') > -1 && cards.indexOf('6S') > -1 && rank === 123) {rank = 294; message = 'Straight Flush';}
		if (cards.indexOf('AC') > -1 && cards.indexOf('2C') > -1 && cards.indexOf('3C') > -1 && cards.indexOf('4C') > -1 && cards.indexOf('5C') > -1 && rank === 123) {rank = 293; message = 'Straight Flush';}
		if (cards.indexOf('AS') > -1 && cards.indexOf('2S') > -1 && cards.indexOf('3S') > -1 && cards.indexOf('4S') > -1 && cards.indexOf('5S') > -1 && rank === 123) {rank = 293; message = 'Straight Flush';}
		if (cards.indexOf('AH') > -1 && cards.indexOf('2H') > -1 && cards.indexOf('3H') > -1 && cards.indexOf('4H') > -1 && cards.indexOf('5H') > -1 && rank === 123) {rank = 293; message = 'Straight Flush';}
		if (cards.indexOf('AD') > -1 && cards.indexOf('2D') > -1 && cards.indexOf('3D') > -1 && cards.indexOf('4D') > -1 && cards.indexOf('5D') > -1 && rank === 123) {rank = 293; message = 'Straight Flush';}
		if (rank === 123) {rank = rank + rankKickers(ranks, 5);} 

	}

	// Straight
	if (rank === 0) {
		if (cards.indexOf('T') > -1 && cards.indexOf('J') > -1 && cards.indexOf('Q') > -1 && cards.indexOf('K') > -1 && cards.indexOf('A') > -1) {rank = 122; }
		if (cards.indexOf('9') > -1 && cards.indexOf('T') > -1 && cards.indexOf('J') > -1 && cards.indexOf('Q') > -1 && cards.indexOf('K') > -1 && rank === 0) {rank = 121; }
		if (cards.indexOf('8') > -1 && cards.indexOf('9') > -1 && cards.indexOf('T') > -1 && cards.indexOf('J') > -1 && cards.indexOf('Q') > -1 && rank === 0) {rank = 120; }
		if (cards.indexOf('7') > -1 && cards.indexOf('8') > -1 && cards.indexOf('9') > -1 && cards.indexOf('T') > -1 && cards.indexOf('J') > -1 && rank === 0) {rank = 119; }
		if (cards.indexOf('6') > -1 && cards.indexOf('7') > -1 && cards.indexOf('8') > -1 && cards.indexOf('9') > -1 && cards.indexOf('T') > -1 && rank === 0) {rank = 118; }
		if (cards.indexOf('5') > -1 && cards.indexOf('6') > -1 && cards.indexOf('7') > -1 && cards.indexOf('8') > -1 && cards.indexOf('9') > -1 && rank === 0) {rank = 117; }
		if (cards.indexOf('4') > -1 && cards.indexOf('5') > -1 && cards.indexOf('6') > -1 && cards.indexOf('7') > -1 && cards.indexOf('8') > -1 && rank === 0) {rank = 116; }
		if (cards.indexOf('3') > -1 && cards.indexOf('4') > -1 && cards.indexOf('5') > -1 && cards.indexOf('6') > -1 && cards.indexOf('7') > -1 && rank === 0) {rank = 115; }
		if (cards.indexOf('2') > -1 && cards.indexOf('3') > -1 && cards.indexOf('4') > -1 && cards.indexOf('5') > -1 && cards.indexOf('6') > -1 && rank === 0) {rank = 114; }
		if (cards.indexOf('A') > -1 && cards.indexOf('2') > -1 && cards.indexOf('3') > -1 && cards.indexOf('4') > -1 && cards.indexOf('5') > -1 && rank === 0) {rank = 113; }
		if (rank !== 0) {
			message = 'Straight'; 
		}
	}

	// Three of a kind
	if (rank === 0) {
		if (ranks.indexOf('AAA') > -1) {rank = 112 + rankKickers(ranks.replace('AAA', ''), 2); }
		if (ranks.indexOf('KKK') > -1 && rank === 0) {rank = 111 + rankKickers(ranks.replace('KKK', ''), 2); }
		if (ranks.indexOf('QQQ') > -1 && rank === 0) {rank = 110 + rankKickers(ranks.replace('QQQ', ''), 2); }
		if (ranks.indexOf('JJJ') > -1 && rank === 0) {rank = 109 + rankKickers(ranks.replace('JJJ', ''), 2); }
		if (ranks.indexOf('TTT') > -1 && rank === 0) {rank = 108 + rankKickers(ranks.replace('TTT', ''), 2); }
		if (ranks.indexOf('999') > -1 && rank === 0) {rank = 107 + rankKickers(ranks.replace('999', ''), 2); }
		if (ranks.indexOf('888') > -1 && rank === 0) {rank = 106 + rankKickers(ranks.replace('888', ''), 2); }
		if (ranks.indexOf('777') > -1 && rank === 0) {rank = 105 + rankKickers(ranks.replace('777', ''), 2); }
		if (ranks.indexOf('666') > -1 && rank === 0) {rank = 104 + rankKickers(ranks.replace('666', ''), 2); }
		if (ranks.indexOf('555') > -1 && rank === 0) {rank = 103 + rankKickers(ranks.replace('555', ''), 2); }
		if (ranks.indexOf('444') > -1 && rank === 0) {rank = 102 + rankKickers(ranks.replace('444', ''), 2); }
		if (ranks.indexOf('333') > -1 && rank === 0) {rank = 101 + rankKickers(ranks.replace('333', ''), 2); }
		if (ranks.indexOf('222') > -1 && rank === 0) {rank = 100 + rankKickers(ranks.replace('222', ''), 2); }
		if (rank !== 0) {
			message = 'Three of a Kind'; 
		}
	}

	// Two pair
	if (rank === 0) {
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('KK') > -1) {rank = 99 + rankKickers(ranks.replace('AA', '').replace('KK', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 98 + rankKickers(ranks.replace('AA', '').replace('QQ', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 97 + rankKickers(ranks.replace('AA', '').replace('JJ', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 96 + rankKickers(ranks.replace('AA', '').replace('TT', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 95 + rankKickers(ranks.replace('AA', '').replace('99', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 94 + rankKickers(ranks.replace('AA', '').replace('88', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 93 + rankKickers(ranks.replace('AA', '').replace('77', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 92 + rankKickers(ranks.replace('AA', '').replace('66', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 91 + rankKickers(ranks.replace('AA', '').replace('55', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 90 + rankKickers(ranks.replace('AA', '').replace('44', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 89 + rankKickers(ranks.replace('AA', '').replace('33', ''), 1); }
		if (ranks.indexOf('AA') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 88 + rankKickers(ranks.replace('AA', '').replace('22', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('QQ') > -1 && rank === 0) {rank = 87 + rankKickers(ranks.replace('KK', '').replace('QQ', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 86 + rankKickers(ranks.replace('KK', '').replace('JJ', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 85 + rankKickers(ranks.replace('KK', '').replace('TT', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 84 + rankKickers(ranks.replace('KK', '').replace('99', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 83 + rankKickers(ranks.replace('KK', '').replace('88', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 82 + rankKickers(ranks.replace('KK', '').replace('77', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 81 + rankKickers(ranks.replace('KK', '').replace('66', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 80 + rankKickers(ranks.replace('KK', '').replace('55', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 79 + rankKickers(ranks.replace('KK', '').replace('44', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 78 + rankKickers(ranks.replace('KK', '').replace('33', ''), 1); }
		if (ranks.indexOf('KK') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 77 + rankKickers(ranks.replace('KK', '').replace('22', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('JJ') > -1 && rank === 0) {rank = 76 + rankKickers(ranks.replace('QQ', '').replace('JJ', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 75 + rankKickers(ranks.replace('QQ', '').replace('TT', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 74 + rankKickers(ranks.replace('QQ', '').replace('99', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 73 + rankKickers(ranks.replace('QQ', '').replace('88', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 72 + rankKickers(ranks.replace('QQ', '').replace('77', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 71 + rankKickers(ranks.replace('QQ', '').replace('66', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 70 + rankKickers(ranks.replace('QQ', '').replace('55', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 69 + rankKickers(ranks.replace('QQ', '').replace('44', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 68 + rankKickers(ranks.replace('QQ', '').replace('33', ''), 1); }
		if (ranks.indexOf('QQ') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 67 + rankKickers(ranks.replace('QQ', '').replace('22', ''), 1); }
		if (ranks.indexOf('JJ') > -1 && ranks.indexOf('TT') > -1 && rank === 0) {rank = 66 + rankKickers(ranks.replace('JJ', '').replace('TT', ''), 1); }
		if (ranks.indexOf('JJ') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 65 + rankKickers(ranks.replace('JJ', '').replace('99', ''), 1); }
		if (ranks.indexOf('JJ') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 64 + rankKickers(ranks.replace('JJ', '').replace('88', ''), 1); }
		if (ranks.indexOf('JJ') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 63 + rankKickers(ranks.replace('JJ', '').replace('77', ''), 1); }
		if (ranks.indexOf('JJ') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 62 + rankKickers(ranks.replace('JJ', '').replace('66', ''), 1); }
		if (ranks.indexOf('JJ') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 61 + rankKickers(ranks.replace('JJ', '').replace('55', ''), 1); }
		if (ranks.indexOf('JJ') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 60 + rankKickers(ranks.replace('JJ', '').replace('44', ''), 1); }
		if (ranks.indexOf('JJ') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 59 + rankKickers(ranks.replace('JJ', '').replace('33', ''), 1); }
		if (ranks.indexOf('JJ') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 58 + rankKickers(ranks.replace('JJ', '').replace('22', ''), 1); }
		if (ranks.indexOf('TT') > -1 && ranks.indexOf('99') > -1 && rank === 0) {rank = 57 + rankKickers(ranks.replace('TT', '').replace('99', ''), 1); }
		if (ranks.indexOf('TT') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 56 + rankKickers(ranks.replace('TT', '').replace('88', ''), 1); }
		if (ranks.indexOf('TT') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 55 + rankKickers(ranks.replace('TT', '').replace('77', ''), 1); }
		if (ranks.indexOf('TT') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 54 + rankKickers(ranks.replace('TT', '').replace('66', ''), 1); }
		if (ranks.indexOf('TT') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 53 + rankKickers(ranks.replace('TT', '').replace('55', ''), 1); }
		if (ranks.indexOf('TT') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 52 + rankKickers(ranks.replace('TT', '').replace('44', ''), 1); }
		if (ranks.indexOf('TT') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 51 + rankKickers(ranks.replace('TT', '').replace('33', ''), 1); }
		if (ranks.indexOf('TT') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 50 + rankKickers(ranks.replace('TT', '').replace('22', ''), 1); }
		if (ranks.indexOf('99') > -1 && ranks.indexOf('88') > -1 && rank === 0) {rank = 49 + rankKickers(ranks.replace('99', '').replace('88', ''), 1); }
		if (ranks.indexOf('99') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 48 + rankKickers(ranks.replace('99', '').replace('77', ''), 1); }
		if (ranks.indexOf('99') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 47 + rankKickers(ranks.replace('99', '').replace('66', ''), 1); }
		if (ranks.indexOf('99') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 46 + rankKickers(ranks.replace('99', '').replace('55', ''), 1); }
		if (ranks.indexOf('99') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 45 + rankKickers(ranks.replace('99', '').replace('44', ''), 1); }
		if (ranks.indexOf('99') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 44 + rankKickers(ranks.replace('99', '').replace('33', ''), 1); }
		if (ranks.indexOf('99') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 43 + rankKickers(ranks.replace('99', '').replace('22', ''), 1); }
		if (ranks.indexOf('88') > -1 && ranks.indexOf('77') > -1 && rank === 0) {rank = 42 + rankKickers(ranks.replace('88', '').replace('77', ''), 1); }
		if (ranks.indexOf('88') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 41 + rankKickers(ranks.replace('88', '').replace('66', ''), 1); }
		if (ranks.indexOf('88') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 40 + rankKickers(ranks.replace('88', '').replace('55', ''), 1); }
		if (ranks.indexOf('88') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 39 + rankKickers(ranks.replace('88', '').replace('44', ''), 1); }
		if (ranks.indexOf('88') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 38 + rankKickers(ranks.replace('88', '').replace('33', ''), 1); }
		if (ranks.indexOf('88') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 37 + rankKickers(ranks.replace('88', '').replace('22', ''), 1); }
		if (ranks.indexOf('77') > -1 && ranks.indexOf('66') > -1 && rank === 0) {rank = 36 + rankKickers(ranks.replace('77', '').replace('66', ''), 1); }
		if (ranks.indexOf('77') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 35 + rankKickers(ranks.replace('77', '').replace('55', ''), 1); }
		if (ranks.indexOf('77') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 34 + rankKickers(ranks.replace('77', '').replace('44', ''), 1); }
		if (ranks.indexOf('77') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 33 + rankKickers(ranks.replace('77', '').replace('33', ''), 1); }
		if (ranks.indexOf('77') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 32 + rankKickers(ranks.replace('77', '').replace('22', ''), 1); }
		if (ranks.indexOf('66') > -1 && ranks.indexOf('55') > -1 && rank === 0) {rank = 31 + rankKickers(ranks.replace('66', '').replace('55', ''), 1); }
		if (ranks.indexOf('66') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 30 + rankKickers(ranks.replace('66', '').replace('44', ''), 1); }
		if (ranks.indexOf('66') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 29 + rankKickers(ranks.replace('66', '').replace('33', ''), 1); }
		if (ranks.indexOf('66') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 28 + rankKickers(ranks.replace('66', '').replace('22', ''), 1); }
		if (ranks.indexOf('55') > -1 && ranks.indexOf('44') > -1 && rank === 0) {rank = 27 + rankKickers(ranks.replace('55', '').replace('44', ''), 1); }
		if (ranks.indexOf('55') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 26 + rankKickers(ranks.replace('55', '').replace('33', ''), 1); }
		if (ranks.indexOf('55') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 25 + rankKickers(ranks.replace('55', '').replace('22', ''), 1); }
		if (ranks.indexOf('44') > -1 && ranks.indexOf('33') > -1 && rank === 0) {rank = 24 + rankKickers(ranks.replace('44', '').replace('33', ''), 1); }
		if (ranks.indexOf('44') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 23 + rankKickers(ranks.replace('44', '').replace('22', ''), 1); }
		if (ranks.indexOf('33') > -1 && ranks.indexOf('22') > -1 && rank === 0) {rank = 22 + rankKickers(ranks.replace('33', '').replace('22', ''), 1); }
		if (rank !== 0) {
			message = 'Two Pair'; 
		}
	}

	// One Pair
	if (rank === 0) {
		if (ranks.indexOf('AA') > -1) {rank = 21 + rankKickers(ranks.replace('AA', ''), 3); }
		if (ranks.indexOf('KK') > -1 && rank === 0) {rank = 20 + rankKickers(ranks.replace('KK', ''), 3); }
		if (ranks.indexOf('QQ') > -1 && rank === 0) {rank = 19 + rankKickers(ranks.replace('QQ', ''), 3); }
		if (ranks.indexOf('JJ') > -1 && rank === 0) {rank = 18 + rankKickers(ranks.replace('JJ', ''), 3); }
		if (ranks.indexOf('TT') > -1 && rank === 0) {rank = 17 + rankKickers(ranks.replace('TT', ''), 3); }
		if (ranks.indexOf('99') > -1 && rank === 0) {rank = 16 + rankKickers(ranks.replace('99', ''), 3); }
		if (ranks.indexOf('88') > -1 && rank === 0) {rank = 15 + rankKickers(ranks.replace('88', ''), 3); }
		if (ranks.indexOf('77') > -1 && rank === 0) {rank = 14 + rankKickers(ranks.replace('77', ''), 3); }
		if (ranks.indexOf('66') > -1 && rank === 0) {rank = 13 + rankKickers(ranks.replace('66', ''), 3); }
		if (ranks.indexOf('55') > -1 && rank === 0) {rank = 12 + rankKickers(ranks.replace('55', ''), 3); }
		if (ranks.indexOf('44') > -1 && rank === 0) {rank = 11 + rankKickers(ranks.replace('44', ''), 3); }
		if (ranks.indexOf('33') > -1 && rank === 0) {rank = 10 + rankKickers(ranks.replace('33', ''), 3); }
		if (ranks.indexOf('22') > -1 && rank === 0) {rank = 9 + rankKickers(ranks.replace('22', ''), 3); }
		if (rank !== 0) {
			message = 'Pair'; 
		}
	}

	// High Card
	if (rank === 0) {
		if (ranks.indexOf('A') > -1) {rank = 8 + rankKickers(ranks.replace('A', ''), 4); }
		if (ranks.indexOf('K') > -1 && rank === 0) {rank = 7 + rankKickers(ranks.replace('K', ''), 4); }
		if (ranks.indexOf('Q') > -1 && rank === 0) {rank = 6 + rankKickers(ranks.replace('Q', ''), 4); }
		if (ranks.indexOf('J') > -1 && rank === 0) {rank = 5 + rankKickers(ranks.replace('J', ''), 4); }
		if (ranks.indexOf('T') > -1 && rank === 0) {rank = 4 + rankKickers(ranks.replace('T', ''), 4); }
		if (ranks.indexOf('9') > -1 && rank === 0) {rank = 3 + rankKickers(ranks.replace('9', ''), 4); }
		if (ranks.indexOf('8') > -1 && rank === 0) {rank = 2 + rankKickers(ranks.replace('8', ''), 4); }
		if (ranks.indexOf('7') > -1 && rank === 0) {rank = 1 + rankKickers(ranks.replace('7', ''), 4); }
		if (rank !== 0) {
			message = 'High Card'; 
		}
	}

	result = {
		rank: rank, 
		message: message
	};

	return result;
}

function rankKickers (ranks, noOfCards) {

	var kickerRank = 0.0000;
	var myRanks = [];
	var rank = '';

	for (var i = 0; i <= ranks.length; i += 1) {
		rank = ranks.substr(i, 1);

		if (rank === 'A') {myRanks.push(0.2048); }
		if (rank === 'K') {myRanks.push(0.1024); }
		if (rank === 'Q') {myRanks.push(0.0512); }
		if (rank === 'J') {myRanks.push(0.0256); }
		if (rank === 'T') {myRanks.push(0.0128); }
		if (rank === '9') {myRanks.push(0.0064); }
		if (rank === '8') {myRanks.push(0.0032); }
		if (rank === '7') {myRanks.push(0.0016); }
		if (rank === '6') {myRanks.push(0.0008); }
		if (rank === '5') {myRanks.push(0.0004); }
		if (rank === '4') {myRanks.push(0.0002); }
		if (rank === '3') {myRanks.push(0.0001); }
		if (rank === '2') {myRanks.push(0.0000); }
	}

	myRanks.sort(function (a, b) {
		return b - a;
	});

	for (var i = 0; i < noOfCards; i += 1) {
		kickerRank += myRanks[i];
	}

	return kickerRank;
}

function checkForAllInPlayers (game, winners) {
	var allInPlayers = [];

	for (var i = 0; i < winners.length; i += 1) {
		if (game.players[winners[i]].allIn === true) {
			allInPlayers.push(winners[i]);
		}
	}
	return allInPlayers;
}

function checkForWinner (game) {

	//Identify winner(s)
	var winners = [];
	var maxRank = 0.000;
	var part = 0;
	var prize = 0;
	var roundEnd = true;
Log('checkforwinnter-before', game);
	for (var i = 0; i < game.players.length; i += 1) {

		// only check players who are still in the game (chips!==0)
		if (game.players[i].out === false) {
			// if the rank is equal to the previous hand, its a tie
			if (game.players[i].hand.rank === maxRank && game.players[i].folded === false) {
				winners.push(i);
			}
			// if someone has a better hand, they are new sole winner, so remove the other ones
			if (game.players[i].hand.rank > maxRank && game.players[i].folded === false) {
				maxRank = game.players[i].hand.rank;
				
				// empty the winners array
				winners.splice(0, winners.length);
				winners.push(i);
			}
		}
	}

	/* pass the array of winners to see how many of them are allin
	var allInPlayers = checkForAllInPlayers(game, winners);

	if (allInPlayers.length > 0) {
		var minBets = game.players[winners[0]].roundBets;
		for (var j = 1; j < allInPlayers.length; j += 1) {
			if (game.players[winners[j]].roundBets !== 0 && game.players[winners[j]].roundBets < minBets) {
				minBets = game.players[winners[j]].roundBets;
			}
		}
		// this will be the smallest bet
		part = parseInt(minBets, 10);
	} else {
		part = parseInt(game.players[winners[0]].roundBets, 10);

	}

*/
	// the prize is just what the player has put in the round thus far
	for (var i = 0; i < game.players.length; i+= 1) {
		if (game.players[i].out === false) {
			prize += game.players[i].roundBets;
			game.players[i].roundBets = 0;
		}
	}

	for (var i = 0; i < winners.length; i += 1) {
		// split the pot if necessary
		console.log(((i === 0) ? Math.round(prize / winners.length) : Math.floor(prize / winners.length)));
		console.log('--------WHAT THE FUCK----------');
		game.players[winners[i]].chips += ((i === 0) ? Math.round(prize / winners.length) : Math.floor(prize / winners.length));
		game.AddEvent('Dealer', game.players[winners[i]].name + ' wins ' + ((i === 0) ? Math.round(prize / winners.length) : Math.floor(prize / winners.length)));
		console.log('Dealer', game.players[winners[i]].name + ' wins ' + ((i === 0) ? Math.round(prize / winners.length) : Math.floor(prize / winners.length)));
	}
Log('checkforwinnter-after', game);
	
	//for (var i = 0; i < game.players.length; i += 1) {
		//if (game.players[i].out === false) {
			//if (game.players[i].roundBets !== 0) {
				//roundEnd = false;
				//console.log('roundbets');
				//console.log(game.players[i].roundBets)
			//}
		//}
	//}

	//if (roundEnd === false) {
		//checkForWinner(game);
	//}
}

function checkForBankrupt (game) {
	for (var i = 0; i < game.players.length; i += 1) {
		if (game.players[i].chips === 0) {
			game.AddEvent('Dealer', game.players[i].name + ' has been eliminated');
			// Remove a player when they have no more chips
			game.players[i].out = true;
		}
	}
}

function moveBetsToPot (game) {
	// Move all bets to the pot
	for (var i = 0; i < game.players.length; i += 1) {
		if (game.players[i].out === false) {
			game.pot += parseInt(game.players[i].bets, 10);
			// add to the amount the player has put in during the round
			game.players[i].roundBets += parseInt(game.players[i].bets, 10);
		}

	}
}

// Sometimes we need the player ID of the other opponenet
// Takes in the ID of the player who wants to know who they are playing against
function getOtherPlayerID (game, current) {

	var id = null;

	if (getPlayerCount(game) === game.maxPlayers) {
		// if the id given is 0, return 1. If the id given is 1 return 0.
		id = (current === 0) ? 1 : 0;
	}
console.log(id);
	return id;
}

exports.Game = Game;