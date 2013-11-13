var site = angular.module('site', []);


site.controller('CollapseCtrl', function($rootScope, $scope) {
	$scope.isCollapsed = true;
});


site.directive('collapse', [function () {

	return {
		link: function(scope, element, attrs) {

			var isCollapsed;

			scope.$watch(attrs.collapse, function(value) {
				if (value) {
					collapse();
				} else {
					expand();
				}
			});
		  
			var expand = function() {
				element.addClass('in');
				isCollapsed = false;
			};
		  
			var collapse = function() {
				isCollapsed = true;
				element.removeClass('in');
			};
		}
	};
}]);



site.directive('dropdownToggle', ['$document', function ($document) {
	var openElement = null,
		closeMenu   = angular.noop;

	return {
		restrict: 'CA',
		link: function(scope, element, attrs) {
			//scope.$watch('$location.path', function() { closeMenu(); });
			element.parent().bind('click', function() { closeMenu(); });
			element.bind('click', function (event) {

				var elementWasOpen = (element === openElement);

				event.preventDefault();
				event.stopPropagation();

				if (!!openElement) {
					closeMenu();
				}

				if (!elementWasOpen) {
					element.parent().addClass('open');
					openElement = element;
					closeMenu = function (event) {
						if (event) {
							event.preventDefault();
							event.stopPropagation();
						}
						$document.unbind('click', closeMenu);
						element.parent().removeClass('open');
						closeMenu = angular.noop;
						openElement = null;
					};
					$document.bind('click', closeMenu);
				}
			});
		}
	};
}]);

site.factory('ajax', function($http) {
   return {
		getActiveGames: function (userID) {
			 //return the promise directly.
			 return $http.get('/games').then(function (result) {
					//resolve the promise as the data
				return result.data;
			});
		}
   }
});

