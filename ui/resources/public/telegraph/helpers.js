var doc;

function displayHeader() {
  $("#name").text(doc.id || "untitled");
  flipClass("disabled", $("#rename").parent(), !doc.id);
  $("#document-header").toggle(!!doc.id || !doc.isEmpty());
};

var isChanged;
function markChanged(changed) {
  isChanged = changed;
  display("#edited", changed);
  flipClass("disabled", $("#revert, #save").parent(), !changed);
};

function pushHistory(name) {
  history.pushState(name, "", window.location.pathname + (name ? "#" + name : ""));
};

function showAlert(text, type) {
  if (type) type = "alert-" + type;
  $("#alerts").append($("<div/>", {class: "alert fade in " + type, text: text}));
  setTimeout(function() { $(".alert").alert('close'); }, 3000);
};

function hash() {
  return window.location.hash.substr(1)
};

function display(selector, show) {
  $(selector).css({display: show ? "inline-block" : "none"})
};

function flipClass(classString, selector, state) {
  var element = $(selector);
  state ? element.addClass(classString) : element.removeClass(classString);
};

function toggleButton(button, e) {
  // Manually toggle bootstrap button.
  e.stopPropagation();
  $(button).toggleClass("active");
};

function blurOnEnter(selector) {
  $(selector).keydown(function(e) {
    if(e.keyCode == 13) $(this).blur();
  });
};

function selectAll() {
  document.execCommand("selectAll", false, null);
};

function save(force) {
  doc.id = doc.id || prompt("Save as:");

  doc.save({force: force}).done(function(results) {
    showAlert(doc.id + " saved", "success");
    pushHistory(doc.id);
    markChanged(false);
    displayHeader(doc);
  }).fail(function(response) {
    if (response.error) {
      if (confirm(response.error + " Would you like to overwrite?")) {
        save(true);
      }
    } else {
      showAlert("save failed", "error");
    }
  });
};


function load(name) {
  draws = 0;
  if (doc) doc.clearRefresh();
  name = name == null ? hash() : name;

  docType.load(name).then(function(d) {
    if (d) {
      doc = d;
      if (name != hash()) pushHistory(doc.id);
      afterLoad();
    } else {
      showAlert("no such dashboard: " + name);
      if (!doc) load("");
    }
  });
};

function afterLoad() {
  redraw();
};

function loadSubmit() {
  var name = $("#load-name").val();
  load(name);
  $("#load-form").modal("toggle");
  $("#load-name").autocomplete("close");
};

$(document).ready(function() {
  $("#save").click(function() {
    $("#document-menu").dropdown("toggle");
    save();
    return false;
  });

  $("#rename").click(function() {
    renaming = true;
    $("#document-menu").dropdown("toggle");
    $("#name").attr({contenteditable: true}).focus();
    selectAll();
    return false;
  });

  $("#duplicate").click(function() {
    $("#document-menu").dropdown("toggle");
    $("#name").attr({contenteditable: true}).text(doc.id + " copy").focus();
    markChanged(true);
    document.execCommand("selectAll",false,null);
    return false;
  });

  $("#revert").click(function() {
    $("#document-menu").dropdown("toggle");
    if (confirmRevert()) {
      load(doc.id);
      return false;
    }
  });

  $("#close").click(function() {
    $("#document-menu").dropdown("toggle");
    if (confirmRevert()) {
      load("");
      return false;
    }
  });

  $("#delete").click(function() {
    $("#document-menu").dropdown("toggle");
    if (confirm(doc.id + " will be permanently deleted. Are you sure?")) {
      telegraph.destroy().done(function() {
        showAlert("Deleted " + doc.id, "success");
        load("");
      }).fail(function(response) {
        showAlert(response.error, "error");
      });
    }
    return false;
  });
});
