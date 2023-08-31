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
