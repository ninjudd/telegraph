var Telegraph = function (opts) {
  opts = opts || {chart: "lineChart"};

  this.hash      = opts.hash;
  this.name      = opts.name;
  this.from      = opts.from;
  this.until     = opts.until;
  this.targets   = opts.targets;
  this.variables = opts.variables;
  this.chart     = opts.chart;
  this.summarize = opts.summarize;
  this.invert    = opts.invert;
  this.refresh   = opts.refresh;
  this.draws     = 0;
};

Telegraph.baseUrls = {};

Telegraph.prototype.draw = function(selector, done) {
  var self = this;
  this.draws++;

  $(selector).empty();
  if (this.refreshInterval) clearInterval(this.refreshInterval);

  if (this.targets && this.targets.length > 0) {
    this.fetchData(this.targets, function(data) {
      if (self.chart == 'table') {
        self.tableDraw(selector, data);
      } else {
        self.nvDraw(selector, data);
      }
    });
    if (done) done();

    var refresh = this.refresh;
    if (this.refresh == null) refresh = Telegraph.defaultRefresh;
    if (refresh) {
      this.refreshInterval = setInterval(_.bind(this.update, this), refresh * 1000);
    }
  } else {
    if (done) done();
  }
};

Telegraph.prototype.tableDraw = function(selector, data) {
  var self = this;
  var times = [""].concat(_.map(data[0].values, function (val) {
    return Telegraph.formatTime(val.x);
  }));
  var items = _.map(data, function (item) {
    var values = _.map(item.values, function(val) { return val.y });
    return [item.key].concat(values);
  });

  if (this.summarize) {
    var rows = _.map(data, function(e) { return _.pluck(e.values, "y") });
    var totals = _.map(_.zip.apply(_, rows), function (col) {
      return _.reduce(col, function(acc, num) {
        return acc + num;
      }, 0);
    });
    items.push(["total"].concat(totals));
  }

  this.table = new Table(selector, {
    invert: this.invert,
    class: "telegraph-table table table-striped",
    items: [times].concat(items)
  })
  _.bindAll(this.table);
  this.table.update();
};

Telegraph.prototype.nvDraw = function(selector, data) {
  var self = this;
  $(selector).append("<svg><svg/>");
  this.svg = d3.select(selector).select("svg");
  this.nvChart = Telegraph.makeChart(this.chart);

  nv.addGraph(function() {
    self.svg.datum(data)
        .transition().duration(500)
        .call(self.nvChart);
    return self.nvChart;
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

Telegraph.makeChart = function(chart) {
  var nvChart = nv.models[chart]();
  nvChart.xAxis.tickFormat(Telegraph.formatTime);
  nvChart.margin({left: 40, right: 30, bottom: 20, top: 20});
  if (nvChart.yAxis)  nvChart.yAxis.tickFormat(d3.format('d'));
  if (nvChart.yAxis1) nvChart.yAxis1.tickFormat(d3.format('d'));
  if (nvChart.yAxis2) nvChart.yAxis2.tickFormat(d3.format('d'));
  _.bindAll(nvChart);
  return nvChart;
};

Telegraph.formatTime = function(d) {
  return d3.time.format('%X')(new Date(d * 1000))
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
    return [target.source, target.shift]
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
  var url = Telegraph.baseUrls[targets[0].source] + "?" + _.compact(_.map(targets, function(t, i) {
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
          bar:    target.type == 'bar',
          type:   target.type,
          yAxis:  target.axis == 'right' ? 2 : 1,
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
      hash: this.hash,
      chart: this.chart,
      from: this.from,
      until: this.until,
      invert: this.invert,
      summarize: this.summarize,
      refresh: this.refresh,
      targets: this.targets,
      variables: this.variables,
      force: opts.force
    };

    return $.ajax({
      url: "/graph/save",
      data: JSON.stringify(data),
      type: "POST",
      success: function(results) {
        self.hash = results.hash;
        if (opts.success) opts.success(results);
      },
      error: function(results) {
        var response = JSON.parse(results.responseText);
        if (opts.error) opts.error(response.error);
      }
    });
  }
};

Telegraph.prototype.rename = function(opts) {
  var self = this;
  var from = this.name;
  return $.ajax({
    url: "/graph/rename",
    data: JSON.stringify({from: self.name, to: opts.name}),
    type: "POST",
    success: function(results) {
      self.name = opts.name;
      if (opts.success) opts.success(from);
    },
    error: function(results) {
      var response = JSON.parse(results.responseText);
      if (opts.error) opts.error(response.error);
    }
  });
};

Telegraph.prototype.delete = function(opts) {
  var self = this;
  return $.ajax({
    url: "/graph/delete",
    data: JSON.stringify({name: self.name}),
    type: "POST",
    success: function(results) {
      if (opts.success) opts.success();
    },
    error: function(results) {
      var response = JSON.parse(results.responseText);
      if (opts.error) opts.error(response.error);
    }
  });
};

Telegraph.load = function(opts) {
  if (opts.name) {
    $.ajax({
      url: "/graph/load?name=" + encodeURIComponent(opts.name),
      success: function(results) {
        if (results) {
          opts.success(new Telegraph(results));
        } else {
          if (opts.error) opts.error(opts.name);
        }
      }
    });
  } else {
    opts.success(new Telegraph());
  }
};

Telegraph.list = function(process) {
  $.ajax({
    url: "/graph/list",
    success: function(results) {
      process(results);
    }
  });
};
