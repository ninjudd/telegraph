(ns flatland.utils)

(defn file-ref [file]
  (let [ref (ref (read-string 
                  (try (slurp file)
                       (catch Exception e
                         "{}"))))]
    (add-watch ref :persist
               (fn [_ _ _ new-state]
                 (locking ref
                   (spit file (pr-str new-state)))))))

(defn save-versioned! [ref key version value]
  (dosync
   (let [old (get @ref key)]
     (when (or (nil? old)
               (= version (:version old)))
       (let [version (inc (or version 0))]
         (alter ref assoc key
                (assoc value :version version))
         version)))))
