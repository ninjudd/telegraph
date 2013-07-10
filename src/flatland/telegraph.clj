(ns flatland.telegraph
  (:require [compojure.core :refer [routes]]
            [compojure.route :refer [resources]]
            [flatland.resting :refer [resting file-ref]]
            [noir.util.middleware :refer [wrap-rewrites]]))

(def handler
  (-> (routes
       (resting "graphs")
       (resting "dashboards")
       (resources "/"))
      (wrap-rewrites #"^/telegraph$"         "/graph.html"
                     #"^/telegraph/[\-\w:]*$" "/dashboard.html")))
