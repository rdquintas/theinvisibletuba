module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    bake: {
      your_target: {
        options: {
          content: "app/data.json",
        },

        files: {
          "index.html": "app/index.html",
          "index_en.html": "app/index_en.html",
          "index_es.html": "app/index_es.html",
          "pictures.html": "app/pictures.html",
          "pictures_en.html": "app/pictures_en.html",
          "pictures_es.html": "app/pictures_es.html",
          "audio.html": "app/audio.html",
          "audio_en.html": "app/audio_en.html",
          "audio_es.html": "app/audio_es.html",
          "contact.html": "app/contact.html",
          "contact_en.html": "app/contact_en.html",
          "contact_es.html": "app/contact_es.html"
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
