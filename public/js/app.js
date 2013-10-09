var app = angular.module('app', ['uiSlider']);


app.factory('socket', function($rootScope) {

	var socket = io.connect(GLOBAL.URL,{
		'reconnect': true,
		'reconnection delay': 500,
		'max reconnection attempts': 10,
		'sync disconnect on unload': true
	});

	return {
		on: function(eventName, callback) {
//console.log(eventName)
			socket.on(eventName, function() {
				var args = arguments;
				$rootScope.$apply(function() {
					callback.apply(socket, args);
				})
			});
		},

		emit: function(eventName, data, callback) {

			socket.emit(eventName, data, function() {
				var args = arguments;

				$rootScope.$apply(function() {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			});
		},

		send: function(eventName, data, callback) {

			socket.send(eventName, data, function() {
				var args = arguments;
				$rootScope.$apply(function() {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			});
		},

		destroy: function () {
			socket.removeAllListeners();
		}
	}
});
/*
app.factory('rtc', function($rootScope) {
	function trace (text) {
		console.log((performance.now() / 1000).toFixed(3) + ": " + text);
	}

	return {

		call: function(scope) {

			if (scope.streams.local.stream.getVideoTracks().length > 0) {
				trace('Using video device: ' + scope.streams.local.stream.getVideoTracks()[0].label);
			}

			if (scope.streams.local.stream.getAudioTracks().length > 0) {
				trace('Using audio device: ' + scope.streams.local.stream.getAudioTracks()[0].label);
			}

			var servers = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};

			localPeerConnection = new RTCPeerConnection(servers);


			trace("Created local peer connection object localPeerConnection");
			localPeerConnection.onicecandidate = function (event) {
				if (event.candidate) {
					remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
					
				}
			}

			remotePeerConnection = new RTCPeerConnection(servers);
			trace("Created remote peer connection object remotePeerConnection");
			remotePeerConnection.onicecandidate = this.gotRemoteIceCandidate;

			remotePeerConnection.onaddstream = function (event) {
				console.log(scope.streams)
				var remoteVideo = scope.streams.remote.element;

				remoteVideo.src = URL.createObjectURL(event.stream);
				trace("Received remote stream");
			};

			localPeerConnection.addStream(scope.streams.local.stream);
			trace("Added scope.localStream to localPeerConnection");
			localPeerConnection.createOffer(this.gotLocalDescription, function () {console.log('error')});
		},


		gotLocalDescription: function (description) {
			localPeerConnection.setLocalDescription(description);
			trace("Offer from localPeerConnection: \n" + description.sdp);
			remotePeerConnection.setRemoteDescription(description);

			remotePeerConnection.createAnswer(function (description) {
				remotePeerConnection.setLocalDescription(description);
				trace("Answer from remotePeerConnection: \n" + description.sdp);
				localPeerConnection.setRemoteDescription(description);
			}, function () {});
			},

		gotRemoteDescription: function (description) {
			remotePeerConnection.setLocalDescription(description);
			trace("Answer from remotePeerConnection: \n" + description.sdp);
			localPeerConnection.setRemoteDescription(description);
		},

		hangup: function () {
			trace("Ending call");
			localPeerConnection.close();
			remotePeerConnection.close();
			localPeerConnection = null;
			remotePeerConnection = null;
			hangupButton.disabled = true;
			callButton.disabled = false;
		},

		gotRemoteIceCandidate: function (event) {
			if (event.candidate) {
				localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
				trace("Remote ICE candidate: \n " + event.candidate.candidate);
			}
		}
	}
});*/

app.directive('scrollGlue', function(){
	return {
		priority: 1,
		require: '?ngModel',
		restrict: 'A',
		link: function(scope, element, attrs, ngModel) {

			// do nothing if no ng-model
			if (!ngModel) return; 

			scope.$watch(function(){
				if (ngModel.$viewValue){
					element[0].scrollTop = element[0].scrollHeight;
				}
			});

		}
	};
});

app.directive('localVideo', ['socket', function (socket) {
	return {
		priority: 1,
		restrict: 'A',
		link: function(scope, element, attrs) {

			var localVideo = element[0];

			// check if the video is visible
			// the video becomes available when  aplayer sits
			if (localVideo) {

				getUserMedia({video: true, audio: false}, function (stream) {
					scope.peer.local.stream = stream;
					scope.peer.local.element = localVideo;
					scope.peer.connection.addStream(stream);

					localVideo.src = URL.createObjectURL(stream);
					localVideo.play();
					
				
					// Only when both players are in the room can we start broadcasting the streams
					if (scope.game.ready) {
						console.log('create offer')
						scope.peer.connection.createOffer(function (desc) {

							scope.peer.connection.setLocalDescription(desc);
							console.log('send offer');
							socket.emit('peer:send_offer', { 
								room: GLOBAL.ROOM,
								sdp: desc 
							}, function (res) {
								console.log(res);
							});
						}, null, {
							'mandatory': {
								'OfferToReceiveAudio':true, 
								'OfferToReceiveVideo':true
							}
						});
					}
				}, function (error) {
					alert(JSON.stringify(error));
					return;
				});



			}

		}
	};
}]);

app.directive('remoteVideo', ['socket', function (socket) {
	return {
		priority: 1,
		restrict: 'A',
		link: function (scope, element, attrs) {
			scope.peer.remote.element = element[0];

		}
	};
}]);


app.controller('GameCtrl', function($rootScope, $scope, $http, $timeout, socket) {

	var pc = new RTCPeerConnection({"iceServers": [{"url": "stun:stun.l.google.com:19302"}]});

	pc.onicecandidate = function (event) {
		if (event.candidate) {

			socket.emit('peer:send_candidate', { 
				room: GLOBAL.ROOM,
				candidate: event.candidate 
			}, function (res) {
				console.log(res);
			});
			
		}
	};

	pc.onaddstream = function (event) {
		if ($scope.peer.remote.element) {
			$scope.peer.remote.element.src = URL.createObjectURL(event.stream);
			$scope.peer.remote.element.play();
		}
	};


	$scope.peer = {
		connection: pc,
		candidates: [],
		local: {},
		remote: {},
		connected: false
	};

	$scope.game = {
		state: null,
		//	Only player specific data will fill these variables
		player: {
			// this is -1 becuase if it was null it would eqaul the turn on the start of the game, 
			// thus flashing the cards beifly until the packet arrived from the server
			id: -1,
			name: null,
			chips: null,
			cards: [],
			options: {
				'BET': {
					allowed: false,
					min:0,
					max:0,
					amount:0
				},
				'RAISE': {
					allowed: false,
					min:0,
					max:0,
					amount:0
				},
				'CALL': {
					allowed: false,
					amount:0
				},
				'FOLD': {
					allowed: false
				}
			},
			time: null
		},
		opponent: {
			id: -1,
			name: null,
			chips: null,
			// this defaults to the backside of the cards, but in a showdown
			// we need to see what the opponents cards are
			cards: []
		},
		events: [],
		action: null
	};




	$scope.fn = {
		msToDateTime: function (ms) {
			var date = new Date(ms);
			return date.toLocaleString();
		}
	};

	$scope.action = function (name) {

		var action = {};
		action.name = name;

		switch (action.name) {
			case 'BET':
				action.amount = parseInt($scope.game.player.options['BET'].amount,10);
				break;
			case 'RAISE':
				action.amount = parseInt($scope.game.player.options['RAISE'].amount,10);
				break;
			default:
				break;

		}
		socket.emit('player:action', {
			room: GLOBAL.ROOM,
			action: action
		}, function (res) {
			console.log(res);
		});
	}

	// the server sends the connect signal when the handshake was successful
	socket.on('connect', function (data) {
		socket.emit('join', {
			room: GLOBAL.ROOM
		}, function (res) {
			console.log(res);
		});
		
	});

	socket.on('game:join', function (data) {

		$scope.game.events = data.events;

		if (data.player.id !== null) {
			if ($scope.game.player.id === -1) {
				$scope.game.player.id = data.player.id;
				$scope.game.player.name = data.user.name;
				$scope.game.ready = data.start;
			} 
		}


	});



	socket.on('player:data', function (data) {

		console.log(data);

		$scope.game.action = data.round.actions[data.round.actions.length-1];

		var player = $scope.game.action.players[data.player.id];
		var opponent = $scope.game.action.players[data.opponent.id];

		$scope.game.player.cards = data.player.cards;
		$scope.game.player.chips = player.chips;
		$scope.game.player.action = player.action;
		$scope.game.player.folded = player.folded;
		$scope.game.player.allIn = player.allIn;
		$scope.game.player.acted = player.acted;
		$scope.game.player.blind = player.blind;
		$scope.game.player.bets = player.bets;
		$scope.game.player.out = player.out;
		$scope.game.player.options = player.options;

		$scope.game.opponent.id = opponent.id;
		$scope.game.opponent.name = opponent.name;
		$scope.game.opponent.cards = opponent.cards;
		$scope.game.opponent.chips = opponent.chips;
		$scope.game.opponent.action = opponent.action;
		$scope.game.opponent.folded = opponent.folded;
		$scope.game.opponent.allIn = opponent.allIn;
		$scope.game.opponent.acted = opponent.acted;
		$scope.game.opponent.blind = opponent.blind;
		$scope.game.opponent.bets = opponent.bets;
		$scope.game.opponent.out = opponent.out;
		$scope.game.opponent.options = opponent.options;

		
	});

	socket.on('game:data', function (data) {

		$scope.game.events = data.events;
		$scope.game.action = data.round.actions[data.round.actions.length-1];



		var player = $scope.game.action.players[$scope.game.player.id];
		var opponent = $scope.game.action.players[$scope.game.opponent.id];

		$scope.game.player.chips = player.chips;
		$scope.game.player.action = player.action;
		$scope.game.player.folded = player.folded;
		$scope.game.player.allIn = player.allIn;
		$scope.game.player.acted = player.acted;
		$scope.game.player.blind = player.blind;
		$scope.game.player.bets = player.bets;
		$scope.game.player.out = player.out;
		$scope.game.player.options = player.options;


		$scope.game.opponent.chips = opponent.chips;
		$scope.game.opponent.action = opponent.action;
		$scope.game.opponent.folded = opponent.folded;
		$scope.game.opponent.allIn = opponent.allIn;
		$scope.game.opponent.acted = opponent.acted;
		$scope.game.opponent.blind = opponent.blind;
		$scope.game.opponent.bets = opponent.bets;
		$scope.game.opponent.out = opponent.out;
		$scope.game.opponent.options = opponent.options;
		
		console.log(data);
		


	});

	// socket.on('railbird:data', function (data) {
	// 	$scope.game.player.id = data.player.id;
	// 	$scope.game.player.cards = data.player.cards;
	// 	$scope.game.opponent.id = data.opponent.id;
	// 	$scope.game.opponent.name = data.opponent.name;
	// 	$scope.game.opponent.cards = data.opponent.cards;
	// });


	socket.on('game:leave', function (data) {
		$scope.game.history = data.history;
	});


	socket.on('peer:receive_candidate', function (data) {
		console.log('peer:receieve_candidate');
		console.log(data.candidate);

		// wait until the remote description is set to use these
		//$scope.peer.candidates.push(data.candidate);
		$scope.peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));

	});


	socket.on('peer:receive_offer', function (data) {

		console.log('set remoite desc');
		//$scope.peer.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));

		$scope.peer.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));

		//if ($scope.peer.candidates.length > 0) {
			//for (var i = 0; i < $scope.peer.candidates.length; i++) {console.log(i)
				//$scope.peer.connection.addIceCandidate(new RTCIceCandidate($scope.peer.candidates[i]));
			//}
		//}

		$scope.peer.connection.createAnswer(function () {
			socket.emit('peer:send_answer', { 
				room: GLOBAL.ROOM,
				sdp: data.sdp 
			}, function (res) {
				console.log(res);
			});	
		});




	});

	socket.on('peer:receieve_answer', function (data) {
		console.log('peer:receieve_answer');

		/*if (!$scope.peer.connected) {
			if ($scope.peer.candidates.length > 0) {
				$scope.peer.connected = true;
				for (var i = 0; i < $scope.peer.candidates.length; i++) {
					$scope.peer.connection.addIceCandidate(new RTCIceCandidate($scope.peer.candidates[i]));
				}
			}
			
		}*/

		$scope.peer.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));
		
		


	});


	$scope.$on('$destroy', function (event) {
		socket.destroy();
	});





});
