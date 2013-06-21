var Resting = function (subclass, opts) {
  if (this instanceof Resting) return;

  _.extend(subclass.prototype, new Resting(), opts);
  _.extend(subclass, Resting, opts);
};

Resting.http = function(method, data, path) {
  var opts = opts || {};

  return $.ajax({
    url: _.compact([this.baseUrl, path]).join('/'),
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(data),
    type: method.toUpperCase()
  }).then(null, function(results) {
    return results.responseText ? JSON.parse(results.responseText) : {};
  });
};

Resting.prototype.http = function(method, opts) {
  return Resting.http(method, opts, encodeURIComponent(this.id));
};

Resting.prototype.save = function(opts) {
  if (this.id) {
    var self = this;
    var data = _.extend(this.attrs, {force: opts.force});
    return this.http('put', data).done(function(results) {
      self.attrs.hash = results.hash;
    });
  }
};

Resting.prototype.rename = function(id) {
  var self = this;
  return this.http('patch', {id: id}).done(function() {
    self.id = id;
  });
};

Resting.prototype.delete = function(opts) {
  var self = this;
  return this.http('delete', opts);
};

Resting.load = function(id, overrides) {
  var subclass = this;
  return this.http('get', null, id).then(function (results) {
    if (results) {
      var instance = new subclass();
      instance.id    = id;
      instance.attrs = _.extend(results, overrides);
      return instance;
    }
  });
};

Resting.list = function() {
  return this.http('get');
};
