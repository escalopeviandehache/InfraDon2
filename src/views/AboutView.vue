<script lang="ts">
import { ref } from 'vue'
import PouchDB from 'pouchdb'

declare interface Post {
  _id: string
  _rev: string
  doc?: {
    post_name: string
    post_content: string
    attributes: {
      creation_date: string
    }
  }
}

export default {
  data() {
    return {
      total: 0,
      postsData: [] as Post[],
      document: null as Post | null,
      storage: null as PouchDB.Database | null
    }
  },

  mounted() {
    this.initDatabase()
    this.fetchData()
    this.deleteData({
      _id: '6bab3ac593d9ec8c0a61a0b3e40515e2',
      _rev: '7-1121e553d66c9145cf69b51a56cd380f'
    })
  },

  methods: {
    async updateData(document: Post) {
      const db = this.storage

      // Vérifier si le stockage est bien défini
      if (!db) {
        console.error("Le stockage n'est pas défini.")
        return
      }

      try {
        // Récupérer le document existant pour obtenir son _rev (version)
        const existingDoc = await db.get(document._id)
        document._rev = existingDoc._rev // Assigner _rev pour la mise à jour

        // Mettre à jour le document
        await db.put(document)
        console.log('Mise à jour réussie')
      } catch (error) {
        console.error('Erreur lors de la mise à jour', error)
      }
    },

    async deleteData(document: Post) {
      console.log('entrée dans la méthode delete')
      const db = this.storage

      // Vérifier si le stockage est bien défini
      if (!db) {
        console.error("Le stockage n'est pas défini.")
        return
      }

      try {
        console.log('try delete')

        // Récupérer le document existant pour obtenir son _rev
        const existingDoc = await db.get(document._id)
        await db.remove(existingDoc._id, existingDoc._rev)
        console.log('Suppression réussie')
      } catch (error) {
        console.log('catch delete')
        console.error('Erreur lors de la suppression', error)
      }
    },

    fetchData() {
      const storage = ref(this.storage)
      const self = this
      if (storage.value) {
        storage.value
          .allDocs({
            include_docs: true,
            attachments: true
          })
          .then(
            function (result: any) {
              console.log('fetchData success', result)
              self.postsData = result.rows
            }.bind(this)
          )
          .catch(function (error: any) {
            console.log('fetchData error', error)
          })
      }
    },

    createData(document: Post) {
      const db = ref(this.storage)
      try {
        if (document) {
          db.value?.post(document)
        }
      } catch (e) {
        throw new Error('Impossible de modifer le document')
      }
    },

    initDatabase() {
      const db = new PouchDB('http://admin:admin@localhost:5984/database')
      if (db) {
        console.log("Connected to collection 'post'")
      } else {
        console.warn('Something went wrong')
      }
      this.storage = db
    }
  }
}
</script>

<template>
  <div>
    <h1>Nombre de post: {{ postsData.length }}</h1>
    <ul>
      <li v-for="post in postsData" :key="post._id">
        <div class="ucfirst">
          {{ post.doc?.post_name
          }}<em style="font-size: x-small" v-if="post.doc?.attributes?.creation_date">
            - {{ post.doc?.attributes?.creation_date }}
          </em>
        </div>
      </li>
    </ul>
  </div>
</template>
