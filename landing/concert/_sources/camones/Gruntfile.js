module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    bake: {
      your_target: {
        options: {
          content: "data.json"      
        },

        files: {
          "../../index.html": "index.html",
          "../../index_de.html": "index_de.html",
          "../../index_es.html": "index_es.html",
          "../../index_fr.html": "index_fr.html",
          "../../index_jp.html": "index_jp.html",
          "../../index_nl.html": "index_nl.html",
          "../../index_pt.html": "index_pt.html",
          "../../index_it.html": "index_it.html",
          "../../index_se.html": "index_se.html"
        },
      },
    }
  });

  grunt.loadNpmTasks("grunt-bake");
  grunt.registerTask("default", ["bake"]);
};
