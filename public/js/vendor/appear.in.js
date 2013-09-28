function hslColor(a, b, c) {
    return "hsl(" + a + "," + b + "%," + c + "%)"
}

function createColorPickerCanvas() {
    for (var a = document.getElementById("canvasColorPicker"), b = a.getContext("2d"), c = b.createLinearGradient(0, 0, a.width, 0), d = a.height, e = a.width, f = 0; d > f; ++f) {
        var g = f / d,
            h = Math.floor(360 * g),
            i = 100,
            j = 50;
        b.beginPath(), b.strokeStyle = hslColor(h, i, j), b.moveTo(0, f), b.lineTo(e, f), b.stroke()
    }
    c.addColorStop(0, "rgba(0,0,0,1)"), c.addColorStop(1, "rgba(1,1,1,0)"), b.fillStyle = c, b.fillRect(0, 0, a.width, a.height)
}

function localStorageAdapter(a, b, c) {
    var d = {
        roomSettings: {
            sidebarCollapsed: !1
        },
        client: {
            cameraAccessGranted: !1
        }
    };
    if (void 0 === a) {
        var e = {}, f = window.localStorage;
        for (b in f) e[b] = JSON.parse(f[b]);
        return e
    }
    var g;
    if (window.localStorage[a] ? g = JSON.parse(window.localStorage.getItem(a)) : (g = d[a], window.localStorage.setItem(a, JSON.stringify(g))), void 0 !== c) g[b] = c, window.localStorage.setItem(a, JSON.stringify(g));
    else if (void 0 !== b) return g[b];
    return g
}

function RTCManager(a, b, c, d, e, f, g, h) {
    this.serverSocket = d, this.selfId = b, this.roomName = a, this.localStreams = {}, this.numberOfLocalStreams = 1, this.peerConnections = {}, this.localStreams[0] = c, this.statusCallback = e, this.streamCallback = f, this.iceServers = g, this.timeout = h, this.hitType = "event", this.category = "RTC", this.action = "Connection", this.sdpConstraints = {
        mandatory: {
            OfferToReceiveAudio: !0,
            OfferToReceiveVideo: !0
        }
    }, this.setupSocketListeners()
}

function getPeerConnection(a, b, c, d) {
    return c ? d[a].receivingConnections[b] : d[a].sendingConnections[b]
}

function sendSDP(a, b, c, d, e) {
    a.createOffer(function (f) {
        a.setLocalDescription(f, function () {
            b.emit("sdp_offer", {
                message: a.localDescription,
                receiverId: c,
                streamId: d,
                sending: e
            })
        }, function (a) {
            console.log("Could not set local description from local offer: " + a.name + "(" + a.message + ")")
        })
    }, function (a) {
        console.log("Could not create local offer: " + a.name + "(" + a.message + ")")
    }, this.sdpConstraints)
}
angular.module("videoconference", []).factory("serverSocket", ["$location", "$rootScope",
    function (a, b) {
        var c = io.connect(a.protocol() + "://" + a.host() + ":" + a.port());
        return b.serverDisconnected = !1, c.on("disconnect", function () {
            b.$apply(function () {
                b.serverDisconnected = !0
            })
        }), c.on("reconnect", function () {
            location.reload()
        }), c
    }
]).directive("vcMuted", function () {
    return function (a, b, c) {
        a.$watch(c.vcMuted, function () {
            b[0].muted = a.$eval(c.vcMuted) === !0 ? "muted" : void 0
        })
    }
}).directive("clickConfirm", function () {
    return function (a, b) {
        b.bind("click", function (a) {
            confirm("Are you sure you want to leave the room?") || (a.preventDefault(), a.stopPropagation())
        })
    }
}).directive("dancingDots", function () {
    return function (a, b) {
        ! function () {
            var a = 0;
            window.setInterval(function () {
                for (var c = "", d = 0; a > d; d++) c += ".";
                b.text(c), 3 !== a ? a += 1 : a = 0
            }, 500)
        }()
    }
}).directive("vcCreateColorPicker", function () {
    return function () {
        createColorPickerCanvas()
    }
}).directive("vcSubmit", function () {
    return function (a, b, c) {
        b.bind("submit", function (b) {
            b.preventDefault(), a.$apply(c.vcSubmit)
        })
    }
}).directive("vcCopyToClipboard", function () {
    return function (a, b) {
        var c = b,
            d = new ZeroClipboard(c, {
                moviePath: "/libraries/ZeroClipboard.swf"
            });
        d.on("complete", function () {
            $(c).attr("title", "Copied to clipboard"), $(c).tooltip("show"), sendAnalytics("event", "Room", "Used feature", "Copy to clipboard"), d.on("mouseout", function () {
                $(c).attr("title", "Copy to clipboard"), $(c).tooltip("destroy")
            })
        })
    }
}).directive("ngKeystroke", function () {
    return function (a, b) {
        b.on("keyup", function (a) {
            if (32 === a.keyCode || 189 === a.keyCode) {
                var b = a.target,
                    c = b.selectionStart;
                b.value = b.value.replace(/ /g, "-"), b.value = b.value.replace(/_/g, "-"), b.setSelectionRange(c, c)
            }
        })
    }
}).config(["$routeProvider", "$locationProvider",
    function (a, b) {
        a.when("/", {
            templateUrl: "/templates/frontpage.html",
            controller: "frontpageController"
        }).when("/error/:errorName", {
            templateUrl: "/templates/error.html",
            controller: ["$scope", "$routeParams", "$rootScope",
                function (a, b, c) {
                    c.cameFromRoom = !1, a.errorName = b.errorName
                }
            ]
        }).when("/information/:informationRequested", {
            templateUrl: "/templates/information.html",
            controller: "informationController"
        }).when("/:roomName", {
            templateUrl: "/templates/views/room.html",
            controller: "roomController"
        }).when("/:namespace/:roomName", {
            templateUrl: "/templates/views/room.html",
            controller: "roomController"
        }).otherwise({
            redirectTo: "/error/404"
        }), b.html5Mode(!0)
    }
]).run(["$rootScope", "$location",
    function (a, b) {
        a.controller = "", a.groupJoined = !1, a.$on("$routeChangeSuccess", function () {
            ga("send", "pageview", b.url())
        })
    }
]), angular.module("videoconference").directive("sidebar", function () {
    return {
        templateUrl: "/templates/partials/sidebar.html",
        restrict: "E"
    }
}), angular.module("videoconference").directive("feedback", function () {
    return {
        templateUrl: "/templates/partials/feedback.html",
        restrict: "E",
        controller: ["$http", "$scope",
            function (a, b) {
                b.status = "", b.feedback = "", b.email = "", b.sendFeedback = function (c, d) {
                    b.status = "sending", a.post("/feedback", {
                        text: c,
                        email: d
                    }).success(function () {
                        b.status = "success"
                    }).error(function () {
                        b.status = "error"
                    })
                }
            }
        ]
    }
}), angular.module("videoconference").directive("vcDropDown", ["$rootScope",
    function (a) {
        return function (b, c, d) {
            var e, f = $(c),
                g = $(d.vcDropDown);
            e = "vcDropDownContainer" in d ? d.vcDropDownContainer : void 0;
            var h, i, j = !1,
                k = !1,
                l = !1,
                m = null,
                n = function () {
                    m = $('<div class="modal-backdrop popover-backdrop"></div>').click(o).prependTo($("body"))
                }, o = function (a) {
                    if (f.toggleClass("active"), f.toggleClass("bold"), j) {
                        var b = f.data("bs.popover").$tip,
                            c = b.find(".popover-content");
                        if (k) h = c.width(), i = c.height(), b.hide();
                        else {
                            var d = $('<div class="popover-filler" />').width(h).height(i);
                            b.append(d), c.detach(), f.data("bs.popover").show(), d.remove(), b.append(c)
                        }
                    } else g.show(), f.popover("show"), j = !0;
                    null === m ? n() : (m.remove(), m = null), k = !k, l = a
                }, p = function () {
                    k && o()
                }, q = function () {
                    g.hide(), g.find(".dismiss-popover").click(o), "vcDropDownDismiss" in d && $(d.vcDropDownDismiss).mousedown(p), f.popover({
                        html: !0,
                        content: g,
                        placement: d.vcDropDownPlacement,
                        container: e,
                        trigger: "manual",
                        animation: !1
                    }), void 0 === d.vcDropDownDisableClick && f.click(function () {
                        o(!1)
                    }), void 0 !== d.vcDropDownShow && b.$watch(d.vcDropDownShow, function (a) {
                        a === !0 ? k || o(!0) : a === !1 && k && l && o(!0)
                    }), a.$on("$routeChangeStart", function () {
                        f.popover("destroy"), null !== m && m.remove()
                    })
                };
            q()
        }
    }
]), angular.module("videoconference").directive("videoBackground", function () {
    return {
        template: '<div class="video-background-wrapper"><video id="video-background" autoplay></video>',
        restrict: "E",
        controller: ["$scope",
            function () {
                var a = navigator.userAgent.toLowerCase().indexOf("chrome") > -1,
                    b = localStorageAdapter("client"),
                    c = {
                        video: !0,
                        audio: !0
                    }, d = function (a) {
                        var b = document.querySelector("#video-background");
                        b.src = window.URL.createObjectURL(a), a.getAudioTracks()[0].enabled = !1
                    }, e = function (a) {
                        console.log(a)
                    };
                a && b.cameraAccessGranted && (navigator.getMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia, navigator.getMedia(c, d, e))
            }
        ]
    }
}), angular.module("videoconference").controller("frontpageController", ["$scope", "$location", "serverSocket", "$rootScope",
    function (a, b, c, d) {
        d.controller = "frontpage", a.$on("$destroy", function () {
            d.controller = ""
        }), a.cameFromRoom = d.cameFromRoom;
        var e = "event",
            f = "Frontpage",
            g = "User action";
        a.roomName = "", a.randomizeName = function () {
            c.emit(shared.toServer.RANDOMIZE_ROOM_NAME), c.once(shared.toClient.ROOM_NAME_RANDOMIZED, function (b) {
                a.suggestedRoomName = b.roomName, a.$apply()
            })
        }, a.launchRoom = function () {
            sendAnalytics(e, f, g, "Created room from frontpage"), a.roomName = a.roomName.replace(/[_ ]/g, "-"), "" !== a.roomName ? b.url("/" + a.roomName) : b.url("/" + a.suggestedRoomName)
        }, a.dismissFeedback = function () {
            a.cameFromRoom = !1, d.cameFromRoom = !1
        }, a.btnRandomizeName = function () {
            sendAnalytics(e, f, g, "Randomized new room name"), a.randomizeName()
        }, a.randomizeName()
    }
]), angular.module("videoconference").controller("informationController", ["$scope", "$routeParams",
    function (a, b) {
        function c(a, b, c) {
            this.title = b, this.id = "faq_" + a, this.content = c
        }
        var d = 1;
        a.faqs = [], a.informationRequested = b.informationRequested;
        var e = "Why does appear.in only work with Firefox and Chrome?",
            f = angular.element("#ac_" + d++).html();
        a.faqs.push(new c(d, e, f)), e = "appear.in uses a different camera device than the one I wanted to use", f = angular.element("#ac_" + d++).html(), a.faqs.push(new c(d, e, f)), e = "Screen sharing does not work. I keep pressing the button and nothing happens", f = angular.element("#ac_" + d++).html(), a.faqs.push(new c(d, e, f)), e = "Are there any security concerns when using this service?", f = angular.element("#ac_" + d++).html(), a.faqs.push(new c(d, e, f)), e = 'I keep getting the error message "We are sorry, but we are not able to set up a connection. Try switching to another network"', f = angular.element("#ac_" + d++).html(), a.faqs.push(new c(d, e, f)), e = "Can I use appear.in with my mobile or tablet", f = angular.element("#ac_" + d++).html(), a.faqs.push(new c(d, e, f)), e = "Muting does not work for me in Firefox 22", f = angular.element("#ac_" + d++).html(), a.faqs.push(new c(d, e, f)), e = "How many people can be in a video meeting at the same time", f = angular.element("#ac_" + d++).html(), a.faqs.push(new c(d, e, f)), e = "I have a suggestion for a new feature or a problem", f = angular.element("#ac_" + d++).html(), a.faqs.push(new c(d, e, f))
    }
]), angular.module("videoconference").controller("roomController", ["$scope", "$routeParams", "serverSocket", "$timeout", "$location", "$rootScope",
    function (a, b, c, d, e, f) {
        function g() {
            a.screenShareDenied = !1, a.$apply(), a.screenShareDenied = !0, a.$apply()
        }

        function h(a, b) {
            t.connect(a.id, !0, b, 1, !1)
        }
        navigator.mozGetUserMedia || navigator.webkitGetUserMedia || e.path("/error/webrtc").replace();
        var i = function (a, b, c) {
            var d = {
                roomSettings: {
                    sidebarCollapsed: !1
                }
            }, e = d;
            return window.localStorage[a] ? e = JSON.parse(window.localStorage.getItem(a)) : window.localStorage.setItem(a, JSON.stringify(e)), void 0 !== b && void 0 !== c && (e[a][b] = c, window.localStorage.setItem(a, JSON.stringify(e))), e[a]
        };
        a.roomSettings = function (a, b) {
            return i("roomSettings", a, b)[a]
        }, f.controller = "room", a.name = b.roomName, a.shortUrl = e.host() + (443 !== e.port() ? ":" + e.port() : ""), a.url = e.absUrl(), a.screenShareDenied = !1, a.shareRoomActive = !1, a.createdNow = !0, f.cameFromRoom = !0, a.webrtcDetectedBrowser = webrtcDetectedBrowser, a.namespace = void 0 === b.namespace ? "/" : b.namespace;
        var j, k = !1,
            l = !1,
            m = "event",
            n = "Room",
            o = "Used Feature",
            p = !1;
        a.state = {
            state: "WaitingForAccess"
        }, a.clients = [], a.connectedClientCount = 0, a.clientCount = 0, a.screenToggled = !1, a.toggleScreenShare = !1, a.clientBrowser = -1 !== navigator.userAgent.indexOf("Android") ? "smartphone-android" : "desktop", fullScreenHandler(a)();
        var q, r = null,
            s = null,
            t = null,
            u = function (b) {
                for (var c = 0; c < a.clients.length; c++)
                    if (a.clients[c].id === b) return c;
                return null
            }, v = function (b) {
                return a.clients[u(b)]
            };
        a.openSidebar = function (a) {
            a ? ($("aside.sidebar2").removeClass("collapsed"), $("header.video-space-header header.main-header").removeClass("collapsed")) : ($("aside.sidebar2").addClass("collapsed"), $("header.video-space-header header.main-header").addClass("collapsed"))
        }, a.shareOn = function (a) {
            var b = "https://",
                c = e.absUrl();
            "plus.google" === a ? b += a + ".com/share?url=" + c : "twitter" === a ? b += "www." + a + ".com/home?status=" + c : "facebook" === a && (b += "www." + a + ".com/sharer/sharer.php?u=" + c), sendAnalytics("event", "Room", "Social share", a), window.open(b, a, "width=626,height=436")
        }, a.btnShareScreen = function () {
            if (k || (sendAnalytics(m, n, o, "Used screen share"), k = !0), a.toggleScreenShare) v(r).streams[q].stream.stop(), a.toggleScreenShare = !1;
            else {
                if ("chrome" !== webrtcDetectedBrowser) return g(), void 0;
                window.getUserMedia({
                    video: {
                        mandatory: {
                            chromeMediaSource: "screen"
                        }
                    }
                }, function (b) {
                    var d = v(r);
                    a.$apply(d.streams[d.numberOfStreams] = {
                        id: d.numberOfStreams,
                        streamUrl: window.URL.createObjectURL(b),
                        stream: b
                    }), q = d.numberOfStreams, a.$apply(d.numberOfStreams++), b.onended = function () {
                        c.emit(shared.toServer.END_STREAM, {
                            endedStream: d.numberOfStreams - 1
                        }), a.toggleScreenShare = !1, a.$apply()
                    }, c.emit(shared.toServer.START_NEW_STREAM), t.addNewStream(b, a.clients), a.toggleScreenShare = !0, a.$apply()
                }, g)
            }
        }, a.$watch("state", function () {
            switch (a.state.state) {
            case "WaitingForAccess":
                y();
                break;
            case "WaitingForRoomInformation":
                A(a.state.parameters);
                break;
            case "ConnectingToClients":
                C(), d(function () {
                    $(".sidebar2").addClass("collapsed")
                }, 1e3)
            }
        }), a.btnToggleMuteMic = function () {
            a.toggleMute = !a.toggleMute;
            var b = v(r);
            w(b, !0), c.emit(shared.toServer.TOGGLE_MIC)
        }, a.btnToggleVideo = function () {
            a.toggleVideo = !a.toggleVideo;
            for (var b = v(r), d = b.streams[0].stream, e = d.getVideoTracks(), f = 0; f < e.length; f++) e[f].enabled = !e[f].enabled;
            c.emit(shared.toServer.TOGGLE_VIDEO)
        }, c.on(shared.toClient.VIDEO_TOGGLED, function (a) {
            var b = v(a.client.id);
            b.isVideoMuted = !b.isVideoMuted, x()
        });
        var w = function (a, b) {
            for (var c, d = 0; d < a.numberOfStreams; d++) {
                c = a.streams[d].stream;
                var e = c.getAudioTracks();
                a.isVideoTagMuted = !a.isVideoTagMuted;
                for (var f = 0, g = e.length; g > f; f++) e[f].enabled = b ? !e[f].enabled : !1
            }
        };
        a.toggleFullScreen = function () {
            if (l || (sendAnalytics(m, n, o, "Used full screen"), l = !0), isFullScreen()) cancelFullScreen(), a.screenToggled = !0;
            else {
                var b = angular.element(document).find("body")[0];
                getFullScreen(b), a.screenToggled = !1
            }
        }, c.on(shared.toClient.MIC_TOGGLED, function (b) {
            var c = v(b.client.id);
            c.isMicMuted = !c.isMicMuted, a.$apply()
        }), c.on(shared.toClient.NEW_STREAM_STARTED, function (a) {
            var b = a.client,
                c = b.id;
            if (c !== r) {
                b.numberOfStreams = a.numberOfStreams;
                var d = a.numberOfStreams - 1;
                h(b, d)
            }
        }), c.on(shared.toClient.STREAM_ENDED, function (b) {
            var c = v(b.client.id);
            a.$apply(delete c.streams[b.streamId]), c.numberOfStreams--, c.id === r ? t.disconnectConnection(!0, b.streamId, null, a.clients) : t.disconnectConnection(!1, b.streamId, c.id, null)
        });
        var x = function () {
            for (var b = 0, c = 0; c < a.clients.length; c++) a.clients[c].streams && b++;
            a.connectedClientCount = b - 1, a.clientCount = Object.keys(a.clients).length - 1, d(function () {
                for (var a = angular.element(document).find("video"), b = 0; b < a.length; b++) a[b].play()
            }, 0)
        }, y = function () {
                var b = d(function () {
                    a.state = {
                        state: "PleaseGrantAccess"
                    }
                }, 1e3);
                window.getUserMedia({
                    video: !0,
                    audio: !0
                }, function (c) {
                    window.localStorageAdapter("client", "cameraAccessGranted", !0), d.cancel(b), a.state = "chrome" === webrtcDetectedBrowser || c.getVideoTracks().length > 0 && c.getAudioTracks().length > 0 ? {
                        state: "WaitingForRoomInformation",
                        parameters: c
                    } : {
                        state: "FirefoxConfigError"
                    }, a.$apply()
                }, function () {
                    d.cancel(b), a.state = {
                        state: "CameraAccessDenied"
                    }, a.$apply()
                })
            }, z = function (b, e) {
                t = new RTCManager(a.name, r, b, c, F, J, e, d)
            }, A = function (f) {
                var g = {
                    room_name: b.roomName,
                    namespace: a.namespace
                };
                c.emit(shared.toServer.JOIN_ROOM, g), c.once(shared.toClient.ROOM_JOINED, function (b) {
                    if (!("room" in b)) return a.$apply(function () {
                        var c = "/error/invalid-room";
                        (b.error = "invalid_namespace") && (c = "/error/invalid-namespace"), a.state = {
                            state: "ConnectingToClients"
                        }, d(function () {
                            e.url(c)
                        }, 0)
                    }), void 0;
                    r = b.selfId, s = f;
                    for (var c = b.room, g = 0; g < c.clients.length; g++) B(c.clients[g]);
                    void 0 !== c.iceServers ? z(f, b.room.iceServers) : z(f, {
                        iceServers: [{
                            url: "stun:stun.l.google.com:19302"
                        }]
                    }), a.state = {
                        state: "ConnectingToClients"
                    }, a.$apply()
                }), c.on(shared.relay.NEW_CLIENT, function (b) {
                    var c = b.client;
                    t.updateIceServers(b.iceServers), B(c), a.$apply(c.streams = {}), x()
                }), c.on(shared.relay.CLIENT_LEFT, function (b) {
                    a.$apply(function () {
                        var c = u(b.client.id);
                        null !== c && (t.disconnectAllConnectionsForClient(b.client.id), a.clients.splice(c, 1), 1 === a.connectedClientCount && (a.createdNow = !1), x())
                    })
                })
            }, B = function (b) {
                b.localClient = b.id === r, a.clients.push(b)
            }, C = function () {
                for (var b = 0; b < a.clients.length; b++) {
                    var c = a.clients[b];
                    D(c, !0)
                }
                H()
            }, D = function (a, b) {
                if (a.streams = {}, a.localClient) E(a.id, s, 0);
                else if (b === !0) {
                    t.connect(a.id, b, 0, 1, !0);
                    for (var c = 1; c < a.numberOfStreams; c++) h(a, c)
                }
            }, E = function (a, b, c) {
                var d = v(a);
                d.streams[c] = {
                    id: c,
                    streamUrl: window.URL.createObjectURL(b),
                    stream: b,
                    isFullScreen: !1,
                    ready: !1,
                    error: !1
                }, d.localClient && (d.streams[c].ready = !0), x()
            };
        a.$watch("clients.length", x), a.$on("$destroy", function () {
            I(), c.emit(shared.toServer.LEAVE_ROOM), null !== t && t.disconnectAll(), null !== s && s.stop(), c.removeAllListeners();
            var a = angular.element(document).find("body")[0];
            a.style.display = "none", a.offsetHeight = a.offsetHeight, a.style.display = "block", f.controller = ""
        });
        var F = function (b, c, d) {
            var e = v(b);
            void 0 !== e && ("error" === d ? e.streams[c].error = !0 : void 0 !== e.streams[c] && null !== e.streams[c] && (e.streams[c].ready = !0), a.$apply())
        }, G = null,
            H = function () {
                G = window.setTimeout(function () {
                    setDimension("dimension5", a.clientCount), sendAnalytics(m, n, "Minute elapsed", "Minute elapsed in conversation", a.clientCount), H()
                }, 6e4)
            }, I = function () {
                null !== G && window.clearTimeout(G)
            };
        a.videoFullscreen = function (a, b) {
            var c = v(a);
            c.streams[b].isFullScreen = !c.streams[b].isFullScreen;
            var d = angular.element("#vid" + a + "-" + b + "-container"),
                e = -1e4,
                f = -1e4;
            isFullScreen() ? cancelFullScreen() : (getFullScreen(d[0]), d.bind("mousemove", function (a) {
                j && (clearTimeout(j), !p || e === a.pageX && f === a.pageY || (d.removeClass("cursorHidden"), p = !1)), j = setTimeout(function () {
                    p === !1 && (p = !0, d.addClass("cursorHidden"), e = a.pageX, f = a.pageY)
                }, 1e3)
            }))
        }, a.cancelVideoFullscreen = function (b) {
            var c = parseInt(b[0].attributes.getNamedItem("client").nodeValue, 10),
                d = parseInt(b[0].attributes.getNamedItem("stream").nodeValue, 10),
                e = v(c);
            e.streams[d].isFullScreen = !1, clearTimeout(j), b.removeClass("cursorHidden"), b.unbind("mousemove"), p = !1, a.$apply()
        };
        var J = function (b, c, d) {
            a.$apply(function () {
                E(b, c, d)
            })
        }
    }
]);
var getFullScreen, isFullScreen, cancelFullScreen, fullScreenHandler;
document.webkitCancelFullScreen ? (getFullScreen = function (a) {
    a.webkitRequestFullScreen()
}, isFullScreen = function () {
    return document.webkitIsFullScreen
}, cancelFullScreen = function () {
    document.webkitCancelFullScreen()
}, fullScreenHandler = function (a) {
    return document.onwebkitfullscreenchange = function (b) {
        void 0 !== b && (b.target === angular.element(document).find("body")[0] ? (a.screenToggled = !a.screenToggled, a.$apply()) : isFullScreen() || a.cancelVideoFullscreen(jQuery(b.target)))
    }
}) : document.mozCancelFullScreen && (getFullScreen = function (a) {
    a.mozRequestFullScreen()
}, isFullScreen = function () {
    return document.mozFullScreen
}, cancelFullScreen = function () {
    document.mozCancelFullScreen()
}, fullScreenHandler = function (a) {
    return document.onmozfullscreenchange = function (b) {
        void 0 !== b && (b.target === angular.element(document).find("body")[0] ? (a.screenToggled = !a.screenToggled, a.$apply()) : isFullScreen() || a.cancelVideoFullscreen(jQuery(b.target)))
    }
}), RTCManager.prototype.updateIceServers = function (a) {
    this.iceServers = a
}, RTCManager.prototype.addNewStream = function (a) {
    this.numberOfLocalStreams++;
    var b = this.numberOfLocalStreams - 1;
    this.localStreams[b] = a
}, RTCManager.prototype.connect = function (a, b, c, d, e) {
    var f = this.serverSocket;
    1 === d && sendAnalytics(this.hitType, this.category, this.action, "Connection started"), void 0 === this.peerConnections[a] && (this.peerConnections[a] = {
        receivingConnections: {},
        sendingConnections: {}
    });
    var g;
    if (3 > d) {
        var h = 0;
        g = {
            iceServers: []
        };
        for (var i = 0; i < this.iceServers.iceServers.length; i++) - 1 === this.iceServers.iceServers[i].url.indexOf("turn") && (g.iceServers[h++] = this.iceServers.iceServers[i])
    } else g = this.iceServers;
    var j = this.startNewPeerConnection(a, c, e || 0 === c, g);
    (e || 0 === c) && (j.addStream(this.localStreams[c]), this.peerConnections[a].sendingConnections[c] = j), e && 0 !== c || (this.peerConnections[a].receivingConnections[c] = j);
    var k = this;
    if (j.onaddstream = function (b) {
        k.streamCallback(a, b.stream, c)
    }, b) this.serverSocket.emit(shared.relay.READY_TO_RECEIVE_OFFER, {
        receiverId: a,
        streamId: c,
        attemptNumber: d,
        sending: e
    });
    else {
        var l = this.timeout(function () {
            6 > d ? k.restartConnection(a, c, b, !e, d + 1, k) : (f.emit(shared.relay.CONNECTION_FAILED, {
                receiverId: a,
                streamId: c,
                attemptNumber: d,
                sending: e
            }), k.sendErrorCallback(a, c, e))
        }, 5e3);
        j.onicechange = j.oniceconnectionstatechange = function () {
            k.timeout(function () {
                return void 0 !== j.iceConnectionState && "connected" === j.iceConnectionState || void 0 !== j.readyState && "active" === j.readyState ? (k.timeout.cancel(l), f.emit(shared.relay.CONNECTION_QUERY, {
                    receiverId: a,
                    streamId: c,
                    attemptNumber: d,
                    sending: e
                }), void 0) : void 0
            }, 200)
        }
    }
}, RTCManager.prototype.startNewPeerConnection = function (a, b, c, d) {
    var e = this.serverSocket,
        f = new RTCPeerConnection(d, {
            optional: [{
                DtlsSrtpKeyAgreement: !0
            }]
        });
    return f.onicecandidate = function (d) {
        d.candidate && e.emit("ice_candidate", {
            message: d.candidate,
            receiverId: a,
            streamId: b,
            sending: c
        })
    }, f
}, RTCManager.prototype.setupSocketListeners = function () {
    var a = this,
        b = this.serverSocket;
    b.on(shared.relay.CONNECTION_QUERY, function (c) {
        var d = getPeerConnection(c.clientId, c.streamId, c.sending, a.peerConnections);
        return void 0 === d ? (this.restartConnection(c.clientId, c.streamId, !1, c.sending, c.attemptNumber), void 0) : (void 0 !== d.iceConnectionState && "connected" === d.iceConnectionState || void 0 !== d.readyState && "active" === d.readyState ? (b.emit(shared.relay.CONNECTION_STATUS_CONNECTED, {
            receiverId: c.clientId,
            streamId: c.streamId,
            attemptNumber: c.attemptNumber,
            sending: !c.sending
        }), a.statusCallback(c.clientId, c.streamId, "success"), a.sendSuccessAnalytics(c.attemptNumber)) : 6 === c.attemptNumber ? (b.emit(shared.relay.CONNECTION_FAILED, {
            receiverId: c.clientId,
            streamId: c.streamId,
            attemptNumber: c.attemptNumber,
            sending: !c.sending
        }), a.sendErrorCallback(c.clientId, c.streamId, !c.sending)) : b.emit(shared.relay.CONNECTION_STATUS_NOT_CONNECTED, {
            receiverId: c.clientId,
            streamId: c.streamId,
            attemptNumber: c.attemptNumber,
            sending: !c.sending,
            active: c.active
        }), void 0)
    }), b.on(shared.relay.CONNECTION_STATUS_CONNECTED, function (b) {
        a.sendSuccessAnalytics(b.attemptNumber), a.statusCallback(b.clientId, b.streamId, "success")
    }), b.on(shared.relay.CONNECTION_STATUS_NOT_CONNECTED, function (b) {
        a.restartConnection(b.clientId, b.streamId, b.active, !b.sending, b.attemptNumber + 1, a)
    }), b.on(shared.relay.CONNECTION_FAILED, function (b) {
        a.sendErrorCallback(b.clientId, b.streamId, !b.sending)
    }), b.on(shared.relay.READY_TO_RECEIVE_OFFER, function (c) {
        var d, e = a.peerConnections[c.clientId];
        void 0 !== e ? (d = getPeerConnection(c.clientId, c.streamId, c.sending, a.peerConnections), void 0 !== d ? a.restartConnection(c.clientId, c.streamId, !0, c.sending, c.attemptNumber) : a.connect(c.clientId, !1, c.streamId, c.attemptNumber, !c.sending || 0 === c.streamId)) : a.connect(c.clientId, !1, c.streamId, c.attemptNumber, !c.sending || 0 === c.streamId), d = getPeerConnection(c.clientId, c.streamId, c.sending, a.peerConnections), sendSDP(d, b, c.clientId, c.streamId, !c.sending)
    }), b.on("ice_candidate", function (b) {
        var c = getPeerConnection(b.clientId, b.streamId, b.sending, a.peerConnections);
        return void 0 === c ? (this.restartConnection(b.clientId, b.streamId, !1, b.sending, b.attemptNumber), void 0) : (c.addIceCandidate(new RTCIceCandidate(b.message)), void 0)
    });
    var c = this.sdpConstraints;
    b.on("sdp_offer", function (d) {
        var e = getPeerConnection(d.clientId, d.streamId, d.sending, a.peerConnections);
        return void 0 === e ? (this.restartConnection(d.clientId, d.streamId, !1, d.sending, d.attemptNumber), void 0) : (e.setRemoteDescription(new RTCSessionDescription(d.message), function () {
            e.createAnswer(function (a) {
                e.setLocalDescription(a, function () {
                    b.emit("sdp_answer", {
                        message: e.localDescription,
                        receiverId: d.clientId,
                        streamId: d.streamId,
                        sending: !d.sending
                    })
                }, function (a) {
                    console.log("Could not set local description from local answer: " + a.name + "(" + a.message + ")")
                })
            }, function (a) {
                console.log("Could not create answer to remote offer: " + a.name + "(" + a.message + ")")
            }, c)
        }, function (a) {
            console.log("Could not set remote description from remote offer: " + a.name + "(" + a.message + ")")
        }), void 0)
    }), b.on("sdp_answer", function (b) {
        var c = getPeerConnection(b.clientId, b.streamId, b.sending, a.peerConnections);
        return void 0 === c ? (this.restartConnection(b.clientId, b.streamId, !1, b.sending, b.attemptNumber), void 0) : (c.setRemoteDescription(new RTCSessionDescription(b.message), function () {}, function (a) {
            console.log("Could not set remote description from remote answer: " + a.name + "(" + a.message + ")")
        }), void 0)
    })
}, RTCManager.prototype.disconnectConnection = function (a, b, c, d) {
    if (a) {
        for (var e in d) {
            var f = d[e];
            f.id !== this.selfId && (this.disconnect(this.peerConnections[f.id].sendingConnections[b]), delete this.peerConnections[f.id].sendingConnections[b])
        }
        this.numberOfLocalStreams--
    } else this.disconnect(this.peerConnections[c].receivingConnections[b]), delete this.peerConnections[c].receivingConnections[b]
}, RTCManager.prototype.disconnect = function (a) {
    try {
        a.close()
    } catch (b) {}
}, RTCManager.prototype.disconnectAll = function () {
    for (var a in this.peerConnections) this.disconnectAllConnectionsForClient(a);
    this.peerConnections = {}
}, RTCManager.prototype.disconnectAllConnectionsForClient = function (a) {
    for (var b in this.peerConnections[a].sendingConnections) {
        var c = parseInt(b, 10);
        this.disconnect(this.peerConnections[a].sendingConnections[c]), delete this.peerConnections[a].sendingConnections[c]
    }
    for (var d in this.peerConnections[a].receivingConnections) {
        var e = parseInt(d, 10);
        0 !== e && (this.disconnect(this.peerConnections[a].receivingConnections[e]), delete this.peerConnections[a].receivingConnections[e])
    }
    delete this.peerConnections[a]
}, RTCManager.prototype.sendErrorCallback = function (a, b, c) {
    sendAnalytics(this.hitType, this.category, this.action, "Connection failed"), c && 0 !== b || this.statusCallback(a, b, "error")
}, RTCManager.prototype.sendSuccessAnalytics = function (a) {
    var b = "Connection established without TURN";
    a > 2 && (b = "Connection established with TURN"), sendAnalytics(this.hitType, this.category, this.action, b)
}, RTCManager.prototype.restartConnection = function (a, b, c, d, e) {
    var f = getPeerConnection(a, b, d, this.peerConnections);
    if (void 0 === f) return this.connect(a, !c, b, e, !d || 0 === b), void 0;
    try {
        f.close()
    } catch (g) {}(d || 0 === b) && delete this.peerConnections[a].receivingConnections[b], d && 0 !== b || delete this.peerConnections[a].sendingConnections[b], this.connect(a, !c, b, e, !d || 0 === b)
},
function (a) {
    a.toServer = {
        TOGGLE_MIC: "toggle_mic",
        CREATE_ROOM: "create_room",
        JOIN_ROOM: "join_room",
        START_NEW_STREAM: "start_new_stream",
        END_STREAM: "end_stream",
        TOGGLE_VIDEO: "toggle_video",
        LEAVE_ROOM: "leave_room",
        JOIN_GROUP: "join_group",
        CALL_MEMBERS: "call_members",
        CALL_MEMBER: "call_member",
        REQUEST_GROUP_INFORMATION: "request_group_information",
        LEAVE_GROUP: "leave_group",
        RANDOMIZE_ROOM_NAME: "randomize_group_name"
    }, a.toClient = {
        MIC_TOGGLED: "mic_toggled",
        ROOM_CREATED: "room_created",
        ROOM_JOINED: "room_joined",
        NEW_STREAM_STARTED: "started_new_stream",
        STREAM_ENDED: "ended_stream",
        VIDEO_TOGGLED: "video_toggled",
        GROUP_JOINED: "joined_group",
        MEMBERS_CALLED: "called_members",
        GROUP_INFORMATION_REQUESTED: "group_information_requested",
        ROOM_NAME_RANDOMIZED: "room_name_randomized"
    }, a.relay = {
        CLIENT_LEFT: "client_left",
        NEW_CLIENT: "new_client",
        NEW_GROUP_MEMBER: "new_group_member",
        MEMBER_LEFT: "member_left",
        STROKE: "stroke",
        CLEAR_WHITEBOARD: "clear_whiteboard",
        GROUP_ROOM_CREATED: "group_room_created",
        GROUP_ROOM_ABANDONED: "group_room_abandoned",
        READY_TO_RECEIVE_OFFER: "ready_to_receive_offer",
        CONNECTION_FAILED: "connection_failed",
        CONNECTION_QUERY: "connection_query",
        CONNECTION_STATUS_CONNECTED: "connection_status_connected",
        CONNECTION_STATUS_NOT_CONNECTED: "connection_status_not_connected"
    }, a.strokeType = {
        LINE_TO: 0
    }
}("undefined" == typeof exports ? this.shared = {} : exports);
var splitscreenElements = function () {
    var a = [],
        b = null,
        c = function () {
            null !== b && b()
        }, d = function (a) {
            (0 === a.videoWidth || 0 === a.videoHeight) && window.setTimeout(function () {
                return 0 === a.videoWidth || 0 === a.videoHeight ? (d(a), void 0) : (c(), void 0)
            }, 100)
        }, e = function (b, d) {
            var e, f;
            for (var g in a) a[g][0] === b[0] ? e = g : a[g][0] === d[0] && (f = g);
            a[e] = d, a[f] = b, c()
        }, f = function (a) {
            var b = null;
            void 0 === a[0].dragDropInitialized && (a[0].dragDropInitialized = !0, a.draggable({
                cancel: ".not-draggable",
                revert: "invalid",
                revertDuration: 250,
                scroll: !1,
                scope: "splitscreen",
                helper: function () {
                    return $("<div />").width(a.width() - 10).height(a.height() - 10).css({
                        "z-index": 1051,
                        border: "5px solid black",
                        opacity: .5,
                        cursor: "move"
                    })
                }
            }).droppable({
                scope: "splitscreen",
                tolerance: "pointer",
                over: function () {
                    b = $("<div />").css({
                        "z-index": 1050,
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        background: "white",
                        opacity: .5
                    }), a.append(b)
                },
                out: function () {
                    b.remove()
                },
                drop: function (c, d) {
                    b.remove(), e(d.draggable, a)
                }
            }))
        };
    return {
        setUpdateHandler: function (a) {
            b = a
        },
        getElementCount: function () {
            return a.length
        },
        getElementByOrdinality: function (b) {
            return a[b]
        },
        registerElement: function (b) {
            f(b), a.unshift(b), void 0 !== b.find("video")[0] && d(b.find("video")[0]), c()
        },
        unregisterElement: function (b) {
            for (var d in a)
                if (a[d][0] === b[0]) return a.splice(d, 1), c(), void 0
        }
    }
}, splitscreenLayouts = function () {
        var a = 640,
            b = 480,
            c = 0,
            d = 1,
            e = 100,
            f = function (c) {
                var d, e, f, g, h = 10,
                    i = null;
                return {
                    recalculate: function (a, b, c, i, j) {
                        d = b + h, e = c + h, f = i - 2 * h, g = j - 2 * h
                    },
                    utilization: function () {
                        var c = a,
                            d = b;
                        return c / d > f / g ? c * d * f * f / c / c : c * d * g * g / d / d
                    },
                    positionElements: function (h) {
                        i = h.getElementByOrdinality(c);
                        var j = i.find("video")[0],
                            k = void 0 === j ? 0 : j.videoWidth,
                            l = void 0 === j ? 0 : j.videoHeight;
                        (0 === k || 0 === l) && (k = a, l = b);
                        var m, n;
                        k / l > f / g ? (m = f, n = l * f / k) : (n = g, m = k * g / l);
                        var o = d + (f - m) / 2,
                            p = e + (g - n) / 2;
                        i.css("position", "absolute"), i.css("left", o + "px"), i.css("top", p + "px"), i.css("width", m + "px"), i.css("height", n + "px"), i.css("font-size", m / 50 + "pt"), i.trigger("splitscreen-resize", [m, n]), window.setTimeout(function () {
                            i.css("transition", "left 0.5s, top 0.5s, width 0.5s, height 0.5s, font-size 0.5s")
                        }, 0)
                    },
                    getLeafCount: function () {
                        return 1
                    }
                }
            }, g = function (a, b, c) {
                var d = [],
                    g = h(a, b, d),
                    i = function (a) {
                        for (a -= c; d.length > a;) d.pop();
                        for (; d.length < a;) d.push(f(c + d.length))
                    };
                return {
                    recalculate: function (a, b, c, d, e) {
                        return i(a), g.recalculate(a, b, c, d, e)
                    },
                    utilization: function () {
                        return g.utilization()
                    },
                    positionElements: function (a) {
                        g.positionElements(a)
                    },
                    getLeafCount: function () {
                        return e
                    }
                }
            }, h = function (a, b, e) {
                return {
                    recalculate: function (f, g, h, i, j) {
                        for (var k, l, m, n, o = [], p = 0, q = 1, r = 0; r < e.length; r++) o.push(q), p += q, q *= b;
                        for (var s in e) {
                            var t = e[s],
                                u = o[s] / p;
                            a === c ? (l = j, k = i * u, m = k, n = 0) : a === d && (l = j * u, k = i, m = 0, n = l), t.recalculate(f, g, h, k, l), g += m, h += n
                        }
                    },
                    utilization: function () {
                        var a = 0;
                        for (var b in e) a += e[b].utilization();
                        return a
                    },
                    positionElements: function (a) {
                        for (var b in e) e[b].positionElements(a)
                    },
                    getLeafCount: function () {
                        var a = 0;
                        for (var b in e) a += e[b].getLeafCount();
                        return a
                    }
                }
            }, i = {
                "0-default": {
                    description: "Mixed layout",
                    layouts: [g(c, 1, 0), g(d, 1, 0), h(c, 2 / 3, [f(0), f(1)]), h(c, 2 / 3, [f(0), h(d, 1, [f(1), f(2)])]), h(d, 1, [h(c, 1, [f(1), f(2)]), h(c, 1, [f(0), f(3)])]), h(c, 2 / 3, [h(d, 1, [f(1), f(0)]), h(d, 1, [f(2), f(3), f(4)])]), h(d, 1, [h(c, 1, [f(0), f(1), f(2)]), h(c, 1, [f(3), f(4), f(5)])]), h(d, 2 / 3, [h(c, 1, [f(0), f(1), f(2)]), h(c, 1, [f(3), f(4), f(5), f(6)])])]
                },
                "1-big-vertical": {
                    description: "Vertical layout",
                    layouts: [h(c, .25, [f(0), g(d, 1, 1)])]
                },
                "2-big-horizontal": {
                    description: "Horizontal layout",
                    layouts: [h(d, .25, [f(0), g(c, 1, 1)])]
                }
            }, j = "0-default",
            k = null,
            l = function () {
                null !== k && k()
            };
        return {
            getCategories: function () {
                return i
            },
            getCurrentCategory: function () {
                return j
            },
            setCurrentCategory: function (a) {
                j = a, l()
            },
            setUpdateHandler: function (a) {
                k = a
            },
            getBestLayout: function (a, b, c, d, f) {
                var g = null,
                    h = 0,
                    k = i[j].layouts;
                for (var l in k) {
                    var m = k[l],
                        n = m.getLeafCount();
                    if (!(e > n && n !== a)) {
                        m.recalculate(a, b, c, d, f);
                        var o = m.utilization();
                        (null === g || o > h) && (g = k[l], h = o)
                    }
                }
                return g
            }
        }
    }, splitscreenRefresher = function (a, b) {
        var c = null,
            d = function () {
                null !== c && window.clearTimeout(c), c = window.setTimeout(function () {
                    c = null, f()
                }, 100)
            }, e = 0,
            f = function () {
                var c = a.getElementCount(),
                    d = e,
                    f = 0,
                    g = angular.element(".video-wrapper").width() - e,
                    h = angular.element(".video-wrapper").height(),
                    i = b.getBestLayout(c, d, f, g, h);
                i.positionElements(a, d, f, g, h)
            }, g = !1;
        return {
            ensureStarted: function () {
                g || (g = !0, f(), a.setUpdateHandler(f), b.setUpdateHandler(f), $(window).resize(d))
            },
            setOffset: function (a) {
                e = a, f()
            }
        }
    };
angular.module("videoconference").factory("splitscreenElements", splitscreenElements).factory("splitscreenLayouts", splitscreenLayouts).factory("splitscreenRefresher", ["splitscreenElements", "splitscreenLayouts", splitscreenRefresher]).directive("vcSplitscreen", ["splitscreenElements", "splitscreenRefresher",
    function (a, b) {
        return function (c, d, e) {
            c.$watch(e.vcSplitscreen, function (b) {
                b === !0 ? a.registerElement(d) : a.unregisterElement(d)
            }), d.bind("$destroy", function () {
                a.unregisterElement(d)
            }), b.ensureStarted()
        }
    }
]).directive("vcSplitscreenOffset", ["splitscreenRefresher",
    function (a) {
        return function (b, c, d) {
            b.$watch(d.vcSplitscreenOffset, function (b) {
                a.setOffset(b)
            })
        }
    }
]).controller("splitscreenLayoutController", ["$scope", "splitscreenLayouts",
    function (a, b) {
        a.getCategories = b.getCategories, a.getCurrentCategory = b.getCurrentCategory, a.setCurrentCategory = b.setCurrentCategory
    }
]);
var whiteboardCanvasController = ["$scope", "$rootScope", "$location", "serverSocket",
    function (a, b, c, d) {
        function e() {
            w = new g, x = new f, p.bind("mousedown", h), p.bind("mousemove", h), p.bind("mouseup", h), p.on("splitscreen-resize", i), u = r.canvas.width / q.clientWidth, v = r.canvas.height / q.clientHeight
        }

        function f() {
            function b(b, c) {
                var d = c.getContext("2d"),
                    e = d.getImageData(b._x, b._y, 1, 1).data,
                    f = l(e[0], e[1], e[2]);
                a.currentColor = f, a.$apply()
            }
            var c = !1;
            this.mousedown = function (a, d) {
                c = !0, b(a, d)
            }, this.mousemove = function (a, d) {
                c && b(a, d)
            }, this.mouseup = function () {
                c = !1
            }
        }

        function g() {
            var b = this;
            this.started = !1;
            var c = null,
                d = 0,
                e = 0;
            this.mousedown = function (a) {
                b.started = !0, d = a._x, e = a._y
            }, this.mousemove = function (f) {
                if (b.started) {
                    var g = f._x,
                        h = f._y;
                    c = {
                        type: shared.strokeType.LINE_TO,
                        tool: a.currentTool,
                        color: a.currentColor,
                        size: a.currentSize,
                        x1: d,
                        y1: e,
                        x2: g,
                        y2: h
                    }, d = g, e = h, j(c)
                }
                m(f)
            }, this.mouseup = function (a) {
                b.started && (b.mousemove(a), b.started = !1)
            }
        }

        function h(a) {
            var b, c = a.target;
            if (a.offsetX || 0 === a.offsetX) a._x = a.offsetX, a._y = a.offsetY;
            else {
                var d = 0,
                    e = 0,
                    f = c.offsetParent;
                do d += f.offsetLeft, e += f.offsetTop; while (f = f.offsetParent);
                a._x = a.pageX - d, a._y = a.pageY - e
            }
            return "canvasColorPicker" === c.id && (b = x[a.type]) ? (a._x = a._x / c.clientWidth * c.width, a._y = a._y / c.clientHeight * c.height, b(a, c), a.preventDefault(), a.stopPropagation(), void 0) : "whiteboardToolBar" === c.id ? (a.preventDefault(), void 0) : (b = w[a.type], b && (a._x = a._x * u, a._y = a._y * v, b(a)), void 0)
        }

        function i(a, b, c) {
            (q.width !== b || q.height !== c) && (u = r.canvas.width / b, v = r.canvas.height / c)
        }

        function j(a) {
            d.emit(shared.relay.STROKE, a)
        }

        function k(b) {
            switch (b.tool) {
            case o:
                r.strokeStyle = angular.element("#canvas").css("background-color"), r.lineJoin = "round", r.lineWidth = a.currentSize * y;
                break;
            case n:
                r.lineJoin = "round", r.strokeStyle = b.color, r.lineWidth = b.size
            }
            switch (b.type) {
            case shared.strokeType.LINE_TO:
                r.beginPath(), r.moveTo(b.x1, b.y1), r.lineTo(b.x2, b.y2), r.closePath(), r.stroke()
            }
        }

        function l(a, b, c) {
            var d = a.toString(16),
                e = b.toString(16),
                f = c.toString(16),
                g = 1 === d.length ? "0" + d : d,
                h = 1 === e.length ? "0" + e : e,
                i = 1 === f.length ? "0" + f : f;
            return "#" + g + h + i
        }

        function m(b) {
            var c = angular.element("#canvas-top-layer");
            switch (a.currentTool) {
            case o:
                t.lineWidth = 3, t.moveTo(b._x, b._y), t.strokeStyle = "Black", t.beginPath();
                var d = a.currentSize * y / 2;
                t.arc(b._x, b._y, d, 0, 2 * Math.PI, !0), t.clearRect(0, 0, q.width, q.height), t.closePath(), t.stroke(), c.css("cursor", "url('/images/vc-cursor.gif'), auto");
                break;
            case n:
                t.clearRect(0, 0, q.width, q.height), c.css("cursor", "crosshair")
            }
        }
        var n = 0,
            o = 1;
        a.toolEraser = o, a.toolPencil = n, a.sizeSmall = 1, a.sizeMedium = 3, a.sizeLarge = 5;
        var p = angular.element("#whiteboard-canvas"),
            q = angular.element("#canvas")[0],
            r = q.getContext("2d");
        r.canvas.width = 1280, r.canvas.height = 960;
        var s = angular.element("#canvas-top-layer")[0],
            t = s.getContext("2d");
        t.canvas.width = r.canvas.width, t.canvas.height = r.canvas.height;
        var u, v, w = null,
            x = null;
        a.currentTool = n, a.currentSize = a.sizeSmall;
        var y = 20;
        a.currentColor = "Blue", d.on(shared.relay.CLEAR_WHITEBOARD, function () {
            r.clearRect(0, 0, q.width, q.height)
        }), d.on(shared.relay.STROKE, function (a) {
            k(a)
        }), d.once(shared.toClient.ROOM_JOINED, function (a) {
            if (!a.error)
                for (var b = 0; b < a.room.whiteboard.strokes.length; b++) k(a.room.whiteboard.strokes[b])
        }), a.btnEraser = function () {
            a.currentTool = o
        }, a.btnPencil = function () {
            a.currentTool = n
        }, a.btnClearWhiteboard = function () {
            d.emit(shared.relay.CLEAR_WHITEBOARD)
        }, e()
    }
];