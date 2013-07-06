require(["common"], function() {
  require([
    "telegraph", "telegraph/dashboard", "resting/document", "underscore", "jquery_ui", "utils", "config"
  ], function(Telegraph, Dashboard, Document, _, $, Utils, config) {

    if (config.telegraph) {
      Telegraph.baseUrls       = config.telegraph.baseUrls;
      Telegraph.defaultRefresh = config.telegraph.defaultRefresh;
    }

    var doc = new Document({
      type:     Dashboard,
      selector: "#dashboard-container",
      name:     "Dashboard",
    });
    doc.addToolbarButton("add-graph", "/telegraph/images/chart-line.svg");
    doc.load(Utils.hash());

    var graphNames = [];
    function addGraphForm() {
      $("#add-graph-form").modal('toggle').on('shown', function() {
        $("#add-graph-name").val("").focus();
      });

      // Load typeahead asynchronously.
      Telegraph.list().done(function(names) {
        console.log("ta", names)
        graphNames = names;
      });
    };

    $(document).ready(function() {
      $("#add-graph").click(function(e) {
        addGraphForm();
      });

      $("#add-graph-name").keydown(function(e) {
        if (e.keyCode == 13) {
          $("#variables").focus();
          return false;
        }
      }).autocomplete({
        minLength: 0,
        source: function(request, response) {
          var matches = _.filter(graphNames, function(name) { return name.indexOf(request.term) >= 0 });
          response(matches);
        }
      });

      $("#add-graph-submit").click(function(e) {
        var overrides = {};

        _.each(["from", "until", "period", "variables", "chart"], function (key) {
          var val = $("#" + key).val();
          if (val != "") overrides[key] = val;
        });
        if (overrides.chart) {
          _.each(["sum_rows", "sum_cols", "invert", "align"], function (key) {
            overrides[key] = $("#" + key).hasClass("active");
          });
        }

        var opts = {
          id: $("#add-graph-name").val(),
          overrides: overrides,
        };

        dashboard.attrs.graphs.push(opts);
        redraw();

        $("#add-graph-form").modal("toggle");
      });
    });

  });
});
