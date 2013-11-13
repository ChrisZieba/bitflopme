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
		link: function (scope, element, attrs) {

			if (getUserMedia !== null) {
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
						
						if (scope.game.ready) {
							scope.initPeerConnection();
						}
					}, function (error) {
						alert('There was an error.');
						console.log(JSON.stringify(error));
						return;
					});
				}
			}

			// weitd bug in firefox sets the height of the video container UNLESS it has controls on page load
			element.removeAttr('controls');
		}
	};
}]);

app.directive('remoteVideo', ['socket', function (socket) {
	return {
		priority: 1,
		restrict: 'A',
		link: function (scope, element, attrs) {
			if (getUserMedia !== null) {
				scope.peer.remote.element = element[0];
			}

			element.removeAttr('controls');

		}
	};
}]);

app.controller('GameCtrl', function($rootScope, $scope, $http, $timeout, socket) {

	// this will get set in adapter.js
	if (RTCPeerConnection !== null) {

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
				console.log(event);
				$scope.peer.remote.element.src = URL.createObjectURL(event.stream);
				$scope.peer.remote.element.play();
			}
		};
	}


	var playerOptions = {
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
	};

	// this gets called when both players are ready and have their webcams on
	$scope.initPeerConnection = function () {

		if (RTCPeerConnection !== null) {
			//console.log('is the game ready:'+scope.game.ready)
			// Only when both players are in the room can we start broadcasting the streams
			// this will be initiated by the second player who joins

			console.log('create offer')
			$scope.peer.connection.createOffer(function (desc) {

				$scope.peer.connection.setLocalDescription(desc);
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

	};

	$scope.peer = {
		connection: pc,
		candidates: [],
		local: {},
		remote: {},
		connected: false
	};

	$scope.room = {
		id: -1,
		players: [],
		observers: []
	};

	$scope.game = {
		//state: null,
		ready: false,
		//	Only player specific data will fill these variables
		player: {
			// this is -1 becuase if it was null it would eqaul the turn on the start of the game, 
			// thus flashing the cards beifly until the packet arrived from the server
			id: -1,
			name: null,
			chips: null,
			cards: [],
			folded: null,
			options: playerOptions
		},
		opponent: {
			id: -1,
			name: null,
			chips: null,
			folded: null,
			cards: []
		},
		events: [],
		action: null,

	};

	$scope.fn = {
		msToDateTime: function (ms) {
			var date = new Date(ms);
			return date.toLocaleString();
		},
		parseAmount: function (amount) {
			return (amount === null || typeof amount === 'undefined') ? 0 : parseInt(amount, 10);
		},
		killVideoStream: function () {
			if ($scope.peer.local.stream) {
				$scope.peer.local.stream.stop();
			}
		},
		startVideoStream: function () {
			$scope.peer.local.stream.play();
		}
	};

	$scope.action = function (name) {

		var action = {};
		action.name = name;

		$scope.game.action.turn = null;
		$scope.game.options = playerOptions;

		switch (action.name) {
			case 'BET':
				action.amount = parseInt($scope.game.player.options['BET'].amount,10);
				break;
			case 'RAISE':
				action.amount = parseInt($scope.game.player.options['RAISE'].amount,10);
				break;
			case 'FOLD':
				$scope.game.player.folded = true;
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
		});
		
	});


	socket.on('game:join', function (data) {
		console.log('game:join');
		console.log(data);

		$scope.game.events = data.events;
		$scope.room.players = data.room.players;
		$scope.room.observers = data.room.observers;

		if (data.player.id !== null) {
			if ($scope.game.player.id === -1) {
				$scope.game.player.id = data.player.id;
				$scope.game.player.name = data.user.name;
				$scope.game.ready = data.start;
			} 
		}

		//console.log('is the game ready:'+scope.game.ready)
		// Only when both players are in the room can we start broadcasting the streams
		// this will be initiated by the second player who joins
		if ($scope.game.ready) {
			$scope.initPeerConnection();
		}


	});


	socket.on('game:data', function (data) {
		console.log('game:data');
		console.log(data);

		$scope.game.events = data.events;
		$scope.game.action = data.action;
		$scope.game.player = data.player;
		$scope.game.opponent = data.opponent;

	});

	socket.on('game:end', function (data) {
		console.log('game:end');
		console.log(data);

		$scope.game.action = data.action;
		$scope.game.player = data.player;
		$scope.game.opponent = data.opponent;

	});

	socket.on('game:leave', function (data) {
		$scope.game.history = data.history;
		$scope.room.players = data.room.players;
		$scope.room.observers = data.room.observers;
console.log('game:leave' + JSON.stringify(data.room));


		if (data.action) $scope.game.action = data.action;

		if (data.player) $scope.game.player = data.player;

		if (data.opponent) $scope.game.opponent = data.opponent;

	});


	socket.on('peer:receive_candidate', function (data) {
		
		if (RTCPeerConnection !== null) {
			console.log('peer:candidate has been received');
			$scope.peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
		}

	});


	socket.on('peer:receive_offer', function (data) {

		if (RTCPeerConnection !== null) {
			console.log('peer:offer has been received');
			//$scope.peer.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));

			$scope.peer.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));
			$scope.peer.connection.createAnswer(function (desc) {
				$scope.peer.connection.setLocalDescription(desc);

				socket.emit('peer:send_answer', { 
					room: GLOBAL.ROOM,
					sdp: desc 
				}, function (res) {
					console.log(res);
				});	
			});
		}
	});

	socket.on('peer:receive_answer', function (data) {
		if (RTCPeerConnection !== null) {
			//console.log('peer:answer has been received');
			$scope.peer.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));
		}
	});


	$scope.$on('$destroy', function (event) {
		socket.destroy();
	});

});


app.directive('dropdownToggle', ['$document', function ($document) {
	var openElement = null,
		closeMenu   = angular.noop;

	return {
		restrict: 'CA',
		link: function(scope, element, attrs) {
			//scope.$watch('$location.path', function() { closeMenu(); });
			element.parent().bind('click', function() { closeMenu(); });
			element.bind('click', function (event) {

				var elementWasOpen = (element === openElement);

				event.preventDefault();
				event.stopPropagation();

				if (!!openElement) {
					closeMenu();
				}

				if (!elementWasOpen) {
					element.parent().addClass('open');
					openElement = element;
					closeMenu = function (event) {
						if (event) {
							event.preventDefault();
							event.stopPropagation();
						}
						$document.unbind('click', closeMenu);
						element.parent().removeClass('open');
						closeMenu = angular.noop;
						openElement = null;
					};
					$document.bind('click', closeMenu);
				}
			});
		}
	};
}]);
