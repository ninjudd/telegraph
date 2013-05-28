(ns flatland.telegraph.graph
  (:refer-clojure :exclude [load list])
  (:require [flatland.utils :as utils]
            [clojure.walk :refer [keywordize-keys]]))

(defn -init [file]
  {:graphs (utils/file-ref file)})

(defn save! [{:keys [graphs]} request]
  (let [{:keys [name hash] :as opts} (keywordize-keys (:body request))]
    (if (empty? name)
      {:status 400, :body {:error "name is required"}}
      (if-let [hash (utils/save! graphs name hash opts)]
        {:body {:name name, :hash hash}}
        {:status 400
         :body {:error (format "The graph %s has been modified by someone else." name)}}))))

(defn delete! [{:keys [graphs]} request]
  (let [name (get (:params request) "name")]
    (if-let [old (utils/delete! graphs name)]
      {:body old}
      {:status 400
       :body {:error (format "Graph %s not found." name)}})))

(defn rename! [{:keys [graphs]} request]
  (let [{:strs [from to]} (:body request)]
    (cond (empty? from)
          {:status 400, :body {:error "from is required"}}
          (empty? to)
          {:status 400, :body {:error "to is required"}}
          :else
          (let [key (utils/rename! graphs from to)]
            (if (= key to)
              {:body {:from from :to to}}
              {:status 400
               :body {:error (if key
                               (format "Graph %s already exists; rename failed." to)
                               (format "Graph %s not found." from))}})))))

(defn load [{:keys [graphs]} request]
  (let [name (get (:params request) "name")]
    {:body (get @graphs name)}))

(defn list [{:keys [graphs]} _]
  {:body (keys @graphs)})
