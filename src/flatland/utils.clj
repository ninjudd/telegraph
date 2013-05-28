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

(defn save! [ref key hashed value]
  (dosync
   (let [old (get @ref key)]
     (when (or (nil? old)
               (= hashed (:hash old))
               (:force value))
       (let [hashed (hash value)]
         (alter ref assoc key
                (assoc value :hash hashed))
         hashed)))))

(defn delete! [ref key]
  (dosync
   (let [old (get @ref key)]
     (alter ref dissoc key)
     old)))

(defn rename! [ref from to]
  (dosync
   (if (get @ref to)
     from
     (when-let [val (get @ref from)]
       (alter ref dissoc from)
       (alter ref assoc to
              (assoc val :name to))
       to))))
