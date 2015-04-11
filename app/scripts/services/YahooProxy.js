(function(){
    'use strict';

    angular.module('soundCloudify')
        .service("YahooProxy", YahooProxy);

    function YahooProxy($http, $q){

        var YAHOO_QUERY_URL = 'http://query.yahooapis.com/v1/public/yql';
        
        return {
            request: request
        };

        function request(url, customTransform){
            var params = {
                url: YAHOO_QUERY_URL,
                method: 'GET',
                params: {
                    q: 'select * from json where url="' + url + '"',
                    format: 'json'
                },
            }

            params.transformResponse = ServiceHelpers.appendTransform($http.defaults.transformResponse, function(response) {
                var data;
                try {
                    data = response.query.results.json;
                } catch(e) {
                }
                return data;
            });

            if (customTransform) {
                params.transformResponse = ServiceHelpers.appendTransform(params.transformResponse, customTransform);
            }

            return $q(function(resolve, reject) {
                $http(params).success(function(data) {
                    resolve(data);
                }).error(function() {
                    reject();
                });
            });
        }
    };

}());
