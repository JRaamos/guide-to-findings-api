const fs = require('fs');

const fetchTemplateEmail = (template) => {
    return new Promise(resolve => {
        fs.readFile(`${__dirname}/../templates/${ template }`, 'utf-8', (err, data) => {
            if (err) {
              console.error('Error reading HTML file:', err);
              return;
            }
            resolve(data)
        });
    })
}; 

module.exports = {
    fetchTemplateEmail
}