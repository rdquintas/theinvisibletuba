$.urlParam = function (name) {
  var results = new RegExp("[?&]" + name + "=([^&#]*)").exec(
    window.location.href
  );
  if (results == null) {
    return null;
  }
  return decodeURI(results[1]) || 0;
};

$(document).ready(function () {
  var tagFromURL = $.urlParam("tag");

  $("#zrqForm")[0].reset();

  if (tagFromURL) {
    $("#tag").val(tagFromURL);
  } else {
    $("#tag").val("");
  }

  // $("#typeEventCorporate").change(function () {
  //   var newOptions = {
  //     [i18next.t("form.corporate_1")]: i18next.t("form.corporate_1"),
  //     [i18next.t("form.corporate_2")]: i18next.t("form.corporate_2"),
  //     [i18next.t("form.corporate_3")]: i18next.t("form.corporate_3"),
  //     [i18next.t("form.corporate_4")]: i18next.t("form.corporate_4"),
  //     [i18next.t("form.corporate_5")]: i18next.t("form.corporate_5"),
  //     [i18next.t("form.corporate_6")]: i18next.t("form.corporate_6"),
  //     [i18next.t("form.corporate_7")]: i18next.t("form.corporate_7"),
  //     [i18next.t("form.corporate_8")]: i18next.t("form.corporate_8"),
  //   };

  //   var $el = $("#occasion");
  //   $el.empty();
  //   $.each(newOptions, function (key, value) {
  //     $el.append($("<option></option>").attr("value", value).text(key));
  //   });
  // });

  // $("#typeEventPrivate").change(function (oEvvbet) {
  //   var newOptions = {
  //     [i18next.t("form.private_1")]: i18next.t("form.private_1"),
  //     [i18next.t("form.private_2")]: i18next.t("form.private_2"),
  //     [i18next.t("form.private_3")]: i18next.t("form.private_3"),
  //     [i18next.t("form.private_4")]: i18next.t("form.private_4"),
  //     [i18next.t("form.private_5")]: i18next.t("form.private_5"),
  //   };

  //   var $el = $("#occasion");
  //   $el.empty();
  //   $.each(newOptions, function (key, value) {
  //     $el.append($("<option></option>").attr("value", value).text(key));
  //   });
  // });

  $("#zrqForm").on("submit", function (oEvent) {
    if (!this.checkValidity()) {
      oEvent.preventDefault();
      oEvent.stopPropagation();
      this.classList.add("was-validated");
      var warningModal = new bootstrap.Modal(
        document.getElementById("warningModal"),
        {
          keyboard: false,
        }
      );
      warningModal.show();
    } else {
      this.classList.add("was-validated");
      var spinnerModal = new bootstrap.Modal(
        document.getElementById("spinnerModal"),
        {
          keyboard: false,
        }
      );
      spinnerModal.show();
    }
  });

  // $("#languagePT").change((a, b, c) => {
  //   const chosenLng = "pt";
  //   $("#zrqForm")[0].reset();
  //   $("#languagePT").prop("checked", true);
  //   i18next.changeLanguage(chosenLng, () => {
  //     $("body").localize();
  //   });
  // });

  // $("#languageEN").change((a, b, c) => {
  //   const chosenLng = "en";
  //   $("#zrqForm")[0].reset();
  //   $("#languageEN").prop("checked", true);
  //   i18next.changeLanguage(chosenLng, () => {
  //     $("body").localize();
  //   });
  // });

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
        fallbackLng: "pt",
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
                corporate: "Corporate/Public Institution",
                private: "Private",
                occasion_lbl: "Occasion",
                type0: "Choose one",
                type1: "Office Party",
                type2: "Christmas Party",
                type3: "Festival",
                type4: "Wedding",
                type5: "Student Event",
                type6: "Birthday Event",
                type7: "Bar/Pub Concert",
                type99: "Other",
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
                newsletter: "Yes, I want to subscribe your Newsletter",
                submit: "Submit form",
                spinner: "Please wait",
                aviso1: "Warning",
                aviso2: "Please, fill all required fields",
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
                corporate: "Empresarial/Instituição Pública",
                private: "Privado",
                occasion_lbl: "Ocasião",
                type0: "Escolhe um",
                type1: "Festa Escritório",
                type2: "Festa de Natal",
                type3: "Festival",
                type4: "Casamento",
                type5: "Festa Estudantes",
                type6: "Aniversário",
                type7: "Concert num Bar/Pub",
                type99: "Outro",                       
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
                comments_phd:
                  "Qualquer comentário ou requisito que queiras acrescentar...",
                newsletter: "Sim, quero subscrever a vossa Newsletter",
                submit: "Enviar pedido",
                spinner: "Aguardar...",
                aviso1: "Aviso",
                aviso2: "Preencher todos os campos obrigatórios por favor",
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
