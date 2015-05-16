(function(){
    'use strict';

    angular.module('soundCloudify')
        .service("Category", CategoryService);

    function CategoryService($http, CLIENT_ID, API_ENDPOINT, TrackAdapter, $q, YahooProxy){

        var cachedCategory = JSON.parse(localStorage.getItem('charts')) || [];
        var SOUNDCLOUD_API_V2_URL = 'https://api-v2.soundcloud.com';
        var cachedRedditVideoIds = [];

        return {
            getList: getList,
            getTracks: getTracks,
            getRedditHot: getRedditHot
        };

        function getList(){

            return $q(function(resolve, reject) {

                if (cachedCategory.length) {
                    resolve(cachedCategory);
                } else {
                    var soundcloudParams = { limit: 10, offset: 0, linked_partitioning: 1, client_id: CLIENT_ID };
                    var soundcloudUrl = window.ServiceHelpers.buildUrl(SOUNDCLOUD_API_V2_URL + '/explore/categories', soundcloudParams)

                    YahooProxy
                        .request(soundcloudUrl)
                        .then(function(data) {
                            cachedCategory = data['music'] || [];
                            resolve(cachedCategory);
                            localStorage.setItem('charts', JSON.stringify(cachedCategory));
                        });
                }
            });

        }

        function getTracks(category, pagingObject) {
            var soundcloudParams = { limit: pagingObject.limit, offset: pagingObject.skip, linked_partitioning: 1, client_id: CLIENT_ID };
            var soundcloudUrl = window.ServiceHelpers.buildUrl(SOUNDCLOUD_API_V2_URL + '/explore/' + category, soundcloudParams);

            var customTransform = function(result) {
                if (!result || !result.tracks) return [];
                return {
                    tracks: TrackAdapter.adaptMultiple(result.tracks, 'sc')
                };
            };

            return YahooProxy.request(soundcloudUrl, customTransform);
        }

        function getRedditHot(pagingObject) {
            return $q(function(resolve, reject) {

                if (!cachedRedditVideoIds.length) {

                    $http({
                        url: API_ENDPOINT + '/reddit',
                        method: 'GET'
                    }).success(function(videoIds) {

                        cachedRedditVideoIds = videoIds;

                        var pagingVideoIds = angular.copy(cachedRedditVideoIds).splice(pagingObject.skip, pagingObject.limit);
                        getVideosInfo(pagingVideoIds, resolve, reject);

                    }).error(function() {
                        reject();
                    })
                } else {

                    var pagingVideoIds = angular.copy(cachedRedditVideoIds).splice(pagingObject.skip, pagingObject.limit);
                    getVideosInfo(pagingVideoIds, resolve, reject);

                }

            });
        }

        function getVideosInfo(ids, resolve, reject) {

            var parts = ['id', 'snippet', 'statistics', 'status'];
            var fields = [
                'items/id',
                'items/snippet/title',
                'items/snippet/thumbnails',
                'items/statistics/viewCount',
                'items/statistics/likeCount',
                'items/status/embeddable'
            ];

            var requestParam = {
                key: 'AIzaSyDGbUJxAkFnaJqlTD4NwDmzWxXAk55gFh4',
                type: 'video',
                maxResults: ids.length,
                part: parts.join(','),
                fields: fields.join(','),
                id: ids.join(',')
            };

            $http({
                url: 'https://www.googleapis.com/youtube/v3/videos',
                method: 'GET',
                params: requestParam,
                transformResponse: ServiceHelpers.appendTransform($http.defaults.transformResponse, function(result) {
                    if (!result || !result.items) return [];
                    return {
                        tracks: TrackAdapter.adaptMultiple(result.items, 'yt')
                    }
                })
            }).success(function(data) {
                resolve(data);
            }).error(function() {
                reject();
            });

        }
    };

}());
