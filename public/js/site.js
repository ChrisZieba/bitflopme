var site = angular.module('site', []);

site.controller('CollapseCtrl', function($rootScope, $scope) {
	$scope.isCollapsed = true;
});

site.controller('RegisterCtrl', ['$scope', function($scope) {
	$scope.submitted = false;
	$scope.token = null;
}]);

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

site.directive('uniqueUsername', ['$http', '$timeout', function($http, $timeout) {
	return {
		require: 'ngModel',
		link: function(scope, ele, attrs, ctrl) {
			scope.$watch(attrs.ngModel, function (val) {

				// reset the validity if empty string
				if (!val) {
					ctrl.$setValidity('unique', true);
					return;
				} 

				$http({
					method: 'POST',
					url: '/api/username/',
					data: {
						'_csrf': scope.token,
						'username': val
					}
				}).success(function(data, status, headers, cfg) {
					ctrl.$setValidity('unique', true);
				}).error(function(data, status, headers, cfg) {
					if (data.pattern) {
						ctrl.$setValidity('pattern', false);
					} else if (data.taken) {
						ctrl.$setValidity('unique', false);
					}
				});

			});
		}
	}
}]);

site.directive('ngFocus', [function() {
	var FOCUS_CLASS = "ng-focused";
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attrs, ctrl) {
			ctrl.$focused = false;
			element.bind('focus', function(evt) {
				element.addClass(FOCUS_CLASS);
				scope.$apply(function() {
					ctrl.$focused = true;
				});
			}).bind('blur', function(evt) {
				element.removeClass(FOCUS_CLASS);
				scope.$apply(function() {
					ctrl.$focused = false;
				});
			});
		}
	}
}]);

site.directive('pwConfirm', [function () {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function (scope, elem , attrs, ctrl) {
			var checker = function () {
				// get the value of the first password
				var password = scope.$eval(attrs.ngModel); 
				// get the value of the other password  
				var passwordConfirm = scope.$eval(attrs.pwConfirm);
				return password == passwordConfirm;
			};

			scope.$watch(checker, function (confirm) {
				// set the form control to valid if both 
				// passwords are the same, else invalid
				ctrl.$setValidity("confirm", confirm);
			});
		}
	};
}]);