const axios = require("axios");

const ENDPOINT = "https://api-endpoint.com"

const GET_HEADERS = () => {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
}

const POST = async (path, params) => {
    try {
      const headers = GET_HEADERS()
      return await axios({
        method: 'POST', 
        headers,
        url: `${ENDPOINT}${ path }`,
        body: JSON.stringify(params)
      }).then(response => response.data )
        .catch(err => { console.log("GET Error", err); return false; })
    } catch (error) {
      return error
    }
}

const GET = async (path) => {
    try {      
      const headers = GET_HEADERS()
      return await axios({
        method: 'GET',
        headers, 
        url: `${ENDPOINT}${ path }`
      }).then(response => response.data )
        .catch(err => { console.log("GET Error", err); return false; })
    } catch (error) {
      return error
    }
}

const PUT = async (path, params) => {
  try {
    const headers = GET_HEADERS()
    return await axios({
      method: 'PUT', 
      headers,
      url: `${ENDPOINT}${ path }`,
      body: JSON.stringify(params)
    }).then(response => response.data )
      .catch(err => { console.log("PUT Error", err); return false; })
  } catch (error) {
    return error
  }
}

const DELETE = async (path) => {
    try {      
      const headers = GET_HEADERS()
      return await axios({
        method: 'DELETE',
        headers,
        url: `${ENDPOINT}${ path }`
      }).then(response => response.data )
        .catch(err => { console.log("DELETE Error", err); return false; })
    } catch (error) {
      return error
    }
}

module.exports = {
  GET,
  POST,
  PUT,
  DELETE
}