db.sessions.remove();
db.counters.remove();
db.users.remove();
db.games.remove();
db.dropDatabase();


db.counters.insert({
    "games":54321,
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
    "id" : 54321,
    "creator" : {
        "name" : "ziebac",
        "id" : 1
    },
    "password" : "walks",
    "name" : "jesus",
    "rounds" : [],
    "events" : [],
    "settings": {
        "smallBlind": 50,
        "bigBlind": 100,
        "minPlayers": 2,
        "maxPlayers": 2,
        "minBuyIn": 100,
        "maxBuyIn": 1000,
        "timer": {
            "call": 30
        }
    },


    "created" : Date.now(),
    //  Once a game has started the players do not change
    "players" : [
        {
            "name" : "ziebac",
            "id" : 1
        },
        {
            "id" : 2,
            "name" : "tony"
        }
    ],
    "state" : "NEW",
});