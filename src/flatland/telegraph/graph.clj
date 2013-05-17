(ns flatland.telegraph.graph)

(defn- persist-graphs [key ref old-state new-state]
  (spit "graphs.clj"
        (pr-str new-state)))

(defn -init []
  {:graphs (doto (atom {})
             (add-watch :persist persist-graphs))})

(defn add! [config opts]
  (prn config opts))
