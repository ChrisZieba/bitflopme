db.sessions.remove();
db.counters.remove();
db.users.remove();
db.games.remove();
db.dropDatabase();


db.counters.insert({
    "games":1,
    "users":3
});

db.users.insert({
    "id" : 1,
    "username": "ziebac",
    "password": "$2a$10$bVC3rDN834S4P4yFXG7kn..HTxXEt76AsuGY.JVbNZj4Q7KbnX2Ry",
    "created": Date.now()
});

db.users.insert({
    "id" : 2,
    "username": "tony",
    "password": "$2a$10$bVC3rDN834S4P4yFXG7kn..HTxXEt76AsuGY.JVbNZj4Q7KbnX2Ry",
    "created": Date.now()
});

db.users.insert({
    "id" : 3,
    "username": "random",
    "password": "$2a$10$bVC3rDN834S4P4yFXG7kn..HTxXEt76AsuGY.JVbNZj4Q7KbnX2Ry",
    "created": Date.now()
});

db.games.insert({
    "id" : 1,
    "created" : Date.now(),
    "creator" : {
        "name" : "ziebac",
        "id" : 1
    },
    "rounds" : [],
    "events" : [],
    "settings": {
        "smallBlind": '50',
        "bigBlind": '100',
        "chipStack": '10000',
        "timer": '0',
        "level": '0'
    },
    //  Once a game has started the players do not change
    "players" : [
        {
            "name" : "ziebac",
            // this is the userID from the database, not the playerID given when a game is started
            "id" : 1
        }
    ],
    // [new,playing,end]
    "state" : "NEW",
});