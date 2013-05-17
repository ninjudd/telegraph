var Telegraph = function (opts) {
  this.initialize = function(opts) {
    this.baseUrl     = opts.baseUrl;
    this.renderPath  = opts.renderPath  || 'render';
  }
  this.initialize(opts);
};

Telegraph.prototype.renderUrl = function(targets, type) {
  var targetParams = _.map(targets, function(t) {
    return "target=" + encodeURIComponent(t.query)
  }).join('&');
  var url = this.baseUrl;
  if (type) url = url + '/' + type;
  return url + '/' + this.renderPath + "?" + targetParams;
};

Telegraph.prototype.getData = function(targets, opts) {
  var self = this;
  var data;

  if (targets.length == 0) return [];

  $.ajax({
    url: this.renderUrl(targets, opts.type),
    data: {
      from:  opts.from,
      until: opts.until
    },
    async: false,
    success: function(d) {
      data = self.toD3Friendly(targets, d);
    }
  });
  return data;
};

Telegraph.prototype.toD3Friendly = function(targets, rawData) {
  var data = [];
  _.each(rawData, function(obj, idx) {
    var dps = _.map(obj.datapoints, function(obj){ return { x: obj[1] || 0, y: obj[0] || 0 } });
    var d = { key: targets[idx].name || obj.target, values: dps };
    data.push(d);
  });
  return data;
};
