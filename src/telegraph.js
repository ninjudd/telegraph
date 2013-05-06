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
      _.each(queries, function(queryGroup, group) {
        _.each(queryGroup, function(query, name) {
          var path = [group].concat(self.splitPath(name));
          var opts = {query: query, name: name, group: group};
          tree = self.updateIn(tree, path, _.partial(self.setQuery, opts));
        });
      });
    }
  });

  return tree;
};

Telegraph.prototype.getGroups = function() {
  return _.pluck(this.values(this.queries), 'name');
}

Telegraph.prototype.listQueries = function(selector) {
  var self = this;

  this.queries = this.getQueries();
  this.queryTree = nv.models.indentedTree().tableClass('table table-striped') //for bootstrap styling
  this.queryTree.columns([
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
      .datum([self.queries])
      .call(self.queryTree);
    return self.queryTree;
  });
};

Telegraph.prototype.addQuery = function(opts) {
  var self = this;

  var postData = {
    group:  opts.group,
    name:   opts.name,
    query:  opts.query,
    format: "json"
  };
  if (opts.replaySince) {
    postData["replay-since"] = opts.replaySince;
  }

  var path = [opts.group].concat(this.splitPath(opts.name));

  $.ajax({
    url: "http://" + this.server + "/" + this.addPath,
    type: "POST",
    data: postData,
    async: true,
    success: function(d) {
      self.queries = self.updateIn(self.queries, path, _.partial(self.setQuery, opts));
      self.queryTree.update();
      if (opts.success) {
        opts.success(d);
      }
    },
    dataType: "text"
  });
};

Telegraph.prototype.deleteQuery = function(opts) {
  var self = this;

  var path = [opts.group].concat(self.splitPath(opts.name));

  $.ajax({
    url: "http://" + this.server + "/" + this.deletePath,
    type: "POST",
    data: {
      group:  opts.group,
      name:   opts.name,
      format: "json"
    },
    async: true,
    success: function(d){
      var node = self.getIn(self.queries, path);

      if (self.isLeaf(node)) {
        self.queries = self.dissocIn(self.queries, path);
      } else {
        self.queries = self.updateIn(self.queries, path, _.partial(self.setQuery, {}));
      }
      self.queryTree.update();

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

Telegraph.prototype.values = function(node) {
  if (node) {
    return node.values || node._values || [];
  } else {
    return [];
  }
};

Telegraph.prototype.isLeaf = function(node) {
  return this.values(node).length == 0;
};

Telegraph.prototype.assocValues = function(node, values) {
  var valuesKey = (node && node.values) ? 'values' : '_values'
  return _.extend(node || {}, _.object([[valuesKey, values]]));
};

Telegraph.prototype.get = function(tree, name) {
  return _.find(this.values(tree), function(v) { return v.name == name});
};

Telegraph.prototype.assoc = function(tree, name, obj) {
  var values = _.reject(this.values(tree), function(v) { return v.name == name});
  values = values.concat([_.extend(obj || {}, {name: name})]);
  return this.assocValues(tree, values);
};

Telegraph.prototype.dissoc = function(tree, name) {
  var values = _.reject(this.values(tree), function(v) { return v.name == name});
  return this.assocValues(tree, values);
};

Telegraph.prototype.setQuery = function(opts, obj) {
  return _.extend(obj || {}, {
    opts:    {name: opts.name, group: opts.group},
    query:   opts.query,
    deleter: opts.query ? 'delete' : null
  });
};

Telegraph.prototype.getIn = function(tree, path) {
  if (path.length == 0) {
    return tree;
  } else {
    return this.getIn(this.get(tree, _.first(path)), _.rest(path));
  }
}

Telegraph.prototype.assocIn = function(tree, path, obj) {
  if (path.length == 0) {
    return obj;
  } else {
    var key = _.first(path);
    var subtree = this.assocIn(this.get(tree, key), _.rest(path), obj);
    return this.assoc(tree, key, subtree);
  }
};

Telegraph.prototype.dissocIn = function(tree, path) {
  if (path.length == 0) {
    return {};
  } else {
    var key = _.first(path);
    var subtree = this.dissocIn(this.get(tree, key), _.rest(path));
    if (this.isLeaf(subtree) && !subtree.query) {
      return this.dissoc(tree, key);
    } else {
      return this.assoc(tree, key, subtree);
    }
  }
};

Telegraph.prototype.updateIn = function(tree, path, f) {
  return this.assocIn(tree, path, f(this.getIn(tree, path) || null));
};
