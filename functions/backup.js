const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const backupDatabase = async () => {
  const currentDate = moment().format('YYYY-MM-DD');
  const backupFileName = `backup_${currentDate}.sql`;
  const backupFilePath = path.join(`${__dirname}/../public/`, 'backups', backupFileName);
  const backupDir = path.dirname(backupFilePath);

  fs.mkdirSync(backupDir, { recursive: true });

  return new Promise((resolve) => {
    const args = [
      '-h',
      process.env.DATABASE_HOST || 'localhost',
      '-p',
      process.env.DATABASE_PORT || '5432',
      '-U',
      process.env.DATABASE_USERNAME || 'guide_to_findings',
      '-d',
      process.env.DATABASE_NAME || 'guide_to_findings',
      '-f',
      backupFilePath,
    ];

    execFile('pg_dump', args, {
      env: {
        ...process.env,
        PGPASSWORD: process.env.DATABASE_PASSWORD || '',
      },
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Backup error: ${error.message}`);
        resolve({ success:false, file: backupFileName})
        return;
      }
      if (stderr) {
        console.error(`Backup stderr: ${stderr}`);
        resolve({ success:true, file: backupFileName })
        return;
      }
      console.log('Backup successful');
      resolve({ success:true, file: backupFileName })
    });
  })
  
};

// await strapi.connections.default.raw(`SHOW * FROM cities;`);

const removeOldBackups = () => {
    const backupDir = path.join(`${__dirname}/../public/`, 'backups');
  
    fs.readdir(backupDir, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return;
      }
  
      const oneMonthAgo = moment().subtract(1, 'months');
  
      files.forEach((file) => {
        const filePath = path.join(backupDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error('Error getting file stats:', err);
            return;
          }
          const fileModificationDate = moment(stats.mtime);
          if (fileModificationDate.isBefore(oneMonthAgo)) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error('Error deleting file:', err);
                return;
              }
              console.log(`Deleted file: ${file}`);
            });
          }
        });
      });
    });
};


module.exports = {
    backupDatabase,
    removeOldBackups
}
