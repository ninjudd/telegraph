require(["common"], function() {
  require([
    "telegraph", "telegraph/dashboard", "resting/document", "underscore", "jquery_ui", "utils", "config", "chosen"
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

    doc.$("#body").sortable({
      cancel: '.dropdown',
      update: function(e) {
        var order = $(this).sortable('toArray');
        var attrs = doc.model.attrs;
        attrs.graphs = _.map(order, function(id) {
          var i = id.split("-")[1];
          return attrs.graphs[i]
        });
        doc.draw();
      }
    });

    doc.addToolbarButton("add-graph", "/images/chart-line.svg");

    function syncColumnWidths(selector) {
      var widths = []
      var tables = $(selector);

      tables.width("auto");

      tables.each(function(i, table) {
        $(table).find("tr").first().find("th").each(function(j, cell) {
          widths[j] = Math.max(widths[j] || 0, $(cell).outerWidth());
        });
      });

      tables.each(function(i, table) {
        $(table).find("tr").first().find("th").each(function(j, cell) {
          var w = widths[j];
          $(cell).css({minWidth: w, maxWidth: w});
        });
      });
    };

    doc.afterDraw = function() {
      $(".dashboard-graph").dblclick(function(e) {
        var index = $(this).data("index");
        var attrs = doc.model.attrs.graphs[index];
        graphForm(index, attrs);
      });

      syncColumnWidths(".telegraph-table");

      if ($("#dashboard-container #right-toolbar #date-controls").length == 0) {
        var controls = $("<span/>", {id: "date-controls"});
        _.each(timeVars, function(key) {
          var input = $("<input/>", {type: "text", id: key, class: "interval", placeholder: key});
          input.change(function(e) {
            doc.model.attrs[key] = $(this).val();
            doc.draw();
          });
          controls.append(input);
        });
        $("#dashboard-container #right-toolbar").prepend(controls);
      }
    };

    doc.afterLoad = function() {
      _.each(timeVars, function(key) {
        $("#" + key).val(doc.model.attrs[key]);
      });
      doc.draw();
      Utils.pushPath(doc.model.id);
    };
    doc.afterRename    = function() { Utils.pushPath(doc.model.id) };
    doc.afterDuplicate = function() { Utils.pushPath(doc.model.id) };

    doc.scrubName = Utils.scrubName;

    doc.registerKeyboardShortcuts();

    doc.load(Utils.path());

    function setViewLink(id) {
      $("#view-graph").attr("href", "/telegraph/graph#" + id);
    };

    var timeVars = ["from", "until", "period"];
    var graphVars = ["variables", "chart"];
    var graphNames = [];
    function graphForm(index, attrs) {
      // Initialize fields.
      attrs = attrs || {overrides: {}};

      $("#style").val(attrs.style);
      $("#label").val(attrs.label);

      _.each(graphVars, function (key) {
        $("#" + key).val(attrs.overrides[key]);
      });
      _.each(["sum_rows", "sum_cols", "invert", "align"], function (key) {
        Document.flipClass("#" + key, attrs.overrides[key], "active");
      });

      // Show form.
      $("#graph-form").modal('toggle').on('shown', function() {
        graphNames = (graphNames || []).sort();
        $("#graph-name").empty();
        $.each(graphNames, function(k, v) {
          $("#graph-name").append($("<option>", {value: v}).text(v));
        });
        if (attrs.id) $("#graph-name").val(attrs.id);
        setViewLink(attrs.id || _.first(graphNames));

        $("#graph-name").trigger("liszt:updated");
        $('#graph-form .chzn-drop .chzn-search input[type="text"]').focus();
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
        _.each(graphVars, function (key) {
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

        _.each(["style", "label"], function (key) {
          var val = $("#" + key).val();
          if (val) opts[key] = val;
        });

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
        doc.draw();
      }
      $("#graph-form").modal("toggle");
    };

    $(document).ready(function() {
      $("#graph-name").chosen({width: "150px"});

      $("#graph-name").change(function(e) {
        setViewLink($(this).val());
      });

      $("#add-graph").click(function(e) {
        graphForm();
      });

      $("#graph-form-submit").click(function(e) {
        graphSubmit();
      });

      $("#graph-form-delete").click(function(e) {
        graphDelete();
      });
    });
  });
});
