define([
  "telegraph", "resting", "jquery", "underscore"
], function(Telegraph, Resting, $, _) {

  var Dashboard = function () {
    this.attrs = {graphs: []};
  };
  Resting(Dashboard, {baseUrl: "/dashboards"});

  Dashboard.prototype.draw = function (selector, css) {
    $(selector).empty();

    return $.when.apply($, _.map(this.attrs.graphs, function(graph, i) {
      var id = "graph-" + i;
      $(selector).append($("<div/>", {id: id, css: css || {}}));
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
