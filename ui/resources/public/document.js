var Document = function(opts) {
  this.type     = opts.type;
  this.selector = opts.selector;
};

Document.prototype.drawContainer = function() {
  var container = $(this.selector);
  container.empty();
  container.append(this.toolbar());
  container.append($("<div/>", {id: "document-alerts"}));
  container.append(this.header());
  container.append($("<div/>", {id: "document-body"}));
};

  $("#load-submit").click(function(e) {
    loadSubmit();
  });

  $("#load-name").keydown(function(e) {
    if (e.keyCode == 13) loadSubmit();
  }).autocomplete({
    minLength: 0,
    source: function(request, response) {
      var matches = _.filter(graphNames, function(name) { return name.indexOf(request.term) >= 0 });
      response(matches);
    }
  });

  $("#load").click(function(e) {
    loadForm();
  });

Document.prototype.find = function(selector) {
  return $(this.selector).find(selector);
};

Document.prototype.draw = function(unchanged) {
  if (this.doc) {
    var self = this;
    var body = this.find("#document-body");
    return this.doc.draw(body).done(function() {
      self.displayHeader();
      // Use draw count as a proxy for changes since we only redraw when a change is made.
      if (!unchanged) this.draws++;
      this.markChanged(this.draws > 1);
    }).fail(function(error) {
      self.showAlert(error, "error");
    });
  }
};

// Document.prototype.toolbar = function() {
//   var toolbar = $("<div/>", {id: "document-toolbar"});
//   toolbar.append(this.iconButton("load", "/telegraph/images/list.svg"));
//   toolbar.append(this.iconButton("edit", "/telegraph/images/cog.svg"));
//   return toolbar;
// };

// Document.prototype.iconButton = function(id, icon) {
//   return $("<span/>", {id: id}).append($("<img/>", {class: "toobar icon faded", src: icon}))
// };

// Document.prototype.header = function() {
//   var header = $("<div/>", {id: "document-header"});
//   header.append(this.iconButton("edit", "/telegraph/images/refresh.svg"));
//   header.append(this.title());
//   return header;
// };

// Document.prototype.title = function() {
//   var title = $("<span/>");
  
//   title.append($("<img/>", {class: "icon" src: "/telegraph/images/graph.svg"}));
//   title.append($("<span/>", {id: "document-name"}));
//   title.append($("<span/>", {id: "edited"}).append("&mdash; edited"));
                
//   return $("<div/>", {id: "document-title"}).append(title).append(this.menu());
// };

// Document.prototype.menu = function() {
//   var menu = $("<ul/>", {id: "document-menu", class: "dropdown-menu", role: "menu"});
//   menu.append(this.menuItem("rename", "Rename"));
//   menu.append(this.menuItem("duplicate", "Duplicate"));
//   menu.append(this.menuItem("save", "Save"));
//   menu.append($("<li/>", {class: "divider"}));
//   menu.append(this.menuItem("revert", "Revert"));
//   menu.append(this.menuItem("close", "Close"));
//   menu.append(this.menuItem("delete", "Delete"));
//   return menu;
// };

// Document.prototype.menuItem = function(id, label) {
//   return $("<li/>").append("<a/>", {id: id, href: "#", text: label});
// };

// Load templates
require(["text!resting/document.html"], function(html) {
  Document.prototype.template = _.template(html);
});

Document.prototype.load = function(id) {
  var self = this;

  this.draws = 0;
  if (this.doc) doc.clearRefresh();

  this.type.load(id).then(function(d) {
    if (d) {
      self.doc = d;
      self.afterLoad();
    } else {
      self.showAlert("no such dashboard: " + name);
      if (!doc) load("");
    }
  });
};

Document.prototype.showLoadForm = function() {
  var form = this.find("#load-form");
  $("#load-form").modal('toggle').on('shown', function() {
    $("#load-name").val("").focus();
  });

  // Load typeahead asynchronously.
  Telegraph.list().done(function(names) {
    graphNames = names;
  });
};


Document.prototype.afterLoad = function() {
  this.redraw();
};

Document.prototype.save = function(opts) {
  var self = this;

  this.doc.id = this.doc.id || prompt("Save as:");

  this.doc.save(opts).done(function(results) {
    self.showAlert(self.doc.id + " saved", "success");
    self.afterSave();
    self.markChanged(false);
    self.displayHeader();
  }).fail(function(response) {
    if (response.error) {
      if (confirm(response.error + " Would you like to overwrite?")) {
        self.save({force: true});
      }
    } else {
      self.showAlert("save failed", "error");
    }
  });
};

Document.prototype.afterSave = function() {
  // do nothing by default
};

Document.prototype.showAlert = function(text, type) {
  if (type) type = "alert-" + type;
  $("#alerts").append($("<div/>", {class: "alert fade in " + type, text: text}));
  setTimeout(function() { $(".alert").alert('close'); }, 3000);
};

Document.prototype.markChanged = function(changed) {
  this.isChanged = changed;
  display("#edited", changed);
  flipClass("disabled", $("#revert, #save").parent(), !changed);
};

Document.prototype.confirmRevert = function() {
  return !this.isChanged || confirm("All unsaved changes to " + this.doc.id + " will be lost. Are you sure?");
};

Document.prototype.displayHeader = function() {
  $("#name").text(this.doc.id || "untitled");
  this.flipClass("disabled", $("#rename").parent(), !this.doc.id);
  $("#document-header").toggle(!!this.doc.id || !this.doc.isEmpty());
};

Document.prototype.flipClass = function(classString, selector, state) {
  var element = $(selector);
  state ? element.addClass(classString) : element.removeClass(classString);
};

Document.prototype.display = function(selector, show) {
  $(selector).css({display: show ? "inline-block" : "none"})
};
