module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				files: {
					'public/js/app.min.js': 'public/js/app.js',
					'public/js/site.min.js': 'public/js/site.js',
					//'public/js/vendor/angular.min.js': 'public/js/vendor/angular.js',
					//'public/js/vendor/angular-slider.min.js': 'public/js/vendor/angular-slider.js',
					//'public/js/vendor/adapter.min.js': 'public/js/vendor/adapter.js'
				}
			},
		},
		cssmin: {
			combine: {
				files: {
					'public/css/site.min.css': ['public/css/site.css'],
					'public/css/game.min.css': ['public/css/game.css'],
					'public/css/vendor/bootstrap.min.css': ['public/css/vendor/bootstrap.css'],
					'public/css/vendor/angular-slider.min.css': ['public/css/vendor/angular-slider.css'],
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