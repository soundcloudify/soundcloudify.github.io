(function() {

    angular.module('soundCloudify')
            .filter('scArtwork', scArtworkFilter);

    function scArtworkFilter() {
        return function(value) {

            if (!value) return '';

            if (value.indexOf('-large') !== -1) {
                return value.replace('-large.', '-t250x250.');
            } else if (value.indexOf('default.jpg') !== -1) {
                return value.replace('default.jpg', 'hqdefault.jpg');
            }

            return value;
        };
    }
}());