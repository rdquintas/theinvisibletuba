module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    bake: {
      your_target: {
        options: {
          // Task-specific options go here.
        },

        files: {
          "contact.html": "app/contact.html",
          "index.html": "app/index.html",
          "pictures.html": "app/pictures.html",
          "theband.html": "app/theband.html",
        },
      },
    },
    watch: {
      scripts: {
        files: ["app/*.*"],
        tasks: ["bake"],
        options: {
          spawn: false,
        },
      },
    },
  });

  grunt.loadNpmTasks("grunt-bake");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.registerTask("default", ["bake"]);
};
