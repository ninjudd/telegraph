var Admin = function (opts) {
  this.initialize = function(opts) {
    this.baseUrl     = opts.baseUrl;
    this.queriesPath = opts.queriesPath || 'queries';
    this.addPath     = opts.addPath     || 'add-query';
    this.runPath     = opts.runPath     || 'run-query';
    this.removePath  = opts.removePath  || 'remove-query';
    this.schemaPath  = opts.schemaPath  || 'schema';
  }
  this.initialize(opts);
  this.fetchQueries();

  var resizeTimeout;
  var resizeQueryTree = function() {
    $("#query-tree").css({height: $("body").innerHeight() - $("#add-container").outerHeight()})
  };

  $(document).ready(function() {
    resizeQueryTree();
    $(window).resize(function() {
      if (resizeTimeout) clearTimeout(resizeTimout);
      resizeTimout = setTimeout(resizeQueryTree, 50);
    });
  });
};

Admin.prototype.fetchQueries = function() {
  var self = this;
  this.queries = {}

  $.ajax({
    url: this.baseUrl + "/" + this.queriesPath,
    async: false,
    success: function(queries) {
      queries = _.sortBy(queries, function(q) {return q.name});
      _.each(queries, function(q) {
        self.assocQuery(q);
      });
    }
  });
};

Admin.prototype.getSchema = function() {
  var schema;
  $.ajax({
    url: this.baseUrl + "/" + this.schemaPath,
    async: false,
    success: function(data) {
      schema = data;
    }
  });
  return schema;
}

Admin.prototype.addOpts = function(field, selector) {
  var schema = this.getSchema();
  var $select = $(selector);
  _.each(schema[field], function(opt, index) {
    $select.append('<option value=' + opt + '>' + opt + '</option>');
  });
};

Admin.prototype.addTree = function(selector, type) {
  var self = this;
  var queries = this.queries[type];

  this.queryData = [queries];
  this.treeSelector = selector;
  this.queryTree = nv.models.indentedTree().tableClass('table table-striped') //for bootstrap styling
  this.queryTree.iconOpen('/telegraph/images/grey-plus.png')
  this.queryTree.iconClose('/telegraph/images/grey-minus.png')
  this.queryTree.columns([
    { key: 'name',
      type: 'text',
      showCount: true,
      width: '300px' },
    { key: 'query',
      type: 'text',
      classes: function(d) { return (d.query && self.clickQuery) ? 'query clickable' : 'hide' },
      click:   function(d) { if (self.clickQuery) self.clickQuery(d) },
      width: 'auto' },
    { key: 'period',
      type: 'text',
      classes: function(d) { return d.period ? 'period' : 'hide' }},
    { key: 'target',
      type: 'text',
      classes: function(d) { return d.target ? 'target' : 'hide' }},
    { key: 'test',
      classes: function(d) { return (d.test && self.testQuery) ? 'btn action' : 'hide' },
      click:   function(d) { if (self.testQuery) self.testQuery(d.opts) },
      type: 'text',
      width: '5px' },
    { key: 'remove',
      classes: function(d) { return d.remove ? 'btn action' : 'hide' },
      click:   function(d) { self.removeQuery(d.opts) },
      type: 'text',
      width: '5px' }
  ])

  nv.addGraph(function() {
    d3.select(selector)
      .datum(self.queryData)
      .call(self.queryTree);
    return self.queryTree;
  });
};

Admin.prototype.selectTree = function(type) {
  this.queryData[0] = this.queries[type];
  if (this.queryTree.update) this.queryTree.update();
}

Admin.prototype.addQuery = function(opts, done) {
  if (!opts.name) {
    done();
    return;
  }

  var self = this;

  $.ajax({
    url: this.baseUrl + "/" + this.addPath,
    type: "POST",
    data: opts,
    async: true,
    success: function(d) {
      self.assocQuery(opts);
      self.queryTree.update();
      if (done) done(d);
    },
    dataType: "text"
  });
};

Admin.prototype.runQuery = function(opts, progress, done) {
  var xhr = new XMLHttpRequest();
  var params = _.map(opts, function(v,k) {
    return k + "=" + encodeURIComponent(v)
  }).join("&");
  var url = this.baseUrl + "/" + this.runPath + "?" + params;

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

Admin.prototype.removeQuery = function(opts, success) {
  var self = this;

  $.ajax({
    url: this.baseUrl + "/" + this.removePath,
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

Admin.prototype.path = function(opts) {
  return opts.name.split(/[\.:]/);
};

Admin.prototype.values = function(node) {
  if (node) {
    return node.values || node._values || [];
  } else {
    return [];
  }
};

Admin.prototype.isLeaf = function(node) {
  return this.values(node).length == 0;
};

Admin.prototype.assocValues = function(node, values) {
  var valuesKey = (node && node.values) ? 'values' : '_values'
  return _.extend(node || {}, _.object([[valuesKey, values]]));
};

Admin.prototype.get = function(tree, name) {
  return _.find(this.values(tree), function(v) { return v.name == name});
};

Admin.prototype.findIndex = function(values, pred) {
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

Admin.prototype.assocArray = function(values, idx, val) {
  var left  = values.slice(0, idx);
  var right = values.slice(idx + 1);
  right.unshift(val);

  return left.concat(right);
};

Admin.prototype.assoc = function(tree, name, obj) {
  var values = this.values(tree);
  var i = this.findIndex(values, function(v) { return v.name == name});

  obj    = _.extend(obj || {}, {name: name});
  values = this.assocArray(values, i, obj);

  return this.assocValues(tree, values);
};

Admin.prototype.dissoc = function(tree, name) {
  var values = _.reject(this.values(tree), function(v) { return v.name == name});
  return this.assocValues(tree, values);
};

Admin.prototype.nodeWriter = function(opts) {
  opts = opts || {};

  var query  = opts.query;
  var target = opts.target;
  var period = opts.period;

  return function(obj) {
    return _.extend(obj || {}, {
      opts:   opts,
      query:  query,
      target: target,
      period: period,
      test:   query ? 'Test'   : null,
      remove: query ? 'Remove' : null
    });
  };
};

Admin.prototype.getIn = function(tree, path) {
  if (path.length == 0) {
    return tree;
  } else {
    return this.getIn(this.get(tree, _.first(path)), _.rest(path));
  }
}

Admin.prototype.assocIn = function(tree, path, obj) {
  if (path.length == 0) {
    return obj;
  } else {
    var key = _.first(path);
    var subtree = this.assocIn(this.get(tree, key), _.rest(path), obj);
    return this.assoc(tree, key, subtree);
  }
};

Admin.prototype.dissocIn = function(tree, path) {
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

Admin.prototype.updateIn = function(tree, path, f) {
  return this.assocIn(tree, path, f(this.getIn(tree, path) || null));
};

Admin.prototype.assocQuery = function(opts) {
  var type = opts.type;
  var tree = this.queries[type] || {values: []};
  var path = this.path(opts);
  this.queries[type] = this.updateIn(tree, path, this.nodeWriter(opts));
};

Admin.prototype.dissocQuery = function(opts) {
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
