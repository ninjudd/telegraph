require(["common"], function() {
  require([
    "telegraph", "telegraph/table", "resting/document", "underscore", "jquery_ui", "utils", "config", "strings"
  ], function(Telegraph, Table, Document, _, $, Utils, config, strings) {

    if (config.telegraph) {
      Telegraph.baseUrls       = config.telegraph.baseUrls;
      Telegraph.defaultRefresh = config.telegraph.defaultRefresh;
    }

    var doc = new Document({
      type:     Telegraph,
      selector: "#graph-container",
      name:     "Graph",
      icon:     "/images/graph.svg",
    });
    doc.addToolbarButton("edit", "/images/cog.svg");

    doc.afterDraw = function() {
      var chart = this.model.attrs.chart;
      $(".table-options, .chart-options, .multi-options, .line-plus-bar-options").removeClass("visible-options");
      $(isTable(chart) ? ".table-options" : ".chart-options").addClass("visible-options");
      if (isMulti(chart))       $(".multi-options").addClass("visible-options");
      if (isLinePlusBar(chart)) $(".line-plus-bar-options").addClass("visible-options");
    };

    var targets = new Table("#targets", {
      class: "table table-striped",
      toCells: Table.deletable(targetCells),
      sortable: true,
      change: function() {
        doc.model.attrs.targets = this.items;
        doc.draw();
      }
    });
    _.bindAll(targets);

    doc.afterLoad = function() {
      $("#span"     ).val(doc.model.attrs.span);
      $("#until"    ).val(doc.model.attrs.until);
      $("#period"   ).val(doc.model.attrs.period);
      $("#refresh"  ).val(doc.model.attrs.refresh);
      $("#chart"    ).val(doc.model.attrs.chart);
      $("#variables").val(doc.model.attrs.variables);
      Document.flipClass("#align",    doc.model.attrs.align,    "active");
      Document.flipClass("#invert",   doc.model.attrs.invert,   "active");
      Document.flipClass("#sum-cols", doc.model.attrs.sum_cols, "active");
      Document.flipClass("#sum-rows", doc.model.attrs.sum_rows, "active");

      targets.replace(doc.model.attrs.targets);
      Utils.pushHash(doc.model.id);
    };

    doc.afterRename    = function() { Utils.pushHash(doc.model.id) };
    doc.afterDuplicate = function() { Utils.pushHash(doc.model.id) };

    doc.scrubName = Utils.scrubName;

    doc.registerKeyboardShortcuts();

    doc.load(Utils.hash());

    //======

    function targetCells(target) {
      var labelField = $("<span/>", {text: target.label, contenteditable: true})
      Document.blurOnEnter(labelField);
      labelField.blur(function(e) {
        var newLabel = $(this).text();
        if (newLabel != target.label) {
          target.label = newLabel;
          doc.draw();
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
        cells.push({html: $("<img/>", {class: "icon", src: "/images/chart-" + target.type + ".svg"})});
      }
      if (isMulti(chart)) {
        cells.push({html: (target.axis == "right" ? "&#x21E5;" : "&#x21E4;")});
      }

      return cells;
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

    function fillTarget(target) {
      $("#query").val(target.query);
      $("#source").val(target.source);
      $("#shift").val(target.shift);

      Document.flipClass("#left",  target.axis != "right", "active");
      Document.flipClass("#right", target.axis == "right", "active");

      Document.flipClass("#line", target.type == "line", "active");
      Document.flipClass("#bar",  target.type == "bar",  "active");
      Document.flipClass("#area", target.type == "area", "active");

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

      $("#from").change(function() {
        doc.model.attrs.span = $(this).val();
        doc.draw();
      });

      $("#until").change(function() {
        doc.model.attrs.until = $(this).val();
        doc.draw();
      });

      $("#period").change(function() {
        doc.model.attrs.period = $(this).val();
        doc.draw();
      });

      $("#refresh").attr({placeholder: Telegraph.defaultRefresh});

      $("#refresh").change(function() {
        doc.model.attrs.refresh = parseInt($(this).val());
        doc.draw();
      });

      $("#chart").change(function() {
        doc.model.attrs.chart = $(this).val();
        doc.draw();
      });

      $("#align").click(function(e) {
        Utils.toggleButton(this, e);
        doc.model.attrs.align = $(this).hasClass("active");
        doc.draw();
      });

      $("#invert").click(function(e) {
        Utils.toggleButton(this, e);
        doc.model.attrs.invert = $(this).hasClass("active");
        doc.draw();
      });

      $("#sum-cols").click(function(e) {
        Utils.toggleButton(this, e);
        doc.model.attrs.sum_cols = $(this).hasClass("active");
        doc.draw();
      });

      $("#sum-rows").click(function(e) {
        Utils.toggleButton(this, e);
        doc.model.attrs.sum_rows = $(this).hasClass("active");
        doc.draw();
      });

      $("#variables").change(function() {
        doc.model.attrs.variables = $("#variables").val();
        doc.draw();
      });

      window.onbeforeunload = function() {
        if (doc.isChanged) return "Unsaved changes will be lost.";
      };

      $("#edit").click(function(e) {
        toggleEdit(!$("#edit-container").is(":visible"));
        if (doc) setTimeout(function() { doc.model.updateChart() }, 500);
      });

      $("#graph-advanced").click(function(e) {
        $("#graph-advanced-form").modal("toggle");
      });

      $("#advanced-submit").click(function(e) {
        $("#graph-advanced-form").modal("toggle");
      });

      $(window).on("hashchange", function () {
        doc.load(Utils.hash());
      });

      toggleEdit(!window.location.hash);

      var $select = $("#source");
      _.each(config.sources, function (source) {
        $select.append('<option value=' + source + '>' + source + '</option>');
      });

      _.each(["from", "until", "period"], function(key) {
        $("#" + key).attr("title", strings[key]);
      });
    });
  });
});
