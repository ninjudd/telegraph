var Table = function (selector, opts) {
  opts = opts || {};

  this.selector  = selector
  this.toCells   = opts.toCells || Table.defaultCells;
  this.change    = opts.change;
  this.invert    = opts.invert;
  this.sortable  = opts.sortable;
  this.class     = opts.class;
  this.items     = opts.items || [];
  this.itemCount = 0;
};

Table.deletable = function(toCells) {
  return function(item) {
    var self = this;
    var cells = toCells(item);
    var removeLink = $("<div/>", {html: "&times;"}).css({cursor: "pointer"});
    removeLink.on("click", function() { self.remove(item.id) });
    cells.push({html: removeLink});
    return cells;
  };
};

Table.defaultCells = function (item) {
  return _.map(item, function(val) {
    return {text: val};
  })
};

Table.prototype.table = function(subSelector) {
  return $(this.selector).find("table " + subSelector);
};

Table.prototype.add = function(item) {
  item.id = this.itemCount++;
  this.items.push(item);
  this.update();
  this.change();

  return item.id;
};

Table.prototype.replace = function(items) {
  var self = this;
  this.items = items || [];
  _.each(items, function(item) {
    item.id = self.itemCount++;
  });
  this.update();
  this.change();
};

Table.prototype.remove = function(id) {
  this.items = _.reject(this.items, function(item) { return item.id == id });
  this.update();
  this.change();
};

Table.prototype.update = function() {
  var self = this;

  var cells = []
  _.each(this.items, function(item, i) {
    _.each(self.toCells(item), function(cell, j) {
      if (self.invert) {
        cells[j] = cells[j] || [];
        cells[j][i] = cell;
      } else {
        cells[i] = cells[i] || []
        cells[i][j] = cell;
      }
    });
  });

  var table = $("<table/>", {class: this.class});
  _.each(cells, function(row, i) {
    var tr = $("<tr/>", {id: i})
    _.each(row, function(cell) { tr.append($("<td/>", cell)) });
    table.append(tr);
  });

  if (this.sortable) {
    table.find("tbody").sortable({
      // Keep table cells from collapsing when reordering.
      // http://www.foliotek.com/devblog/make-table-rows-sortable-using-jquery-ui-sortable
      helper: function(e, ui) {
        ui.children().each(function() { $(this).width($(this).width()) });
        return ui;
      },
      cancel: '[contenteditable]',
      update: function( event, ui ) {
        var order = $(this).sortable('toArray');
        self.replace(_.map(order, function(i) {
          return self.items[i]
        }));
      }
    });
  }

  $(this.selector).html("").append(table);
};
