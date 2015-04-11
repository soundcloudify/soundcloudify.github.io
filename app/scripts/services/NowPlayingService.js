(function(){
    'use strict';

    angular.module('soundCloudify')
        .service("NowPlaying", NowPlayingService);

    function NowPlayingService($http, CLIENT_ID, $rootScope){
        
        var NOW_PLAYING_LIST_KEY = 'nowPlaying';
        var NOW_PLAYING_STATE_KEY = 'nowPlayingState';

        var onNowPlayingChange = null, onNowPlayingStateChange = null;

        return {
            getList: getList,
            saveList: saveList,
            getState: getState,
            saveState: saveState,
            registerNowPlayingChangeHandler: registerNowPlayingChangeHandler,
            registerNowPlayingStateChangeHandler: registerNowPlayingStateChangeHandler
        };

        function registerNowPlayingChangeHandler(callback) {
            onNowPlayingChange = callback;
        }

        function registerNowPlayingStateChangeHandler(callback) {
            onNowPlayingStateChange = callback;
        }

        function getList(callback){
            callback(JSON.parse(localStorage.getItem(NOW_PLAYING_LIST_KEY)) || []);
        }

        function saveList(list) {
            localStorage.setItem(NOW_PLAYING_LIST_KEY, JSON.stringify(list));
        }

        function saveState(state) {
            localStorage.setItem(NOW_PLAYING_STATE_KEY, JSON.stringify(state));
        }

        function getState(callback) {
            callback(JSON.parse(localStorage.getItem(NOW_PLAYING_STATE_KEY)) || {});
        }
    };

}());
