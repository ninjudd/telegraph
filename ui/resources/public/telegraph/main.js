var telegraph;
var targets = new Table("#targets", {
  class: "table table-striped",
  toCells: Table.deletable(targetCells),
  sortable: true,
  change: function() {
    telegraph.attrs.targets = this.items;
    redraw();
  }
});
_.bindAll(targets)

load();

//======

function targetCells(target) {
  var labelField = $("<span/>", {text: target.label, contenteditable: true})
  blurOnEnter(labelField);
  labelField.blur(function(e) {
    var newLabel = $(this).text();
    if (newLabel != target.label) {
      target.label = newLabel;
      redraw();
    }
  });

  var queryLink = $("<a/>", {href: "#", title: target.source, text: target.query});
  queryLink.click(_.partial(fillTarget, target));

  var cells = [
    {html: labelField},
    {class: "monospace", html: queryLink},
    {class: "monospace", text: target.shift},
  ]
  var chart = $("#chart").val() || "";

  if (isMulti(chart) || isLinePlusBar(chart)) {
    cells.push({html: $("<img/>", {class: "icon", src: "/telegraph/images/chart-" + target.type + ".svg"})});
  }
  if (isMulti(chart)) {
    cells.push({html: (target.axis == "right" ? "&#x21E5;" : "&#x21E4;")});
  }

  return cells;
};

function displayHeader() {
  $("#name").text(telegraph.id || "untitled");
  flipClass("disabled", $("#rename").parent(), !telegraph.id);
  $("#graph-header").toggle(!!telegraph.id || telegraph.attrs.targets.length > 0);
};

var isChanged;
function markChanged(changed) {
  isChanged = changed;
  display("#edited", changed);
  flipClass("disabled", $("#revert, #save").parent(), !changed);
};

function isTable(chart) {
  return chart == "table";
};

function isMulti(chart) {
  return chart == "multiChart";
};

function isLinePlusBar(chart) {
  return chart && chart.match(/^linePlusBar/);
};

var draws;
function redraw(unchanged) {
  telegraph.draw("#graph").done(displayHeader).fail(function(error) {
    showAlert(error, "error");
  });

  // Use draw count as a proxy for changes since we only redraw when a change is made.
  if (!unchanged) draws++;
  markChanged(draws > 1);

  var chart = $("#chart").val() || "";

  $(".table-options, .chart-options, .multi-options, .line-plus-bar-options").removeClass("visible-options");
  $(isTable(chart) ? ".table-options" : ".chart-options").addClass("visible-options");
  if (isMulti(chart))       $(".multi-options").addClass("visible-options");
  if (isLinePlusBar(chart)) $(".line-plus-bar-options").addClass("visible-options");
};

function fillTarget(target) {
  $("#query").val(target.query);
  $("#source").val(target.source);
  $("#shift").val(target.shift);

  flipClass("active", "#left",  target.axis != "right");
  flipClass("active", "#right", target.axis == "right");

  flipClass("active", "#line", target.type == "line");
  flipClass("active", "#bar",  target.type == "bar");
  flipClass("active", "#area", target.type == "area");

  return false;
};

function display(selector, show) {
  $(selector).css({display: show ? "inline-block" : "none"})
};

function save(force) {
  telegraph.id = telegraph.id || prompt("Save graph as:");

  telegraph.save({force: force}).done(function(results) {
    showAlert(telegraph.id + " saved", "success");
    pushHistory(telegraph.id);
    markChanged(false);
    displayHeader();
  }).fail(function(response) {
    if (response.error) {
      if (confirm(response.error + " Would you like to overwrite?")) {
        save(true);
      }
    } else {
      showAlert("save failed", "error");
    }
  });
};

function pushHistory(name) {
  history.pushState(name, "", window.location.pathname + (name ? "#" + name : ""));
};

function showAlert(text, type) {
  if (type) type = "alert-" + type;
  $("#alerts").append($("<div/>", {class: "alert fade in " + type, text: text}));
  setTimeout(function() { $(".alert").alert('close'); }, 3000);
};

function hash() {
  return window.location.hash.substr(1)
};

function load(name) {
  draws = 0;
  if (telegraph) telegraph.clearRefresh();
  name = name == null ? hash() : name;
  if (name == null) return;

  Telegraph.load(name).then(function(t) {
    if (t) {
      telegraph = t;
      _.bindAll(telegraph);

      if (name != null) pushHistory(telegraph.id);
      $("#from"     ).val(telegraph.attrs.from);
      $("#until"    ).val(telegraph.attrs.until);
      $("#period"   ).val(telegraph.attrs.period);
      $("#refresh"  ).val(telegraph.attrs.refresh);
      $("#chart"    ).val(telegraph.attrs.chart);
      $("#variables").val(telegraph.attrs.variables);
      flipClass("active", "#align",    telegraph.attrs.align);
      flipClass("active", "#invert",   telegraph.attrs.invert);
      flipClass("active", "#sum-cols", telegraph.attrs.sumCols);
      flipClass("active", "#sum-rows", telegraph.attrs.sumRows);

      targets.replace(telegraph.attrs.targets);
    } else {
      showAlert("no such graph: " + name);
      if (!telegraph) load("");
    }
  });
};

function loadSubmit() {
  var name = $("#load-name").val();
  load(name);
  $("#load-form").modal("toggle");
  $("#load-name").autocomplete("close");
};

var graphNames = [];
function loadForm() {
  $("#load-form").modal('toggle').on('shown', function() {
    $("#load-name").val("").focus();
  });

  // Load typeahead asynchronously.
  Telegraph.list().done(function(names) {
    graphNames = names;
  });
};

function blurOnEnter(selector) {
  $(selector).keydown(function(e) {
    if(e.keyCode == 13) $(this).blur();
  });
};

function selectAll() {
  document.execCommand("selectAll",false,null);
};

function confirmRevert() {
  return !isChanged || confirm("All unsaved changes to " + telegraph.id + " will be lost. Are you sure?");
};

function flipClass(classString, selector, state) {
  var element = $(selector);
  state ? element.addClass(classString) : element.removeClass(classString);
};

function activeId(selector) {
  return $(selector).find(".active")[0].id;
};

function toggleEdit(show) {
  var edit  = $("#edit-container");
  var graph = $("#graph-container");

  if (show) {
    edit.show(500);
    graph.css({top: "240px"});
  } else {
    edit.hide(250);
    graph.css({top: 0});
  }
};

$(document).ready(function() {
  $("#add").click(function() {
    var query = $("#query").val();
    var shift = $("#shift").val();
    targets.add({
      label:  _.compact([shift, query]).join(":"),
      query:  query,
      shift:  shift,
      source: $("#source").val(),
      type:   activeId("#type"),
      axis:   activeId("#axis")
    });
  });

  $("#refresh-graph").click(function() {
    redraw(true);
  });

  $("#from").change(function() {
    telegraph.attrs.from = $(this).val();
    redraw();
  });

  $("#until").change(function() {
    telegraph.attrs.until = $(this).val();
    redraw();
  });

  $("#period").change(function() {
    telegraph.attrs.period = $(this).val();
    redraw();
  });

  $("#refresh").attr({placeholder: Telegraph.defaultRefresh});

  $("#refresh").change(function() {
    telegraph.attrs.refresh = parseInt($(this).val());
    redraw();
  });

  $("#chart").change(function() {
    telegraph.attrs.chart = $(this).val();
    redraw();
    targets.update();
  });

  $("#align").click(function(e) {
    e.stopPropagation(); // Make sure the button is toggled before we check it.
    $(this).toggleClass("active");
    telegraph.attrs.align = $(this).hasClass("active");
    redraw();
  });

  $("#invert").click(function(e) {
    e.stopPropagation(); // Make sure the button is toggled before we check it.
    $(this).toggleClass("active");
    telegraph.attrs.invert = $(this).hasClass("active");
    redraw();
  });

  $("#sum-cols").click(function(e) {
    e.stopPropagation(e); // Make sure the button is toggled before we check it.
    $(this).toggleClass("active");
    telegraph.attrs.sumCols = $(this).hasClass("active");
    redraw();
  });

  $("#sum-rows").click(function(e) {
    e.stopPropagation(e); // Make sure the button is toggled before we check it.
    $(this).toggleClass("active");
    telegraph.attrs.sumRows = $(this).hasClass("active");
    redraw();
  });

  $("#variables").change(function() {
    telegraph.attrs.variables = $("#variables").val();
    redraw();
    targets.update();
  });

  var renaming;
  $("#name").blur(function() {
    var self = this;
    var name = $(this).text();
    if (renaming) {  // rename
      var from = telegraph.id;
      telegraph.rename(name).done(function() {
        showAlert("Renamed " + from + " to " + name, "success");
        pushHistory(name);
      }).fail(function(response) {
        showAlert(response.error);
        $(self).text(telegraph.id);
      });
      renaming = false;
    } else {  // duplicate
      telegraph.id = name;
      pushHistory(telegraph.id);
      telegraph.attrs.hash = null;
    }
    $(this).attr({contenteditable: false});
  });

  blurOnEnter("#name");

  $("#save").click(function() {
    $("#graph-menu").dropdown("toggle");
    save();
    return false;
  });

  $(document).bind('keydown', function(e) {
    if (e.metaKey || e.ctrlKey) {
      if (e.keyCode == 83) { // Ctrl-s or Command-s
        save();
        return false;
      } else if (e.keyCode == 79) { // Ctrl-o or Command-o
        loadForm();
        return false;
      }
    }
  });

  window.onbeforeunload = function() {
    if (isChanged) return "Unsaved changes will be lost.";
  };

  $("#rename").click(function() {
    renaming = true;
    $("#graph-menu").dropdown("toggle");
    $("#name").attr({contenteditable: true}).focus();
    selectAll();
    return false;
  });

  $("#duplicate").click(function() {
    $("#graph-menu").dropdown("toggle");
    $("#name").attr({contenteditable: true}).text(telegraph.id + " copy").focus();
    markChanged(true);
    document.execCommand("selectAll",false,null);
    return false;
  });

  $("#revert").click(function() {
    $("#graph-menu").dropdown("toggle");
    if (confirmRevert()) {
      load(telegraph.id);
      return false;
    }
  });

  $("#close").click(function() {
    $("#graph-menu").dropdown("toggle");
    if (confirmRevert()) {
      load("");
      return false;
    }
  });

  $("#delete").click(function() {
    $("#graph-menu").dropdown("toggle");
    if (confirm("Graph " + telegraph.id + " will be permanently deleted. Are you sure?")) {
      telegraph.destroy().done(function() {
        showAlert("Deleted graph " + telegraph.id, "success");
        load("");
      }).fail(function(response) {
        showAlert(response.error, "error");
      });
    }
    return false;
  });

  $("#edit").click(function(e) {
    toggleEdit(!$("#edit-container").is(":visible"));
    if (telegraph) setTimeout(function() { telegraph.updateChart() }, 500);
  });

  $("#load-submit").click(function(e) {
    loadSubmit();
  });

  $("#load-name").keydown(function(e) {
    if (e.keyCode == 13) loadSubmit();
  }).autocomplete({
    minLength: 0,
    source: function(request, response) {
      var matches = _.filter(graphNames, function(name) { return name.indexOf(request.term) >= 0 });
      response(matches);
    }
  });

  $("#load").click(function(e) {
    loadForm();
  });

  $("#graph-advanced").click(function(e) {
    $("#graph-advanced-form").modal("toggle");
  });

  $("#advanced-submit").click(function(e) {
    $("#graph-advanced-form").modal("toggle");
  });

  $(window).on("hashchange", function () {
    load();
  });

  toggleEdit(!window.location.hash);

  var $select = $("#source");
  _.each(telegraphSources, function (source) {
    $select.append('<option value=' + source + '>' + source + '</option>');
  });

  var elements = $("[tooltip=true]")
  elements.tooltip({
    delay: {show: 500},
    placement: "bottom",
    trigger: "hover",
    container: "body"
  }).tooltip("disable");

  var tooltipsEnabled = false;
  $("#help").click(function() {
    if (tooltipsEnabled) {
      tooltipsEnabled = false;
      elements.tooltip("disable");
      $(this).tooltip("hide");
    } else {
      tooltipsEnabled = true;
      elements.tooltip("enable");
      $(this).tooltip("show");
    }
  });
});
