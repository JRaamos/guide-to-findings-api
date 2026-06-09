const { backupDatabase, removeOldBackups } = require("../functions/backup");


module.exports = {
    '0 0 * * *': async ({ strapi }) => {
        
        try {
            console.log("midnight")

            const { success, file } = await backupDatabase()
            await removeOldBackups()

            if(success){
                console.log(`Backup created: ${file}`)
            } 

        } catch (error) {
            console.error(error);
        }

    },
};  
