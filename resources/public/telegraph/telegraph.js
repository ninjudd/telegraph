var Telegraph = function (opts) {
  opts = opts || {chart: "lineChart"};

  this.hash       = opts.hash;
  this.name       = opts.name;
  this.from       = opts.from;
  this.until      = opts.until;
  this.targets    = opts.targets;
  this.chart      = opts.chart;
  this.period     = opts.period;
  this.align      = opts.align;
  this.invert     = opts.invert;
  this.sumCols    = opts.sumCols;
  this.sumRows    = opts.sumRows;
  this.refresh    = opts.refresh;
  this.tickCount  = opts.tickCount;
  this.scale      = opts.scale;
  this.variables  = opts.variables;

  if (this.variables) {
    try {
      this.vars = JSON.parse(this.variables);
    } catch (err) {}
  } else {
    this.vars = {};
  }
  if (!_.isArray(this.vars)) this.vars = [this.vars];
};

Telegraph.baseUrls = {};

Telegraph.requiresMatchingCardinality = function(chart) {
  return _.contains(['table', 'stackedAreaChart', 'multiBarChart'], chart)
};

Telegraph.maxDataPoints = 5000;

Telegraph.prototype.draw = function(selector, done, error) {
  var self = this;

  $(selector).empty();
  this.clearRefresh();

  if (this.targets && this.targets.length > 0) {
    this.fetchData(function(data) {
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

Telegraph.prototype.clearRefresh = function() {
  if (this.refreshInterval) clearInterval(this.refreshInterval);
};

Telegraph.timeVals = function(data) {
  return _.mapcat(data, function(datum) {
    return _.map(datum.results, function(results) {
      return _.pluck(results, "x");
    });
  });
};

Telegraph.cardinality = function(data) {
  var timeVals = this.timeVals(data);
  var match = _.every(_.zip.apply(_, timeVals), function (times) {
    return _.uniq(times).length == 1;
  });

  return {
    match: match,
    lengths: _.pluck(timeVals, "length"),
  };
};

_.add = function (a, b) {
  return a + b;
};

_.pointwise = function(colls, f, context) {
  return _.map(_.zip.apply(_, colls), function(a) {
    return _.reduce(_.rest(a), f, _.first(a));
  });
};

Telegraph.prototype.tableItems = function(data) {
  var format;

  var scale      = this.scale || Telegraph.timeScale(data);
  var formatTime = scale.tickFormat();
  var formatVal  = format ? function(val) { return _.str.sprintf(format, val) } : _.identity;
  var formatVals = format ? function(vals) { return _.map(vals, formatVal) } : _.identity;

  var times = [""].concat(_.map(data[0].values, function (val) {
    return formatTime(new Date(val.x * 1000));
  }));

  var rows = _.map(data, function (datum) {
    return _.map(_.zip.apply(_, _.pluck(datum.results, "values")), function(vals) {
      return _.pluck(vals, "y")
    });
  });

  var items = _.map(data, function (datum, i) { return [datum.key].concat(rows[i]) });

  if (this.sumRows) {
    _.each(rows, function (row, i) {
      items[i].push(_.pointwise(row, _.add));
    });
    times.push("total");
  }

  if (this.sumCols) {
    var totals = _.pointwise(rows, function (a, b) {
      return _.pointwise([a, b], _.add);
    });
    if (this.sumRows) totals.push(_.pointwise(totals, _.add));
    items.push(["total"].concat(totals));
  }

  return [times].concat(items);
};

Telegraph.prototype.tableDraw = function(selector, data) {
  var self = this;
  var classes = "telegraph-table table table-striped";
  classes += (this.invert)  ? " inverted"   : " standard";
  classes += (this.sumCols) ? " sum-cols"   : "";
  classes += (this.sumRows) ? " sum-rows" : "";

  var items = this.tableItems(data);
  if (self.invert) items = _.zip.apply(_, items);

  this.table = new Table(selector, {
    class: classes,
    items: items,
  })
  _.bindAll(this.table);
  this.table.update();

  var link = $("<span/>", {class: "dropdown-toggle", "data-toggle": "dropdown", html: "&#x25BE;"});
  var menu = $("<ul/>", {id: "table-menu", class: "dropdown-menu", role: "menu"});
  _.each(this.vars, function(vars, i) {
    var suffix = i == 0 ? "" : i + 1;
    var name = self.name;
    name += suffix ? " - " + suffix : "";
    menu.append($("<li/>").append(self.csvLink(name, data, i)));
  });

  var cell = $(selector).find("table tr:first-child td:first-child")
  cell.append($("<div/>", {class: "dropdown"}).append(menu, link));
};

Telegraph.prototype.csvData = function(data, index) {
  var rows = _.map(data, function(datum) {
    return datum.results[index].values;
  });
  var lines = _.map(_.zip.apply(_, rows), function (col) {
    return [col[0].x].concat(_.pluck(col, "y")).join(",");
  });
  var fields = ["time"].concat(_.pluck(data, "key"));
  return [fields].concat(lines).join("\n");
};

Telegraph.prototype.csvLink = function(name, data, index) {
  var url = "data:application/csv;charset=utf-8," + encodeURIComponent(this.csvData(data, index));
  return $("<a/>", {download: name + ".csv", href: url, text: "Download " + name});
};

Telegraph.prototype.nvDraw = function(selector, data) {
  var self = this;
  var $container = $(selector)
  var tickCount  = this.tickCount || Math.floor($container.width() / 100);
  var scale      = this.scale     || Telegraph.timeScale(data);

  $container.append("<svg><svg/>");
  this.svg = d3.select(selector).select("svg");
  this.nvChart = Telegraph.makeChart(this.chart, scale, tickCount);

  nv.addGraph(function() {
    self.svg.datum(data)
        .transition().duration(500)
        .call(self.nvChart);
    return self.nvChart;
  });

  nv.utils.windowResize(function() {
    self.updateChart();
  });
};

Telegraph.prototype.subVariables = function(target, variables) {
  return _.reduce(variables, function (target, value, key) {
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
  var timeVals = this.timeVals(data);
  var min = _.min(_.map(timeVals, function(x) { return _.min(x) }));
  var max = _.max(_.map(timeVals, function(x) { return _.max(x) }));

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

  this.fetchData(function(data) {
    if (self.chart == 'table') {
      self.table.items = self.tableItems(data);
      self.table.update();
    } else {
      self.svg.datum(data);
      self.updateChart();
    }
  });
};

Telegraph.prototype.updateChart = function() {
  if (this.nvChart) this.nvChart.update();
};

Telegraph.prototype.fetchData = function(done) {
  var self = this;
  var data = [];
  var count = 0;

  var targets = _.mapcat(_.compact(this.targets), function (target, targetNum) {
    return _.mapcat(self.vars, function(vars, varNum) {
      return {
        source:    self.subVariables(target.source, vars),
        query:     self.subVariables(target.query, vars) + (vars._transform || ""),
        label:     self.subVariables(target.label, vars),
        shift:     self.subVariables(target.shift, vars),
        targetNum: targetNum,
        varNum:    varNum,
        index:     count++,
        base:      target,
        vars:      vars,
      };
    });
  });

  var promises = [];
  _.each(_.groupBy(targets, function(t) { return [t.source, t.shift] }), function(targets) {
    promises.push(self.getData(data, targets));
  });

  $.when.apply($, promises).always(function (e) {
    done(data);
  });
};

Telegraph.defaultPeriod = "15m";

Telegraph.prototype.getData = function(data, targets) {
  if (targets.length == 0) return;

  var opts = {
    from:     this.from,
    until:    this.until,
    period:   this.period || Telegraph.defaultPeriod,
    align:    this.chart == 'table' ? 'start' : this.align,
    shift:    targets[0].shift,
    timezone: - (new Date()).getTimezoneOffset() + "m",
  };

  var url = Telegraph.baseUrls[targets[0].source] + "?" + _.compact(_.map(targets, function(t, i) {
    return "target=" + encodeURIComponent(t.query);
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
        var item = data[target.targetNum] || {
          bar:     target.base.type == 'bar',
          type:    target.base.type,
          yAxis:   target.base.axis == 'right' ? 2 : 1,
          results: [],
        };
        if (target.varNum == 0) {
          item.key    = target.label;
          item.values = datapoints;
        }
        item.results[target.varNum] = {
          vars:   target.vars,
          values: datapoints,
        };
        data[target.targetNum] = item;
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
      sumCols:   this.sumCols,
      sumRows:   this.sumRows,
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
        var response = results.responseText ? JSON.parse(results.responseText) : {};
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
