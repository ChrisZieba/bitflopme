// Table Class
function Table (smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn) {
	//  The blinds amounts
	this.smallBlind = smallBlind;
	this.bigBlind = bigBlind;
	this.minPlayers = minPlayers;
	this.maxPlayers =  maxPlayers;
	this.players = [];

	this.minBuyIn = minBuyIn;
	this.maxBuyIn = maxBuyIn;
	//  Keep track of all the events so we can display in the console
	this.events = [];

	//Validate acceptable value ranges.
	var err;

	//  Require at least two players to start a game.
	if (minPlayers < 2) { 
		err = new Error(101, 'Parameter [minPlayers] must be a postive integer of a minimum value of 2.');
	} else if (maxPlayers > 10) { //hard limit of 10 players at a table.
		err = new Error(102, 'Parameter [maxPlayers] must be a positive integer less than or equal to 10.');
	} else if (minPlayers > maxPlayers) { //Without this we can never start a game!
		err = new Error(103, 'Parameter [minPlayers] must be less than or equal to [maxPlayers].');
	}

	if (err) return err;

}

function Error (vars) {
	console.log('\n');
	console.log('--------------------------------------------------');

	for (var key in vars) {
		if (vars.hasOwnProperty(key)) {
			console.log(key + ':' + JSON.stringify(vars[key]));
		}
	}

	console.log('--------------------------------------------------');
	console.log('\n');
}
// Game Class
function Game (table) {
	//  The blinds indexes, not amounts
	this.smallBlind = 0;
	this.bigBlind = 1;
	//Track the dealer position between games
	this.dealer = 0;
	// when a round can no longer continue becuase someone is allin
	this.endOfAction = false;
	// tracks if the game is over
	this.over = false;
	//	Track whos turn it is
	this.turn = 0;
	this.pot = 0;
	this.sidePot = 0;
	//Start the first round
	this.state = 'Deal';
	//bet,raise,re-raise,cap
	this.betName = 'Bet'; 
	//  Holds the bet amounts of each player via index, ie. If player0 posted small blind of 50 then bets[0] = 50
	this.bets = [];
	this.roundBets = [];
	this.deck = [];
	this.board = [];
	this.table = table; 

	fillDeck(this.deck);
}

// Player Class
function Player (userID, playerID, playerName, chips, table) {
	this.userID = userID;
	this.playerID = playerID;
	this.playerName = playerName;
	this.chips = chips;
	this.folded = false;
	this.allIn = false;
	//  Has a player acted yet
	this.acted = false;
	//Circular reference to allow reference back to parent object.
	this.table = table; 
	this.cards = [];
}

// Hand Class
function Hand (cards) {
	this.cards = cards;
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
	var i, j, tempi, tempj;
	for (i = 0; i < deck.length; i += 1) {
		j = Math.floor(Math.random() * (i + 1));
		tempi = deck[i];
		tempj = deck[j];
		deck[i] = tempj;
		deck[j] = tempi;
	}
}

function getMaxBet (bets) {
	var maxBet, i;
	maxBet = 0;
	for (i = 0; i < bets.length; i += 1) {
		if (bets[i] > maxBet) {
			maxBet = bets[i];
		}
	}
	return maxBet;
}

function checkForEndOfRound (table) {
	var endOfRound = true;
	var maxBet = getMaxBet(table.game.bets);
	var playersInRound = 0;

	// For each player, check if they are still in the hand
	for (var i = 0; i < table.players.length; i += 1) {
		if (table.players[i].folded === false) {
			playersInRound += 1;
			// If the player has not acted yet OR they have not matched the highest bet yet
			if (table.players[i].acted === false || table.game.bets[i] !== maxBet) {
				if (table.players[i].allIn === false) {
					endOfRound = false;
				}
			}
		} 
	}

	// Since the blinds positions are mixed in heads up (dealer is small blind and first to act)
	// we need to check if the small blind folded, leaving only one player. This also checks if a
	// player decides t ofold their hand when a check is available.
	if (playersInRound === 1) {
		endOfRound = true;
	}

	return endOfRound;
}

// See if the game can continue
// Example: A player is allin, therefore action can not contine to the next round
function checkForEndOfAction (table) {
	var endOfAction = true;
	var playersWithChips = 0;

	// If at least two players still have chips we can continue
	for (var i = 0; i < table.players.length; i += 1) {
		if (table.players[i].chips !== 0) {
			playersWithChips += 1;
		} 
	}

	if (playersWithChips > 1) {
		endOfAction = false;
	}

	return endOfAction;
}

// How many players have not yet folded
function playersInRound (table) {
	var enoughPlayersInRound = true;
	var playersInRound = 0;

	// For each player, check if they are still in the hand
	for (var i = 0; i < table.players.length; i += 1) {
		if (table.players[i].folded === false) {
			playersInRound += 1;
		}
	}

	return playersInRound;
}

function checkForEnoughPlayersInGame (table) {
	var enoughPlayersInGame = true;

	if (table.players.length < table.minPlayers) {
		enoughPlayersInGame = false;
	}

	return enoughPlayersInGame;
}

function checkForAllInPlayer (table, winners) {
	var allInPlayer = [];

	for (var i = 0; i < winners.length; i += 1) {
		if (table.players[winners[i]].allIn === true) {
			allInPlayer.push(winners[i]);
		}
	}
	return allInPlayer;
}

function checkForWinner (table) {
	var i, j, k, l, maxRank, winners, part, prize, allInPlayer, minBets, roundEnd;
	//Identify winner(s)
	winners = [];
	maxRank = 0.000;

	for (k = 0; k < table.players.length; k += 1) {
		if (table.players[k].hand.rank === maxRank && table.players[k].folded === false) {
			winners.push(k);
		}
		if (table.players[k].hand.rank > maxRank && table.players[k].folded === false) {
			maxRank = table.players[k].hand.rank;
			winners.splice(0, winners.length);
			winners.push(k);
		}
	}

	part = 0;
	prize = 0;
	allInPlayer = checkForAllInPlayer(table, winners);

	if (allInPlayer.length > 0) {
		minBets = table.game.roundBets[winners[0]];
		for (j = 1; j < allInPlayer.length; j += 1) {
			if (table.game.roundBets[winners[j]] !== 0 && table.game.roundBets[winners[j]] < minBets) {
				minBets = table.game.roundBets[winners[j]];
			}
		}
		part = parseInt(minBets, 10);
	} else {
		part = parseInt(table.game.roundBets[winners[0]], 10);

	}

	for (l = 0; l < table.game.roundBets.length; l += 1) {
		if (table.game.roundBets[l] > part) {
			prize += part;
			table.game.roundBets[l] -= part;
		} else {
			prize += table.game.roundBets[l];
			table.game.roundBets[l] = 0;
		}
	}

	for (i = 0; i < winners.length; i += 1) {
		table.players[winners[i]].chips += prize / winners.length;

		if (table.game.roundBets[winners[i]] === 0) {
			table.players[winners[i]].folded = true;
		}

		table.AddEvent('Dealer', table.players[winners[i]].playerName + ' wins !!');
	}

	roundEnd = true;

	for (l = 0; l < table.game.roundBets.length; l += 1) {
		if (table.game.roundBets[l] !== 0) {
			roundEnd = false;
		}
	}
	if (roundEnd === false) {
		checkForWinner(table);
	}
}

function checkForBankrupt (table) {
	for (var i = 0; i < table.players.length; i += 1) {
		if (table.players[i].chips === 0) {
			table.AddEvent('Dealer', table.players[i].playerName + ' has been elinated');
			// Remove a player when they have no more chips
			table.players.splice(i, 1);
		}
	}
}



function rankHands(hands) {
	var x, myResult;

	for (x = 0; x < hands.length; x += 1) {
		myResult = rankHandInt(hands[x]);
		hands[x].rank = myResult.rank;
		hands[x].message = myResult.message;
	}

	return hands;
}

function sortNumber (a, b) {
	return b - a;
}

function Result (rank, message) {
	this.rank = rank;
	this.message = message;
}

function rankKickers (ranks, noOfCards) {
	var i, kickerRank, myRanks, rank;

	kickerRank = 0.0000;
	myRanks = [];
	rank = '';

	for (i = 0; i <= ranks.length; i += 1) {
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

	myRanks.sort(sortNumber);

	for (i = 0; i < noOfCards; i += 1) {
		kickerRank += myRanks[i];
	}

	return kickerRank;
}

function rankHandInt (hand) {
	var rank, message, handRanks, handSuits, ranks, suits, cards, result, i;

	rank = 0.0000;
	message = '';
	handRanks = [];
	handSuits = [];

	for (i = 0; i < hand.cards.length; i += 1) {
		// number
		handRanks[i] = hand.cards[i].substr(0, 1);
		// suit
		handSuits[i] = hand.cards[i].substr(1, 1);
	}

	ranks = handRanks.sort().toString().replace(/\W/g, "");
	suits = handSuits.sort().toString().replace(/\W/g, "");
	cards = hand.cards.toString();

	//Four of a kind
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
		if (rank !== 0) {message = 'Four of a kind'; }
	}

	//Full House
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
		if (rank !== 0) {message = 'Full House'; }
	}

	//Flush
	if (rank === 0) {
		if (suits.indexOf('CCCCC') > -1 || suits.indexOf('DDDDD') > -1 || suits.indexOf('HHHHH') > -1 || suits.indexOf('SSSSS') > -1) {rank = 123; message = 'Flush';}

		//Straight flush
		if (cards.indexOf('TC') > -1 && cards.indexOf('JC') > -1 && cards.indexOf('QC') > -1 && cards.indexOf('KC') > -1 && cards.indexOf('AC') > -1 && rank === 123) {rank = 302; message = 'Straight Flush';}
		if (cards.indexOf('TD') > -1 && cards.indexOf('JD') > -1 && cards.indexOf('QD') > -1 && cards.indexOf('KD') > -1 && cards.indexOf('AD') > -1 && rank === 123) {rank = 302; message = 'Straight Flush';}
		if (cards.indexOf('TH') > -1 && cards.indexOf('JH') > -1 && cards.indexOf('QH') > -1 && cards.indexOf('KH') > -1 && cards.indexOf('AH') > -1 && rank === 123) {rank = 302; message = 'Straight Flush';}
		if (cards.indexOf('TS') > -1 && cards.indexOf('JS') > -1 && cards.indexOf('QS') > -1 && cards.indexOf('KS') > -1 && cards.indexOf('AS') > -1 && rank === 123) {rank = 302; message = 'Straight Flush';}
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

	//Straight
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
		if (rank !== 0) {message = 'Straight'; }
	}

	//Three of a kind
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
		if (rank !== 0) {message = 'Three of a Kind'; }
	}

	//Two pair
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
		if (rank !== 0) {message = 'Two Pair'; }
	}

	//One Pair
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
		if (rank !== 0) {message = 'Pair'; }
	}

	//High Card
	if (rank === 0) {
		if (ranks.indexOf('A') > -1) {rank = 8 + rankKickers(ranks.replace('A', ''), 4); }
		if (ranks.indexOf('K') > -1 && rank === 0) {rank = 7 + rankKickers(ranks.replace('K', ''), 4); }
		if (ranks.indexOf('Q') > -1 && rank === 0) {rank = 6 + rankKickers(ranks.replace('Q', ''), 4); }
		if (ranks.indexOf('J') > -1 && rank === 0) {rank = 5 + rankKickers(ranks.replace('J', ''), 4); }
		if (ranks.indexOf('T') > -1 && rank === 0) {rank = 4 + rankKickers(ranks.replace('T', ''), 4); }
		if (ranks.indexOf('9') > -1 && rank === 0) {rank = 3 + rankKickers(ranks.replace('9', ''), 4); }
		if (ranks.indexOf('8') > -1 && rank === 0) {rank = 2 + rankKickers(ranks.replace('8', ''), 4); }
		if (ranks.indexOf('7') > -1 && rank === 0) {rank = 1 + rankKickers(ranks.replace('7', ''), 4); }
		if (rank !== 0) {message = 'High Card'; }
	}

	result = new Result(rank, message);

	return result;
}

function rankHand (hand) {
	var myResult = rankHandInt(hand);
	hand.rank = myResult.rank;
	hand.message = myResult.message;

	return hand;
}

function updateTurn (table, dealer) {

	if (table.game) {
	
		if (typeof dealer !== 'undefined') {
			table.game.turn = dealer + 1;
		} else {
			table.game.turn += 1;
		}

		if (table.game.turn >= table.players.length) {
			table.game.turn -= table.players.length;
		}

		// if a dealer position is passed in, then we want to reset the turn to whoever is set to after the button
	}

}

//	This gets called when a new round is started. ie. after a showdown
Table.prototype.initNewRound = function () {

	// If we still have enough players start a new round
	if (checkForEnoughPlayersInGame(this) === true) {
		//	Move the button
		this.game.dealer += 1;

		if (this.game.dealer >= this.players.length) {
			this.game.dealer = 0;
		}



		this.game.pot = 0;
		this.game.state = 'Deal'; //Start the first round
		this.game.betName = 'Bet'; //bet,raise,re-raise,cap
		this.game.bets.splice(0, this.game.bets.length);
		this.game.deck.splice(0, this.game.deck.length);
		this.game.board.splice(0, this.game.board.length);

		for (var i = 0; i < this.players.length; i += 1) {
			this.players[i].folded = false;
			this.players[i].acted = false;
			this.players[i].allIn = false;
			this.players[i].cards.splice(0, this.players[i].cards.length);
		}

		fillDeck(this.game.deck);
		this.NewRound();
	} else {
		// game over
		this.AddEvent('Dealer', 'Game is over');
		this.game.over = true;
	}

};

Table.prototype.StartGame = function () {
	//If there is no current game and we have enough players, start a new game.
	if (!this.game && this.players.length >= this.minPlayers) {
		this.game = new Game(this);
		this.AddEvent('Dealer','Start Game');
		this.NewRound();
	}
};

Table.prototype.AddPlayer = function (userID, playerID, playerName, chips) {
	if (this.players.length < this.maxPlayers && chips >= this.minBuyIn && chips <= this.maxBuyIn) {
		var player = new Player(userID, playerID, playerName, chips, this);
		this.players.push(player);
	}
};

Table.prototype.AddEvent = function (name, event) {

	this.events.push({
		time: Date.now(), 
		name: name,
		event: event
	});


};

// Attempt to move the game along to the next round
// This gets called after each player makes a move or a new player is added
Game.prototype.Progress = function () {
	var cards, hand;

	if (this.table.game) {

		if (checkForEndOfRound(this.table) === true) {
			var maxBet = getMaxBet(this.table.game.bets);

			// Need to give back any leftovers to players who made bets and opponents could not afford to call the full amount
			/*
			for (var i = 0; i < this.table.game.bets.length; i += 1) {
				// the player did not have enough to call the full amount
				if (this.table.game.bets[i] !== maxBet) {
					// add to a sidepot
					this.table.game.sidePot += maxBet - this.table.game.bets[i];
				}
			}

			if (this.table.game.sidePot !== 0) {
				for (var i = 0; i < this.table.game.bets.length; i += 1) {
					// the player did not have enough to call the full amount
					if (this.table.game.bets[i] === maxBet) {
						// give him back his chips
						this.table.game.bets[i] -= this.table.game.sidePot;
					}
				}

				this.table.game.sidePot = 0;
			}*/

			// Move all roundBets to the pot
			for (var i = 0; i < this.table.game.bets.length; i += 1) {
				this.table.game.pot += parseInt(this.table.game.bets[i], 10);
				this.table.game.roundBets[i] += parseInt(this.table.game.bets[i], 10);
			}

Error({
	progress:'',
	pot: this.table.game.pot,
	bets: this.table.game.bets,
	potfn: this.table.game.Pot(),
	sidepot: this.table.game.sidePot
})
			// if theres only person left at the end of the round
			if (playersInRound(this.table) === 1) {
				// If we get here there is only one player left in the hand (all else folded) so give them the chips
				for (var i = 0; i < this.table.players.length; i += 1) {
					if (this.table.players[i].folded === false) {
						// The reason to use the Pot() method here is because the blinds might have been pulled in yet
						this.table.players[i].chips += this.table.game.pot;
						this.table.AddEvent('Dealer', '** Hand Over **' + this.table.players[i].playerName + ' wins ' + this.table.game.pot);
					}
				}
				
				this.table.game.bets.splice(0, this.table.game.bets.length);
				this.table.game.turn = null;
				this.table.initNewRound();

			} else if (this.table.game.state === 'River') {
				this.table.game.state = 'Showdown';
				this.table.AddEvent('Dealer', '** Showdown **');
				this.table.game.bets.splice(0, this.table.game.bets.length);
				// set this to null since no more actions are taken by players after ther river card is played out
				this.table.game.turn = null;

				//Evaluate each hand
				for (var j = 0; j < this.table.players.length; j += 1) {
					cards = this.table.players[j].cards.concat(this.table.game.board);
					hand = new Hand(cards);
					this.table.players[j].hand = rankHand(hand);
				}

				checkForWinner(this.table);
				checkForBankrupt(this.table);

				// If we still have enough players start a new round
				// checkforBankrupt removes any players that have no chips left
				this.table.initNewRound();

			} else if (this.table.game.state === 'Turn') {
				this.table.game.state = 'River';
				this.table.AddEvent('Dealer', 'Dealing river card');
				this.table.game.deck.pop(); //Burn a card
				this.table.game.board.push(this.table.game.deck.pop()); //Turn a card
				updateTurn(this.table, this.table.game.dealer);

				for (var i = 0; i < this.table.game.bets.length; i += 1) {
					this.table.game.bets[i] = 0;
				}
				
				for (var i = 0; i < this.table.players.length; i += 1) {
					this.table.players[i].acted = false;
				}

				// if the game can not go any further, ie. a player is allin
				this.table.game.endOfAction = checkForEndOfAction(this.table);

			} else if (this.table.game.state === 'Flop') {

				this.table.game.state = 'Turn';
				this.table.AddEvent('Dealer', 'Dealing turn card');
				this.table.game.deck.pop(); //Burn a card
				this.table.game.board.push(this.table.game.deck.pop()); //Turn a card
				updateTurn(this.table, this.table.game.dealer);

				for (var i = 0; i < this.table.game.bets.length; i += 1) {
					this.table.game.bets[i] = 0;
				}

				for (var i = 0; i < this.table.players.length; i += 1) {
					this.table.players[i].acted = false;
				}

				// if the game can not go any further, ie. a player is allin
				this.table.game.endOfAction = checkForEndOfAction(this.table);

			//  On the start of the game this is where we begin
			} else if (this.table.game.state === 'Deal') {
				this.table.game.state = 'Flop';
				this.table.AddEvent('Dealer', 'Dealing flop');
				this.table.game.deck.pop(); //Burn a card
				// Set the turn to the first position after the dealer
				updateTurn(this.table, this.table.game.dealer);


				for (var i = 0; i < 3; i += 1) { //Turn three cards
					this.table.game.board.push(this.table.game.deck.pop());
				}

				for (var i = 0; i < this.table.game.bets.length; i += 1) {
					this.table.game.bets[i] = 0;
				}
				for (var i = 0; i < this.table.players.length; i += 1) {
					this.table.players[i].acted = false;
				}

				// if the game can not go any further, ie. a player is allin
				this.table.game.endOfAction = checkForEndOfAction(this.table);
			} 
		}
	}
};

// Returns the summation of all the bets currently active
Game.prototype.Pot = function () {

	// 
	var pot = this.pot;

	//Move all bets to the pot
	for (i = 0; i < this.bets.length; i += 1) {
		pot += parseInt(this.bets[i], 10);
	}

	return pot;
};


Table.prototype.NewRound = function() {
	var smallBlind, bigBlind;

	this.AddEvent('Dealer','Starting new round');
	this.AddEvent('Dealer','Dealing hold cards');

	//Deal 2 cards to each player
	for (var i = 0; i < this.players.length; i += 1) {
		this.players[i].cards.push(this.game.deck.pop());
		this.players[i].cards.push(this.game.deck.pop());
		this.game.bets[i] = 0;
		this.game.roundBets[i] = 0;

	}

	//  Identify Small and Big Blind player indexes
	if (this.players.length === 2) {
		this.game.smallBlind = this.game.dealer;
	} else {
		this.game.smallBlind = this.game.dealer + 1;
	}
	
	if (this.game.smallBlind >= this.players.length) {
		this.game.smallBlind = 0;
	}

	if (this.players.length === 2) {
		this.game.bigBlind = this.game.dealer + 1;
	} else {
		this.game.bigBlind = this.game.dealer + 2;
	}
	
	if (this.game.bigBlind >= this.players.length) {
		this.game.bigBlind -= this.players.length;
	}

	//	Set whos turn it is
	// Heads up has different blinds positions (sb=dealer and acts first at the start)
	if (this.players.length === 2) {
		this.game.turn = this.game.dealer;
	} else {
		this.game.turn = this.game.dealer + 3;
	}

	if (this.game.turn > this.players.length) {
		this.game.turn -= this.players.length;
	}


	//Force Blind Bets
	this.players[this.game.smallBlind].chips -= this.smallBlind;
	this.AddEvent(this.players[this.game.smallBlind].playerName, 'small blind of ' + this.smallBlind);
	this.players[this.game.bigBlind].chips -= this.bigBlind;
	this.AddEvent(this.players[this.game.bigBlind].playerName, 'big blind of ' + this.bigBlind);
	this.game.bets[this.game.smallBlind] = this.smallBlind;
	this.game.bets[this.game.bigBlind] = this.bigBlind;

};

//  Returns an array or the possible plays a player has [call,raise,re-raise,check,fold,allin]
Player.prototype.Options = function() {
	
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
	if (this.table.game.turn === this.playerID) {

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
			
			var maxBet = getMaxBet(this.table.game.bets);
			var callAmount = Math.min(maxBet - this.table.game.bets[this.playerID], this.chips);

Error({
	callamount: callAmount,
	maxbet: maxBet,
	player_bets: this.table.game.bets[this.playerID],
	bets: this.table.game.bets
})
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
				min:this.table.bigBlind,
				max: this.chips,
				amount:this.table.bigBlind
			}
		} 

		if (this.canRaise()) {

			var maxBet = getMaxBet(this.table.game.bets);

			options['RAISE'] = {
				allowed: true,
				name: "RAISE",
				min: maxBet,
				max: this.chips,
				amount: maxBet
			}
		} 

	}


	return options;

};

Player.prototype.canCheck = function() {
	// A check is allowed if all bets in the pot are equal
	return this.table.game.bets.every(function(v, i, a) {
		// first item: nothing to compare with (and, single element arrays should return true)
		// otherwise:  compare current value to previous value
		return i === 0 || v === a[i - 1];
	});

};

Player.prototype.canBet = function() {

	var canBet = true;

	// A player can make a bet if no other bets are active. Otherwise it would be a raise.
	for (var i = 0; i < this.table.game.bets.length; i += 1) {
		if (this.table.game.bets[i] !== 0) {
			canBet = false;
		}
	}
	
	return canBet;
};

Player.prototype.canRaise = function() {

	var maxBet = getMaxBet(this.table.game.bets);
	var bet = this.table.game.bets[this.playerID];


	// Can raise if a bet has been made to the pot
	// raise. The player will be given an opportunity to raise if his bet is
	// lower than the highest bet on the table or if he did not yet talk in this
	// betting round (for instance if he payed the big blind or a late blind).
	return (maxBet != 0 && this.chips > maxBet && (this.acted == false || bet < maxBet ));
};

Player.prototype.canCall = function() {

	var canCheck = this.canCheck();

	// as long as a player has one chip, and there is a bet in the pot, they can make a call
	return (this.chips > 0 && canCheck == false);
};

Player.prototype.canFold = function() {
	// A player can fold at any stage during the game, if it's their turn of course
	return true

}

Player.prototype.Check = function() {

	for (var i = 0; i < this.table.players.length; i += 1) {
		if (this === this.table.players[i]) {
			// Only set this to 0 if not checking on the big blind
			if (this.table.game.bigBlind !== this.playerID) {
				this.table.game.bets[i] = 0;
			}
			this.acted = true;
		}
	}

	updateTurn(this.table);
	//Attemp to progress the game
	this.table.game.Progress();

};

Player.prototype.Bet = function (bet) {


	for (var i = 0; i < this.table.players.length; i += 1) {
		if (this === this.table.players[i]) {
			this.table.game.bets[i] += bet;
			this.table.players[i].chips -= bet;
			this.acted = true;
		}
	}

Error({
	bet:bet,
	bets:this.table.game.bets
})
	updateTurn(this.table);

	//Attemp to progress the game
	this.table.game.Progress();
	this.table.game.betName = 'Bet';


	
};

Player.prototype.Raise = function (bet) {

	// check to see if the raise is an allin
	for (var i = 0; i < this.table.players.length; i += 1) {
		if (this === this.table.players[i]) {
			if (this.table.players[i].chips === bet) {
				this.table.game.bets[i] += this.table.players[i].chips;
				this.table.players[i].chips = 0;
				this.allIn = true;
				
			} else {
				this.table.game.bets[i] += bet;
				this.table.players[i].chips -= bet;
			}

			this.acted = true;
		}
	}

	updateTurn(this.table);
	this.table.game.Progress();
	this.table.game.betName = 'Raise';
};


Player.prototype.Call = function() {
	var maxBet = getMaxBet(this.table.game.bets);

	
	//Match the highest bet
	for (var i = 0; i < this.table.players.length; i += 1) {
		if (this === this.table.players[i]) {
			if (this.table.game.bets[i] >= 0) {
				this.chips += this.table.game.bets[i];
			}

			if (this.chips > maxBet) {
				this.chips -= maxBet;
				this.table.game.bets[i] = maxBet;
				this.acted = true;
			} else {
				// the player is forced allin with the call
				this.table.game.bets[i] = this.chips;

				this.chips = 0;
				this.allIn = true;
				this.acted = true;
				
			}

		}
	}
	this.table.game.betName = 'Bet';


	updateTurn(this.table);
	//Attemp to move the game along
	this.table.game.Progress();


};

Player.prototype.AllIn = function() {
	var i;
	for (i = 0; i < this.table.players.length; i += 1) {
		if (this === this.table.players[i]) {
			if (this.table.players[i].chips !== 0) {
				this.table.game.bets[i] += this.table.players[i].chips;
				this.table.players[i].chips = 0;

				this.allIn = true;
				this.acted = true;
			}
		}
	}
	this.table.game.betName = 'Allin';
	updateTurn(this.table);
	//Attemp to progress the game
	this.table.game.Progress();

};

Player.prototype.Fold = function() {

	//Move any current bet into the pot
	for (var i = 0; i < this.table.players.length; i += 1) {
		if (this === this.table.players[i]) {
			var bet = parseInt(this.table.game.bets[i], 10);
			this.table.game.bets[i] = 0;
			// Move any bet the player has to the pot
			this.table.game.pot += bet;
			this.acted = true;
			//Mark the player as folded
			this.folded = true;

	Error({
		fold: '',
		chips: this.chips,
		bets: this.table.game.bets,
		pot: this.table.game.pot
		
	})
		}
	}


	updateTurn(this.table);
	//Attemp to progress the game
	this.table.game.Progress();
};

exports.Table = Table;