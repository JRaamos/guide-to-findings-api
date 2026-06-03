'use strict';
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');

module.exports = {
    async downloadExcel(ctx) {

        const columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nome', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
        ];

        const rows = [
            { id: 1, name: 'Jonathan', email: 'jonathan@email.com' },
            { id: 2, name: 'Maria', email: 'maria@email.com' },
        ];

        const result = await makeExcelDownload(columns, rows)

        ctx.send(result);
    }
};


const makeExcelDownload = async (columns, rows) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    // Cabeçalhos
    worksheet.columns = columns;

    // Dados de exemplo (pode vir do banco)
    const data = rows;

    data.forEach(row => worksheet.addRow(row));

    const tempFilePath = path.join(tmpdir(), `${uuidv4()}.xlsx`);
    await workbook.xlsx.writeFile(tempFilePath);

    const fileStat = fs.statSync(tempFilePath);

    const uploadedFile = await strapi.plugins['upload'].services.upload.upload({
        data: {
            fileInfo: {
                name: 'relatorio.xlsx',
                alternativeText: 'Relatório Excel',
                caption: 'Arquivo gerado automaticamente',
            },
        },
        files: {
            path: tempFilePath,
            name: 'relatorio.xlsx',
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: fileStat.size,
        },
    });

    // Remove o arquivo temporário após upload
    fs.unlinkSync(tempFilePath);

    return {
        url: uploadedFile[0].url,
        name: uploadedFile[0].name,
    };
}