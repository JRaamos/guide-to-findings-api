'use strict';

var Json2csvParser = require('json2csv').Parser;
const fs = require('fs');
const path = require('path');
const csv = require("csvtojson");


const saveFile = (fileToUpload) => {
  return new Promise(async (resolve) => {
    const fileResult = await fs.readFileSync(fileToUpload.path);
    const fileData = Buffer.from(fileResult);
    const destinationFolder = __dirname + "/../../../../public/";
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

const convertCsvToJson = async (csvFilePath) => {
  try {
    const data = await csv().fromFile(csvFilePath)
    //remove file
    return data

  } catch (error) {
    console.error('Erro ao converter CSV para JSON:', error);
    return [];
  }
};

module.exports = {
  download: async (ctx) => {
    try {
      let { table, filter, omit, prep } = ctx.request.query;

      if (!table) {
        return badRequest("table is empty");
      }

      const model = strapi.db.config.models.find(model => model.collectionName === table);
      var data = await strapi.db.query(model?.uid).findMany(JSON.parse(filter || "{}"));

      if (omit) {
        const omitParse = (obj, arr) =>
          Object.keys(obj)
            .filter(k => !arr.includes(k))
            .reduce((acc, key) => ((acc[key] = obj[key]), acc), {});

        omit = JSON.parse(omit)

        data = data.map(item => omitParse(item, omit));

      }

      if (prep) {
        prep = JSON.parse(prep);
        data = data.map(item => ({ ...prep, ...item }))
      }

      if (data?.length > 0) {
        let columns = [];
        let listColumns = strapi.db.config.models.find(f => f.uid === model.uid)
        for (var i of Object.keys(listColumns?.attributes)) {
          columns.push(i);
        }

        const json2csvParser = new Json2csvParser({ columns });
        const csv = json2csvParser.parse(data);

        ctx.response.attachment("data.csv")
        ctx.response.type = 'text/csv; charset=utf-8';
        ctx.body = csv
      }

    } catch (error) {
      ctx.badRequest(error);

    }
  },
  upload: async (ctx) => {
    try {
      const { files } = ctx.request;

      const { params: params, state: { user: user }, request: { body: body, query: query, header } } = ctx;

      if (!files) return ctx.body = "empty files";

      const file = await saveFile(files.file);
      const result = await convertCsvToJson(file)

      if (result.length === 0) return ctx.badRequest("no rows in file")

      let successes = 0

      for (const row in result) {
        // process your row
        // const currentRow = result[row]
        // await strapi.db.query("api::process-user.process-user").create({ data: payload })
      }

      ctx.body = {
        "message": "completed upload",
        success: successes === result?.length
      }

    } catch (error) {
      console.log(error)
      ctx.badRequest(error);

    }
  },
};

