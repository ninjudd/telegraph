var Telegraph = function (opts) {
  opts = opts || {chart: "lineChart"};

  this.hash      = opts.hash;
  this.name      = opts.name;
  this.from      = opts.from;
  this.until     = opts.until;
  this.targets   = opts.targets;
  this.variables = opts.variables;
  this.chart     = opts.chart;
  this.period    = opts.period;
  this.align     = opts.align;
  this.invert    = opts.invert;
  this.summarize = opts.summarize;
  this.refresh   = opts.refresh;
  this.tickCount = opts.tickCount;
  this.scale     = opts.scale;
  this.draws     = 0;
};

Telegraph.baseUrls = {};

Telegraph.requiresMatchingCardinality = function(chart) {
  return _.contains(['table', 'stackedAreaChart', 'multiBarChart'], chart)
};

Telegraph.maxDataPoints = 5000;

Telegraph.prototype.draw = function(selector, done, error) {
  var self = this;
  this.draws++;

  $(selector).empty();
  if (this.refreshInterval) clearInterval(this.refreshInterval);

  if (this.targets && this.targets.length > 0) {
    this.fetchData(this.targets, function(data) {
      var cardinality = Telegraph.cardinality(data);
      var numDataPoints = _.max(cardinality.lengths);
      if (!cardinality.match && Telegraph.requiresMatchingCardinality(self.chart)) {
        if (error) error("Cardinality of data sets must match for this type of chart.");
      } else if (numDataPoints > Telegraph.maxDataPoints) {
        if (error) error("Too many data points. " + "Your query returns " +
                         numDataPoints + ", but the maximum is " + Telegraph.maxDataPoints + ".");
      } else {
        if (self.chart == 'table') {
          self.tableDraw(selector, data);
        } else {
          self.nvDraw(selector, data);
        }
        var refresh = (self.refresh == null) ? Telegraph.defaultRefresh : self.refresh;
        if (refresh) {
          self.refreshInterval = setInterval(_.bind(self.update, self), refresh * 1000);
        }
        if (done) done();
      }
    });
  } else {
    if (done) done();
  }
};

Telegraph.cardinality = function(data) {
  var rows  = _.map(data, Telegraph.axisValues("x"));
  var match = _.every(_.zip.apply(_, rows), function (times) {
    return _.uniq(times).length == 1;
  });

  return {
    match: match,
    lengths: _.pluck(rows, "length"),
  };
};

Telegraph.axisValues = function(axis, data) {
  if (data) {
    return _.pluck(data.values, axis);
  } else {
    return function(data) {
      return _.pluck(data.values, axis);
    };
  }
};

Telegraph.prototype.tableItems = function(data) {
  var scale  = this.scale || Telegraph.timeScale(data);
  var format = scale.tickFormat();

  var times  = [""].concat(_.map(data[0].values, function (val) {
    return format(new Date(val.x * 1000));
  }));

  var items = _.map(data, function (item) {
    var values = Telegraph.axisValues("y", item);
    return [item.key].concat(values);
  });

  if (this.summarize) {
    var rows = _.map(data, Telegraph.axisValues("y"));
    var totals = _.map(_.zip.apply(_, rows), function (col) {
      return _.reduce(col, function(acc, num) {
        return acc + num;
      }, 0);
    });
    items.push(["total"].concat(totals));
  }

  return [times].concat(items);
};

Telegraph.prototype.tableDraw = function(selector, data) {
  var classes = "telegraph-table table table-striped";
  classes += (this.summarize) ? " summary"  : "";
  classes += (this.invert)    ? " inverted" : " standard";

  this.table = new Table(selector, {
    invert: this.invert,
    class: classes,
    items: this.tableItems(data)
  })
  _.bindAll(this.table);
  this.table.update();
};

Telegraph.prototype.nvDraw = function(selector, data) {
  var self = this;
  var container = $(selector)
  var tickCount = this.tickCount || Math.floor(container.width() / 100);
  var scale     = this.scale     || Telegraph.timeScale(data);

  container.append("<svg><svg/>");
  this.svg = d3.select(selector).select("svg");
  this.nvChart = Telegraph.makeChart(this.chart, scale, tickCount);

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

Telegraph.queryHasVariables = function(query) {
  return query.match(/\$/);
};

Telegraph.prototype.hasVariables = function() {
  var self = this;
  return _.some(this.targets, function(t) { return t && Telegraph.queryHasVariables(t.query) });
};

Telegraph.timeScale = function(data) {
  var xData = _.map(data, Telegraph.axisValues("x"));
  var min = _.min(_.map(xData, function(x) { return _.min(x) }));
  var max = _.max(_.map(xData, function(x) { return _.max(x) }));

  var interval = max - min;
  var scale = d3.time.scale();
  scale.domain([new Date(min * 1000), new Date(max * 1000)]);
  return scale;
};

Telegraph.makeChart = function(chart, scale, tickCount) {
  var nvChart = nv.models[chart]();
  var ticks   = _.map(scale.ticks(tickCount), function(d) { return d.getTime() / 1000 });
  var format  = function(d, i) {
    var fmt = (i == null) ? d3.time.format('%X %a %x') : scale.tickFormat(tickCount);
    return fmt(new Date(d * 1000))
  };

  _.each([nvChart.xAxis, nvChart.x2Axis], function (axis) {
    if (axis) axis.showMaxMin(false).tickValues(ticks).tickFormat(format);
  });
  _.each([nvChart.yAxis, nvChart.yAxis1, nvChart.yAxis2, nvChart.y2Axis], function (axis) {
    if (axis) axis.tickFormat(d3.format('d'));
  });
  nvChart.margin({left: 40, right: 30, bottom: 20, top: 20});

  _.bindAll(nvChart);
  return nvChart;
};

Telegraph.prototype.update = function() {
  var self = this;
  this.fetchData(this.targets, function(data) {
    if (self.chart == 'table') {
      self.table.items = self.tableItems(data);
      self.table.update();
    } else {
      self.svg.datum(data);
      self.nvChart.update();
    }
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

Telegraph.defaultPeriod = "15m";

Telegraph.prototype.getData = function(data, targets) {
  var self = this;

  if (targets.length == 0) return;
  var period = this.period || Telegraph.defaultPeriod;
  var align  = (this.align || this.chart == 'table') ? period : null;

  var opts = {
    from:     this.from,
    until:    this.until,
    period:   period,
    align:    align,
    shift:    self.subVariables(targets[0].shift),
    timezone: (new Date()).getTimezoneOffset() + "m",
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
      name:      this.name,
      hash:      this.hash,
      chart:     this.chart,
      from:      this.from,
      until:     this.until,
      period:    this.period,
      align:     this.align,
      invert:    this.invert,
      summarize: this.summarize,
      refresh:   this.refresh,
      targets:   this.targets,
      variables: this.variables,
      force:     opts.force
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
