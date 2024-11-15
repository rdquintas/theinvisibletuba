module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    bake: {
      your_target: {
        options: {
          content: "app/data.json",
        },

        files: {
          "contact_en.html": "app/contact_en.html",
          "contact.html": "app/contact.html",
          "index.html": "app/index.html",
          "index_en.html": "app/index_en.html",
          "concerts.html": "app/concerts.html",
          "concerts_en.html": "app/concerts_en.html",
          "pictures.html": "app/pictures.html",
          "pictures_en.html": "app/pictures_en.html",
          "audio.html": "app/audio.html",
          "audio_en.html": "app/audio_en.html",
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
