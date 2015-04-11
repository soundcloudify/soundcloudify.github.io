(function() {

    'use strict';

    var soundCloudify = angular.module('soundCloudify');

    soundCloudify.service('CorePlayer', 
        function($rootScope, $window, $mdToast, Messaging, NowPlaying, CLIENT_ID, GATracker, LastFMAuthentication,
                    SoundCloudPlayer, YouTubePlayer) {

        var ORIGIN_YOUTUBE = 'yt';
        var ORIGIN_SOUNDCLOUD = 'sc';

        function debounce(fn, delay) {
            var timer = null;
            return function () {
                var context = this, args = arguments;
                clearTimeout(timer);
                timer = setTimeout(function () {
                    fn.apply(context, args);
                }, delay);
            };
        }

        var DEFAULT_STATE = {
            currentTrack: false,
            currentIndex: 0,
            playing: false,
            currentTime: 0,
            duration: 0,
            volume: 0.5,
            repeat: 0,
            shuffle: false,
            scrobble: false
        };

        var self = this;

        this.tracks = [];
        this.state = DEFAULT_STATE;
        this.startTimestamp = null;
        this.activePlayer = null;

        NowPlaying.getList(function(tracks) {
            self.tracks = tracks;
        });

        NowPlaying.getState(function(savedState) {
            if (savedState && typeof savedState.volume !== 'undefined') {
                self.state = savedState;
            }
        });

        this.add = function(track, andPlay) {

            andPlay = andPlay || true;

            if (track) {
                //we need to do a copy here to ensure each track we add
                //to the playlist will have a unique id
                track = angular.copy(track);
                track.uuid = window.ServiceHelpers.ID();
                
                this.tracks.unshift(track);

                NowPlaying.saveList(this.tracks);
            }

            if (andPlay) {
                this.play(0);
            }

        };

        /**
         * Add track to position after the current index, in order to play this track  next
         */
        this.playNext = function(track) {
            
            if (track) {
                track = angular.copy(track);
                track.uuid = window.ServiceHelpers.ID();
                
                var currentIndex = this.state.currentIndex;
                this.tracks.splice(currentIndex + 1, 0, track);

                NowPlaying.saveList(this.tracks);
            }

        };

        /*
         * Clear the current list
         * Add all tracks to the list
         * Start play at position 0s
         */
        this.playAll = function(tracks) {

            this.tracks = tracks;
            NowPlaying.saveList(this.tracks);

            angular.extend(this.state, {
                currentTrack: false,
                currentIndex: 0,
                playing: false,
                currentTime: 0,
                duration: 0
            });

            this.play(0);
        };

        /**
         * Remove track at specific index
         */
        this.remove = function(index) {
            this.tracks.splice(index, 1);

            if (this.state.currentIndex === index) {
                this.play(index);
            } else if (index < this.state.currentIndex){
                this.state.currentIndex --;
            }

            NowPlaying.saveList(this.tracks);
            NowPlaying.saveState(this.state);
        };

        this.clear = function() {
            this.tracks = [];

            angular.extend(this.state, {
                currentTrack: null,
                currentIndex: 0,
                playing: false,
                currentTime: 0,
                duration: 0
            });

            NowPlaying.saveList(this.tracks);
            NowPlaying.saveState(this.state);
            
            if(this.activePlayer) {
                this.activePlayer.clear();
            }
        }

        this.play = function(index) {

            index = index || 0;

            var track = this.tracks[index];

            if (!track) {
                throw 'No track found for playing, index=' + index;
            }

            if (track) {
                this.state.playing = true;
                this.state.currentTime = 0;
                this.state.duration = 0;
                this.state.currentTrack = track;
                this.state.currentIndex = index;

                if (track.error) {
                    track.error = false
                    NowPlaying.saveList(this.tracks);
                };

                NowPlaying.saveState(this.state);
                
                if (track.origin === ORIGIN_YOUTUBE) {
                    SoundCloudPlayer.clear();
                    YouTubePlayer.play(track);
                    this.activePlayer = YouTubePlayer;
                } else {
                    YouTubePlayer.clear();
                    SoundCloudPlayer.play(track);
                    this.activePlayer = SoundCloudPlayer;
                }

                this.startTimestamp = Math.floor(Date.now() / 1000);
            }
        };

        this.pause = function() {
            this.state.playing = false;
            NowPlaying.saveState(this.state);
            
            if(this.activePlayer) {
                this.activePlayer.pause();
            }
        };

        this.resume = function() {
            this.state.playing = true;
            NowPlaying.saveState(this.state);
            if (!this.activePlayer) {
                this.play(this.state.currentTrack);
                return;
            }

            this.activePlayer.resume();
        };

        this.stop = function() {
            this.state.playing = false;
            this.state.currentTime = 0;
            NowPlaying.saveState(this.state);

            if (this.activePlayer) {
                this.activePlayer.stop();
            }
        };

        this.playPause = function(index) {
            if (typeof index !== 'undefined') {
                if (index === this.state.currentIndex) {
                    this.state.playing ? this.pause() : this.resume();
                } else {
                    this.play(index);
                }
                return;
            }

            this.state.playing ? this.pause() : this.resume();
        };

        this.next = function() {
            var nextIndex;

            if (this.state.shuffle) {
                
                nextIndex = Utils.random(0, this.tracks.length - 1);

            } else {
                
                nextIndex = this.state.currentIndex + 1;

                if (nextIndex >= this.tracks.length) {
                    nextIndex = 0;
                }
            }

            this.play(nextIndex);
        };

        this.previous = function() {
            var currentIndex = this.state.currentIndex;
            var nextIndex = currentIndex - 1;

            if (nextIndex < 0) {
                nextIndex = this.tracks.length -1;
            }

            this.play(nextIndex);
        };

        this.seek = function(xpos) {
            this.state.currentTime = xpos * this.state.duration;

            if (this.activePlayer) {
                this.activePlayer.seek(xpos);
            }
        };

        this.updateState = function(data) {
            if(!this.state.currentTrack) {
                this.state.currentTrack = data.track;
                this.state.playing = true;
            }

            this.state.currentTime = data.currentTime;
            this.state.duration = data.duration;
        };

        this.isPlaying = function(trackId) {
            if (!this.state.currentTrack) return false;
            return this.state.currentTrack.id === trackId;
        };

        var deboundSaveVolume = debounce(function() {
            NowPlaying.saveState(self.state);
        }, 500);

        this.setVolume = function(volume) {
            this.state.volume = volume;
            SoundCloudPlayer.setVolume(volume);
            YouTubePlayer.setVolume(volume);
            deboundSaveVolume();
        };

        this.toggleRepeat = function() {
            if (this.state.repeat === 0) {
                this.state.repeat = 1; // repeat all
            } else if (this.state.repeat === 1) {
                this.state.repeat = 2; // repeat one
            } else {
                this.state.repeat = 0; // no repeat
            }
            NowPlaying.saveState(this.state);
            GATracker.trackPlayer('toggle repeat', this.state.repeat === 1 ? 'all' : this.state.repeat === 2 ? 'one' : 'none');
        };

        this.toggleShuffle = function() {
            this.state.shuffle = !this.state.shuffle;
            NowPlaying.saveState(this.state);
            GATracker.trackPlayer('toggle shuffle', this.state.shuffle ? 'on' : 'off');
        };

        this.toggleScrobble = function() {

            var self = this;

            if (!LastFMAuthentication.isAuth()) {
                LastFMAuthentication.auth(function() {
                    self.state.scrobble = true;
                });
            } else {
                self.state.scrobble = !self.state.scrobble;
            }

            NowPlaying.saveState(self.state);
            GATracker.trackPlayer('toggle scrobble', this.state.scrobble ? 'on' : 'off');
        };

        this.sendManualScrobble = function(manualScrobble) {
            Messaging.sendManualScrobbleMessage(manualScrobble);

            this.tracks[this.state.currentIndex].manualTrack = manualScrobble.track;
            this.tracks[this.state.currentIndex].manualArtist = manualScrobble.artist;

            NowPlaying.saveList(this.tracks);
        };

        this.markCurrentTrackError = function() {
            this.state.currentTrack.error = true;
            this.tracks[this.state.currentIndex].error = true;
            NowPlaying.saveState(this.state);
            NowPlaying.saveList(this.tracks);
            GATracker.trackPlayer('track error');
        };


        //Communication
        $rootScope.$on('player.timeupdate', function(event, args) {
            $rootScope.$apply(function() {
                self.updateState.call(self, args);
            });
        });

        $rootScope.$on('player.error', function() {
            $mdToast.show({
                templateUrl: 'scripts/views/toastError.html',
                hideDelay: 1000,
                position: 'bottom right',
                parent: angular.element(document.querySelector('#tab-content'))
            });

            self.markCurrentTrackError();
        });

        $rootScope.$on('player.ended', function() {
            $rootScope.$apply(function() {
                if (self.state.repeat === 0) {
                    if (self.state.currentIndex === self.tracks.length - 1) {
                        self.stop();
                        self.seek(0);
                        currentPort.postMessage({message: 'scd.ended'});
                    } else {
                        self.next.call(self);
                    }
                } else if (self.state.repeat === 1) {
                    self.next.call(self);
                } else {
                    self.replay.call(self);
                }
            });
            
        });

        // Messaging.registerLastFmInvalidHandler(function() {
        //     self.state.currentTrack.lastFmValidate = false;
        // });

        // Messaging.registerLastFmScrobbledHandler(function() {
        //     self.state.currentTrack.scrobbled = true;
        //     self.state.currentTrack.lastFmValidate = true;
        // })
    });
})();


