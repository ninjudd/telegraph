var Telegraph = function () {};

Telegraph.prototype.getData = function(targets, opts) {
  var t = _.map(targets, function(t) {
    return "target=" + t.query
  }).join('&');

  var self = this;
  var data;
  $.ajax({
    url: opts.url + "?" + t,
    data: {
      from:   opts.from,
      until:  opts.until,
      format: "json"
    },
    async: false,
    success: function(d){
      data = self.toD3Friendly(targets, d);
    }
  });
  return data;
}

// Munge our data to be d3 friendly.
Telegraph.prototype.toD3Friendly = function(targets, rawData) {
  var data = [];
  _.each(rawData, function(obj, idx){
    var dps = _.map(obj.datapoints, function(obj){ return { x: obj[1] || 0, y: obj[0] || 0 } });
    var d = { key: targets[idx].name || obj.target, values: dps };
    data.push(d);
  });
  return data;
};

Telegraph.prototype.getQueries = function(opts) {
  var queries;
  $.ajax({
    url: opts.url,
    async: false,
    success: function(d){
      queries = d;
    }});

  var data = [{
    name: 'Queries',
    values: _.map(queries, function(queries, group){
      return {
        name: group,
        _values: _.map(queries, function(query, name){
          return {name: name, query: query}
        })
      }
    })
  }]

  return data;
}

Telegraph.prototype.queryList = function() {
  var list = nv.models.indentedTree().tableClass('table table-striped') //for bootstrap styling
  list.columns([
    { key: 'name',
      label: 'Name',
      showCount: true,
      width: '50%',
      type: 'text',
      classes: function(d) { return d.url ? 'clickable name' : 'name' },
      click: function(d) {
        if (d.url) window.location.href = d.url;
      }},
    { key: 'query',
      label: 'Query',
      width: '50%',
      type: 'text' }
  ])
  return list;
}


