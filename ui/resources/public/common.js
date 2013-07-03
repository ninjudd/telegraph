requirejs.config({
  paths: {
    text:               "//cdnjs.cloudflare.com/ajax/libs/require-text/2.0.5/text",
    jquery:             "//code.jquery.com/jquery-1.9.1",
    jquery_ui:          "//code.jquery.com/ui/1.10.3/jquery-ui",
    bootstrap:          "//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/2.3.1/js/bootstrap",
    underscore:         "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.4/underscore",
    underscore_contrib: "//cdnjs.cloudflare.com/ajax/libs/underscore-contrib/0.1.4/underscore-contrib",
    underscore_string:  "//cdnjs.cloudflare.com/ajax/libs/underscore.string/2.3.0/underscore.string.min",
  },
  shim: {
    underscore: {
      exports: '_',
    },
    underscore_contrib: { 
      exports: '_',
      deps: ['underscore'],
    },
    underscore_string: {
      exports: '_',
      deps: ['underscore'],
    },
    jquery_ui: {
      exports: '$',
      deps: ['jquery'],
    },
  },
});
