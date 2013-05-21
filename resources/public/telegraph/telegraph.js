var Telegraph = function (opts) {
  this.initialize = function(opts) {
    this.from  = opts.from;
    this.until = opts.until;
  }
  this.initialize(opts);
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
