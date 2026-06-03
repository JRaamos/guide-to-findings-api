class CredentialsManager {  
    constructor(token, refresh) {
      this.token = token
      this.refresh = refresh
    }
  
    setCredentials(token, refresh) {
      this.token = token
      this.refresh = refresh
    }
  
    getCredentials() {
      return {
        token: this.token,
        refresh: this.refresh
      }
    }
  }
  
  module.exports = {
    CredentialsManager
  }