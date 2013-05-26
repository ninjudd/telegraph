var Telegraph = function (opts) {
  opts = opts || {chart: "lineChart"};

  this.version   = opts.version;
  this.name      = opts.name;
  this.from      = opts.from;
  this.until     = opts.until;
  this.targets   = opts.targets;
  this.variables = opts.variables;
  this.chart     = opts.chart;
};

Telegraph.prototype.draw = function(selector, done) {
  var self = this;
  $(selector).find("svg").text("");

  this.svg = d3.select(selector).select("svg");
  this.nvChart = this.makeChart(this.chart);
  this.fetchData(this.targets, function(data) {
    nv.addGraph(function() {
      self.svg.datum(data)
          .transition().duration(500)
          .call(self.nvChart);
      if (done) done();
      return self.nvChart;
    });
  });

  nv.utils.windowResize(function() {
    self.nvChart.update()
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

Telegraph.prototype.makeChart = function(chart) {
  var nvChart = nv.models[chart]();
  nvChart.xAxis.tickFormat(function(d) { return d3.time.format('%X')(new Date(d * 1000)) });
  if (nvChart.yAxis)  nvChart.yAxis.tickFormat(d3.format('d'));
  if (nvChart.yAxis1) nvChart.yAxis1.tickFormat(d3.format('d'));
  if (nvChart.yAxis2) nvChart.yAxis2.tickFormat(d3.format('d'));
  _.bindAll(nvChart);
  return nvChart;
};

Telegraph.prototype.update = function() {
  var self = this;
  this.fetchData(this.targets, function(data) {
    self.svg.datum(data);
    self.nvChart.update();
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
    labels[i] = self.subVariables(t.label);
    return "target=" + encodeURIComponent(query);
  })).join('&');

  return $.ajax({
    url: url,
    data: opts,
    success: function(results) {
      _.each(results, function(val, i) {
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

Telegraph.prototype.save = function(opts) {
  if (this.name) {
    var self = this;
    var data = {
      name: this.name,
      version: this.version,
      chart: this.chart,
      from: this.from,
      until: this.until,
      targets: this.targets,
      variables: this.variables,
      force: opts.force
    };

    return $.ajax({
      url: "/graph/save",
      data: JSON.stringify(data),
      type: "POST",
      success: function(results) {
        self.version = results.version;
        if (opts.success) opts.success(results);
      },
      error: function(results) {
        var response = JSON.parse(results.responseText);
        if (opts.error) opts.error(response.error);
      }
    });
  }
};

Telegraph.load = function(name, success) {
  if (name) {
    $.ajax({
      url: "/graph/load?name=" + encodeURIComponent(name),
      success: function(results) {
        success(new Telegraph(results));
      }
    });
  } else {
    success(new Telegraph());
  }
};
