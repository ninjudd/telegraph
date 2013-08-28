define([
  "telegraph", "resting", "jquery_ui", "underscore"
], function(Telegraph, Resting, $, _) {

  var Dashboard = function () {
    this.attrs = {graphs: []};
  };
  Resting(Dashboard, {baseUrl: "/dashboards"});

  Dashboard.cssDefault = {
    table: {
      padding: "10px",
    },
    default: {
      height: "400px",
      padding: "10px",
    },
  }

  Dashboard.css = function(styles, chart) {
    return _.reduce(styles, function(css, arg) {
      return _.extend(css, Telegraph.parseJSON(arg));
    }, Dashboard.cssDefault[chart] || Dashboard.cssDefault['default']);
  };

  Dashboard.prototype.overrides = function (graph) {
    return _.extend({
      span:  this.attrs.span,
      until: this.attrs.until,
    }, graph.overrides);
  };

  Dashboard.prototype.draw = function (selector) {
    var self = this;
    this.graphs = [];

    $(selector).empty();

    return $.when.apply($, _.map(this.attrs.graphs, function(graph, i) {
      var id  = "graph-" + i;
      var div = $("<div/>", {id: id, class: "dashboard-graph"});
      $(selector).append(div.data("index", i));

      return Telegraph.load(graph.id, self.overrides(graph)).then(function(telegraph) {
        var css = Dashboard.css([self.attrs.style, graph.style], telegraph.attrs.chart);
        div.css(css);
        self.graphs[i] = telegraph;
        telegraph.draw("#" + id).done(function() {
          if (graph.label) div.find(".chart-label").text(graph.label);
        });
      });
    }));
  };

  Dashboard.prototype.isEmpty = function () {
    return this.attrs.graphs.length == 0;
  }

  Dashboard.prototype.clear = function () {
    _.each(this.graphs, function(graph) {
      graph.clear();
    });
  };

  return Dashboard;
});
