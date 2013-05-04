var Telegraph = function (opts) {
  this.initialize = function(opts) {
    this.server      = opts.server;
    this.queriesPath = opts.queriesPath || 'queries'
    this.renderPath  = opts.renderPath  || 'render'
    this.addPath     = opts.addPath     || 'add'
    this.deletePath  = opts.deletePath  || 'delete'
  }
  this.initialize(opts);
};

Telegraph.prototype.getData = function(targets, opts) {
  var targetParams = _.map(targets, function(t) {
    return "target=" + t.query
  }).join('&');

  var self = this;
  var data;
  $.ajax({
    url: "http://" + this.server + "/" + this.renderPath + "?" + targetParams,
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

Telegraph.prototype.getQueries = function() {
  var self = this;
  var tree = {name: 'Queries'};
  $.ajax({
    url: "http://" + this.server + "/" + this.queriesPath,
    async: false,
    success: function(queries) {
      _.each(queries, function(queryGroup, type) {
        var subTree = self.getTree(tree, type);
        _.each(queryGroup, function(query, name) {
          var path = self.splitPath(name);
          self.assocInTree(subTree, path, self.queryNode({query: query, name: name, type: type}));
        });
      });
    }
  });

  return tree;
};

Telegraph.prototype.listQueries = function(selector) {
  var self = this;

  this.queryData = this.getQueries();
  this.queryList = nv.models.indentedTree().tableClass('table table-striped') //for bootstrap styling
  this.queryList.columns([
    { key: 'name',
      label: 'Name',
      type: 'text',
      showCount: true,
      width: '40%' },
    { key: 'query',
      label: 'Query',
      type: 'text',
      width: '50%' },
    { key: 'deleter',
      label: '',
      classes: 'clickable',
      click: function (d) {
        self.deleteQuery(d.opts);
      },
      type: 'text',
      width: '10%' }
  ])

  nv.addGraph(function() {
    d3.select(selector)
      .datum([self.queryData])
      .call(self.queryList);
    return self.queryList;
  });
};

Telegraph.prototype.addQuery = function(opts) {
  var self = this;

  var postData = {
    type:   opts.type,
    name:   opts.name,
    query:  opts.query,
    format: "json"
  };
  if (opts.replaySince) {
    postData["replay-since"] = opts.replaySince;
  }

  var subtree = self.getTree(self.queryData, opts.type);
  var path    = self.splitPath(opts.name);

  $.ajax({
    url: "http://" + this.server + "/" + this.addPath,
    type: "POST",
    data: postData,
    async: true,
    success: function(d) {
      self.assocInTree(subtree, path, self.queryNode(opts));
      self.queryList.update();
      if (opts.success) {
        opts.success(d);
      }
    },
    dataType: "text"
  });
};

Telegraph.prototype.deleteQuery = function(opts) {
  var self = this;

  var subtree = self.getTree(self.queryData, opts.type);
  var path    = self.splitPath(opts.name);

  $.ajax({
    url: "http://" + this.server + "/" + this.deletePath,
    type: "POST",
    data: {
      type:   opts.type,
      name:   opts.name,
      format: "json"
    },
    async: true,
    success: function(d){
      var node = self.getInTree(subtree, path);

      if (self.isLeafNode(node)) {
        self.dissocInTree(subtree, path);
      } else {
        node.query   = null;
        node.deleter = null;
      }
      self.queryList.update();

      if (opts.success) {
        opts.success(d);
      }
    },
    dataType: "text"
  });
};

// Helper functions //

Telegraph.prototype.toD3Friendly = function(targets, rawData) {
  var data = [];
  _.each(rawData, function(obj, idx){
    var dps = _.map(obj.datapoints, function(obj){ return { x: obj[1] || 0, y: obj[0] || 0 } });
    var d = { key: targets[idx].name || obj.target, values: dps };
    data.push(d);
  });
  return data;
};

Telegraph.prototype.splitPath = function(pathString) {
  return pathString.split(/[\.:]/);
};

Telegraph.prototype.isLeafNode = function(node) {
  return !(node._values || node.values);
};

Telegraph.prototype.childValues = function(node) {
  var values = node._values || node.values;
  if (!values) {
    node._values = values = [];
  }
  return values;
};

Telegraph.prototype.getTree = function(tree, name) {
  var values  = this.childValues(tree);
  var subtree = _.find(values, function(v) { return v.name == name});
  if (!subtree) {
    subtree = {name: name};
    values.push(subtree);
  }
  return subtree;
};

Telegraph.prototype.deleteFirst = function(array, pred) {
  var i = 0, l = array.length;
  for (; i < l; i++) {
    if (pred(array[i])) break;
  }
  var rest = array.slice(i + 1);
  array.length = i;

  return array.push.apply(array, rest);
};

Telegraph.prototype.dissocTree = function(tree, name) {
  var values  = this.childValues(tree);
  this.deleteFirst(values, function(v) { return v.name == name});
  return tree;
};

Telegraph.prototype.queryNode = function(opts) {
  return {
    opts:    {name: opts.name, type: opts.type},
    query:   opts.query,
    deleter: 'delete'
  };
};

Telegraph.prototype.getInTree = function(tree, path) {
  var self = this;
  var subtree = tree;
  _.each(path, function(subname) {
    subtree = self.getTree(subtree, subname);
  });
  return subtree;
};

Telegraph.prototype.assocInTree = function(tree, path, attrs) {
  var subtree = this.getInTree(tree, path);
  _.each(attrs, function(v, k) {
    subtree[k] = v;
  });
  return subtree;
};

Telegraph.prototype.dissocInTree = function(tree, path) {
  if (path.length == 0) {
    return {};
  } else {
    var key = _.first(path);
    var subtree = this.dissocInTree(this.getTree(tree, key), _.rest(path));
    if (this.childValues(subtree).length == 0) {
      this.dissocTree(tree, key)
    }
    return tree;
  }
};
