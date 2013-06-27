var docType = Telegraph.Dashboard;

load();

var dashboardNames = [];
function loadForm() {
  $("#load-form").modal('toggle').on('shown', function() {
    $("#load-name").val("").focus();
  });

  // Load typeahead asynchronously.
  Telegraph.list(function(names) {
    dashboardNames = _.map(names, function(n) { return n + " dashboard" });
  });
};

var graphNames = [];
function addGraphForm() {
  $("#add-graph-form").modal('toggle').on('shown', function() {
    $("#add-graph-name").val("").focus();
  });

  // Load typeahead asynchronously.
  Telegraph.list(function(names) {
    graphNames = names;
  });
};

var draws;
function redraw(unchanged) {
  doc.draw("#dashboard").done(function() {
    displayHeader();
  }).fail(function(error) {
    showAlert(error, "error");
  });

  // Use draw count as a proxy for changes since we only redraw when a change is made.
  if (!unchanged) draws++;
  markChanged(draws > 1);
};

$(document).ready(function() {
  $("#load").click(function(e) {
    loadForm();
  });

  $("#load-name").keydown(function(e) {
    if (e.keyCode == 13) loadSubmit();
  }).autocomplete({
    minLength: 0,
    source: function(request, response) {
      var matches = _.filter(dashboardNames, function(name) { return name.indexOf(request.term) >= 0 });
      response(matches);
    }
  });

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

  initMenu(dashboard);
});
