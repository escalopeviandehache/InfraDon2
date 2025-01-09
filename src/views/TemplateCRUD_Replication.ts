/* MODEL */
export declare interface Post {
    _id: string
    _rev: string
    post_name: string
    post_content: string
    attributes: {
        creation_date: string
    }
}

data() {
    return {
        remoteDB: 'http://admin:admin@localhost:5984/post',
        postsData: [] as Post[],
        db: null as PouchDB.Database | null
    }
},

/* METHODS */
methods: {

    initDatabase() {
        const localDB = 'post'
        const $db = new PouchDB(localDB)
        if ($db) {
            console.log('Connected to collection: ' + $db.name)
        } else {
            console.warn('Something went wrong')
        }
        this.db = $db
    },


    fetchData() {
        const db = ref(this.db).value
        if (db) {
            db.allDocs
                .bind(this)({
                    include_docs: true,
                    attachments: true
                })
                .then((result: any) => {
                    console.log('fetchData success =>', result.rows)
                    this.postsData = result.rows.map((row: any) => row.doc)
                })
                .catch(function (error: any) {
                    console.log('fetchData error', error)
                })
        }
    },

    getFakePost() {
        return {
            _id: v4(),
            post_name: 'post_name' + new Date().toISOString(),
            post_content: 'post_content',
            attributes: {
                creation_date: new Date().toISOString()
            }
        }
    },

    putDocument() {
        const document = this.getFakePost()
        const db = ref(this.db).value
        if (db) {
            db.put
                .bind(this)(document)
                .then(() => {
                    console.log('Add ok')
                    this.fetchData()
                })
                .catch((error) => {
                    console.log('Add ko', error)
                })
        }
    },

    async deleteData(id: string, rev: string) {
        console.log('Call deleteData', rev)
        const db = ref(this.db).value
        if (!db) {
            console.log('Database not valid')
            return
        }
        try {
            await db.remove(id, rev)
            console.log('deleteData success')
            this.fetchData()
        } catch (error) {
            console.log('deleteData error', error)
        }
    },

    updateLocalDatabase() {
        const db = ref(this.db).value
        if (db) {
            db.replicate.from
                .bind(this)(this.remoteDB)
                .on('complete', () => {
                    console.log('on replicate complete')
                    this.fetchData()
                })
                .on('error', function (error) {
                    console.log('error', error)
                })
        }
    },

    updateDistantDatabase() {
        const db = ref(this.db).value;
        if (!db) {
            console.error("La base de données locale n'est pas initialisée.");
            return;
        }
    
        db.replicate.to(this.remoteDB)
            .on('complete', () => {
                console.log('Mise à jour de la base distante réussie.');
            })
            .on('error', (error) => {
                console.error('Erreur lors de la mise à jour de la base distante:', error);
            });
    }

    watchRemoteDatabase() {
        const db = ref(this.db).value;
        if (!db) {
            console.error("La base de données locale n'est pas initialisée.");
            return;
        }
    
        // Synchronisation automatique
        PouchDB.sync(db, this.remoteDB, {
            live: true,
            retry: true
        })
            .on('change', (info) => {
                console.log('Changement détecté dans la base distante:', info);
                this.fetchData(); // Actualiser les données locales
            })
            .on('paused', () => {
                console.log('Synchronisation en pause (connexion perdue ou synchronisation terminée).');
            })
            .on('active', () => {
                console.log('Reprise de la synchronisation.');
            })
            .on('error', (error) => {
                console.error('Erreur de synchronisation:', error);
            });
    }
}