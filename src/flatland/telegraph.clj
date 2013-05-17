(ns flatland.telegraph
  (:require [flatland.wakeful.core :refer [wakeful]]
            [flatland.telegraph.graph :as graph]
            [noir.util.middleware :refer [wrap-rewrites]]))

(def handler
  (-> (wakeful :root "flatland.telegraph"
               :config (graph/-init))
      (wrap-rewrites #"^/telegraph/?$" "/telegraph/index.html")))
