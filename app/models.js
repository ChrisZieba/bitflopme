var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
    db = mongoose.createConnection('localhost', 'bitflopme');


exports.Counters = db.model('Counters', new Schema({
    games : { type: Number, required: true },
    records : { type: Number, required: true },
    users : { type: Number, required: true },
}));

/* 
    Possible States are NEW, ONGOING, SAVED
*/
exports.Games = db.model('Games', new Schema({
    id : { type: Number, required: true },
    name: { type: String, required: true },
    created: { type: Date, required: false, default: Date.now },
    creator : { type: Schema.Types.Mixed, required: true },
    // POSSIBLE STATES ['NEW','PLAYING','FINISHED']
    state: { type: String, required: true, default: 'NEW' },
    players : [],
    settings : { type: Schema.Types.Mixed, required: false, default: null },
    //  After each round of the game, we push the chip counts, etc. This will be a 2D array since a round consists of many actions, ie. call, fold, etc
    events:[],
    rounds : []
}));

exports.Records = db.model('Records', new Schema({
    id : { type: Number, required: true },
    name: { type: String, required: true },
    created: { type: Date, required: false, default: Date.now },
    creator : { type: Schema.Types.Mixed, required: true },
    players : [],
    settings : { type: Schema.Types.Mixed, required: false, default: null },
    events:[],
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