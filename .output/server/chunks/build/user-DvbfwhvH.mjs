import { defineStore } from 'pinia';

const useUserStore = defineStore("user", {
  state: () => {
    return {
      name: "John Doe",
      email: "john.doe@example.com"
    };
  },
  actions: {
    updateName(newName) {
      this.name = newName;
      this.saveToLocalStorage();
    },
    updateEmail(newEmail) {
      this.email = newEmail;
      this.saveToLocalStorage();
    },
    saveToLocalStorage() {
    },
    loadFromLocalStorage() {
    },
    persist: true
  }
});

export { useUserStore as u };
//# sourceMappingURL=user-DvbfwhvH.mjs.map
