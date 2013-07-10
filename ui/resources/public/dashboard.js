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
      icon:     "/images/graph.svg",
    });
    doc.addToolbarButton("add-graph", "/images/chart-line.svg");

    doc.afterDraw = function() {
      $(".dashboard-graph").dblclick(function(e) {
        var index = $(this).data("index");
        var attrs = doc.model.attrs.graphs[index];
        graphForm(index, attrs);
      });
    };

    doc.afterRename    = function() { Utils.pushPath(doc.model.id) };
    doc.afterDuplicate = function() { Utils.pushPath(doc.model.id) };

    doc.scrubName = Utils.scrubName;

    doc.registerKeyboardShortcuts();

    doc.load(Utils.path());

    var graphNames = [];
    function graphForm(index, attrs) {
      // Initialize fields.
      attrs = attrs || {overrides: {}};

      $("#graph-name").val(attrs.id);
      $("#style").val(attrs.style);

      _.each(["from", "until", "period", "variables", "chart"], function (key) {
        $("#" + key).val(attrs.overrides[key]);
      });
      _.each(["sum_rows", "sum_cols", "invert", "align"], function (key) {
        Document.flipClass("active", "#" + key, attrs.overrides[key]);
      });

      // Show form.
      $("#graph-form").modal('toggle').on('shown', function() {
        $("#graph-name").focus();
      })

      if (_.isUndefined(index)) {
        $("#graph-form").removeData("index");
      } else {
        $("#graph-form").data("index", index);
      }

      // Load typeahead asynchronously.
      Telegraph.list().done(function(names) {
        graphNames = names;
      });
    };

    function graphSubmit() {
      var id = $("#graph-name").val();

      if (id) {
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
          id: id,
          overrides: overrides,
        };
        var style = $("#style").val();
        if (style) opts.style = style;

        var index = $("#graph-form").data("index");
        if (_.isUndefined(index)) {
          doc.model.attrs.graphs.push(opts);
        } else {
          doc.model.attrs.graphs[index] = opts;
        }
        doc.draw();
      }
      $("#graph-form").modal("toggle");
    };

    function graphDelete() {
      var index = $("#graph-form").data("index");
      if (!_.isUndefined(index)) {
        doc.model.attrs.graphs = _.reject(doc.model.attrs.graphs, function(item, i) {
          return i == index;
        });
        console.log(doc.model.attrs.graphs);
        doc.draw();
      }
      $("#graph-form").modal("toggle");
    };

    $(document).ready(function() {
      $("#graph-name").keydown(function(e) {
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

      $("#add-graph").click(function(e) {
        graphForm();
      });

      $("#graph-form-submit").click(function(e) {
        graphSubmit();
      });

      $("#graph-form-delete").click(function(e) {
console.log("foo")
        graphDelete();
      });
    });

  });
});
