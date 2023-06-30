module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    bake: {
      your_target: {
        options: {
          content: "app/data.json",
        },

        files: {
          "contact.html": "app/contact.html",
          "index.html": "app/index.html",
          "index_pt.html": "app/index_pt.html",
          "pictures.html": "app/pictures.html",
          "epk.html": "app/epk.html",
          "audio.html": "app/audio.html",
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
