var Table = function (selector, toCells, change) {
  this.selector  = selector
  this.toCells   = toCells;
  this.change    = change || function () {};
  this.items     = [];
  this.itemCount = 0;
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
  this.items = items;
  _.each(items, function(item) {
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

Table.prototype.removeLink = function(id) {
  var self = this;
  var icon = $("<img/>", {src: "/telegraph/images/x.gif"});
  return $("<span/>", {id: "remove"}).html(icon).on("click", function() { self.remove(id) });
};

Table.prototype.update = function() {
  var self = this;
  var table = $(this.selector);
  table.html("");
  _.each(this.items, function(item) {
    var row   = $("<tr/>")
    var cells = self.toCells(item);
    cells.push({html: self.removeLink(item.id)});
    _.each(cells, function(opts) {
      row.append($("<td/>", opts));
    });
    table.append(row);
  });
};
