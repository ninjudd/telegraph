define(["text!resting/document.html"], function(html) {

  var module = function(opts) {
    this.resting  = opts.resting;
    this.selector = opts.selector;
    this.name     = opts.name;
    this.drawContainer();
  };

  module.prototype.drawContainer = function() {
    var container = $(this.selector);
    container.html(this.template({name: this.name}));
    this.registerEvents();
  };

  module.prototype.registerEvents = function() {
    var self = this;

    this.$("#document-load").click(this.showLoadForm);
    this.$("#load-submit").click(this.submitLoadForm);
    this.$("#load-name").keydown(function(e) {
      if (e.keyCode == 13) self.submitLoadForm();
    }).autocomplete({
      minLength: 0,
      source: self.autocomplete,
    });

    this.$("#save").click(this.save);
    this.$("#rename").click(this.rename);
    this.$("#duplicate").click(this.duplicate);
    this.$("#revert").click(this.revert);
    this.$("#close").click(this.close);
    this.$("#destroy").click(this.destroy);
  };

  module.prototype.save = function() {
    this.$("#document-menu").dropdown("toggle");
    this.save();
    return false;
  };

  module.prototype.rename = function() {
    this.renaming = true;
    this.$("#document-menu").dropdown("toggle");
    this.$("#name").attr({contenteditable: true}).focus();
    this.selectAll();
    return false;
  };

  module.prototype.duplicate = function() {
    this.$("#document-menu").dropdown("toggle");
    this.$("#name").attr({contenteditable: true}).text(this.doc.id + " copy").focus();
    this.markChanged(true);
    this.selectAll();
    return false;
  };

  module.prototype.revert = function() {
    this.$("#document-menu").dropdown("toggle");
    if (this.confirmRevert()) {
      this.load(this.doc.id);
    }
    return false;
  };

  module.prototype.close = function() {
    this.$("#document-menu").dropdown("toggle");
    if (this.confirmRevert()) {
      this.load("");
    }
    return false;
  };

  module.prototype.destroy = function() {
    var self = this;

    this.$("#document-menu").dropdown("toggle");
    if (confirm(this.doc.id + " will be permanently deleted. Are you sure?")) {
      this.doc.destroy().done(function() {
        self.showAlert("Deleted " + doc.id, "success");
        self.load("");
      }).fail(function(response) {
        self.showAlert(response.error, "error");
      });
    }
    return false;
  };

  module.prototype.selectAll = function() {
    document.execCommand("selectAll", false, null);
  };

  module.prototype.$ = function(selector) {
    return $(this.selector).find(selector);
  };

  module.prototype.draw = function(unchanged) {
    if (this.doc) {
      var self = this;
      var body = this.$("#document-body");
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

  module.prototype.template = _.template(html);

  module.prototype.load = function(id) {
    var self = this;

    this.draws = 0;
    if (this.doc) doc.clearRefresh();

console.log(this)
console.log(this.resting)

    this.resting.load(id).then(function(d) {
      if (d) {
        self.doc = d;
        self.afterLoad();
      } else {
        self.showAlert("no such dashboard: " + name);
        if (!doc) load("");
      }
    });
  };

  module.prototype.showLoadForm = function() {
    var $loadName = this.$("#load-name");
    this.$("#load-form").modal('toggle').on('shown', function() {
      $loadName.val("").focus();
    });
  };

  module.prototype.autocomplete = function(request, response) {
    this.resting.list().done( function(names) {
      var matches = _.filter(names, function(name) {
        return name.indexOf(request.term) >= 0 
      });
      response(matches);
    });
  };

  module.prototype.submitLoadForm = function() {
    var name = this.$("#load-name").autocomplete("close").val
    load(name);
    this.$("#load-form").modal("toggle");
  };

  module.prototype.afterLoad = function() {
    this.draw();
  };

  module.prototype.save = function(opts) {
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

  module.prototype.afterSave = function() {
    // do nothing by default
  };

  module.prototype.showAlert = function(text, type) {
    if (type) type = "alert-" + type;
    $("#alerts").append($("<div/>", {class: "alert fade in " + type, text: text}));
    setTimeout(function() { $(".alert").alert('close'); }, 3000);
  };

  module.prototype.markChanged = function(changed) {
    this.isChanged = changed;
    display("#edited", changed);
    flipClass("disabled", $("#revert, #save").parent(), !changed);
  };

  module.prototype.confirmRevert = function() {
    return !this.isChanged || confirm("All unsaved changes to " + this.doc.id + " will be lost. Are you sure?");
  };

  module.prototype.displayHeader = function() {
    $("#name").text(this.doc.id || "untitled");
    this.flipClass("disabled", $("#rename").parent(), !this.doc.id);
    $("#document-header").toggle(!!this.doc.id || !this.doc.isEmpty());
  };

  module.prototype.flipClass = function(classString, selector, state) {
    var element = $(selector);
    state ? element.addClass(classString) : element.removeClass(classString);
  };

  module.prototype.display = function(selector, show) {
    $(selector).css({display: show ? "inline-block" : "none"})
  };

  return module;
});
