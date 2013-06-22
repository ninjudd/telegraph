function displayHeader() {
  $("#name").text(telegraph.id || "untitled");
  flipClass("disabled", $("#rename").parent(), !telegraph.id);
  $("#graph-header").toggle(!!telegraph.id || telegraph.attrs.targets.length > 0);
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

function blurOnEnter(selector) {
  $(selector).keydown(function(e) {
    if(e.keyCode == 13) $(this).blur();
  });
};

function selectAll() {
  document.execCommand("selectAll", false, null);
};
