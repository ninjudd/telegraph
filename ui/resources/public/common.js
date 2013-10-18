requirejs.config({
  paths: {
    text:               "//cdnjs.cloudflare.com/ajax/libs/require-text/2.0.5/text",
    jquery:             "//code.jquery.com/jquery-1.9.1",
    jquery_ui:          "//code.jquery.com/ui/1.10.3/jquery-ui",
    bootstrap:          "//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/2.3.1/js/bootstrap",
    underscore:         "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.4/underscore",
    underscore_contrib: "//cdnjs.cloudflare.com/ajax/libs/underscore-contrib/0.1.4/underscore-contrib",
    underscore_string:  "//raw.github.com/epeli/underscore.string/2.3.3/dist/underscore.string.min",
    d3:                 "//cdnjs.cloudflare.com/ajax/libs/d3/2.10.0/d3.v2",
    nvd3:               "//cdnjs.cloudflare.com/ajax/libs/nvd3/0.9/nv.d3",
    backbone:           "//cdnjs.cloudflare.com/ajax/libs/backbone.js/1.0.0/backbone",
    chosen:             "//cdnjs.cloudflare.com/ajax/libs/chosen/0.9.15/chosen.jquery.min"
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
      exports: '_.str',
      deps: ['underscore'],
    },
    backbone: {
      deps: ['underscore'],
    },
    jquery_ui: {
      exports: '$',
      deps: ['jquery'],
    },
    bootstrap: {
      deps: ['jquery', 'jquery_ui'],
    },
    d3: {
      exports: 'd3',
    },
    nvd3: {
      exports: 'nv',
      deps: ['d3', 'backbone'],
    },
    chosen: {
      deps: ['jquery'],
    },
  },
});
