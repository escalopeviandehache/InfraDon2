<script lang="ts">
import { ref } from 'vue'
import PouchDB from 'pouchdb'

declare interface Post {
  _id: string
  doc: {
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
    //nouvelle méthode pour créer un document
    this.putDocument(this.createDocument())
    this.fetchData()
  },

  methods: {
    //nouvelle méthode pour créer un document
    createDocument() {
      return {
        _id: new Date().toISOString(), // création d'un identifiant unique basé sur la date
        doc: {
          post_name: 'tigre',
          post_content: 'tigre 2',
          attributes: {
            creation_date: new Date().toLocaleDateString()
          }
        }
      }
    },

    putDocument(document: Post) {
      const db = ref(this.storage).value
      if (db) {
        db.put(document)
          .then(() => {
            console.log('Add ok')
          })
          .catch((error) => {
            console.log('Add ko', error)
          })
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

    initDatabase() {
      const db = new PouchDB('http://admin:admin@localhost:5984/database')
      if (db) {
        console.log("Connected to collection 'database'")
      } else {
        console.warn('Something went wrong')
      }
      this.storage = db
    },

    initDatabaseLocal() {
      const db = new PouchDB('Test')
      if (db) {
        console.log("Connected to collection 'database'")
      } else {
        console.warn('Something went wrong')
      }
      this.storage = db
    }
  }
}
</script>

<template>
  <h1>Nombre de post: {{ postsData.length }}</h1>
  <ul>
    <li v-for="post in postsData" :key="post._id">
      <div class="ucfirst">
        {{ post.doc.post_name
        }}<em style="font-size: x-small" v-if="post.doc.attributes?.creation_date">
          - {{ post.doc.attributes?.creation_date }}
        </em>
      </div>
    </li>
  </ul>
</template>
