(function() {
    'use strict';

    angular.module('soundCloudify').directive('googleSignin', function($window){
        return {
            restrict: 'E',
            template: '<div class="goggle-signin"></div>',
            replace: true,
            link: function($scope, iElm, iAttrs, controller) {

                var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
                po.src = 'https://apis.google.com/js/platform.js';
                var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);

                po.onload = function() {

                    // gapi.auth2.init({
                    //     client_id: CLIENT_ID
                    // });

                    gapi.signin2.render(iElm[0], {
                        'scope': 'email',
                        'width': 190,
                        // 'height': 50,
                        'longtitle': true,
                        'theme': 'dark',
                        'onsuccess': $window.onSignIn,
                        'onfailure': function onfailure (argument) {
                            console.log('failed to sign in');
                        }
                    });
                };
            }
        };
    });



}());
