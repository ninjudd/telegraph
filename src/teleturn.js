var Teleturn = function (opts) {
  this.initialize = function(opts) {
    this.server      = opts.server;
    this.queriesPath = opts.queriesPath || 'queries';
    this.addPath     = opts.addPath     || 'add-query';
    this.testPath    = opts.testPath    || 'test-query';
    this.removePath  = opts.removePath  || 'remove-query';
    this.schemaPath  = opts.schemaPath  || 'schema';
  }
  this.initialize(opts);
  this.fetchQueries();
};

Teleturn.prototype.fetchQueries = function() {
  var self = this;
  this.queries = {}

  $.ajax({
    url: "http://" + this.server + "/" + this.queriesPath,
    async: false,
    success: function(queries) {
      _.each(queries, function(opts) {
        self.assocQuery(opts);
      });
    }
  });
};

Teleturn.prototype.getSchema = function() {
  var schema;
  $.ajax({
    url: "http://" + this.server + "/" + this.schemaPath,
    async: false,
    success: function(data) {
      schema = data;
    }
  });
  return schema;
}

Teleturn.prototype.addOpts = function(field, selector) {
  var schema = this.getSchema();
  var select = $(selector);
  _.each(schema[field], function(opt, index) {
    select.append('<option value=' + opt + '>' + opt + '</option>');
  });
};

Teleturn.prototype.addTree = function(selector, type) {
  var self = this;
  var queries = this.queries[type];

  this.queryData = [queries];
  this.treeSelector = selector;
  this.queryTree = nv.models.indentedTree().tableClass('table table-striped') //for bootstrap styling
  this.queryTree.columns([
    { key: 'name',
      type: 'text',
      showCount: true,
      width: '20%' },
    { key: 'target',
      type: 'text',
      classes: function(d) { return d.target ? 'target' : 'hide' }},
    { key: 'query',
      type: 'text',
      classes: function(d) { return d.query ? 'clickable' : 'hide' },
      click:   function(d) { if (self.clickQuery) self.clickQuery(d) },
      width: '60%' },
    { key: 'view',
      classes: function(d) { return d.view ? 'clickable' : 'hide' },
      click:   function(d) { self.viewQuery(d.opts) },
      type: 'text',
      width: '5%' },
    { key: 'remove',
      classes: function(d) { return d.remove ? 'clickable' : 'hide' },
      click:   function(d) { self.removeQuery(d.opts) },
      type: 'text',
      width: '5%' }
  ])

  nv.addGraph(function() {
    d3.select(selector)
      .datum(self.queryData)
      .call(self.queryTree);
    return self.queryTree;
  });
};

Teleturn.prototype.selectTree = function(type) {
  this.queryData[0] = this.queries[type];
  if (this.queryTree.update) this.queryTree.update();
}

Teleturn.prototype.addQuery = function(opts, success) {
  var self = this;

  $.ajax({
    url: "http://" + this.server + "/" + this.addPath,
    type: "POST",
    data: opts,
    async: true,
    success: function(d) {
      self.assocQuery(opts);
      self.queryTree.update();
      if (success) success(d);
    },
    dataType: "text"
  });
};

Teleturn.prototype.testQuery = function(opts, progress, done) {
  var xhr = new XMLHttpRequest();
  var params = _.map(opts, function(v,k) {
    return k + "=" + encodeURIComponent(v)
  }).join("&");
  var url = "http://" + this.server + "/" + this.testPath + "?" + params;

  xhr.onreadystatechange = function() {
    if (xhr.responseText.length > 0) progress(xhr.responseText);
    if (xhr.readyState == XMLHttpRequest.DONE && done) {
      done();
    };
  }

  xhr.open('GET', url, true);
  xhr.send(null);

  return xhr;
};

Teleturn.prototype.removeQuery = function(opts, success) {
  var self = this;

  $.ajax({
    url: "http://" + this.server + "/" + this.removePath,
    type: "POST",
    data: opts,
    async: true,
    success: function(d){
      self.dissocQuery(opts)
      self.queryTree.update();
      if (success) success(d);
    },
    dataType: "text"
  });
};

// Helper functions //

Teleturn.prototype.path = function(opts) {
  return opts.name.split(/[\.:]/);
};

Teleturn.prototype.values = function(node) {
  if (node) {
    return node.values || node._values || [];
  } else {
    return [];
  }
};

Teleturn.prototype.isLeaf = function(node) {
  return this.values(node).length == 0;
};

Teleturn.prototype.assocValues = function(node, values) {
  var valuesKey = (node && node.values) ? 'values' : '_values'
  return _.extend(node || {}, _.object([[valuesKey, values]]));
};

Teleturn.prototype.get = function(tree, name) {
  return _.find(this.values(tree), function(v) { return v.name == name});
};

Teleturn.prototype.findIndex = function(values, pred) {
  var i = 0;
  values.every(function(val) {
    if (pred(val)) {
      return false;
    } else {
      i = i + 1;
      return true;
    }
  });
  return i;
};

Teleturn.prototype.assocArray = function(values, idx, val) {
  var left  = values.slice(0, idx);
  var right = values.slice(idx + 1);
  right.unshift(val);

  return left.concat(right);
};

Teleturn.prototype.assoc = function(tree, name, obj) {
  var values = this.values(tree);
  var i = this.findIndex(values, function(v) { return v.name == name});

  obj    = _.extend(obj || {}, {name: name});
  values = this.assocArray(values, i, obj);

  return this.assocValues(tree, values);
};

Teleturn.prototype.dissoc = function(tree, name) {
  var values = _.reject(this.values(tree), function(v) { return v.name == name});
  return this.assocValues(tree, values);
};

Teleturn.prototype.nodeWriter = function(opts) {
  opts = opts || {};

  var query  = opts.query;
  var target = opts.target;
  return function(obj) {
    return _.extend(obj || {}, {
      opts:   opts,
      query:  query,
      target: target,
      view:   query ? 'view'   : null,
      remove: query ? 'remove' : null
    });
  };
};

Teleturn.prototype.getIn = function(tree, path) {
  if (path.length == 0) {
    return tree;
  } else {
    return this.getIn(this.get(tree, _.first(path)), _.rest(path));
  }
}

Teleturn.prototype.assocIn = function(tree, path, obj) {
  if (path.length == 0) {
    return obj;
  } else {
    var key = _.first(path);
    var subtree = this.assocIn(this.get(tree, key), _.rest(path), obj);
    return this.assoc(tree, key, subtree);
  }
};

Teleturn.prototype.dissocIn = function(tree, path) {
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

Teleturn.prototype.updateIn = function(tree, path, f) {
  return this.assocIn(tree, path, f(this.getIn(tree, path) || null));
};

Teleturn.prototype.assocQuery = function(opts) {
  var type = opts.type;
  var tree = this.queries[type] || {values: []};
  var path = this.path(opts);
  this.queries[type] = this.updateIn(tree, path, this.nodeWriter(opts));
};

Teleturn.prototype.dissocQuery = function(opts) {
  var type = opts.type;
  var tree = this.queries[type] || {values: []};
  var path = this.path(opts);

  var node = this.getIn(tree, path);

  if (this.isLeaf(node)) {
    this.queries[type] = this.dissocIn(tree, path);
  } else {
    this.queries[type] = this.updateIn(tree, path, this.nodeWriter());
  }
};
