class DataManager {
  constructor() {
    this.dbName = 'WebGraphDB';
    this.dbVersion = 1;
    this.db = null;
    this.data = null;
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => reject("IndexedDB error: " + event.target.error);

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        this.db = event.target.result;
        this.db.createObjectStore('snapshots', { keyPath: 'id' });
      };
    });
  }

  async loadInitialData() {
    try {
      const response = await fetch(chrome.runtime.getURL('data/bookmarks.json'));
      const initialData = await response.json();
      this.data = initialData;
      await this.saveData();
      return this.data;
    } catch (error) {
      console.error("Error loading initial data:", error);
      throw error;
    }
  }

  async loadData() {
    try {
      await this.initDB();
      return new Promise((resolve, reject) => {
        chrome.storage.local.get('webgraph_data', async (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            if (!result.webgraph_data) {
              // If no data exists, load the initial data
              this.data = await this.loadInitialData();
            } else {
              this.data = result.webgraph_data;
            }
            console.log('DataManger.js Loaded data:', JSON.stringify(this.data, null, 2));
            resolve(this.data);
          }
        });
      });
    } catch (error) {
      console.error("Error loading data:", error);
      throw error;
    }
  }

  async saveData() {
    return new Promise((resolve, reject) => {
      console.log("Attempting to save data to chrome.storage.local");
      chrome.storage.local.set({ 'webgraph_data': this.data }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving data:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log("Data saved successfully");
          resolve();
        }
      });
    });
  }

  async addBookmark(bookmark) {
    if (!bookmark || typeof bookmark !== 'object') {
      throw new Error('Invalid bookmark object');
    }

    console.log("Adding bookmark:", bookmark);
    await this.loadData();
    const space = this.data.spaces[0];
    
    // Generate a unique ID
    let newId;
    do {
      newId = 'site' + Math.floor(Math.random() * 1000000);
    } while (space.sites.some(site => site.id === newId));

    const newBookmark = {
      id: newId,
      title: bookmark.title || 'Untitled',
      url: bookmark.url || '',
      tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
      dateCreated: bookmark.dateCreated || new Date().toISOString(),
      visits: bookmark.visits || 0,
      notes: bookmark.notes || '',
      favicon: bookmark.favicon || ''
    };

    if (bookmark.snapshot) {
      await this.saveSnapshot(newId, bookmark.snapshot);
    }

    console.log("New bookmark object created:", newBookmark);
    space.sites.push(newBookmark);

    newBookmark.tags.forEach(tagName => {
      if (!space.tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
        space.tags.push({ id: 'tag' + (space.tags.length + 1), name: tagName });
      }
    });

    console.log("Saving data...");
    await this.saveData();
    console.log("Data saved successfully");
    return newBookmark;
  }

  async updateBookmark(bookmarkId, updatedData) {
    await this.loadData();
    const space = this.data.spaces[0];
    const bookmarkIndex = space.sites.findIndex(site => site.id === bookmarkId);
    if (bookmarkIndex !== -1) {
      space.sites[bookmarkIndex] = { ...space.sites[bookmarkIndex], ...updatedData };
      
      // Update tags
      if (updatedData.tags) {
        updatedData.tags.forEach(tagName => {
          if (!space.tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
            space.tags.push({ id: 'tag' + (space.tags.length + 1), name: tagName });
          }
        });
      }
      
      // Remove orphaned tags
      const allTags = new Set(space.sites.flatMap(site => site.tags));
      space.tags = space.tags.filter(tag => allTags.has(tag.name));

      await this.saveData();
      return space.sites[bookmarkIndex];
    }
    throw new Error('Bookmark not found');
  }

  async saveSnapshot(id, snapshot) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');
      const request = store.put({ id, snapshot });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSnapshot(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['snapshots'], 'readonly');
      const store = transaction.objectStore('snapshots');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ? request.result.snapshot : null);
    });
  }

  async removeBookmark(bookmarkId) {
    await this.loadData();
    const space = this.data.spaces[0];
    space.sites = space.sites.filter(site => site.id !== bookmarkId);
    await this.removeSnapshot(bookmarkId);
    await this.saveData();
  }

  async removeSnapshot(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
    // Add a new tag
    async addTag(tagName) {
      await this.loadData();
      const space = this.data.spaces[0];
      const newId = 'tag' + (space.tags.length + 1);
      const newTag = { id: newId, name: tagName };
      space.tags.push(newTag);
      await this.saveData();
      return newTag;
    }
  
    // Remove a tag
    async removeTag(tagId) {
      await this.loadData();
      const space = this.data.spaces[0];
      space.tags = space.tags.filter(tag => tag.id !== tagId);
      // Remove the tag from all bookmarks
      space.sites.forEach(site => {
        site.tags = site.tags.filter(t => t !== tagId);
      });
      await this.saveData();
    }
  
    // Get all bookmarks
    async getBookmarks() {
    await this.loadData();
    return this.data.spaces[0].sites;
    }

    // Get all tags
     async getTags() {
    await this.loadData();
    return this.data.spaces[0].tags;
    }
  
    // Update a tag
    async updateTag(tagId, newName) {
      await this.loadData();
      const space = this.data.spaces[0];
      const tagIndex = space.tags.findIndex(tag => tag.id === tagId);
      if (tagIndex !== -1) {
        space.tags[tagIndex].name = newName;
        await this.saveData();
        return space.tags[tagIndex];
      }
      throw new Error('Tag not found');
    }

    async clearAll() {
      this.data = { spaces: [{ id: "space1", name: "Personal Bookmarks", tags: [], sites: [] }] };
      await this.saveData();
      await this.clearAllSnapshots();
    }
  
    async clearAllSnapshots() {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['snapshots'], 'readwrite');
        const store = transaction.objectStore('snapshots');
        const request = store.clear();
  
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  }
  
  export default DataManager;