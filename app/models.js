var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
    db = mongoose.createConnection('localhost', 'bitflopme');


exports.Counters = db.model('Counters', new Schema({
    games : { type: Number, required: true },
    users : { type: Number, required: true },
}));

exports.Rules = db.model('Rules', new Schema({
    id : { type: Number, required: true },
    player1 : { type: String, required: true },
    player2 : { type: String, required: true },
    settings : { type: Schema.Types.Mixed, required: true }
}));

/* 
    Possible States are NEW, ONGOING, SAVED
*/
exports.Games = db.model('Games', new Schema({
    id : { type: Number, required: true },
    name: { type: String, required: true },
    password : { type: String, required: true },
    creator : { type: Schema.Types.Mixed, required: true },
    // POSSIBLE STATES ['NEW','PLAYING','FINISHED']
    state: { type: String, required: true, default: 'NEW' },
    players : [],
    created: { type: Date, required: false, default: Date.now },
    settings : { type: Schema.Types.Mixed, required: false, default: null },
    //  Contains history of the play, without chip counts, etc
    history : [],
    //  After each round of the game, we push the chip counts, etc. This will be a 2D array since a round consists of many actions, ie. call, fold, etc
    rounds : []
}));

exports.Users = db.model('Users', new Schema({
    id : { type: Number, required: true },
    username : { type: String, required: true },
    password : { type: String, required: true },
    email : { type: String, required: false },
    created: { type: Date, default: Date.now },
    reset_date: { type: Date, required: false },
    reset_token :  { type: String, required: false }
}));