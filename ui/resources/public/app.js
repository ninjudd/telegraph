requirejs.config({
  "paths": {
    "text": "//cdnjs.cloudflare.com/ajax/libs/require-text/2.0.5/text",
  },
});

requirejs(["resting"]);
requirejs(["resting/document"]);
requirejs(["telegraph"]);
requirejs(["telegraph/table"]);
requirejs(["telegraph/config"]);
requirejs(["telegraph/helpers"]);
requirejs(["telegraph/dashboard"]);
