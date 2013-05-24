var Telegraph = function (selector, opts) {
  this.selector  = selector;
  this.chartType = opts.chart;
  this.chart     = this.makeChart(this.chartType);
  this.from      = opts.from;
  this.until     = opts.until;
  this.targets   = opts.targets;
  this.variables = opts.variables;

  var self = this;
  this.fetchData(this.targets, function(data) {
    nv.addGraph(function() {
      self.svg().datum(data)
          .transition().duration(500)
          .call(self.chart);
      nv.utils.windowResize(self.chart.update);
      return self.chart;
    });
  });
};

Telegraph.prototype.subVariables = function(target) {
  return _.reduce(this.variables, function (target, value, key) {
    var pattern = new RegExp("\\$" + key, 'g');
    return target.replace(pattern, value);
  }, target);
};

Telegraph.prototype.queryHasVariables = function(query) {
  return query.match(/\$/);
};

Telegraph.prototype.hasVariables = function() {
  var self = this;
  return _.some(this.targets, function(t) { return t && self.queryHasVariables(t.query) });
};

Telegraph.prototype.makeChart = function(chartType) {
  var chart = nv.models[chartType]();
  chart.xAxis.tickFormat(function(d){ return d3.time.format('%X')(new Date(d * 1000)) });
  if (chart.yAxis)  chart.yAxis.tickFormat(d3.format('d'));
  if (chart.yAxis1) chart.yAxis1.tickFormat(d3.format('d'));
  if (chart.yAxis2) chart.yAxis2.tickFormat(d3.format('d'));
  return chart;
};

Telegraph.prototype.svg = function() {
  return d3.select(this.selector).select('svg');
};

Telegraph.prototype.update = function() {
  var self = this;
  this.fetchData(this.targets, function(data) {
    self.svg().datum(data);
    self.chart.update();
  });
};

Telegraph.prototype.fetchData = function(targets, done) {
  var self = this;
  var data = [];

  targets = _.compact(targets);
  var targetGroups = _.groupBy(targets, function(target, index) {
    target.index = index;
    return [target.baseUrl, target.shift]
  });

  var promises = _.map(targetGroups, function(targets) {
    return self.getData(data, targets);
  });

  $.when.apply($, promises).always(function (e) {
    done(data);
  });
};

Telegraph.prototype.getData = function(data, targets) {
  var self = this;

  if (targets.length == 0) return;

  var opts = {
    from:  this.from,
    until: this.until,
    shift: self.subVariables(targets[0].shift)
  };

  var labels = [];
  var url = targets[0].baseUrl + "?" + _.compact(_.map(targets, function(t, i) {
    var query = self.subVariables(t.query);
    var label = t.label || _.compact([t.shift, t.query]).join(":");
    labels[i] = self.subVariables(label);
    return "target=" + encodeURIComponent(query);
  })).join('&');

  return $.ajax({
    url: url,
    data: opts,
    success: function(rawData) {
      _.each(rawData, function(val, i) {
        var datapoints = _.map(val.datapoints, function(d) {
          return { x: d[1] || 0, y: d[0] || 0 }
        });
        var target = targets[i];
        data[target.index] = {
          key:    labels[i],
          values: datapoints,
          bar:    target.bar,
          type:   target.type,
          yAxis:  target.yAxis
        };
      });
    }
  });
};
