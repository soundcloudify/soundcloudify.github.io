(function(){
    'use strict';

    angular.module('soundCloudify')
        .service("SearchService", SearchService);

    var DEFAULT_LIMIT = 20;

    function SearchService($http, CLIENT_ID, TrackAdapter, $q, YahooProxy){

        var customTransform = function(result) {
            if (!result || !result.collection) return [];
            return {
                tracks: TrackAdapter.adaptMultiple(result.collection, 'sc')
            };
        };
        
        return {
            search: search,
            searchYoutube: searchYoutube
        };

        function search(term, pagingObject){

            return $q(function(resolve, reject) {
                
                var params = { q: term, limit: pagingObject.limit, offset: pagingObject.skip, linked_partitioning: 1, client_id: CLIENT_ID };
                var soundcloudUrl = window.ServiceHelpers.buildUrl('https://api-v2.soundcloud.com/search/tracks', params)

                YahooProxy
                        .request(soundcloudUrl, customTransform)
                        .then(function(data) {
                            resolve(data);
                        });
            })
        }

        function searchYoutube(term, pagingObject) {

            var defer = $q.defer();

            var params = {
                key: 'AIzaSyDGbUJxAkFnaJqlTD4NwDmzWxXAk55gFh4',
                type: 'video',
                maxResults: pagingObject.limit,
                pageToken: pagingObject.nextPageToken,
                part: 'id',
                //fields: 'items/id',
                q: term
            };

            var nextPageToken = '';

            $http({
                url: 'https://www.googleapis.com/youtube/v3/search',
                method: 'GET',
                params: params
            }).success(function(result) {
                if (!result || !result.items) defer.resolve([]);

                nextPageToken = result.nextPageToken;

                var ids = result.items.map(function(item) {
                    return item.id.videoId;
                });

                var parts = ['id', 'snippet', 'statistics', 'status'];
                var fields = [
                    'items/id',
                    'items/snippet/title',
                    'items/snippet/thumbnails',
                    'items/statistics/viewCount',
                    'items/statistics/likeCount',
                    'items/status/embeddable'
                ];

                var secondRequestParams = {
                    key: 'AIzaSyDGbUJxAkFnaJqlTD4NwDmzWxXAk55gFh4',
                    type: 'video',
                    maxResults: pagingObject.limit,
                    part: parts.join(','),
                    fields: fields.join(','),
                    id: ids.join(',')
                };

                $http({
                    url: 'https://www.googleapis.com/youtube/v3/videos',
                    method: 'GET',
                    params: secondRequestParams,
                    transformResponse: ServiceHelpers.appendTransform($http.defaults.transformResponse, function(result) {
                        if (!result || !result.items) return [];
                        return {
                            nextPageToken: nextPageToken,
                            tracks: TrackAdapter.adaptMultiple(result.items, 'yt')
                        }
                    })
                }).success(function(data) {
                    defer.resolve(data);
                }).error(function() {
                    defer.reject();
                });

            }).error(function() {
                defer.reject();
            });

            return defer.promise;
        }
    };

}());
