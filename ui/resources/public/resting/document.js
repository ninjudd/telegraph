define([
  "text!resting/document.html", "underscore", "jquery_ui", "bootstrap"
], function(html, _, $) {

  var Document = function(opts) {
    this.type     = opts.type;
    this.selector = opts.selector;
    this.name     = opts.name;
    this.drawContainer();
  };

  Document.prototype.drawContainer = function() {
    var container = $(this.selector);
    container.html(this.template({name: this.name}));
    this.registerEvents();
  };

  Document.prototype.registerClick = function(functionName, selector) {
    selector = selector || "#" + functionName;
    this.$(selector).click(_.bind(this[functionName], this));
  };

  Document.prototype.registerEvents = function() {
    var self = this;

    this.registerClick("showLoadForm", "#document-load");
    this.registerClick("submitLoadForm", "#load-submit");
    _.each(["save", "rename", "duplicate", "revert", "close", "destroy"], this.registerClick);

    this.$("#load-name").keydown(function(e) {
      if (e.keyCode == 13) self.submitLoadForm();
    }).autocomplete({
      minLength: 0,
      source: _.bind(this.autocomplete, this),
    });
  };

  Document.prototype.save = function() {
    this.$("#document-menu").dropdown("toggle");
    this.save();
    return false;
  };

  Document.prototype.rename = function() {
    this.renaming = true;
    this.$("#document-menu").dropdown("toggle");
    this.$("#name").attr({contenteditable: true}).focus();
    this.selectAll();
    return false;
  };

  Document.prototype.duplicate = function() {
    this.$("#document-menu").dropdown("toggle");
    this.$("#name").attr({contenteditable: true}).text(this.model.id + " copy").focus();
    this.markChanged(true);
    this.selectAll();
    return false;
  };

  Document.prototype.revert = function() {
    this.$("#document-menu").dropdown("toggle");
    if (this.confirmRevert()) {
      this.load(this.model.id);
    }
    return false;
  };

  Document.prototype.close = function() {
    this.$("#document-menu").dropdown("toggle");
    if (this.confirmRevert()) {
      this.load("");
    }
    return false;
  };

  Document.prototype.destroy = function() {
    var self = this;

    this.$("#document-menu").dropdown("toggle");
    if (confirm(this.model.id + " will be permanently deleted. Are you sure?")) {
      this.model.destroy().done(function() {
        self.showAlert("Deleted " + doc.id, "success");
        self.load("");
      }).fail(function(response) {
        self.showAlert(response.error, "error");
      });
    }
    return false;
  };

  Document.prototype.selectAll = function() {
    document.execCommand("selectAll", false, null);
  };

  Document.prototype.$ = function(selector) {
    return $(this.selector).find(selector);
  };

  Document.prototype.draw = function(unchanged) {
    if (this.model) {
      var self = this;
      var body = this.$("#document-body");
      return this.model.draw(body).done(function() {
        self.displayHeader();
        // Use draw count as a proxy for changes since we only redraw when a change is made.
        if (!unchanged) self.draws++;
        self.markChanged(self.draws > 1);
        if (self.afterDraw) self.afterDraw();
      }).fail(function(error) {
        self.showAlert(error, "error");
      });
    }
  };

  Document.prototype.template = _.template(html);

  Document.prototype.load = function(id) {
    var self = this;

    this.draws = 0;
    if (this.model) this.model.clearRefresh();
console.log(this)
    this.type.load(id).then(function(m) {
      if (m) {
        self.model = m;
        self.afterLoad();
      } else {
        self.showAlert("no such dashboard: " + name);
        if (!self.model) load("");
      }
    });
  };

  Document.prototype.showLoadForm = function() {
    var $loadName = this.$("#load-name");
    this.$("#load-form").modal('toggle').on('shown', function() {
      $loadName.val("").focus();
    });
  };

  Document.prototype.autocomplete = function(request, response) {
console.log(this)
    this.type.list().done( function(names) {
      var matches = _.filter(names, function(name) {
        return name.indexOf(request.term) >= 0 
      });
      response(matches);
    });
  };

  Document.prototype.submitLoadForm = function() {
    var name = this.$("#load-name").autocomplete("close").val
    load(name);
    this.$("#load-form").modal("toggle");
  };

  Document.prototype.afterLoad = function() {
    this.draw();
  };

  Document.prototype.save = function(opts) {
    var self = this;

    this.model.id = this.model.id || prompt("Save as:");

    this.model.save(opts).done(function(results) {
      self.showAlert(self.model.id + " saved", "success");
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
    return !this.isChanged || confirm("All unsaved changes to " + this.model.id + " will be lost. Are you sure?");
  };

  Document.prototype.displayHeader = function() {
    $("#name").text(this.model.id || "untitled");
    this.flipClass("disabled", $("#rename").parent(), !this.model.id);
    $("#document-header").toggle(!!this.model.id || !this.model.isEmpty());
  };

  Document.prototype.flipClass = function(classString, selector, state) {
    var element = $(selector);
    state ? element.addClass(classString) : element.removeClass(classString);
  };

  Document.prototype.display = function(selector, show) {
    $(selector).css({display: show ? "inline-block" : "none"})
  };

  return Document;
});
