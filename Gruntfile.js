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
          "contact_pt.html": "app/contact_pt.html",
          "index.html": "app/index.html",
          "index_pt.html": "app/index_pt.html",
          "pictures.html": "app/pictures.html",
          "pictures_pt.html": "app/pictures_pt.html",
          "epk.html": "app/epk.html",
          "epk_pt.html": "app/epk_pt.html",
          "audio.html": "app/audio.html",
          "audio_pt.html": "app/audio_pt.html",
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
