(function() {

	var web = angular.module('soundcloudify.web', ['soundcloudify.core']);

	web.config(['$stateProvider', '$urlRouterProvider', '$mdThemingProvider', '$compileProvider', '$httpProvider', '$indexedDBProvider', 'SCConfigurationProvider',
		function($stateProvider, $urlRouterProvider, $mdThemingProvider, $compileProvider, $httpProvider, $indexedDBProvider, SCConfigurationProvider) {

			$stateProvider
				.state('nowPlaying', {
					url: "/now-playing",
					templateUrl: "partials/nowPlaying.html",
					controller: 'NowPlayingController',
					controllerAs: 'vm'
				})
				.state('search', {
					url: "/search",
					templateUrl: "partials/search.html",
					controller: 'SearchController'
				})
				//===============================================
				// PLAYLIST
				//===============================================
				.state('playlist', {
					abstract: true,
					url: "/playlist",
					templateUrl: "partials/playlist/playlist.html",
					controller: 'PlaylistController',
					controllerAs: 'playlistCtrl'
				})
					.state('playlist.list', {
						url: "",
						templateUrl: "partials/playlist/list.html"
					})
					.state('playlist.view', {
						url: "/:playlistIndex",
						templateUrl: "partials/playlist/view.html",
						controller: 'PlaylistViewController',
						controllerAs: 'playlistViewCtrl'
					})
				//===============================================
				// CHARTS
				//===============================================
				.state('charts', {
					abstract: true,
					url: "/charts",
					templateUrl: "partials/charts/charts.html",
					controller: 'ChartsController',
					controllerAs: 'chartsCtrl'
				})
					.state('charts.list', {
						url: "",
						templateUrl: "partials/charts/list.html"
					})
					.state('charts.detail', {
						url: "/:category",
						templateUrl: "partials/charts/view.html",
						controller: 'ChartsViewController',
						controllerAs: 'viewCtrl'
					});

			$urlRouterProvider.otherwise("/charts");

			$mdThemingProvider.definePalette('amazingPaletteName', {
				'50': 'ffebee',
				'100': 'ffcdd2',
				'200': 'ef9a9a',
				'300': 'e57373',
				'400': 'ef5350',
				'500': 'f44336',
				'600': 'e53935',
				'700': 'd32f2f',
				'800': 'c62828',
				'900': 'b71c1c',
				'A100': 'ff8a80',
				'A200': 'ff5252',
				'A400': 'ff1744',
				'A700': 'd50000',
				'contrastDefaultColor': 'light',    // whether, by default, text (contrast)
				                                	// on this palette should be dark or light
				'contrastDarkColors': ['50', '100', //hues which contrast should be 'dark' by default
					'200', '300', '400', 'A100'],
				'contrastLightColors': undefined    // could also specify this if default was 'dark'
			});

			$mdThemingProvider.theme('default')
			    .primaryPalette('light-green').dark();

			$compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob|chrome-extension):|data:image\/)/);

            $httpProvider.interceptors.push('HttpRequestInterceptor');

            $indexedDBProvider
                .connection('soundcloudify')
                .upgradeDatabase(1, function(event, db, tx){
                    console.log('upgradeDatabase');
                    var playlistStore = db.createObjectStore('playlist', {keyPath: 'uuid'});
                    playlistStore.createIndex('sync', 'sync', {unique: false});
                    playlistStore.createIndex('deleted', 'deleted', {unique: false});

                    var nowplayingStore = db.createObjectStore('nowplaying', {keyPath: 'uuid'});
                    nowplayingStore.createIndex("sync", "sync", { unique: false });
                    nowplayingStore.createIndex("deleted", "deleted", { unique: false });

                    var starStore = db.createObjectStore('starred', {keyPath: 'id'});
                    starStore.createIndex("sync", "sync", { unique: false });
                    starStore.createIndex("deleted", "deleted", { unique: false });
                });

			//TODO: reenable it in production
			$compileProvider.debugInfoEnabled(false);

            SCConfigurationProvider.configureClient('web');
		}
	]);

	web.run(function($rootScope, GATracker, $location, PlaylistService, StarService, SyncService, $window, $http, API_ENDPOINT) {
		$rootScope.$on('$stateChangeSuccess', function(event) {
			GATracker.trackPageView($location.path());
		});

        PlaylistService.init();

        StarService.init();

        SyncService.init();

        $window.onSignIn = function(googleUser) {
            var profile = googleUser.getBasicProfile();
            var gid = localStorage.getItem('gid');
            if (gid === null || gid === 'undefined') {
                $http({
                    url: API_ENDPOINT + '/signup',
                    method: 'POST',
                    data: {
                        gid: profile.getId(),
                        email: profile.getEmail()
                    }
                }).success(function(user) {
                    if (user.id) {
                        localStorage.setItem('gid', user.id);
                    }
                });
            }
            $rootScope.$broadcast('identity.confirm', {
                identity: {
                    email: profile.getEmail(),
                    id: profile.getId(),
                    image: profile.getImageUrl(),
                    name: profile.getName()
                }
            });
        }
	});

	angular.element(document).ready(function() {
		//angular.bootstrap(document, ["soundCloudify"]);
	    setTimeout(function() { angular.bootstrap(document, ["soundcloudify.web"]); }, 100);
	});

}());
