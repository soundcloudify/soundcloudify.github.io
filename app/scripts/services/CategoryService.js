(function(){
    'use strict';

    angular.module('soundCloudify')
        .service("Category", CategoryService);

    function CategoryService($http, CLIENT_ID, TrackAdapter, $q, YahooProxy){

        var cachedCategory = JSON.parse(localStorage.getItem('charts')) || [];
        var SOUNDCLOUD_API_V2_URL = 'https://api-v2.soundcloud.com';

        return {
            getList: getList,
            getTracks: getTracks
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
    };

}());
