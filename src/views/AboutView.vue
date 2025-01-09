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
  attributes: {
    creation_date: string
    modified: string
  }
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
        content: ''
      },
      isEditing: false,
      currentEditId: null as string | null,
      error: null as string | null
    }
  },

  computed: {
    sortedPosts() {
      return [...this.posts].sort((a, b) => 
        new Date(b.attributes.creation_date).getTime() - new Date(a.attributes.creation_date).getTime()
      )
    }
  },

  methods: {
    async initDatabases() {
      try {
        // Local database
        this.localDb = new PouchDB<Post>('posts')
        
        // Remote database
        this.remoteDb = new PouchDB('http://admin:admin@localhost:5984/database')
        
        // Set up sync
        if (this.localDb && this.remoteDb) {
          PouchDB.sync(this.localDb, this.remoteDb, {
            live: true,
            retry: true
          }).on('change', () => {
            this.fetchPosts()
          }).on('error', (error) => {
            console.error('Sync error:', error)
            this.error = 'Erreur de synchronisation avec le serveur'
          })
        }

        await this.fetchPosts()
      } catch (error) {
        console.error('Database initialization error:', error)
        this.error = 'Erreur d\'initialisation de la base de données'
      }
    },

    async fetchPosts() {
      if (!this.localDb) return

      try {
        const result = await this.localDb.allDocs({
          include_docs: true,
          attachments: true
        })
        this.posts = result.rows.map(row => row.doc as Post)
        this.error = null
      } catch (error) {
        console.error('Fetch error:', error)
        this.error = 'Erreur lors de la récupération des posts'
      }
    },

    async addPost() {
      if (!this.localDb || !this.newPost.title.trim() || !this.newPost.content.trim()) return

      try {
        const post: Post = {
          _id: new Date().toISOString(),
          title: this.newPost.title.trim(),
          content: this.newPost.content.trim(),
          attributes: {
            creation_date: new Date().toISOString(),
            modified: new Date().toISOString()
          }
        }

        await this.localDb.put(post)
        this.newPost.title = ''
        this.newPost.content = ''
        await this.fetchPosts()
        this.error = null
      } catch (error) {
        console.error('Add error:', error)
        this.error = 'Erreur lors de l\'ajout du post'
      }
    },

    async updatePost(post: Post) {
      if (!this.localDb) return

      try {
        const existingDoc = await this.localDb.get(post._id)
        const updatedPost = {
          ...post,
          _rev: existingDoc._rev,
          attributes: {
            ...post.attributes,
            modified: new Date().toISOString()
          }
        }

        await this.localDb.put(updatedPost)
        this.isEditing = false
        this.currentEditId = null
        await this.fetchPosts()
        this.error = null
      } catch (error) {
        console.error('Update error:', error)
        this.error = 'Erreur lors de la mise à jour du post'
      }
    },

    async deletePost(post: Post) {
      if (!this.localDb || !confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) return

      try {
        const existingDoc = await this.localDb.get(post._id)
        await this.localDb.remove(existingDoc)
        await this.fetchPosts()
        this.error = null
      } catch (error) {
        console.error('Delete error:', error)
        this.error = 'Erreur lors de la suppression du post'
      }
    },

    startEditing(post: Post) {
      this.isEditing = true
      this.currentEditId = post._id
      this.newPost = {
        title: post.title,
        content: post.content
      }
    },

    cancelEditing() {
      this.isEditing = false
      this.currentEditId = null
      this.newPost = {
        title: '',
        content: ''
      }
    }
  },

  mounted() {
    this.initDatabases()
  }
})
</script>





<template>
  <div class="posts-manager">
    <!-- Error Alert -->
    <div v-if="error" class="error-alert" role="alert">
      {{ error }}
      <button @click="error = null" class="close-button">×</button>
    </div>

    <div class="content-container">
      <!-- Form Section -->
      <div class="form-section">
        <h1 class="section-title">{{ isEditing ? 'Modifier le post' : 'Nouveau post' }}</h1>
        <form @submit.prevent="isEditing ? updatePost({
          _id: currentEditId as string,
          title: newPost.title,
          content: newPost.content,
          attributes: {
            creation_date: new Date().toISOString(),
            modified: new Date().toISOString()
          }
        }) : addPost()" class="post-form">
          <div class="form-group">
            <input
              v-model="newPost.title"
              placeholder="Titre du post"
              required
              class="form-input"
            />
          </div>
          <div class="form-group">
            <textarea
              v-model="newPost.content"
              placeholder="Contenu du post"
              required
              class="form-textarea"
            ></textarea>
          </div>
          <div class="button-group">
            <button type="submit" class="submit-button">
              {{ isEditing ? 'Mettre à jour' : 'Ajouter' }}
            </button>
            <button
              v-if="isEditing"
              type="button"
              @click="cancelEditing"
              class="cancel-button"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>

      <!-- Posts List -->
      <div class="posts-section">
        <h2 class="section-title">Posts ({{ posts.length }})</h2>
        <div class="posts-scrollable">
          <div v-if="posts.length" class="posts-grid">
            <div v-for="post in sortedPosts" :key="post._id" class="post-card">
              <div class="post-card-header">
                <h3 class="post-title">{{ post.title }}</h3>
                <div class="post-actions">
                  <button @click="startEditing(post)" class="icon-button edit-button" title="Modifier">
                    ✏️
                  </button>
                  <button @click="deletePost(post)" class="icon-button delete-button" title="Supprimer">
                    🗑️
                  </button>
                </div>
              </div>
              <div class="post-content">
                <p class="post-text">{{ post.content }}</p>
              </div>
              <div class="post-meta">
                <div class="post-date">
                  📅 {{ new Date(post.attributes.creation_date).toLocaleDateString() }}
                </div>
                <div v-if="post.attributes.modified !== post.attributes.creation_date" class="post-modified">
                  ✏️ {{ new Date(post.attributes.modified).toLocaleDateString() }}
                </div>
              </div>
            </div>
          </div>
          <p v-else class="no-posts">Aucun post disponible</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.posts-manager {
  width: 100%;
  min-height: 100vh;
  background-color: #f3f4f6;
  padding: 20px;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
  height: calc(100vh - 40px);
}

.section-title {
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

/* Form Styles */
.form-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  height: fit-content;
}

.post-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #3b82f6;
  outline: none;
}

.form-textarea {
  min-height: 150px;
  resize: vertical;
}

/* Posts Section */
.posts-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.posts-scrollable {
  flex-grow: 1;
  overflow-y: auto;
  padding-right: 16px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.post-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.post-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.post-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  flex-grow: 1;
  margin-right: 12px;
}

.post-content {
  margin-bottom: 16px;
}

.post-text {
  color: #4b5563;
  line-height: 1.5;
  margin: 0;
}

.post-meta {
  display: flex;
  gap: 12px;
  font-size: 0.875rem;
  color: #6b7280;
}

.post-date,
.post-modified {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Buttons */
.button-group {
  display: flex;
  gap: 12px;
}

.submit-button,
.cancel-button {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.submit-button {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.submit-button:hover {
  background-color: #2563eb;
}

.cancel-button {
  background-color: #f3f4f6;
  color: #4b5563;
  border: 1px solid #d1d5db;
}

.cancel-button:hover {
  background-color: #e5e7eb;
}

.icon-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  transition: transform 0.2s ease;
}

.icon-button:hover {
  transform: scale(1.1);
}

.post-actions {
  display: flex;
  gap: 8px;
}

/* Error Alert */
.error-alert {
  background-color: #fee2e2;
  border-left: 4px solid #ef4444;
  color: #dc2626;
  padding: 12px 40px 12px 16px;
  margin-bottom: 20px;
  border-radius: 8px;
  position: relative;
}

.close-button {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #dc2626;
  font-size: 1.25rem;
  padding: 4px;
}

.no-posts {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 40px 0;
}

/* Scrollbar Styling */
.posts-scrollable::-webkit-scrollbar {
  width: 8px;
}

.posts-scrollable::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.posts-scrollable::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.posts-scrollable::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .content-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .posts-scrollable {
    max-height: 600px;
  }
}

@media (max-width: 640px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }

  .content-container {
    padding: 0;
  }
}
</style>