(function(){
    'use strict';

    angular.module('soundcloudify.web')
        .service("SoundCloudPlayer", SoundCloudPlayer);

    function SoundCloudPlayer($rootScope, CLIENT_ID){

        var self = this;
        
        this.audio = document.createElement('audio');
        this.audio.volume = 0.5;

        this.audio.addEventListener('timeupdate', function() {
            $rootScope.$broadcast('player.timeupdate', {currentTime: self.audio.currentTime, duration: self.audio.duration});
        }, false);

        this.audio.addEventListener('ended', function() {
            $rootScope.$broadcast('player.ended');
        }, false);

        this.audio.addEventListener('error', function() {
            $rootScope.$broadcast('player.error');
        }, false);

        this.play = function(track) {
            var src = track.streamUrl + '?client_id=' + CLIENT_ID;

            if (src === this.audio.src) {
                this.replay();
            } else {
                this.audio.src = src;
                this.audio.play();
            }

        };
        
        this.resume = function() {
            this.audio.play();
        };

        this.pause = function() {
            this.audio.pause();
        };

        this.stop = function() {
            this.audio.pause();
            this.audio.currentTime = 0;
        };

        this.replay = function() {
            this.stop();
            this.resume();
        };

        this.seek = function(xpos) {
            if (!this.audio.readyState) return false;
            this.audio.currentTime = (xpos * this.audio.duration);
        };

        this.clear = function() {
            this.audio.pause();
            this.audio.src = '';
            this.audio.removeAttribute('src');
        };

        this.setVolume = function(volume) {
            this.audio.volume = volume;
        };
    };

}());
