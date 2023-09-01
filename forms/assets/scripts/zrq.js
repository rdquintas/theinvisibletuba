$(document).ready(function () {
  $("#typeEventCorporate").change(function () {
    // $('title').text($.t(i18next.t('intro.button')));
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

  $("#languagePT").change((a, b, c) => {
    const chosenLng = "pt";
    i18next.changeLanguage(chosenLng, () => {
      $("body").localize();
    });
  });

  $("#languageEN").change((a, b, c) => {
    const chosenLng = "en";
    i18next.changeLanguage(chosenLng, () => {
      $("body").localize();
    });
  });

  // https://www.i18next.com
  i18next
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languageDetector
    // .use(i18nextBrowserLanguageDetector)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init(
      {
        debug: true,
        fallbackLng: "en",
        resources: {
          en: {
            translation: {
              intro: {
                button: "Go to our website",
                title1: "Do you want to",
                title2: "book us ?",
                title3:
                  "Plese fill the form bellow and we'll send you a quote.",
                en: "English",
                pt: "Português",
              },
              form: {
                required: "Required Field",
                name_lbl: "Your name",
                email_lbl: "Your email",
                email_phd: "Your email address",
                type_lbl: "Type of event",
                corporate: "Corporate",
                private: "Private",
                occasion_lbl: "Occasion",
                corporate_1: "Choose one",
                corporate_2: "Office Party",
                corporate_3: "Christmas Party",
                corporate_4: "Store Opening",
                corporate_5: "Product Promo",
                corporate_6: "Festival",
                corporate_7: "Fair/Conference",
                corporate_8: "Other",
                private_1: "Choose one",
                private_2: "Wedding",
                private_3: "Student Event",
                private_4: "Birthday Event",
                private_5: "Other",
                date_lbl: "Date of event",
                time_lbl: "Time and Duration",
                time_phd: "For ex: from 20h till midnight",
                location_lbl: "Location of event",
                location_phd: "For ex: Sintra...",
                guests_lbl: "Number of guests",
                guests_phd: "How many guests more or less...",
                environment_lbl: "Environment",
                environment1: "Indoors",
                environment2: "Outdoors",
                environment3: "Don't know",
                comments_lbl: "Comments",
                comments_phd: "Any extra comments or requirements...",
                submit: "Submit form",
              },
            },
          },
          pt: {
            translation: {
              intro: {
                button: "Ir para o nosso website",
                title1: "Queres",
                title2: "contratar-nos ?",
                title3:
                  "Preenche o formulário seguinte, para te podermos enviar um orçamento.",
                en: "English",
                pt: "Português",
              },
              form: {
                required: "Campo obrigatório",
                name_lbl: "O teu nome",
                email_lbl: "Email",
                email_phd: "O teu email",
                type_lbl: "Tipo de evento",
                corporate: "Empresarial",
                private: "Privado",
                occasion_lbl: "Ocasião",
                corporate_1: "Escolhe um",
                corporate_2: "Festa Escritório",
                corporate_3: "Festa de Natal",
                corporate_4: "Abertura Loja",
                corporate_5: "Lançamento Produto",
                corporate_6: "Festival",
                corporate_7: "Feira/Conferencia",
                corporate_8: "Outro",
                private_1: "Escolhe um",
                private_2: "Casamento",
                private_3: "Festa Estudantes",
                private_4: "Aniversário",
                private_5: "Outro",
                date_lbl: "Data do evento",
                time_lbl: "Horário e Duração",
                time_phd: "Por ex: das 20h até às 00h",
                location_lbl: "Local do evento",
                location_phd: "Por ex: Sintra...",
                guests_lbl: "Número de convidados",
                guests_phd: "Coloca um número aprox.",
                environment_lbl: "Espaço",
                environment1: "Interior",
                environment2: "Ar livre",
                environment3: "Não sei",
                comments_lbl: "Comentários",
                comments_phd: "Qualquer comentário ou requisito que queiras acrescentar...",
                submit: "Enviar pedido",
              },
            },
          },
        },
      },
      (err, t) => {
        if (err) return console.error(err);

        // for options see
        // https://github.com/i18next/jquery-i18next#initialize-the-plugin
        jqueryI18next.init(i18next, $, { useOptionsAttr: true });

        // start localizing, details:
        // https://github.com/i18next/jquery-i18next#usage-of-selector-function
        $("body").localize();
      }
    );
});
