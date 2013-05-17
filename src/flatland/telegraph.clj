(ns flatland.telegraph
  (:require [flatland.wakeful.core :refer [wakeful]]
            [flatland.telegraph.graph :as graph]))

(def handler
  (wakeful :root "flatland.telegraph"
           :config (graph/-init)))
