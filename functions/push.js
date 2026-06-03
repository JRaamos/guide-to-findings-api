'use strict';

const axios = require('axios').default

const dispatchPush = async (expoPushToken, title, body, metaData) => {

    const message = {
        to: expoPushToken, 
        sound: 'default', 
        title, 
        body, 
        data: { ...metaData }
    }; 
      
    await axios.post('https://exp.host/--/api/v2/push/send', message, {
        headers:  {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        }
    });
}

module.exports = {
    dispatchPush
};
