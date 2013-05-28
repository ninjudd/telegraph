(ns flatland.telegraph.graph
  (:refer-clojure :exclude [load list])
  (:require [flatland.utils :refer [file-ref save-hashed!]]
            [clojure.walk :refer [keywordize-keys]]))

(defn -init [file]
  {:graphs (file-ref file)})

(defn save! [{:keys [graphs]} request]
  (let [{:keys [name hash] :as opts} (keywordize-keys (:body request))]
    (if (empty? name)
      {:status 400
       :body {:error "name is required"}}
      (if-let [hash (save-hashed! graphs name hash opts)]
        {:body {:name name, :hash hash}}
        {:status 400
         :body {:error (format "The graph %s has been modified by someone else." name)}}))))

(defn load [{:keys [graphs]} request]
  (let [name (get (:params request) "name")]
    {:body (get @graphs name)}))

(defn list [{:keys [graphs]} _]
  {:body (keys @graphs)})
