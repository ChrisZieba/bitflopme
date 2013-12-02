var site = angular.module('site', []);

site.controller('CollapseCtrl', function($rootScope, $scope) {
	$scope.isCollapsed = true;
});

// register form
site.controller('RegisterCtrl', ['$scope', function($scope) {
	$scope.submitted = false;
	$scope.token = null;
}]);

site.controller('NewGameCtrl', ['$scope', function($scope) {
	$scope.submitted = false;
	$scope.token = null;
	$scope.BBCount = null;

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
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attrs, ctrl) {
			ctrl.$focused = false;
			element.bind('focus', function(evt) {
				scope.$apply(function() {
					ctrl.$focused = true;
				});
			}).bind('blur', function(evt) {
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


site.directive('smallBlind', [function () {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function (scope, elem , attrs, ctrl) {

			scope.$watch(attrs.ngModel, function (smallBlind) {

				smallBlind = parseInt(smallBlind,10);
				
				if (isNaN(smallBlind)) return;

				var inRange = (smallBlind > 0 && smallBlind <= 1000);
				var chipStack = scope.chipStack;
				ctrl.$setValidity("range", inRange);
				scope.bigBlind = smallBlind * 2;

				// check if the chipstack has been entered
				if (scope.newgame.chipStack.$dirty) {
					if (chipStack < 5 *scope.bigBlind || chipStack > 100 * scope.bigBlind) {
						scope.newgame.chipStack.$setValidity("range", false);
						scope.BBCount = null;
					} else {
						scope.newgame.chipStack.$setValidity("range", true);
						scope.BBCount = Math.round(chipStack / scope.bigBlind);
					}

				}

				return;
			});
		}
	};
}]);

site.directive('chipStack', [function () {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function (scope, elem , attrs, ctrl) {

			scope.$watch(attrs.ngModel, function (chipStack) {
				chipStack = parseInt(chipStack,10);
				var bigBlind = parseInt(scope.$eval(attrs.chipStack),10);
				var nanCS = isNaN(chipStack);
				var nanBB = isNaN(bigBlind);

				// do nothing if its not an integer...the pattern will fail
				if (nanCS || nanBB) {
					ctrl.$setValidity("range", true);
					return;
				}

				// if the range fails, return without setting the big blind
				if (chipStack < 5 * bigBlind || chipStack > 100 * bigBlind) {
					ctrl.$setValidity("range", false);
					scope.BBCount = null;
				} else {
					ctrl.$setValidity("range", true);
					scope.BBCount = Math.round(chipStack / bigBlind);
				}

				return;
			});
		}
	};
}]);