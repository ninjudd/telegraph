var Telegraph = function (selector, opts) {
  this.selector  = selector;
  this.chartType = opts.chart;
  this.from      = opts.from;
  this.until     = opts.until;
  this.targets   = opts.targets;
  this.variables = opts.variables;

  var self = this;
  this.fetchData(this.targets, function(data) {
    if (data.length > 0) {
      nv.addGraph(function() {
        var chart = self.chart();
        self.svg().datum(data)
            .transition().duration(500)
            .call(chart);
        return chart;
      });
    }
  });
};

Telegraph.prototype.subVariables = function(target) {
  return _.reduce(this.variables, function (target, value, key) {
    var pattern = new RegExp("\\$" + key, 'g');
    return target.replace(pattern, value);
  }, target);
};

Telegraph.prototype.hasVariables = function() {
  return _.some(this.targets, function(t) { return t.query.match(/\$/) });
};

Telegraph.prototype.chart = function() {
  var chart = nv.models[this.chartType]();
  chart.xAxis.tickFormat(function(d){ return d3.time.format('%X')(new Date(d * 1000)) });
  if (chart.yAxis)  chart.yAxis.tickFormat(d3.format('d'));
  if (chart.yAxis1) chart.yAxis1.tickFormat(d3.format('d'));
  if (chart.yAxis2) chart.yAxis2.tickFormat(d3.format('d'));
  return chart;
};

Telegraph.prototype.svg = function() {
  return d3.select(this.selector).select('svg');
};

Telegraph.prototype.css = function(opts) {
  $(this.selector).css(opts);
};

Telegraph.prototype.update = function() {
  var self = this;
  this.fetchData(this.targets, function(data) {
    self.svg().datum(data);
    self.chart.update();
  });
};

Telegraph.prototype.fetchData = function(targets, success) {
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

  $.when.apply($, promises).then(function (e) {
    success(data);
  });
};

Telegraph.prototype.getData = function(data, targets) {
  var self = this;

  if (targets.length == 0) return;

  var opts = {
    from:  this.from,
    until: this.until,
    shift: targets[0].shift
  };

  var url = targets[0].baseUrl + "?" + _.map(targets, function(t) {
    return "target=" + encodeURIComponent(self.subVariables(t.query))
  }).join('&');

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
          key:    target.label || _.compact([target.shift, target.query]).join(":"),
          values: datapoints,
          bar:    target.bar,
          type:   target.type,
          yAxis:  target.yAxis
        };
      });
    }
  });
};
