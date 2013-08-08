define([
  "telegraph/table", "resting", "jquery", "nvd3", "d3", "underscore_contrib", "underscore_string",
], function(Table, Resting, $, nv, d3, _, str) {

  var Telegraph = function() {
    this.attrs = {
      chart:   "lineChart",
      targets: []
    };
  };
  Resting(Telegraph, {baseUrl: "/graphs"});

  Telegraph.maxDataPoints = 5000;

  Telegraph.parseJSON = function(json) {
    if (json) {
      try {
        return JSON.parse(json);
      } catch (e) {
        return;
      }
    } else {
      return {};
    }
  };

  Telegraph.prototype.overrideAttrs = function(overrides) {
    if (overrides) {
      this.attrs = _.extend(this.attrs, overrides, {variables: this.attrs.variables});
      this.variableOverrides = overrides.variables;
    }
  };

  Telegraph.prototype.parseVariables = function() {
    var variables = Telegraph.parseJSON(this.attrs.variables);
    var overrides = Telegraph.parseJSON(this.variableOverrides);

    // Allow overriding specific variables without overriding all of them.
    if (!_.isArray(variables)) variables = [variables];
    if (!_.isArray(overrides)) overrides = _.map(variables, function() { return overrides });

    return _.map(variables, function(variable, i) {
      return _.extend(variable, overrides[i]);
    });
  }

  Telegraph.prototype.draw = function(selector) {
    var self = this;

    return jQuery.Deferred(function (promise) {
      self.vars = self.parseVariables();

      if (!self.vars) {
        promise.reject("Error parsing JSON for macro varibles; " + e);
        return;
      }
      if (!_.isArray(self.vars)) self.vars = [self.vars];

      $(selector).empty();
      self.clear();

      if (self.attrs.targets && self.attrs.targets.length > 0) {
        self.fetchData().done(function(data) {
          var cardinality = Telegraph.cardinality(data);
          var numDataPoints = _.max(cardinality.lengths);
          if (!cardinality.match && self.requiresMatchingCardinality()) {
            promise.reject("Cardinality of data sets must match for this type of chart.");
          } else if (numDataPoints > Telegraph.maxDataPoints) {
            promise.reject("Too many data points. " + "Your query returns " +
                           numDataPoints + ", but the maximum is " + Telegraph.maxDataPoints + ".");
          } else {
            if (self.attrs.chart == 'table') {
              self.tableDraw(selector, data);
            } else {
              self.nvDraw(selector, data);
            }
            var refresh = (self.attrs.refresh == null) ? Telegraph.defaultRefresh : self.attrs.refresh;
            if (refresh) {
              self.refreshInterval = setInterval(_.bind(self.update, self), refresh * 1000);
            }
            promise.resolve();
          }
        });
      } else {
        promise.resolve();
      }
    });
  };

  Telegraph.prototype.isEmpty = function () {
    return this.attrs.targets.length == 0;
  }

  Telegraph.prototype.requiresMatchingCardinality = function() {
    return _.contains(['table', 'stackedAreaChart', 'multiBarChart'], this.attrs.chart);
  };

  Telegraph.prototype.clear = function() {
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
    var self = this;

    var scale      = this.scale || Telegraph.timeScale(data);
    var formatTime = scale.tickFormat();
    var formatVal  = function(val) {
      return _.map(val, function(v, i) {
        var format = self.vars[i]._format;
        return format ? str.sprintf(format, v) : v;
      });
    };

    var times = [""].concat(_.map(data[0].values, function (val) {
      return formatTime(new Date(val.x * 1000));
    }));

    var rows = _.map(data, function (datum) {
      return _.map(_.zip.apply(_, datum.results), function(vals) {
        return _.pluck(vals, "y")
      });
    });

    var items = _.map(data, function (datum, i) {
      return [datum.key].concat(_.map(rows[i], formatVal));
    });

    if (this.attrs.sum_rows) {
      _.each(rows, function (row, i) {
        var total = _.pointwise(row, _.add);
        items[i].push(formatVal(total));
      });
      times.push("total");
    }

    if (this.attrs.sum_cols) {
      var totals = _.pointwise(rows, function (a, b) {
        return _.pointwise([a, b], _.add);
      });
      var grandTotal = _.pointwise(totals, _.add);
      items.push(["total"].concat(_.map(totals, formatVal)));
      if (this.attrs.sum_rows) _.last(items).push(formatVal(grandTotal));
    }

    return [times].concat(items);
  };

  Telegraph.prototype.tableCells = function (item, i) {
    var self = this;

    var colSpan = this.vars.length;
    var length  = item.length;

    return _.mapcat(item, function(val, j) {
      var css = (j == 0) ?
          {} :
          {borderLeft: (j == length - 1 || j == 1) ? "double 3px #ccc" : "solid 1px #ddd"};
      if (_.isArray(val)) {
        return _.map(val, function(v, k) {
          var cell = {
            text: v,
            title: self.vars[k]._label || JSON.stringify(self.vars[k], null, "  ")
          };
          if (k == 0) cell.css = css;
          return cell;
        });
      } else {
        return [{
          text: val,
          css: css,
          colSpan: (i == 0 && j > 0 && colSpan > 1) ? colSpan : null,
        }];
      }
    });
  };

  Telegraph.prototype.tableDraw = function(selector, data) {
    var classes = "telegraph-table table table-striped";
    classes += (this.attrs.invert)   ? " inverted" : " standard";
    classes += (this.attrs.sum_cols) ? " sum-cols" : "";
    classes += (this.attrs.sum_rows) ? " sum-rows" : "";

    var items = this.tableItems(data);
    if (this.attrs.invert) items = _.zip.apply(_, items);

    this.table = new Table(selector, {
      toCells: _.bind(this.tableCells, this),
      class:  classes,
      items:  items,
    })
    _.bindAll(this.table);
    this.table.update();
    this.addTableTitle(data);
  };

  Telegraph.prototype.addTableTitle = function(data) {
    var self = this;
    var link = $("<span/>", {class: "dropdown-toggle", "data-toggle": "dropdown"});
    link.append($("<span/>", {class: "chart-label table-label"}));
    link.append("&#x25BE;");
    var menu = $("<ul/>", {id: "table-menu", class: "dropdown-menu", role: "menu"});
    _.each(this.vars, function(v, i) {
      var suffix = v._label || (i == 0 ? "" : i + 1);
      var name = self.id;
      name += suffix ? " - " + suffix : "";
      menu.append($("<li/>").append(self.csvLink(name, data, i)));
    });

    var cell = $(this.table.selector).find("table tr:first-child td:first-child")
    cell.append($("<div/>", {class: "dropdown"}).append(menu, link));
  };

  Telegraph.prototype.csvData = function(data, index) {
    var rows = _.map(data, function(datum) {
      return datum.results[index];
    });
    var lines = _.map(_.zip.apply(_, rows), function (col) {
      return [col[0].x].concat(_.pluck(col, "y")).join(",");
    });
    var fields = ["time"].concat(_.pluck(data, "key"));
    return [fields].concat(lines).join("\n");
  };

  Telegraph.prototype.csvLink = function(name, data, index) {
    var url = "data:application/csv;charset=utf-8," + encodeURIComponent(this.csvData(data, index));
    return $("<a/>", {download: name + ".csv", href: url, text: "Export: " + name});
  };

  Telegraph.prototype.nvDraw = function(selector, data) {
    var self = this;
    var $container = $(selector)
    var tickCount  = this.tickCount || Math.floor($container.width() / 100);
    var scale      = this.scale     || Telegraph.timeScale(data);

    $container.append($("<div/>", {class: "graph-label"}).append($("<span/>", {class: "chart-label"})));
    $container.append("<svg></svg>");
    this.svg = d3.select(selector).select("svg");
    this.nvChart = Telegraph.makeChart(this.attrs.chart, scale, tickCount);

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
    return _.some(this.attrs.targets, function(t) { return t && Telegraph.queryHasVariables(t.query) });
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

    this.fetchData().done(function(data) {
      if (self.attrs.chart == 'table') {
        self.table.items = self.tableItems(data);
        self.table.update();
        self.addTableTitle(data);
      } else {
        self.svg.datum(data);
        self.updateChart();
      }
    });
  };

  Telegraph.prototype.updateChart = function() {
    if (this.nvChart) this.nvChart.update();
  };

  Telegraph.prototype.fetchData = function() {
    var self = this;

    var data = [];
    var count = 0;

    var targets = _.mapcat(_.compact(this.attrs.targets), function (target, targetNum) {
      return _.mapcat(self.vars, function(vars, varNum) {
        return {
          source:    self.subVariables(target.source, vars),
          query:     self.subVariables(target.query,  vars) + (vars._transform || ""),
          label:     self.subVariables(target.label,  vars),
          shift:     self.subVariables(target.shift,  vars),
          targetNum: targetNum,
          varNum:    varNum,
          index:     count++,
          base:      target,
        };
      });
    });

    var groups = _.groupBy(targets, function(t) { return [t.source, t.shift] });
    return $.when.apply($, _.map(groups, function(targets) {
      return self.getData(data, targets);
    })).then(function() {
      return data;
    });
  };

  Telegraph.baseUrls = {};
  Telegraph.defaultPeriod = "15m";

  Telegraph.prototype.getData = function(data, targets) {
    if (targets.length == 0) return;

    var opts = {
      from:     this.attrs.from,
      until:    this.attrs.until,
      period:   this.attrs.period || Telegraph.defaultPeriod,
      align:    this.attrs.chart == 'table' ? 'start' : this.attrs.align,
      shift:    targets[0].shift,
      timezone: - (new Date()).getTimezoneOffset() + "m",
    };

    var url = Telegraph.baseUrls[targets[0].source] + "?" + _.compact(_.map(targets, function(t, i) {
      return "target=" + encodeURIComponent(t.query);
    })).join('&');

    return $.ajax({
      url: url,
      data: opts
    }).done(function(results) {
      var targetsByQuery = _.groupBy(targets, function(t) { return t.query });

      _.each(results, function(result) {
        var datapoints = _.map(result.datapoints, function(d) {
          return { x: d[1] || 0, y: d[0] || 0 }
        });
        _.each(targetsByQuery[result.target], function(target) {
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
          item.results[target.varNum] = datapoints;
          data[target.targetNum] = item;
        });
      });
    });
  };

  return Telegraph;
});
