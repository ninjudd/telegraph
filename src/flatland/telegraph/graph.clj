(ns flatland.telegraph.graph
  (:refer-clojure :exclude [load list])
  (:require [flatland.utils :refer [file-ref save-versioned!]]))

(defn -init [file]
  {:graphs (file-ref file)})

(defn save! [{:keys [graphs]} {{:strs [name version] :as opts} :body}]
  (if (empty? name) 
    {:status 400
     :body {:error "name is required"}}
    (if-let [version (save-versioned! graphs name version opts)]
      {:body {:version version}}
      {:status 400
       :body {:error (format "version %s of %s is stale" version name)}})))

(defn load [{:keys [graphs]} {{:strs [name]} :params :as opts}]
(prn opts)
  {:body (get @graphs name)})

(defn list [{:keys [graphs]} _]
  {:body (keys @graphs)})
