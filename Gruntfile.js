module.exports = function (grunt) {

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-replace');

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		base: grunt.config('base') || grunt.option('base') || process.cwd(),

		source: 'source',

		production: 'publish',

        bamboo: 'bamboo',

		clean: {
			production: ['<%= production %>/'],
			bamboo: ['<%= bamboo %>/']
		},

        copy: {
            bamboo: {
                files: [{
                	expand: true,
                	cwd: '<%= production %>/',
                    src: ['**'],
                    dest: '<%= bamboo %>/adapterjs/<%= pkg.version %>'
                }, {
                	expand: true,
                	cwd: '<%= production %>/',
                    src: ['**'],
                    dest: '<%= bamboo %>/adapterjs/<%= pkg.version_major %>.<%= pkg.version_minor %>.x'
                }, {
                	expand: true,
                	cwd: '<%= production %>/',
                    src: ['**'],
                    dest: '<%= bamboo %>/adapterjs/latest'
                }],
            },
        },

		concat: {
			options: {
				separator: '\n',
				stripBanners: false,
				banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
					'<%= grunt.template.today("yyyy-mm-dd") %> */\n\n'
			},
			production: {
				src: ['<%= source %>/*.js'],
				dest: '<%= production %>/adapter.debug.js'
			}
		},

		uglify: {
			options: {
				mangle: false,
				drop_console: true,
				compress: {
					drop_console: true
				},
				banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
					'<%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			production: {
				files: {
					'<%= production %>/adapter.min.js': ['<%= production %>/adapter.debug.js']
				}
			}
		},

		replace: {
			production: {
				options: {
					variables: {
						'version': '<%= pkg.version %>'
					},
					prefix: '@@'
				},
				files: [{
					expand: true,
					flatten: true,
					src: [
						'<%= production %>/*.js'
					],
					dest: '<%= production %>/'
				}]
			}
		},

		jshint: {
			build: {
				options: grunt.util._.merge({
					node: true
				}, grunt.file.readJSON('.jshintrc')),
				src: [
					'package.json',
					'Gruntfile.js'
				]
			},
			tests: {
				options: grunt.util._.merge({
					node: true
				}, grunt.file.readJSON('.jshintrc')),
				src: [
					'tests/*_test.js'
				]
			},
			app: {
				options: grunt.util._.merge({
					browser: true,
					devel: true,
					globals: {
						require: true,
						define: true
					}
				}, grunt.file.readJSON('.jshintrc')),
				src: [
					'<%= source %>/*.js'
				]
			}
		}
	});


    grunt.registerTask('versionise', 'Adds version meta intormation', function() {
        var done = this.async(),
            arr = [];

        grunt.util.spawn({
            cmd: 'git',
            args: ['log', '-1', '--pretty=format:%h\n %ci']
        }, function(err, result) {
            if (err) {
                return done(false);
            }
            arr = result.toString().split('\n ');
            grunt.config('meta.rev', arr[0]);
            grunt.config('meta.date', arr[1]);
        });

        try {
            var version = grunt.config('pkg.version').match('^([0-9]+)\.([0-9]+)\.([0-9]+)$')
            grunt.config('pkg.version_major', version[1]);
            grunt.config('pkg.version_minor', version[2]);
            grunt.config('pkg.version_release', version[3]);
        }
        catch (e) {
        	grunt.fatal('Version ' + grunt.config('pkg.version') + ' has not the correct format.');
        }

        grunt.util.spawn({
            cmd: 'git',
            args: [
                'for-each-ref',
                '--sort=*authordate',
                '--format="%(tag)"',
                'refs/tags'
            ]
        }, function(err, result) {
            if (err) {
                return done(false);
            }
            arr = result.toString().split('\n');

            var tag = arr[arr.length - 1];
            tag = tag.toString();
            grunt.config('meta.tag', tag);

            grunt.log.write('Version: ' + grunt.config('pkg.version') +
            	'\nRevision: ' + grunt.config('meta.rev') +
            	'\nDate: ' + grunt.config('meta.date') +
            	'\nGit Tag: ' + grunt.config('meta.tag') + '\n');

            done(result);
        });
    });

	grunt.registerTask('bamboovars', 'Write bamboo variables to file', function() {
		grunt.file.write('bamboo/vars', 'version=' + grunt.config('pkg.version'));
		grunt.log.writeln('bamboo/vars file successfully created');
	});

	grunt.registerTask('publish', [
		'versionise',
		'clean:production',
		'concat',
		'replace',
		'uglify'
	]);

	grunt.registerTask('bamboo', [
		'publish',
		'clean:bamboo',
		'copy',
		'bamboovars'
	]);
};
