(function(){
    'use strict';

    angular.module('soundCloudify')
        .service("SuggestionService", SuggestionService);

    function SuggestionService($http, CLIENT_ID, TrackAdapter, $q, YahooProxy){
        
        return {
            suggest: youtubeSuggest
        };

        function youtubeSuggest(term) {
            var params = { q: term, client: 'firefox', ds: 'yt'};
            var suggestUrl = window.ServiceHelpers.buildUrl('http://suggestqueries.google.com/complete/search', params);

            var customTransform = function(result) {
                if (!result || !result.json || !result.json[1]) return [];
                return result.json[1].json.map(function(suggestion) {
                    return {
                        value: suggestion,
                        display: suggestion
                    };
                })
            };

            return YahooProxy.request(suggestUrl, customTransform);
        }

        function suggest(term){
            var params = { q: term, limit: 10, offset: 0, linked_partitioning: 1, client_id: CLIENT_ID };

            return $q(function(resolve, reject) {
                $http({
                    url: 'https://api-v2.soundcloud.com/search/suggest',
                    method: 'GET',
                    params: params,
                    transformResponse: ServiceHelpers.appendTransform($http.defaults.transformResponse, function(result) {
                        if (!result || !result.suggestions) return [];


                        return result.suggestions.map(function(suggestion) {
                            return {
                                value: suggestion.query.toLowerCase(),
                                display: suggestion.query
                            };
                        })
                    })
                }).success(function(data) {
                    resolve(data)
                }).error(function() {
                    reject();
                });
            });
        }

    };

}());
