module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/download/excel',
            handler: 'download.downloadExcel',
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ],
};
