class DataManager {
    constructor() {
      this.data = null;
    }
  
    // Load data from chrome.storage.local
    async loadData() {
        return new Promise((resolve, reject) => {
          chrome.storage.local.get('webgraph_data', (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              this.data = result.webgraph_data || { 
                spaces: [{ 
                  id: "space1", 
                  name: "Personal Bookmarks", 
                  tags: [], 
                  sites: [] 
                }] 
              };
              console.log('Loaded data:', JSON.stringify(this.data, null, 2));  // Log the loaded data
              resolve(this.data);
            }
          });
        });
      }
  
    // Save data to chrome.storage.local
    async saveData() {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ 'webgraph_data': this.data }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    }
  
    // Add a new bookmark
    async addBookmark(bookmark) {
        await this.loadData();
        const space = this.data.spaces[0];
        const newId = 'site' + (space.sites.length + 1);
        const newBookmark = {
          id: newId,
          title: bookmark.title,
          url: bookmark.url,
          tags: bookmark.tags,  // Now storing tag names instead of IDs
          dateCreated: bookmark.dateCreated,
          visits: bookmark.visits,
          notes: bookmark.notes,
          snapshot: bookmark.snapshot,
          favicon: bookmark.favicon
        };
        space.sites.push(newBookmark);
    
        // Add new tags if they don't exist
        bookmark.tags.forEach(tagName => {
          if (!space.tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
            space.tags.push({ id: 'tag' + (space.tags.length + 1), name: tagName });
          }
        });
    
        await this.saveData();
        return newBookmark;
      }
    
  
    // Remove a bookmark
    async removeBookmark(bookmarkId) {
      await this.loadData();
      const space = this.data.spaces[0];
      space.sites = space.sites.filter(site => site.id !== bookmarkId);
      await this.saveData();
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
  
    // Clear all bookmarks and tags
    async clearAll() {
      this.data = { spaces: [{ id: "space1", name: "Personal Bookmarks", tags: [], sites: [] }] };
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
  
    // Update a bookmark
    async updateBookmark(bookmarkId, updatedData) {
      await this.loadData();
      const space = this.data.spaces[0];
      const bookmarkIndex = space.sites.findIndex(site => site.id === bookmarkId);
      if (bookmarkIndex !== -1) {
        space.sites[bookmarkIndex] = { ...space.sites[bookmarkIndex], ...updatedData };
        await this.saveData();
        return space.sites[bookmarkIndex];
      }
      throw new Error('Bookmark not found');
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
  }
  
  export default DataManager;