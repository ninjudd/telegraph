require(["common", "telegraph/helpers"], function() {
  require([
    "telegraph", "telegraph/table", "resting/document", "underscore", "jquery_ui"
  ], function(Telegraph, Table, Document, _, $) {

    var targets = new Table("#targets", {
      class: "table table-striped",
      toCells: Table.deletable(targetCells),
      sortable: true,
      change: function() {
        doc.attrs.targets = this.items;
        redraw();
      }
    });
    _.bindAll(targets);

    function targetCells(target) {
      var labelField = $("<span/>", {text: target.label, contenteditable: true})
      blurOnEnter(labelField);
      labelField.blur(function(e) {
        var newLabel = $(this).text();
        if (newLabel != target.label) {
          target.label = newLabel;
          redraw;
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



    var doc = new Document({
      type:     Telegraph,
      selector: "#graph-container",
      name:     "Graph",
    });
    doc.load(hash());

    doc.afterDraw = function() {
      $(".table-options, .chart-options, .multi-options, .line-plus-bar-options").removeClass("visible-options");
      $(isTable(chart) ? ".table-options" : ".chart-options").addClass("visible-options");
      if (isMulti(chart))       $(".multi-options").addClass("visible-options");
      if (isLinePlusBar(chart)) $(".line-plus-bar-options").addClass("visible-options");
    };

    doc.afterLoad = function() {
      $("#from"     ).val(doc.attrs.from);
      $("#until"    ).val(doc.attrs.until);
      $("#period"   ).val(doc.attrs.period);
      $("#refresh"  ).val(doc.attrs.refresh);
      $("#chart"    ).val(doc.attrs.chart);
      $("#variables").val(doc.attrs.variables);
      flipClass("active", "#align",    doc.attrs.align);
      flipClass("active", "#invert",   doc.attrs.invert);
      flipClass("active", "#sum-cols", doc.attrs.sum_cols);
      flipClass("active", "#sum-rows", doc.attrs.sum_rows);

      targets.replace(doc.attrs.targets);
    };


    //======

    function isTable(chart) {
      return chart == "table";
    };

    function isMulti(chart) {
      return chart == "multiChart";
    };

    function isLinePlusBar(chart) {
      return chart && chart.match(/^linePlusBar/);
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

      $("#refresh-document").click(function() {
        doc.draw(true);
      });

      $("#from").change(function() {
        doc.model.attrs.from = $(this).val();
        doc.draw();
      });

      $("#until").change(function() {
        doc.attrs.until = $(this).val();
        redraw();
      });

      $("#period").change(function() {
        doc.attrs.period = $(this).val();
        redraw();
      });

      $("#refresh").attr({placeholder: Telegraph.defaultRefresh});

      $("#refresh").change(function() {
        doc.attrs.refresh = parseInt($(this).val());
        redraw();
      });

      $("#chart").change(function() {
        doc.attrs.chart = $(this).val();
        redraw();
        targets.update();
      });

      $("#align").click(function(e) {
        e.stopPropagation(); // Make sure the button is toggled before we check it.
        $(this).toggleClass("active");
        doc.attrs.align = $(this).hasClass("active");
        redraw();
      });

      $("#invert").click(function(e) {
        e.stopPropagation(); // Make sure the button is toggled before we check it.
        $(this).toggleClass("active");
        doc.attrs.invert = $(this).hasClass("active");
        redraw();
      });

      $("#sum-cols").click(function(e) {
        e.stopPropagation(e); // Make sure the button is toggled before we check it.
        $(this).toggleClass("active");
        doc.attrs.sum_cols = $(this).hasClass("active");
        redraw();
      });

      $("#sum-rows").click(function(e) {
        e.stopPropagation(e); // Make sure the button is toggled before we check it.
        $(this).toggleClass("active");
        doc.attrs.sum_rows = $(this).hasClass("active");
        redraw();
      });

      $("#variables").change(function() {
        doc.attrs.variables = $("#variables").val();
        redraw();
      });

      var renaming;
      $("#name").blur(function() {
        var self = this;
        var name = $(this).text();
        if (renaming) {  // rename
          var from = doc.id;
          doc.rename(name).done(function() {
            showAlert("Renamed " + from + " to " + name, "success");
            pushHistory(name);
          }).fail(function(response) {
            showAlert(response.error);
            $(self).text(doc.id);
          });
          renaming = false;
        } else {  // duplicate
          doc.id = name;
          pushHistory(doc.id);
          doc.attrs.hash = null;
        }
        $(this).attr({contenteditable: false});
      });

      blurOnEnter("#name");

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

      $("#edit").click(function(e) {
        toggleEdit(!$("#edit-container").is(":visible"));
        if (doc) setTimeout(function() { doc.updateChart() }, 500);
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
