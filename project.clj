(defproject org.flatland/telegraph "0.4.11"
  :description "Make beautiful dashboards for telemetry and turntable."
  :url "http://github.com/flatland/telegraph"
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [org.flatland/resting "0.1.4"]
                 [org.flatland/telegraph-ui "0.4.10"]
                 [lib-noir "0.5.5"]]
  :plugins [[lein-ring "0.8.5"]]
  :ring {:handler flatland.telegraph/handler
         :open-browser? false})
