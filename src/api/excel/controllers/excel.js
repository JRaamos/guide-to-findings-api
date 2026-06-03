'use strict';

/**
 * Upload interface to use Instead CSV upload
 */
 
const fs = require('fs');
const path = require('path'); 
const reader = require('xlsx');

const saveFile = (fileToUpload) => {
  if(!fileToUpload){ return ;}
  return new Promise(async (resolve) => {
    const fileResult = await fs.readFileSync(fileToUpload?.path);
    const fileData = Buffer.from(fileResult);
    const destinationFolder = __dirname + "/../../../../public/uploads";
    const fileName = fileToUpload.name;
    const destinationFilePath = path.join(destinationFolder, fileName);
    fs.writeFile(destinationFilePath, fileData, (err) => {
      if (err) {
        console.error('Error saving file:', err);
      } else {
        resolve(destinationFilePath);
        // resolve(fileData);
      }
    });
  })
}

const processXls = path => {
  // Reading our test file
  return new Promise(resolve => {
    const file = reader.readFile(path)
    let data = []
    const sheets = file.SheetNames
    // console.log({ sheets })
    for(let i = 0; i < sheets.length; i++) {
      const temp = reader.utils.sheet_to_json( file.Sheets[file.SheetNames[i]] )
      temp.forEach((res) => data.push(res) )
    }
    resolve(data)
  })
} 

module.exports = {
  upload: async (ctx, next) => {
    try {
      const { files } = ctx.request;

      const { params: params, state: { user: user }, request: { body: body, query: query, header } } = ctx;

      if (!files) return ctx.body = "empty files";

      const file = await saveFile(files.file);
      const result = await processXls(file)
      
      if (result.length === 0) return ctx.badRequest("no rows in file")

      // Process your file
        
      // const payloads = makePayloads(result, body)
      // const promises = payloads.map(p => createOrUpdate(p))
      // const results = await Promise.all(promises)

      ctx.body = {
        "message": "completed upload",
        success: (results?.length === result?.length)
      }

      return ;

    } catch (error) {
      console.log(error)
      ctx.badRequest(error);

    }
  }
};



const createOrUpdate = async ({ data }) => {
  let already = await strapi.db.query("api::pre-user.pre-user").findOne({ where: { name:data?.name, classification:data?.classification, process:data?.process } })
  if( already?.id ) { 
    return await strapi.db.query("api::pre-user.pre-user").update({ where: { id: already?.id }, data }) ;
  }
  return await strapi.db.query("api::pre-user.pre-user").create({ data }) ;
}

const makePayloads = (result, body) => {
  return result?.map(m => ({
    data: {
      name: m?.__EMPTY_1,
      classification: EnumClasses?.[m?.__EMPTY_2],
      value: m?.__EMPTY_5,
      procurator: m?.__EMPTY_6,
      procurator_phone: m?.__EMPTY_8,
      procurator_email: m?.__EMPTY_7,
      license: (m?.__EMPTY_9 === "S"),
      presence: (m?.__EMPTY_10 === "S"),
      vote: (m?.__EMPTY_11 === "S"),
      process: body?.process
    }
  }))
}
