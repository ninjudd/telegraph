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
};

Telegraph.prototype.getQueries = function(opts) {
  var self = this;
  var tree = {name: 'Queries'};
  $.ajax({
    url: opts.url,
    async: false,
    success: function(queries) {
      _.each(queries, function(queryGroup, groupName) {
        var subTree = self.getTree(tree, groupName);
        _.each(queryGroup, function(query, name) {
          self.assocInTree(subTree, name, {query: query, actions: opts.actions});
        });
      });
    }
  });

  return [tree];
};

Telegraph.prototype.queryList = function() {
  var list = nv.models.indentedTree().tableClass('table table-striped') //for bootstrap styling
  list.columns([
    { key: 'name',
      label: 'Name',
      type: 'text',
      showCount: true,
      width: '40%' },
    { key: 'query',
      label: 'Query',
      type: 'text',
      width: '50%' },
    { key: 'actions',
      label: 'Actions',
      type: 'text',
      width: '10%' }
  ])
  return list;
};

Telegraph.prototype.addQuery = function(opts) {
    var $submit = $("#query-submit");
    $submit.attr("disabled", true);
    var postData = {
        type:   opts.type,
        name:   opts.name,
        query:  opts.query,
        format: "json"
    };
    if (opts.replaySince) {
        postData["replay-since"] = opts.replaySince;
    }

    // console.log(postData);
    $.ajax({
        url: opts.url,
        type: "POST",
        data: postData,
        async: true,
        success: function(d){
            console.log(d);
            $submit.attr("disabled", false);
        },
        dataType: "text"
    });
};

// Helper functions //
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

Telegraph.prototype.getTree = function(tree, name) {
  var values = tree._values || tree.values;
  if (!values) {
    tree._values = values = [];
  }

  var subtree = _.find(values, function(v) { return v.name == name });
  if (!subtree) {
    subtree = {name: name};
    values.push(subtree);
  }
  return subtree;
};

Telegraph.prototype.getInTree = function(tree, name) {
  var self = this;
  var segments = name.split(/[\.:]/);
  var subtree = tree;
  _.each(segments, function(subname) {
    subtree = self.getTree(subtree, subname);
  });

  return subtree;
};

Telegraph.prototype.assocInTree = function(tree, name, attrs) {
  var subtree = this.getInTree(tree, name);
  _.each(attrs, function(v, k) {
    subtree[k] = v;
  });

  return subtree;
};
