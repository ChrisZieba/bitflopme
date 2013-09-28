var videoChat = angular.module('videoChat', []);

app.factory('rtc', function($rootScope) {

	return {
		trace: function (text) {
			console.log((performance.now() / 1000).toFixed(3) + ": " + text);
		},
		
		call: function() {

			if ($rootScope.localStream.getVideoTracks().length > 0) {
				trace('Using video device: ' + $rootScope.localStream.getVideoTracks()[0].label);
			}

			if ($rootScope.localStream.getAudioTracks().length > 0) {
				trace('Using audio device: ' + $rootScope.localStream.getAudioTracks()[0].label);
			}

			var servers = null;

			localPeerConnection = new webkitRTCPeerConnection(servers);
			trace("Created local peer connection object localPeerConnection");
			ocalPeerConnection.onicecandidate = gotLocalIceCandidate;

			remotePeerConnection = new webkitRTCPeerConnection(servers);
			trace("Created remote peer connection object remotePeerConnection");
			remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
			remotePeerConnection.onaddstream = gotRemoteStream;

			localPeerConnection.addStream($rootScope.localStream);
			trace("Added scope.localStream to localPeerConnection");
			localPeerConnection.createOffer(gotLocalDescription);
		},


		gotLocalDescription: function (description) {
			localPeerConnection.setLocalDescription(description);
			trace("Offer from localPeerConnection: \n" + description.sdp);
			remotePeerConnection.setRemoteDescription(description);
			remotePeerConnection.createAnswer(gotRemoteDescription);
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

		gotRemoteStream: function (event) {
			remotevid.src = URL.createObjectURL(event.stream);
			trace("Received remote stream");
		},

		gotLocalIceCandidate: function (event) {
			if (event.candidate) {
				remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
				trace("Local ICE candidate: \n" + event.candidate.candidate);
			}
		},

		gotRemoteIceCandidate: function (event) {
			if (event.candidate) {
				localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
				trace("Remote ICE candidate: \n " + event.candidate.candidate);
			}
		}
	}
});


videoChat.directive('remoteVideo', function(){
	return {
		priority: 1,
		restrict: 'A',
		link: function(scope, element, attrs) {


		}
	};
});


videoChat.directive('localVideo', function(){
	return {
		priority: 1,
		restrict: 'A',
		link: function(scope, element, attrs) {

			var localVideo = element[0];

			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia || navigator.msGetUserMedia;
			window.URL = window.URL || window.webkitURL;

			function successCallback(stream) {
				scope.localStream = stream;

				if (sourcevid.mozSrcObject) {
					sourcevid.mozSrcObject = stream;
					sourcevid.play();
				} else {
					try {
						sourcevid.src = window.URL.createObjectURL(stream);
						sourcevid.play();
					} catch(e) {
						console.log("Error setting video src: ", e);
					}
				}

				scope.localStream = stream;
				rtc.call();

			}

			navigator.getUserMedia({video: true, audio: false}, successCallback, function () {
				console.error('An error occurred: [CODE ' + JSON.stringify(error) + ']');
				return;
			});




		}
	};
});