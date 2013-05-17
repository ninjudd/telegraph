(defproject org.flatland/telegraph "0.1.3"
  :description "Make beautiful dashboards for telemetry and turntable."
  :url "http://github.com/flatland/telegraph"
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.4.0"]
                 [org.flatland/wakeful "0.5.3"]
                 [lib-noir "0.5.5"]]
  :plugins [[lein-ring "0.8.5"]]
  :classifiers {:resources {:dependencies []
                            :omit-source true
                            :compile-path "target/empty"}}
  :ring {:handler flatland.telegraph/handler
         :open-browser? false})
