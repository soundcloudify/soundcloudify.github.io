(function(){

    /**
     * =====================================
     *          SOUNDCLOUD PLAYER
     * =====================================
     */
    var SoundCloudPlayer = function(opts) {
        var self = this;

        this.audio = document.createElement('audio');
        this.audio.volume = 0.5;

        this.onTimeUpdate = opts.onTimeUpdate;
        this.onEnded = opts.onEnded;
        this.onError = opts.onError;

        this.audio.addEventListener('timeupdate', function() {
            self.onTimeUpdate(self.audio.currentTime, self.audio.duration);
        }, false);

        this.audio.addEventListener('ended', this.onEnded, false);

        this.audio.addEventListener('error', this.onError, false);
    };

    SoundCloudPlayer.prototype = {
        
        constructor: SoundCloudPlayer,

        play: function(track) {
            var src = track.streamUrl + '?client_id=' + CLIENT_ID;

            if (src === this.audio.src) {
                this.replay();
            } else {
                this.audio.src = src;
                this.audio.play();
            }

        },
        resume: function() {
            this.audio.play();
        },
        pause: function() {
            this.audio.pause();
        },
        stop: function() {
            this.audio.pause();
            this.audio.currentTime = 0;
        },
        replay: function() {
            this.stop();
            this.resume();
        },
        seek: function(xpos) {
            if (!this.audio.readyState) return false;
            this.audio.currentTime = (xpos * this.audio.duration);
        },
        clear: function() {
            this.audio.pause();
            this.audio.src = '';
            this.audio.removeAttribute('src');
        },
        setVolume: function(volume) {
            this.audio.volume = volume;
        }
    };

    /**
     * =====================================
     *          YOUTUBE PLAYER
     * =====================================
     */
    var YoutubePlayer = function(opts) {
        this.player = null;
        this.playerReady = false;
        this.onTimeUpdate = opts.onTimeUpdate;
        this.onEnded = opts.onEnded;
        this.onError = opts.onError;
    };

    YoutubePlayer.prototype = {
        
        constructor: YoutubePlayer,

        setPlayer: function(player) {
            this.player = player;
        },

        play: function(track) {
            if(this.playerReady) {
                this.player.loadVideoById({videoId: track.id});
            }
        },
        resume: function() {
            this.player.playVideo();
        },
        pause: function() {
            this.player.pauseVideo();
        },
        stop: function() {
            this.player.stopVideo();
        },
        replay: function() {
            this.player.seekTo(0);
        },
        seek: function(xpos) {
            this.player.seekTo(xpos * this.player.getDuration());
        },
        clear: function() {
            this.stop();
            this.player.clearVideo();
        },
        setVolume: function(volume) {
            this.player.setVolume(volume * 100);

            if( this.player.isMuted()) {
                this.player.unMute();
            }
        }
    };

    /**
     * =====================================
     *          MAIN PLAYER
     * =====================================
     */
    var Player = function(soundcloudPlayer, youtubePlayer) {
        this.soundcloudPlayer = soundcloudPlayer;
        this.youtubePlayer = youtubePlayer;
        this.init();
    };

    Player.prototype = {

        constructor: Player,

        init: function() {

            var self = this;

            self.tracks = [];
            self.state = {};
            self.notificationId = '';
            self.activePlayer = null;
            self.startTimestamp = null;

            chrome.storage.local.get('nowPlaying', function(data) {
                self.tracks = data['nowPlaying'] || [];
            });

            chrome.storage.local.get('nowPlayingState', function(data) {
                self.state = data['nowPlayingState'] || {};
            });

            chrome.storage.sync.get('scConfig', function(data) {
                self.configuration = data['scConfig'] || {showNotification: true};
            });

            chrome.storage.onChanged.addListener(function (changes, areaName) {

                if (changes['nowPlayingUpdatedBy'] && changes['nowPlayingUpdatedBy'].newValue.indexOf('foreground') > -1 && changes['nowPlaying']) {
                    self.tracks = changes['nowPlaying'].newValue;

                    if(!self.tracks.length) {
                        self.clear.call(self);
                    }
                }

                if (changes['nowPlayingState']) {

                    var oldValue = changes['nowPlayingState'].oldValue,
                        lastTrackId = oldValue && oldValue.currentTrack ?  oldValue.currentTrack.id : null;

                    self.state = changes['nowPlayingState'].newValue;

                    if (self.state.currentTrack && lastTrackId !== self.state.currentTrack.id) {

                        if (self.configuration.showNotification) {
                            var notificationOptions = {
                                type: "basic",
                                title: "Playing Track",
                                message: self.state.currentTrack.title,
                                iconUrl: self.state.currentTrack.artworkUrl
                            };

                            Utils.createOrUpdateNotification('track-change', notificationOptions, function() {});
                        }

                        if (self.state.scrobble) {

                            if(self.state.currentTrack.lastFmTrack || self.state.currentTrack.manualTrack) {

                                window.LastFM.updateNowPlaying({
                                    track: self.state.currentTrack.lastFmTrack || self.state.currentTrack.manualTrack,
                                    artist: self.state.currentTrack.lastFmArtirst || self.state.currentTrack.manualArtist
                                });

                            } else {
                                window.LastFM.checkTrackInfo(self.state.currentTrack, function(lastFmTrack) {
                                    console.log('checkTrackInfo: success');
                                    if (lastFmTrack.track) {
                                        self.state.currentTrack.lastFmTrack = lastFmTrack.track.name;
                                        self.state.currentTrack.lastFmArtirst = lastFmTrack.track.artist.name;
                                        chrome.storage.local.set({
                                            'nowPlayingState': self.state,
                                            'nowPlayingStateUpdatedBy': getStorageUpdateKey()
                                        });

                                        //TODO: inform frontend?
                                        window.LastFM.updateNowPlaying({
                                            track: lastFmTrack.track.name,
                                            artist: lastFmTrack.track.artist.name
                                        });
                                    } else if (lastFmTrack.error) {
                                        self.state.currentTrack.lastFmValidate = false;
                                        chrome.storage.local.set({
                                            'nowPlayingState': self.state,
                                            'nowPlayingStateUpdatedBy': getStorageUpdateKey()
                                        });

                                        if (!currentPort) return;
                                        currentPort.postMessage({message: 'lastfm.trackInvalid'});    
                                    }
                                }, function() {
                                    self.state.currentTrack.lastFmValidate = false;
                                    chrome.storage.local.set({
                                        'nowPlayingState': self.state,
                                        'nowPlayingStateUpdatedBy': getStorageUpdateKey()
                                    });

                                    if (!currentPort) return;
                                    currentPort.postMessage({message: 'lastfm.trackInvalid'});

                                    console.log('checkTrackInfo: error');
                                });
                            }

                        }
                    }
                }

                if (changes['scConfig']) {
                    self.configuration = changes['scConfig'].newValue;
                }
            });

        },

        next: function() {

            var nextIndex;

            if (this.state.shuffle) {
                
                nextIndex = Utils.random(0, this.tracks.length - 1);

            } else {
                
                nextIndex = this.state.currentIndex + 1;

                if (nextIndex >= this.tracks.length) {
                    nextIndex = 0;
                }
            }

            var nextTrack = this.tracks[nextIndex];

            if (nextTrack) {

                this.play(nextTrack);

                this.state.currentIndex = nextIndex;
                this.state.currentTrack = nextTrack;
                this.state.playing = true;

                chrome.storage.local.set({
                    'nowPlayingState': this.state,
                    'nowPlayingStateUpdatedBy': getStorageUpdateKey()
                });
            }
        },

        prev: function() {
            var currentIndex = this.state.currentIndex;
            var nextIndex = currentIndex - 1;

            if (nextIndex < 0) {
                nextIndex = this.tracks.length -1;
            }

            var nextTrack = this.tracks[nextIndex];

            if (nextTrack) {

                this.play(nextTrack);

                this.state.currentIndex = nextIndex;
                this.state.currentTrack = nextTrack;
                this.state.playing = true;
                
                chrome.storage.local.set({
                    'nowPlayingState': this.state,
                    'nowPlayingStateUpdatedBy': getStorageUpdateKey()
                });
            }
        },

        play: function(track) {

            if (track.origin === ORIGIN_YOUTUBE) {
                this.soundcloudPlayer.clear();
                this.youtubePlayer.play(track);
                this.activePlayer = youtubePlayer;
            } else {
                this.youtubePlayer.clear();
                this.soundcloudPlayer.play(track);
                this.activePlayer = soundcloudPlayer;
            }

            this.startTimestamp = Math.floor(Date.now() / 1000);


            chrome.browserAction.setIcon({path: 'images/icon-38.png'});
        },

        pause: function() {
            if(this.activePlayer) {
                this.activePlayer.pause();
            }
            chrome.browserAction.setIcon({path: 'images/icon-38-pause.png'});
        },

        resume: function() {

            if (!this.activePlayer) {
                this.play(this.state.currentTrack);
                return;
            }

            this.activePlayer.resume();
            chrome.browserAction.setIcon({path: 'images/icon-38.png'});
        },

        replay: function() {
            if (this.activePlayer) {
                this.activePlayer.replay();
            }
        },

        stop: function() {
            if (this.activePlayer) {
                this.activePlayer.stop();
            }

            this.state.playing = false;
            this.state.currentTime = 0;
            chrome.storage.local.set({
                'nowPlayingState': this.state,
                'nowPlayingStateUpdatedBy': getStorageUpdateKey()
            });
            chrome.browserAction.setIcon({path: 'images/icon-38-pause.png'});
        },

        clear: function() {
            if(this.activePlayer) {
                this.activePlayer.clear();
            }
        },

        seek: function(xpos) {
            this.activePlayer.seek(xpos);
        },

        setVolume: function(volume) {
            this.soundcloudPlayer.setVolume(volume);
            this.youtubePlayer.setVolume(volume);
        },

        scrobble: function(manualScrobble) {

            this.scrobbling = true;

            var self = this, track, artist;

            if (manualScrobble && manualScrobble.track && manualScrobble.artist) {
                self.state.currentTrack.manualTrack = manualScrobble.track;
                self.state.currentTrack.manualArtist = manualScrobble.artist;
            }

            track = self.state.currentTrack.lastFmTrack || self.state.currentTrack.manualTrack;
            artist = self.state.currentTrack.lastFmArtirst || self.state.currentTrack.manualArtist;

            if (!track || !artist) {
                throw new Error('LastFM scrobbling has failed because of missing information!');
            }

            window.LastFM.scrobble({
                track: track,
                artist: artist,
                startTimestamp: self.startTimestamp || Math.floor(Date.now() / 1000)
            }, function(response) {

                if (!response.error) {
                    self.scrobbling = false;
                    self.state.currentTrack.scrobbled = true;
                    self.state.currentTrack.lastFmValidate = true;
                    //TODO: replace with savePlayerState() method
                    chrome.storage.local.set({
                        'nowPlayingState': self.state,
                        'nowPlayingUpdatedBy': getStorageUpdateKey()
                    });

                    //update the track in the list
                    var currentTrack = self.tracks[self.state.currentIndex];
                    currentTrack.lastFmValidate = true;

                    if (manualScrobble) {
                        currentTrack.manualTrack = manualScrobble.track;
                        currentTrack.manualArtist = manualScrobble.artist;
                    }

                    chrome.storage.local.set({
                        'nowPlaying': self.tracks,
                        'nowPlayingUpdatedBy': getStorageUpdateKey()
                    });

                    if (!currentPort) return;
                    currentPort.postMessage({message: 'lastfm.scrobbled'});

                    if (ga)
                        ga('send', 'event', 'lastfm', 'scrobble success');
                } else {
                    if (!currentPort) return;
                    currentPort.postMessage({message: 'lastfm.scrobbleError', data: {
                        error: response.error
                    }});
                }

            }, function() {
                if (!currentPort) return;
                currentPort.postMessage({message: 'lastfm.scrobbleError'});
            });
        },

        shouldScrobble: function(currentTime) {
            return currentTime > (this.configuration.scrobbleDuration || 30) &&
                    !this.scrobbling &&
                    !this.state.currentTrack.scrobbled &&
                    (this.state.currentTrack.lastFmTrack || this.state.currentTrack.manualTrack);
        }
    };

    /**
     * ===================================================
     *                YOUTUBE IFRAME API
     * ===================================================
     */
    window.onYouTubeIframeAPIReady = function() {
        youtubePlayer.player = new YT.Player('player', {
                height: '390',
                width: '640',
                videoId: 'J1Ol6M0d9sg',
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': onPlayerError
                }
            });
    };

    window.onPlayerReady = function(event) {
      youtubePlayer.playerReady = true;
    }

    var youtubeProgressTimer;
    function onPlayerStateChange(event) {

        clearTimeout(youtubeProgressTimer);

        switch(event.data) {
            case YT.PlayerState.PLAYING:
                youtubeProgressTimer = setInterval(function() {
                    youtubePlayer.onTimeUpdate(youtubePlayer.player.getCurrentTime(), youtubePlayer.player.getDuration());
                }, 1000);
                break;

            case YT.PlayerState.ENDED:
                youtubePlayer.onEnded();
                break;

            case YT.PlayerState.PAUSED:
                //youtubePlayer.play();
                break;
            case YT.PlayerState.BUFFERING:
                break;
            case YT.PlayerState.CUED:
                break;
        }
    }

    function onPlayerError() {
        youtubePlayer.onError();
    }

}());