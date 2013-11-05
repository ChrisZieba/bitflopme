var poker = require('../../app/lib/headsup');

var game = new poker.Game(50,100,10000,10000);

game.AddPlayer(0, 'zieba',10000);
game.AddPlayer(1, 'tony',10000);

/* change the players cards
game.players[0].cards = ['2C','3H'];
game.players[0].chips = 0;
game.players[0].allin = true;
game.players[0].acted = true;
game.players[0].folded = false;
game.players[0].bets = 0;
game.players[0].roundBets = 10000;

game.players[1].cards = ['4C','5H'];
game.players[1].chips = 0;
game.players[1].allin = true;
game.players[1].acted = true;
game.players[1].folded = false;
game.players[1].bets = 0;
game.players[1].roundBets = 10000;
*/

game.Start();


game.players[0].Raise(9950);
game.Progress();
game.players[1].Call();
game.Progress();
game.Progress();
game.Progress();

game.players[0].cards = ['7D','7S'];
game.players[1].cards = ['TC','5H'];
game.board = ['7C','8C','9C','6C','7H'];

game.Progress();









