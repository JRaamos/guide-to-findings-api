const { backupDatabase, removeOldBackups } = require("../functions/backup");
const { sentEmail } = require("../functions/mail");
const { fetchTemplateEmail } = require("../functions/utils");


module.exports = {
    '0 0 * * *': async ({ strapi }) => {
        
        try {
            console.log("midnight")

            const { success, file } = await backupDatabase()
            await removeOldBackups()

            if(success){
    
                const targets = [
                    // "israel@x-apps.com.br"
                ]
                
                if(targets.length){

                    const link = `${ process.env.ENDPOINT }/backups/${ file }`
                    const image = `${ process.env.ENDPOINT }/favicon.png`
                    const template = await fetchTemplateEmail("backup.html")
                    const html = template.replace(/{link}/g, link).replace(/{image}/g, image)

                    const promises = targets.map(t => sentEmail(t, "Backup Guide to findings", html))
                    await Promise.all(promises)
                }
            } 

        } catch (error) {
            console.error(error);
        }

    },
    
    "*/15 * * * *": async ({ strapi }) => {

    },
};  
