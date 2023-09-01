$(document).ready(function () {
  $("#typeEventCorporate").change(function () {
    var newOptions = {
      "Choose one": "Choose one",
      "Office Party": "Office Party",
      "Christmas Party": "Christmas Party",
      "Store Opening": "Store Opening",
      "Product Promo": "Product Promo",
      Festival: "Festival",
      "Fair/Conference": "Fair/Conference",
      Other: "Other",
    };

    var $el = $("#occasion");
    $el.empty();
    $.each(newOptions, function (key, value) {
      $el.append($("<option></option>").attr("value", value).text(key));
    });
  });

  $("#typeEventPrivate").change(function (oEvvbet) {
    var newOptions = {
      "Choose one": "Choose one",
      Wedding: "Wedding",
      "Student Event": "Student Event",
      "Birthday Event": "Birthday Event",
      Other: "Other",
    };

    var $el = $("#occasion");
    $el.empty();
    $.each(newOptions, function (key, value) {
      $el.append($("<option></option>").attr("value", value).text(key));
    });
  });

  $("#zrqForm").on("submit", function (oEvent) {
    if (!this.checkValidity()) {    
      oEvent.preventDefault();
      oEvent.stopPropagation();
    }
     
    this.classList.add("was-validated");
  });
});


$(function () {
  // use plugins and options as needed, for options, detail see
  // https://www.i18next.com
  i18next
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languageDetector
    .use(i18nextBrowserLanguageDetector)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
      debug: true,
      fallbackLng: 'en',
      resources: {
        en: {
            translation: {
              intro: {
                title: 'Landing Page zrq',
                subTitle: 'Some subtitle'
              }
            }
          }
      }
    }, (err, t) => {
      if (err) return console.error(err);

      // for options see
      // https://github.com/i18next/jquery-i18next#initialize-the-plugin
      jqueryI18next.init(i18next, $, { useOptionsAttr: true });

      // start localizing, details:
      // https://github.com/i18next/jquery-i18next#usage-of-selector-function
      $('body').localize();
    });
});