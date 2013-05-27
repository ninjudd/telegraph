(ns flatland.telegraph.graph
  (:refer-clojure :exclude [load list])
  (:require [flatland.utils :refer [file-ref save-versioned!]]
            [clojure.walk :refer [keywordize-keys]]))

(defn -init [file]
  {:graphs (file-ref file)})

(defn save! [{:keys [graphs]} request]
  (let [{:keys [name version] :as opts} (keywordize-keys (:body request))]
    (if (empty? name)
      {:status 400
       :body {:error "name is required"}}
      (if-let [version (save-versioned! graphs name version opts)]
        {:body {:name name, :version version}}
        {:status 400
         :body {:error (format "version %s of %s is stale" version name)}}))))

(defn load [{:keys [graphs]} request]
  (let [name (get (:params request) "name")]
    {:body (get @graphs name)}))

(defn list [{:keys [graphs]} _]
  {:body (keys @graphs)})
