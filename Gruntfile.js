module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
				mangle: false
			},
			build: {
				files: {
					'public/js/build/app.<%= pkg.version %>.min.js': 'public/js/app.js',
					'public/js/build/site.<%= pkg.version %>.min.js': 'public/js/site.js',
					'public/js/vendor/angular.min.js': 'public/js/vendor/angular.js',
					'public/js/vendor/angular-slider.min.js': 'public/js/vendor/angular-slider.js',
					'public/js/vendor/adapter.min.js': 'public/js/vendor/adapter.js'
				}
			},
		},
		cssmin: {
			combine: {
				files: {
					'public/css/build/site.<%= pkg.version %>.min.css' : ['public/css/site.css'],
					'public/css/build/game.<%= pkg.version %>.min.css' : ['public/css/game.css'],
					'public/css/vendor/bootstrap.min.css': ['public/css/vendor/bootstrap.css'],
				}
			}
		}
	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');



	// Default task(s).
	grunt.registerTask('default', ['uglify', 'cssmin']);

};