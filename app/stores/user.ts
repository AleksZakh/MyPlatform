

export const useUserStore = defineStore('user', {
    state: () => {
        if (typeof window !== 'undefined') {
            const savedData = window.localStorage.getItem('user-data')
            if (savedData) {
                return JSON.parse(savedData)
            }
        }
        
        return {
            name: 'John Doe',
            email: 'john.doe@example.com'
        }
    },
    actions: {
        updateName(newName: string) {
            this.name = newName;
            this.saveToLocalStorage();
        },
        updateEmail(newEmail: string) {
            this.email = newEmail;
            this.saveToLocalStorage();
        },
        saveToLocalStorage() {
            
            if (typeof window !== 'undefined') {
                console.log('Saving user data to localStorage:');
                window.localStorage.setItem('user-store', JSON.stringify({
                    name: this.name,
                    email: this.email
                }));
            }
        },
        loadFromLocalStorage() {
            if (typeof window !== 'undefined') {
                const saved = window.localStorage.getItem('user-store');
                if (saved) {
                    const data = JSON.parse(saved);
                    this.name = data.name;
                    this.email = data.email;
                }
            }
        },
        persist: true,
    }
});