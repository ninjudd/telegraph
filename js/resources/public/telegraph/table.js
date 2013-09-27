define(["underscore", "jquery_ui"], function(_, $) {

  var Table = function (selector, opts) {
    opts = opts || {};

    this.selector  = selector
    this.header    = opts.header;
    this.toRows    = opts.toRows || Table.rowBuilder(opts.toCells || Table.defaultCells, this.header);
    this.change    = opts.change;
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

  Table.defaultCells = function (item, i) {
    return _.map(item, function(val) {
      return {text: val};
    })
  };

  Table.makeRow = function(cells, i, enableHeader) {
    var tr = $("<tr/>", {id: i});
    _.each(cells, function(cell) {
      tr.append($(i == 0  && enableHeader ? "<th/>" : "<td/>", cell));
    });
    return tr;
  };

  Table.rowBuilder = function(toCells, enableHeader) {
    return function(item, i) {
      return [Table.makeRow(toCells.call(this, item, i), i, enableHeader)];
    };
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
    var table = $("<table/>", {class: this.class});
    table.append.apply(table, _.mapcat(this.items, this.toRows));

    if (this.sortable) {
      table.find("tbody").sortable({
        // Keep table cells from collapsing when reordering.
        // http://www.foliotek.com/devblog/make-table-rows-sortable-using-jquery-ui-sortable
        helper: function(e, ui) {
          ui.children().each(function() { $(this).width($(this).width()) });
          return ui;
        },
        cancel: '[contenteditable]',
        update: function(e) {
          var order = $(this).sortable('toArray');
          self.replace(_.map(order, function(i) {
            return self.items[i]
          }));
        }
      });
    }

    $(this.selector).html("").append(table);
  };

  return Table;
});
