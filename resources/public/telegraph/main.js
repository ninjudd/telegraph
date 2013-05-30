var telegraph;
var targets = new Table("#targets", {
  class: "table table-striped",
  toCells: Table.deletable(targetCells),
  change: function(targets) {
    telegraph.targets = targets.items;
    redraw();
  }
});
_.bindAll(targets)

load();
$(window).on("hashchange", function () { load() });

function targetCells(target) {
  var sub = $("#variables").is(":focus") ? _.identity : telegraph.subVariables;

  var query = sub(target.query);
  var shift = sub(target.shift);

  var labelField = $("<span/>", {text: target.label, contenteditable: true})
  blurOnEnter(labelField);
  labelField.blur(function(e) {
    var newLabel = $(this).text();
    if (newLabel != target.label) {
      target.label = newLabel;
      redraw();
    }
  });

  var cells = [
    {html: labelField},
    {class: "monospace", html: $("<a/>", {text: query}).click(_.partial(fillTarget, target))},
    {class: "monospace", text: shift}
  ]
  var chart = $("#chart").val();

  if (chart == "multiChart") {
    cells.push({text: target.type});
    cells.push({html: (target.axis == "right" ? "&#x21E5;" : "&#x21E4;")});
  } else if (chart == "linePlusBarChart") {
    cells.push({text: target.type});
  }
  return cells;
};

function displayHeader() {
  $("#name").text(telegraph.name || "untitled");
  flipClass("disabled", $("#rename").parent(), !telegraph.name);
  $("#graph-header").css({display: telegraph.targets.length > 0 ? "block" : "none"});
};

var isChanged;
function markChanged(changed) {
  isChanged = changed;
  display("#edited", changed);
  flipClass("disabled", $("#revert, #save").parent(), !changed);
};

function redraw(name) {
  telegraph.draw("#graph", displayHeader);
  telegraph.hasVariables() ? $("#variables").show() : $("#variables").hide();

  // Use draw count as a proxy for changes since we only redraw when a change is made.
  markChanged(telegraph.draws > 1);

  var chart = $("#chart").val();

  $(".table-options, .chart-options, .multi-options, .line-plus-bar-options").removeClass("visible-options");
  if (chart == "table")            $(".table-options").addClass("visible-options");
  if (chart != "table")            $(".chart-options").addClass("visible-options");
  if (chart == "multiChart")       $(".multi-options").addClass("visible-options");
  if (chart == "linePlusBarChart") $(".line-plus-bar-options").addClass("visible-options");
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
};

function display(selector, show) {
  $(selector).css({display: show ? "inline-block" : "none"})
};

function save(force) {
  telegraph.name = telegraph.name || prompt("Save graph as:");

  telegraph.save({
    force: force,
    success: function(results) {
      showAlert(results.name + " saved", "success");
      pushHistory(telegraph.name);
      markChanged(false);
      displayHeader();
    },
    error: function(error) {
      if (confirm(error + " Would you like to overwrite?")) {
        save(true);
      }
    }
  });
};

function pushHistory(name) {
  history.pushState(name, "", window.location.pathname + (name ? "#" + name : ""));
};

function showAlert(text, type) {
  if (type) type = "alert-" + type;
  $("#alerts").append($("<div/>", {class: "alert fade in " + type, text: text}));
  setTimeout(function() { $(".alert").alert('close'); }, 2000);
};

function hash() {
  return window.location.hash.substr(1)
};

function load(name) {
  Telegraph.load({
    refresh: 3000,
    name: name == null ? hash() : name,
    success: function(t) {
      telegraph = t;
      _.bindAll(telegraph);

      if (name != null) pushHistory(telegraph.name);
      $("#from").val(telegraph.from);
      $("#until").val(telegraph.until);
      $("#period").val(telegraph.period);
      $("#refresh").val(telegraph.refresh);
      $("#chart").val(telegraph.chart);
      $("#variables").val(JSON.stringify(telegraph.variables));
      flipClass("active", "#align",     telegraph.align);
      flipClass("active", "#invert",    telegraph.invert);
      flipClass("active", "#summarize", telegraph.summarize);

      targets.replace(telegraph.targets);
    },
    error: function(name) {
      showAlert("no such graph: " + name);
      if (!telegraph) load("");
    }
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
  return !isChanged || confirm("All unsaved changes to " + telegraph.name + " will be lost. Are you sure?");
};

function flipClass(classString, selector, state) {
  var element = $(selector);
  state ? element.addClass(classString) : element.removeClass(classString);
};

function activeId(selector) {
console.log($(selector).find(".active").length)
  return $(selector).find(".active")[0].id;
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
    redraw();
  });

  $("#from").change(function() {
    telegraph.from = $(this).val();
    redraw();
  });

  $("#until").change(function() {
    telegraph.until = $(this).val();
    redraw();
  });

  $("#period").change(function() {
    telegraph.period = $(this).val();
    redraw();
  });

  $("#refresh").change(function() {
    telegraph.refresh = parseInt($(this).val());
    redraw();
  });

  $("#chart").change(function() {
    telegraph.chart = $(this).val();
    redraw();
    targets.update();
  });

  $("#align").click(function(e) {
    e.stopPropagation(); // Make sure the button is toggled before we check it.
    $(this).toggleClass("active");
    telegraph.align = $(this).hasClass("active");
    redraw();
  });

  $("#invert").click(function(e) {
    e.stopPropagation(); // Make sure the button is toggled before we check it.
    $(this).toggleClass("active");
    telegraph.invert = $(this).hasClass("active");
    redraw();
  });

  $("#summarize").click(function(e) {
    e.stopPropagation(e); // Make sure the button is toggled before we check it.
    $(this).toggleClass("active");
    telegraph.summarize = $(this).hasClass("active");
    redraw();
  });

  $("#variables").change(function() {
    var variables = $("#variables").val();
    telegraph.variables = variables ? JSON.parse(variables) : null
    redraw();
    targets.update();
  });

  $("#variables").focus(function() {
    $(this).css({height: "78px"});
    targets.update();
  });

  $("#variables").blur(function() {
    $(this).css({height: "21px"});
    targets.update();
  });

  var renaming;
  $("#name").blur(function() {
    var self = this;
    var name = $(this).text();
    if (renaming) {  // rename
      telegraph.rename({
        name: name,
        success: function(from) {
          showAlert("Renamed " + from + " to " + name, "success");
          pushHistory(telegraph.name);
        },
        error: function(error) {
          showAlert(error);
          $(self).text(telegraph.name);
        }
      });
      renaming = false;
    } else {  // duplicate
      telegraph.name = name;
      pushHistory(telegraph.name);
      telegraph.hash = null;
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
    // Ctrl-s or Command-s
    if (e.keyCode == 83 && (e.metaKey || e.ctrlKey)) {
      save();
      return false;
    }
  });

  $("#rename").click(function() {
    renaming = true;
    $("#graph-menu").dropdown("toggle");
    $("#name").attr({contenteditable: true}).focus();
    selectAll();
    return false;
  });

  $("#duplicate").click(function() {
    $("#graph-menu").dropdown("toggle");
    $("#name").attr({contenteditable: true}).text(telegraph.name + " copy").focus();
    markChanged(true);
    document.execCommand("selectAll",false,null);
    return false;
  });

  $("#revert").click(function() {
    $("#graph-menu").dropdown("toggle");
    if (confirmRevert()) {
      load(telegraph.name);
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
    if (confirm("Graph " + telegraph.name + " will be permanently deleted. Are you sure?")) {
      telegraph.delete({
        success: function() {
          showAlert("Deleted graph " + telegraph.name, "success");
          load("");
        },
        error: function(error) {
          showAlert(error, "error");
        }
      });
    }
    return false;
  });

  var loadName = $("<input/>", {type: "text", id: "load-name", placeholder: "load graph"});
  $("#load").popover({
    placement: "right",
    html: true,
    content: loadName,
    trigger: "manual"
  });

  $("#load").click(function(e) {
    e.stopPropagation();

    if ($(this).next('div.popover:visible').length == 0) {
      $(this).popover("show");

      var options = [];
      $("#load-name").keydown(function(e) {
        if (e.keyCode == 13) {
          $(this).blur();
          var name = $(this).val();
          load(name);
        }
      }).click(function(e) {
        e.stopPropagation();
      }).blur(function() {
        $("#load").popover("toggle");
      }).autocomplete({
        minLength: 0,
        source: function(request, response) {
          var matches = _.filter(options, function(name) { return name.indexOf(request.term) >= 0 });
          response(matches);
        }
      }).focus();

      // Load typeahead asynchronously.
      Telegraph.list(function(names) {
        options = names;
      });

      selectAll();
    } else {
      $(this).popover("hide");
    }
  });

  $("html").click(function() {
    $("#load").popover("hide");
  });

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
