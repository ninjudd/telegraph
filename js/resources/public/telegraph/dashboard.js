define([
  "telegraph", "resting", "jquery", "underscore"
], function(Telegraph, Resting, $, _) {

  var Dashboard = function () {
    this.attrs = {graphs: []};
  };
  Resting(Dashboard, {baseUrl: "/dashboards"});

  Dashboard.css = function() {
    return _.reduce(arguments, function(css, arg) {
      return _.extend(css, Telegraph.parseJSON(arg));
    }, {
      height: "400px",
      padding: "10px",
    });
  };

  Dashboard.prototype.draw = function (selector) {
    $(selector).empty();
    var attrs = this.attrs;
    return $.when.apply($, _.map(attrs.graphs, function(graph, i) {
      var id  = "graph-" + i;
      var css = Dashboard.css(attrs.style, graph.style);
      var div = $("<div/>", {id: id, class: "dashboard-graph", css: css});
      $(selector).append(div.data("index", i));
      return Telegraph.load(graph.id, graph.overrides).then(function(telegraph) {
        telegraph.draw("#" + id);
      });
    }));
  };

  Dashboard.prototype.isEmpty = function () {
    return this.attrs.graphs.length == 0;
  }

  Dashboard.prototype.clearRefresh = function () {
    _.each(this.attrs.graphs, Telegraph.prototype.clearRefresh.call);
  };

  return Dashboard;
});
