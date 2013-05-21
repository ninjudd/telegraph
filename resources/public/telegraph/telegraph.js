var Telegraph = function (selector, chart, opts) {
  this.chart    = chart;
  this.selector = selector;
  this.from     = opts.from;
  this.until    = opts.until;

  var self = this;
  nv.addGraph(function() {
    self.svg().datum([])
        .transition().duration(500)
        .call(chart);
    return chart;
  });
};

Telegraph.prototype.svg = function() {
  return d3.select(this.selector).select('svg');
};

Telegraph.prototype.css = function(opts) {
  $(this.selector).css(opts);
};

Telegraph.prototype.update = function(targets) {
  var self = this;
  this.fetchData(targets, function(data) {
    if (data.length == 0) {
      self.css({opacity: 0})
    } else {
      self.svg().datum(data);
      self.chart.update();
      setTimeout(function() { self.css({opacity: 1}) }, 500);
    }
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
  if (targets.length == 0) return;

  var opts = {
    from:  this.from,
    until: this.until,
    shift: targets[0].shift
  };

  var url = targets[0].baseUrl + "?" + _.map(targets, function(t) {
    return "target=" + encodeURIComponent(t.query)
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
          key: target.name || val.target,
          values: datapoints
        };
      });
    }
  });
};
