var app = angular.module('app', ['uiSlider', 'ui.bootstrap']);


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


app.directive('collapse', [function () {

	return {
		link: function(scope, element, attrs) {

			var isCollapsed;

			scope.$watch(attrs.collapse, function(value) {
				if (value) {
					collapse();
				} else {
					expand();
				}
			});
		  
			var expand = function() {
				element.addClass('in');
				isCollapsed = false;
			};
		  
			var collapse = function() {
				isCollapsed = true;
				element.removeClass('in');
			};
		}
	};
}]);

app.filter('reverse', function() {
	return function(items) {
		return items.slice().reverse();
	};
});

app.directive('scrollGlue', function(){
	return {
		priority: 1,
		require: '?ngModel',
		restrict: 'A',
		link: function(scope, element, attrs, ngModel) {

			// do nothing if no ng-model
			if (!ngModel) return; 

			// when the event history changes
			scope.$watch(function(){
				if (ngModel.$viewValue){
					element[0].scrollTop = element[0].scrollHeight + 1000;
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

			scope.peer.local.element = element[0];

			if (getUserMedia !== null) {
				var localVideo = element[0];

				// check if the video is visible
				// the video becomes available when a player sits
				if (localVideo) {
					// weitd bug in firefox sets the height of the video container UNLESS it has controls on page load
					element.removeAttr('controls');

					getUserMedia({video: true, audio: true}, function (stream) {
						scope.peer.local.stream = stream;

						if (RTCPeerConnection !== null) {
							scope.peer.connection.addStream(stream);
						}

						localVideo.src = URL.createObjectURL(stream);
						localVideo.play();

						// add the vide/audio dropdowns
						scope.media.available = true;
						scope.media.video = true;
						scope.media.audio = true;

						scope.$apply();
						// on a page refresh this gets called before the server sends back that the game is ready
						if (RTCPeerConnection !== null) {
							socket.emit('peer:ready', { 
								room: GLOBAL.ROOM
							});
						}

					}, function (error) {
						alert('There was an error connecting your webcam. Make sure it is not being used by any other applications.');
						return;
					});


				}
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

			if (getUserMedia !== null) {
				var remoteVideo = element[0];

				// check if the video is visible
				// the video becomes available when a player sits
				if (remoteVideo) {
					element.removeAttr('controls');
				}

				// watch to see if the player disconnects remove the stream
				scope.$watch('game.opponent.name', function (name) {
					if (!name) {
						if (scope.peer.remote.stream) {
							element.attr('src', '/img/webcam.png');

							if (scope.peer.connection && scope.peer.connection.removeStream) {
								scope.peer.connection.removeStream(scope.peer.remote.stream);
							}

							if (scope.peer.remote.stream.stop) {
								scope.peer.remote.stream.stop();
							}
						}


					}

				});
			}

		}
	};
}]);

app.directive('sendChatMsg', ['socket', function (socket) {
	return function (scope, element, attrs) {
		element.bind("keydown keypress", function (event) {
			if (event.which === 13) {
				scope.$apply(function () {
					if (scope.chat.msg.trim() !== "" || scope.chat.msg !== null) {
						socket.emit('chat:msg', { 
							room: GLOBAL.ROOM,
							msg: scope.chat.msg
						});
						scope.chat.msg = null;
					}
				});
				event.preventDefault();
			}
		});
	};
}]);

// Handle illegal character input

app.directive('betAmount', [function () {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function (scope, elem , attrs, ctrl) {
			scope.$watch(attrs.ngModel, function (amount, old) {
				amount = parseInt(amount,10);
				var type = attrs.name.toUpperCase();
				var nan = isNaN(amount);

				if (nan) {
					return;
				}

				if (amount >= scope.game.player.options[type].min && amount <= scope.game.player.options[type].max) {
					scope.game.player.options[type].amount = amount;
				} 

				return;

			});
		}
	};
}]);

app.controller('GameOverCtrl', function($rootScope, $scope, $http, $timeout, $modalInstance) {
	$scope.ok = function () {
		$modalInstance.close('ok');
	};
});

app.controller('InvitePlayerCtrl', function($rootScope, $scope, $http, $timeout, $modalInstance) {
	$scope.ok = function () {
		$modalInstance.close('ok');
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};

	$scope.share = function (id) {
		var text = "Anyone%20up%20to%20play%20some%20webcam%20poker%3F%20via%20%40bitflopme";
		var url = "https%3A%2F%2Fbitflop.me%2Fgame%2Fplay%2F" + id;
		var opts = 'status=1' +
			',width=575' +
			',height=375' +
			',toolbar=no' +
			',location=no' +
			',status=no' +
			',menubar=no' +
			',scrollbars=no' +
			',resizeable=yes' +
			',top=' + Math.floor((window.innerHeight - 400)  / 2)  +
			',left=' + Math.floor((window.innerWidth  - 575)  / 2
		);

		window.open("https://twitter.com/share?text=" + text + "&url=" + url, "Share", opts);
		return false;
	}
});

app.controller('GameCtrl', function($rootScope, $scope, $http, $timeout, $modal, socket) {

	var CANDIDATE_RETRY = 0;

	function waitUntilRemoteStreamStartsFlowing () {
		console.log('readyState'+ $scope.peer.remote.element.readyState);//0
		console.log('HAVE_CURRENT_DATA'+ HTMLMediaElement.HAVE_CURRENT_DATA);//2
		console.log('paused'+ $scope.peer.remote.element.paused);//true
		console.log('currenttime'+ $scope.peer.remote.element.currentTime);//0

		// (! (0 <= 2 || true || 0 <= 0) )
		if (! ($scope.peer.remote.element.readyState <= HTMLMediaElement.HAVE_CURRENT_DATA || 
			$scope.peer.remote.element.paused || $scope.peer.remote.element.currentTime <= 0)) {
		} else {
			setTimeout(waitUntilRemoteStreamStartsFlowing, 200);
		}
	}

	function createAnswer () {

		console.log('5. creating answer to be sent');

		
		$scope.peer.connection.createAnswer(function (desc) {
			$scope.peer.connection.setLocalDescription(desc);

			socket.emit('peer:send_answer', { 
				room: GLOBAL.ROOM,
				sdp: desc 
			});	

			console.log('6. answer has been sent to other player');
			console.log('7. add ice candidates');
			//addIceCandidates();

		});



	}

	function addIceCandidates () {
		
		console.log('TRYING to add ice candidates');

		if ($scope.peer.candidates.length !== 0) {
			CANDIDATE_RETRY = 0;
			for (var i = 0; i < $scope.peer.candidates.length; i+=1) {
				$scope.peer.connection.addIceCandidate(new RTCIceCandidate($scope.peer.candidates[i]));
				console.log('ice candidate was added!')
			}
		} else if (CANDIDATE_RETRY < 10) {
			CANDIDATE_RETRY+=1;
			setTimeout(addIceCandidates,250);
		}
	}

	function onIceCandidate (event) {
		if (!event.candidate) return;

		console.log('ice candidate created and sent out')

		socket.emit('peer:send_candidate', { 
			room: GLOBAL.ROOM,
			candidate: event.candidate 
		});
	}

	function onAddStream (event) {
		if (!event) return;
		if (!$scope.peer.remote.element) return;

		console.log('10. onAddStream has been called');

		$scope.peer.remote.stream = event.stream;
		$scope.peer.remote.element.src = URL.createObjectURL(event.stream);
		$scope.peer.remote.element.play();

		waitUntilRemoteStreamStartsFlowing();
	}


	$scope.isCollapsed = true;

	// this will get set in adapter.js
	if (RTCPeerConnection !== null) {
		var pc = new RTCPeerConnection({"iceServers": [{"url": "stun:stun.l.google.com:19302"}], optional: {DtlsSrtpKeyAgreement: true}});
		pc.onicecandidate = onIceCandidate;
		pc.onaddstream = onAddStream;
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

		console.log('1. init peer connection');

		if (RTCPeerConnection !== null) {

			// reset the peer connection when a page gets reloaded

				//$scope.peer.connection = new RTCPeerConnection({"iceServers": [{"url": "stun:stun.l.google.com:19302"}]});
				//$scope.peer.connection.onicecandidate = onIceCandidate;
				//$scope.peer.connection.onaddstream = onAddStream;


			// Only when both players are in the room can we start broadcasting the streams
			// this will be initiated by the second player who joins
			$scope.peer.connection.createOffer(function (desc) {

				console.log('2. local description has been set');
				$scope.peer.connection.setLocalDescription(desc);
				socket.emit('peer:send_offer', { 
					room: GLOBAL.ROOM,
					sdp: desc 
				});
			}, null, {
				'mandatory': {
					'OfferToReceiveAudio':true, 
					'OfferToReceiveVideo':true
				}
			});
		}

	};

	$scope.chat = {
		msg: null
	};

	$scope.media = {
		available: false,
		audio: false,
		video: true
	};

	$scope.peer = {
		connection: pc || null,
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
		action: {
			board: ['01','01','01','01','01'],
			state: null
		}

	};

	$scope.fn = {
		msToDateTime: function (ms) {
			var date = new Date(ms);
			return date.toLocaleString();
		},
		parseAmount: function (amount) {
			return (amount === null || typeof amount === 'undefined') ? 0 : parseInt(amount, 10);
		},
		toggleVideoStream: function () {
			if ($scope.peer.local.stream) {
				if ($scope.media.video) {
					$scope.peer.local.stream.getVideoTracks()[0]. enabled = false;
					$scope.media.video = false;
				} else {
					$scope.peer.local.stream.getVideoTracks()[0]. enabled = true;
					$scope.media.video = true;
				}
			} 
		},
		toggleAudioStream: function () {
			if ($scope.peer.local.stream) {
				if ($scope.media.audio) {
					$scope.peer.local.stream.getAudioTracks()[0]. enabled = false;
					$scope.media.audio = false;
				} else {
					$scope.peer.local.stream.getAudioTracks()[0]. enabled = true;
					$scope.media.audio = true;
				}
			} 
		}
	};

	$scope.betOption = function (name, option) {
		var amount = $scope.game.player.options[name].amount;
		var min = $scope.game.player.options[name].min;
		var max = $scope.game.player.options[name].max;
		var bet;

		switch (option) {
			case 'double':
				bet = min * 2;
				break;
			case 'triple':
				bet = min * 3;
				break;
			case 'allin':
				bet = max;
				break;
			default:
				break;
		}

		if (bet <= max) {
			$scope.game.player.options[name].amount = bet
		} else {
			$scope.game.player.options[name].amount = max
		}
	};

	$scope.invitePlayer = function (link) {
		var modalInstance = $modal.open({
			template: '<div class="modal-header"><h3>Invite a Player</h3></div><div class="modal-body"><p>Send the link below to the other player you wish to play against. They can copy and paste it into their browser window to join you!</p><p><strong>https://bitflop.me/game/play/' + link + '</strong></p><p>You can also send out a tweet using the link below to invite another player!</p><p><span class="share-link"><i class="fa fa-twitter" ng-click="share(' + link + ')"></i></span></p></div><div class="modal-footer"><button class="btn btn-primary" ng-click="ok()">OK</button></div>',
			controller: 'InvitePlayerCtrl'
		});

		modalInstance.result.then(function (selectedItem) {
			console.log(selectedItem);
		}, function () {
			console.log(selectedItem)
		});
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
				// alert the player if they click fold when checking is available
				if ($scope.game.player.options['CHECK'].allowed) {
					var fold = confirm('Are you sure you want to fold? Checking is free!');

					if (fold) {
						$scope.game.player.folded = true;
					} else {
						action.name = "CHECK";
					}
				} else {
					$scope.game.player.folded = true;
				}
				
				break;
			default:
				break;

		}
		socket.emit('player:action', {
			room: GLOBAL.ROOM,
			action: action
		});
	}

	// the server sends the connect signal when the handshake was successful
	socket.on('connect', function (data) {
		socket.emit('join', {
			room: GLOBAL.ROOM
		});
		
	});

	socket.on('disconnect', function () {
		socket.emit('disconnect', {});
	});


	socket.on('game:join', function (data) {
		$scope.game.events = data.events;
		$scope.room.players = data.room.players;
		$scope.room.observers = data.room.observers;

		if (data.player.id !== null) {

			$scope.game.ready = data.start;

			if ($scope.game.player.id === -1) {
				$scope.game.player.id = data.player.id;
				$scope.game.player.name = data.user.name;

				//angular.element(document.querySelector('#local-video')).removeAttr('controls');
			} 
		}


	});

	var updateBoard = function (cards) {
		for (var i = 0; i <= 4; i+=1) {
			if (!cards[i]) cards[i] = '01';
		}
		$scope.game.action.board = cards;
	}

	socket.on('game:data', function (data) {

		if (data.events) {
			$scope.game.events = data.events;
		}

		if (data.action) {
			$scope.game.action = data.action;
			updateBoard($scope.game.action.board);

			if ($scope.game.action.state === 'END') {

				if (!$scope.game.action.winner) return;
				
				var modalInstance = $modal.open({
					template: '<div class="modal-header"><h3>Game Over</h3></div><div class="modal-body"><strong>' + $scope.game.action.winner + '</strong> wins!!!</div><div class="modal-footer"><button class="btn btn-primary" ng-click="ok()">OK</button></div>',
					controller: 'GameOverCtrl'
				});

				modalInstance.result.then(function (selectedItem) {
					console.log(selectedItem);
				}, function () {
					console.log(selectedItem)
				});
			}
		}

		if (data.player) {
			$scope.game.player = data.player;
		}

		if (data.opponent) {
			$scope.game.opponent = data.opponent;
		}

	});

	socket.on('game:end', function (data) {

		$scope.game.action = data.action;
		updateBoard($scope.game.action.board);
		$scope.game.player = data.player;
		$scope.game.opponent = data.opponent;

	});

	socket.on('game:leave', function (data) {
		$scope.game.events = data.events;
		$scope.game.history = data.history;
		$scope.room.players = data.room.players;
		$scope.room.observers = data.room.observers;


		if (data.action) {
			$scope.game.action = data.action;
			updateBoard($scope.game.action.board);
		}

		if (data.player) {
			$scope.game.player = data.player;
		}

		if (data.opponent) {
			$scope.game.opponent = data.opponent;
		}

	});

	socket.on('game:disconnect', function (data) {

		window.location.reload();

	});

	socket.on('peer:init', function (data) {
		if (RTCPeerConnection !== null) {
			$scope.initPeerConnection()
		}
	});

	socket.on('peer:receive_candidate', function (data) {
		
		if (RTCPeerConnection !== null) {
			console.log('pushed ice candidate');
			// dont add ice candiadtes until the answer is created
			//$scope.peer.candidates.push(data.candidate);
			
			$scope.peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
		}

	});

	// This will get recieved by the player who was at the table first, 
	// since it was the last player to sit at the table who created the offer
	socket.on('peer:receive_offer', function (data) {

		console.log('3. offer has been received');

		if (RTCPeerConnection !== null) {

			$scope.peer.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));

			// Make sure any ice candidates have not been added yet!
			//console.log('4. candiadtes in receive offer:'+ JSON.stringify($scope.peer.candidates,null,4));

			createAnswer();



		}
	});

	socket.on('peer:receive_answer', function (data) {
		if (RTCPeerConnection !== null) {

			$scope.peer.connection.setRemoteDescription(new RTCSessionDescription(data.sdp));


			console.log('8. received answer!')

			console.log('9. addIceCandidates')
			//addIceCandidates();

			
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

