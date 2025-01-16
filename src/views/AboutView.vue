<script lang="ts">
import { defineComponent } from 'vue'
import PouchDB from 'pouchdb'
import findPlugin from 'pouchdb-find'
PouchDB.plugin(findPlugin)

interface Post {
  _id: string
  _rev?: string
  title: string
  content: string
  creation_date: string
  modified: string
  _attachments?: {
    [key: string]: {
      content_type: string
      data: string
    }
  }
}

interface PostAttachment {
  name: string
  type: string
  data: Blob
}

export default defineComponent({
  name: 'PostsManager',
  data() {
    return {
      localDb: null as PouchDB.Database<Post> | null,
      remoteDb: null as PouchDB.Database<Post> | null,
      posts: [] as Post[],
      newPost: {
        title: '',
        content: '',
        attachments: [] as PostAttachment[]
      },
      searchQuery: '',
      isEditing: false,
      currentEditId: null as string | null,
      error: null as string | null,
    }
  },

  computed: {
    sortedPosts() {
      let filtered = [...this.posts]

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(post => 
          post.title.toLowerCase().includes(query) || 
          post.content.toLowerCase().includes(query)
        )
      }

      return filtered.sort((a, b) => 
        new Date(b.creation_date).getTime() - 
        new Date(a.creation_date).getTime()
      )
    }
  },

  methods: {
    async initDatabases() {
      try {
        this.localDb = new PouchDB<Post>('posts')
        this.remoteDb = new PouchDB('http://admin:admin@localhost:5984/database')
        
        await this.localDb.createIndex({
          index: {
            fields: ['title', 'content']
          }
        })

        if (this.localDb && this.remoteDb) {
          PouchDB.sync(this.localDb, this.remoteDb, {
            live: true,
            retry: true
          }).on('change', () => {
            this.fetchPosts()
          }).on('error', (error) => {
            console.error('Sync error:', error)
            this.error = 'Erreur de synchronisation'
          })
        }

        await this.fetchPosts()
      } catch (error) {
        console.error('Database error:', error)
        this.error = 'Erreur de base de données'
      }
    },

    async fetchPosts() {
      if (!this.localDb) return

      try {
        const result = await this.localDb.allDocs({
          include_docs: true,
          attachments: true,
          binary: true
        })
        this.posts = result.rows.map(row => row.doc as Post)
        this.error = null
      } catch (error) {
        console.error('Fetch error:', error)
        this.error = 'Erreur de récupération'
      }
    },

    async handleFileUpload(event: Event) {
      const input = event.target as HTMLInputElement
      if (!input.files?.length) return

      const file = input.files[0]
      this.newPost.attachments.push({
        name: file.name,
        type: file.type,
        data: file
      })
    },

    async addPost() {
      if (!this.localDb || !this.newPost.title.trim() || !this.newPost.content.trim()) return

      try {
        const post: Post = {
          _id: new Date().toISOString(),
          title: this.newPost.title.trim(),
          content: this.newPost.content.trim(),
          creation_date: new Date().toISOString(),
          modified: new Date().toISOString()
        }

        if (this.newPost.attachments.length > 0) {
          post._attachments = {}
          for (const attachment of this.newPost.attachments) {
            const base64Data = await this.fileToBase64(attachment.data)
            post._attachments[attachment.name] = {
              content_type: attachment.type,
              data: base64Data
            }
          }
        }

        await this.localDb.put(post)
        this.resetForm()
        await this.fetchPosts()
      } catch (error) {
        console.error('Add error:', error)
        this.error = 'Erreur d\'ajout'
      }
    },

    async fileToBase64(blob: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = reader.result as string
          resolve(base64String.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    },

    async downloadAttachment(post: Post, attachmentName: string) {
      if (!this.localDb) return

      try {
        const attachment = await this.localDb.getAttachment(post._id, attachmentName)
        if (!attachment) return

        const blob = attachment instanceof Blob ? attachment : new Blob([attachment])
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = attachmentName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Download error:', error)
        this.error = 'Erreur de téléchargement'
      }
    },

    async searchPosts() {
      if (!this.localDb) return

      try {
        const result = await this.localDb.find({
          selector: {
            $or: [
              { title: { $regex: RegExp(this.searchQuery, 'i') } },
              { content: { $regex: RegExp(this.searchQuery, 'i') } }
            ]
          }
        })
        this.posts = result.docs as Post[]
      } catch (error) {
        console.error('Search error:', error)
        this.error = 'Erreur de recherche'
      }
    },

    async deletePost(postId: string) {
      if (!this.localDb) return

      try {
        const post = await this.localDb.get(postId)
        await this.localDb.remove(post)
        await this.fetchPosts()
      } catch (error) {
        console.error('Delete error:', error)
        this.error = 'Erreur de suppression'
      }
    },

    async editPost(postId: string) {
      if (!this.localDb) return

      try {
        const post = await this.localDb.get(postId)
        this.newPost = {
          title: post.title,
          content: post.content,
          attachments: []
        }
        this.isEditing = true
        this.currentEditId = postId
      } catch (error) {
        console.error('Edit error:', error)
        this.error = 'Erreur de modification'
      }
    },

    async updatePost() {
      if (!this.localDb || !this.currentEditId) return

      try {
        const post = await this.localDb.get(this.currentEditId)
        post.title = this.newPost.title.trim()
        post.content = this.newPost.content.trim()
        post.modified = new Date().toISOString()

        if (this.newPost.attachments.length > 0) {
          post._attachments = {}
          for (const attachment of this.newPost.attachments) {
            const base64Data = await this.fileToBase64(attachment.data)
            post._attachments[attachment.name] = {
              content_type: attachment.type,
              data: base64Data
            }
          }
        }

        await this.localDb.put(post)
        this.resetForm()
        this.isEditing = false
        this.currentEditId = null
        await this.fetchPosts()
      } catch (error) {
        console.error('Update error:', error)
        this.error = 'Erreur de mise à jour'
      }
    },

    resetForm() {
      this.newPost = {
        title: '',
        content: '',
        attachments: []
      }
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    }
  },

  mounted() {
    this.initDatabases()
  }
})
</script>

<template>
  <div class="container">
    <div v-if="error" class="error">{{ error }}</div>

    <div class="search-section">
      <input v-model="searchQuery" placeholder="Rechercher..." class="input"/>
      <button @click="searchPosts" class="button">Rechercher</button>
    </div>

    <div class="form-section">
      <h2>{{ isEditing ? 'Modifier le post' : 'Nouveau post' }}</h2>
      <form @submit.prevent="isEditing ? updatePost() : addPost()">
        <input v-model="newPost.title" placeholder="Titre" required class="input"/>
        <textarea v-model="newPost.content" placeholder="Contenu" required class="textarea"></textarea>
        <input type="file" @change="handleFileUpload" class="file-input"/>
        <button type="submit" class="button">{{ isEditing ? 'Mettre à jour' : 'Ajouter le post' }}</button>
      </form>
    </div>

    <div class="posts-section">
      <h2>Posts ({{ sortedPosts.length }})</h2>
      <div class="posts-grid">
        <div v-for="post in sortedPosts" :key="post._id" class="post-card">
          <h3>{{ post.title }}</h3>
          <p>{{ post.content }}</p>
          <div v-if="post._attachments" class="attachments">
            <div v-for="(_, name) in post._attachments" :key="name">
              <button @click="downloadAttachment(post, String(name))" class="button">
                📎 Télécharger {{ name }}
              </button>
            </div>
          </div>
          <div class="dates">
            <span>📆 : {{ new Date(post.creation_date).toLocaleDateString() }}</span>
            <span v-if="post.modified !== post.creation_date">
              ✏️ : {{ new Date(post.modified).toLocaleDateString() }}
            </span>
          </div>
          <button @click="editPost(post._id)" class="button">Modifier ✏️</button>
          <button @click="deletePost(post._id)" class="button">Supprimer 🗑️</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.error {
  background: #fee2e2;
  color: #dc2626;
  padding: 10px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.search-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  margin-left: 20px;
  margin-right: 10px;

}

.form-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.post-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.input, .select, .textarea {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.textarea {
  min-height: 100px;
  resize: vertical;
}

.button {
  background: #3b82f6;
  color: white;
  padding: 8px 16px;
  margin-bottom: 10px  ;
  margin-right: 10px  ;
  margin-top: 5px  ;

  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.button:hover {
  background: #5b8aef;
}

.category {
  color: #666;
  margin: 10px 0;
}

.dates {
  font-size: 0.9em;
  color: #666;
  margin-top: 10px;  
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .search-section {
    flex-direction: column;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
  }
}
</style>