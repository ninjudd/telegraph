define(["jquery"], function($) {
  return {
    hash: function() {
      return window.location.hash.substr(1);
    },

    pushHash: function (name) {
      history.pushState(name, "", window.location.pathname + (name ? "#" + name : ""));
    },

    path: function() {
      return _.rest(window.location.pathname.split("/"), 2).join("/");
    },

    pushPath: function (name) {
      var path = window.location.pathname.split("/")
      path[2] = name;
      history.pushState(name, "", path.join("/"));
    },

    scrubName: function(name) {
      return name.replace(/\s/g, "-").replace(/[\/\.]/g, ":");
    },

    toggleButton: function (button, e) {
      // Manually toggle bootstrap button.
      e.stopPropagation();
      $(button).toggleClass("active");
    },
  };
});
