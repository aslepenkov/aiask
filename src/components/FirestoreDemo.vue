<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'

interface Item {
  id: string
  title: string
  createdAt: Timestamp | null
}

const items = ref<Item[]>([])
const newItemTitle = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const fetchItems = async () => {
  loading.value = true
  error.value = null
  try {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    const fetched: Item[] = []
    querySnapshot.forEach((docSnapshot) => {
      fetched.push({
        id: docSnapshot.id,
        title: docSnapshot.data().title || '',
        createdAt: docSnapshot.data().createdAt || null
      })
    })
    items.value = fetched
  } catch (err: any) {
    console.error('Error fetching items:', err)
    error.value = err.message || 'Failed to fetch items from Firestore.'
  } finally {
    loading.value = false
  }
}

const addItem = async () => {
  if (!newItemTitle.value.trim()) return
  loading.value = true
  error.value = null
  try {
    const docRef = await addDoc(collection(db, 'items'), {
      title: newItemTitle.value.trim(),
      createdAt: serverTimestamp()
    })
    items.value.unshift({
      id: docRef.id,
      title: newItemTitle.value.trim(),
      createdAt: null
    })
    newItemTitle.value = ''
  } catch (err: any) {
    console.error('Error adding item:', err)
    error.value = err.message || 'Failed to add item to Firestore.'
  } finally {
    loading.value = false
  }
}

const deleteItem = async (id: string) => {
  error.value = null
  try {
    await deleteDoc(doc(db, 'items', id))
    items.value = items.value.filter((item) => item.id !== id)
  } catch (err: any) {
    console.error('Error deleting item:', err)
    error.value = err.message || 'Failed to delete item from Firestore.'
  }
}

onMounted(() => {
  fetchItems()
})
</script>

<template>
  <div class="card">
    <h2>Firestore Collection Demo</h2>
    <p class="description">
      Manage <code>items</code> collection in real-time with Firebase Firestore.
    </p>

    <form @submit.prevent="addItem" class="input-group">
      <input
        v-model="newItemTitle"
        type="text"
        placeholder="Enter item title..."
        :disabled="loading"
        required
      />
      <button type="submit" :disabled="loading || !newItemTitle.trim()">
        Add Item
      </button>
    </form>

    <div v-if="error" class="error-msg">
      {{ error }}
    </div>

    <div v-if="loading && items.length === 0" class="loading">
      Loading items...
    </div>

    <ul v-else-if="items.length > 0" class="item-list">
      <li v-for="item in items" :key="item.id" class="item font-sans">
        <span>{{ item.title }}</span>
        <button @click="deleteItem(item.id)" class="btn-delete" title="Delete item">
          &times;
        </button>
      </li>
    </ul>

    <p v-else class="empty-state">
      No items found in Firestore. Add one above!
    </p>
  </div>
</template>

<style scoped>
.card {
  background: #1a1a1a;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #333;
}

.description {
  color: #aaa;
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

input {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  border: 1px solid #444;
  background: #2a2a2a;
  color: #fff;
  font-size: 1rem;
  flex: 1;
  max-width: 400px;
}

input:focus {
  outline: none;
  border-color: #42b883;
}

button {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  border: none;
  background: #42b883;
  color: #1a1a1a;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #33a06f;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.loading, .empty-state {
  color: #888;
  font-style: italic;
  margin-top: 1rem;
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #2a2a2a;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #3a3a3a;
}

.btn-delete {
  background: transparent;
  color: #ff6b6b;
  font-size: 1.2rem;
  padding: 0 0.4rem;
  line-height: 1;
}

.btn-delete:hover {
  background: rgba(255, 107, 107, 0.2);
  color: #ff4d4d;
}
</style>
