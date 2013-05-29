var Table = function (selector, toCells, opts) {
  opts = opts || {};

  this.selector  = selector
  this.toCells   = toCells;
  this.change    = opts.change || function () {};
  this.items     = [];
  this.itemCount = 0;
};

Table.deletable = function(toCells) {
  return function(item) {
    var cells = toCells(item);
    var removeLink = $("<span/>", {id: "remove", html: "&times;"})
    removeLink.on("click", function() { self.remove(item.id) });
    cells.push({html: removeLink});
    return cells;
  };
};

Table.prototype.add = function(item) {
  item.id = this.itemCount++;
  this.items.push(item);
  this.change(this);
  this.update();

  return item.id;
};

Table.prototype.replace = function(items) {
  var self = this;
  this.items = items || [];
  _.each(this.items, function(item) {
    item.id = self.itemCount++;
  });
  this.change(this);
  this.update();
};

Table.prototype.remove = function(id) {
  this.items = _.reject(this.items, function(item) { return item.id == id });
  this.change(this);
  this.update();
};

Table.prototype.update = function() {
  var self = this;
  var table = $(this.selector);
  table.html("");
  _.each(this.items, function(item) {
    var row   = $("<tr/>")
    var cells = self.toCells(item);
    _.each(cells, function(opts) {
      row.append($("<td/>", opts));
    });
    table.append(row);
  });
};
