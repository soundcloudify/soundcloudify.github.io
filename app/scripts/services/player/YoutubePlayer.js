(function(){
    'use strict';

    angular.module('soundCloudify')
        .service("YouTubePlayer", YouTubePlayer);

    function YouTubePlayer($rootScope, CLIENT_ID, $document){
        this.player = null;
        this.playerReady = false;

        var self = this;
        var youtubeProgressTimer;

        var tag = $document[0].createElement('script');

        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = $document[0].getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        /**
         * ===================================================
         *                YOUTUBE IFRAME API
         * ===================================================
         */
        window.onYouTubeIframeAPIReady = function() {
            self.player = new YT.Player('invisible-player', {
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
          self.playerReady = true;
        }

        this.play = function(track) {
            if(this.playerReady) {
                this.player.loadVideoById({videoId: track.id});
            }
        };
        this.resume = function() {
            this.player.playVideo();
        };
        this.pause = function() {
            this.player.pauseVideo();
        };
        this.stop = function() {
            this.player.stopVideo();
        };
        this.replay = function() {
            this.player.seekTo(0);
        };
        this.seek = function(xpos) {
            this.player.seekTo(xpos * this.player.getDuration());
        };
        this.clear = function() {
            this.stop();
            this.player.clearVideo();
        };
        this.setVolume = function(volume) {
            this.player.setVolume(volume * 100);

            if( this.player.isMuted()) {
                this.player.unMute();
            }
        };

        function onPlayerStateChange(event) {

            clearTimeout(youtubeProgressTimer);

            switch(event.data) {
                case YT.PlayerState.PLAYING:
                    youtubeProgressTimer = setInterval(function() {
                        $rootScope.$broadcast('player.timeupdate', {
                            currentTime: self.player.getCurrentTime(),
                            duration: self.player.getDuration()
                        });
                    }, 1000);
                    break;

                case YT.PlayerState.ENDED:
                    $rootScope.$broadcast('player.ended');
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
            $rootScope.$broadcast('player.error');
        }
    };

}());
