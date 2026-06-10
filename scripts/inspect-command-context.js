'use strict';

const {
  buildCommandContext,
} = require('../src/services/editorial-intelligence/command-context');

const DEFAULT_MESSAGES = [
  'quero fazer um top 10 melhores pneus',
  'cria um ranking com 5 melhores air fryers',
  'gera top 15 notebooks custo-benefício',
  'faz uma página com os 10 melhores pneus para chuva',
  'quero comparar 8 mamadeiras',
  'furadeira',
];

const message = process.argv.slice(2).join(' ').trim();
const payload = message
  ? buildCommandContext({ message })
  : DEFAULT_MESSAGES.map((item) => buildCommandContext({ message: item }));

console.log(JSON.stringify(payload, null, 2));
