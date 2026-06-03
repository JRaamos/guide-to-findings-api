module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/excel/upload',
     handler: 'excel.upload',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
