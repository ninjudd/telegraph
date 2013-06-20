var dashboard = new Telegraph.dashboard([]);

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
    $("#graph-name").val("").focus();
  });

  // Load typeahead asynchronously.
  Telegraph.list(function(names) {
    graphNames = names;
  });
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

  $("#add-graph-submit").click(function(e) {
    dashboard.graphs.push({
      name:      $("#graph-name").val(),
      from:      $("#from").val(),
      until:     $("#until").val(),
      period:    $("#period").val(),
      chart:     $("#chart").val(),
      variables: $("#variables").val(),
      sumRows:   $("#sum-rows").hasClass("active"),
      sumCols:   $("#sum-cols").hasClass("active"),
      invert:    $("#invert").hasClass("active"),
      align:     $("#align").hasClass("active"),
    });

    dashboard.draw("#dashboard");

    $("#add-graph-form").modal("toggle");
  });
});
