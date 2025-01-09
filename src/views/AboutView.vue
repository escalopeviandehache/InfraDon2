<template>
  <div>
    <div>
        <h1>Ajouter un post</h1>
        <form @submit.prevent="addPost">
          <input v-model="newPostName" placeholder="Nom du post" required />
          <div>
            <textarea v-model="newPostContent" placeholder="Contenu du post" required></textarea>
          </div>
          <button type="submit">Ajouter</button>
        </form>
        <hr style="margin-top: 10px;">
      </div>
      <h1>Nombre de posts: {{ posts.length }}</h1>
      <ul>
        <li v-for="post in posts" :key="post._id">
          <div class="ucfirst">
            {{ post.title }}
            <em style="font-size: x-small" v-if="post.attributes?.creation_date">
              - {{ post.attributes?.creation_date }}
            </em>
          </div>
          <button @click="editPost(post)">Modifier</button>
          <button @click="deleteData(post)">Supprimer</button>
        </li>
      </ul>
    </div>
  </template> 
  
  <script lang="ts">
  import { defineComponent } from 'vue'
  import PouchDB from 'pouchdb'
  
  interface Post {
    _id: string
    _rev?: string
    title: string
    content: string
    attributes: {
      creation_date: string
      modified: string
    }
  }
  
  export default defineComponent({
    name: 'AboutView',
    data() {
      return {
        storage: null as PouchDB.Database<Post> | null,
        posts: [] as Post[],
        newPostName: '',
        newPostContent: ''
      }
    },
    methods: {
      initDatabase() {
        this.storage = new PouchDB('posts')
      },
      async fetchData() {
        if (!this.storage) {
          console.error("Le stockage n'est pas défini.")
          return
        }
  
        try {
          const result = await this.storage.allDocs({ include_docs: true })
          this.posts = result.rows.map(row => row.doc as Post)
        } catch (error) {
          console.error('Erreur lors de la récupération des données', error)
        }
      },
      async addPost() {
        if (!this.storage) {
          console.error("Le stockage n'est pas défini.")
          return
        }
  
        const newPost: Post = {
          _id: new Date().toISOString(),
          title: this.newPostName,
          content: this.newPostContent,
          attributes: {
            creation_date: new Date().toISOString(),
            modified: 'not yet'
          }
        }
  
        try {
          await this.storage.put(newPost)
          console.log('Post ajouté avec succès')
          this.fetchData()
          this.newPostName = ''
          this.newPostContent = ''
        } catch (error) {
          console.error('Erreur lors de l\'ajout du post', error)
        }
      },
      async updateData(document: Post) {
        if (!this.storage) {
          console.error("Le stockage n'est pas défini.")
          return
        }
  
        try {
          const existingDoc = await this.storage.get(document._id)
          document._rev = existingDoc._rev
  
          await this.storage.put(document)
          console.log('Mise à jour réussie')
          this.fetchData()
        } catch (error) {
          console.error('Erreur lors de la mise à jour', error)
        }
      },
      async deleteData(document: Post) {
        if (!this.storage) {
          console.error("Le stockage n'est pas défini.")
          return
        }
  
        try {
          if (!document._rev) {
            const existingDoc = await this.storage.get(document._id)
            document._rev = existingDoc._rev
          }
          if (document._rev) {
            await this.storage.remove({ _id: document._id, _rev: document._rev })
          } else {
            console.error("Le document n'a pas de révision définie.")
          }
          console.log('Suppression réussie')
          this.fetchData()
        } catch (error) {
          console.error('Erreur lors de la suppression', error)
        }
      },
      editPost(post: Post) {
        const newContent = prompt('Modifier le contenu du post:', post.content)
        if (newContent !== null) {
          post.content = newContent
          post.attributes.modified = new Date().toISOString()
          this.updateData(post)
        }
      }
    },
    mounted() {
      this.initDatabase()
      this.fetchData()
    }
  })
  </script>
  
  <style scoped>
  .ucfirst {
    text-transform: capitalize;
  }
  </style>
  
  <!-- 2 replicate form -->
  <!-- 4 replicate to -->
  <!-- Car je manipule la DB local sans prendre les infos de couchDB et sans renvoyer
  les infos dans couchDB -->