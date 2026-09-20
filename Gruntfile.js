module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    nunjucks: {
      options: {
        // Carrega os dados do JSON exatamente como tinhas no bake
        data: Object.assign(
          {},
          grunt.file.readJSON("app/dados/config.json"),
          grunt.file.readJSON("app/dados/concertos.json"),
          grunt.file.readJSON("app/dados/artigos_loja.json")
        ),
        // Aponta para a pasta onde estão os ficheiros HTML e os parciais
        paths: ["app"],
      },
      render: {
        // Mantém exatamente o mesmo mapa de destino: origem
        files: {
          "index.html": "app/index.html",
          "index_en.html": "app/index_en.html",
          "pictures.html": "app/pictures.html",
          "pictures_en.html": "app/pictures_en.html",
          "audio.html": "app/audio.html",
          "audio_en.html": "app/audio_en.html",
          "contact.html": "app/contact.html",
          "contact_en.html": "app/contact_en.html",
          "mediakit.html": "app/mediakit.html",
          "mediakit_en.html": "app/mediakit_en.html",
          "shop.html": "app/shop.html",
          "shop_en.html": "app/shop_en.html",
        },
      },
    },
    watch: {
      scripts: {
        files: ["app/*.*"],
        tasks: ["nunjucks"],
        options: {
          spawn: false,
        },
      },
    },
  });

  grunt.loadNpmTasks("grunt-nunjucks-2-html");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.registerTask("default", ["nunjucks"]);
};
