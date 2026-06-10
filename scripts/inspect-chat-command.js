'use strict';

const {
  parseRankingChatCommand,
} = require('../src/services/editorial-intelligence/chat-command-parser');

const DEFAULT_MESSAGES = [
  'quero fazer um top 10 melhores pneus',
  'cria um ranking com 5 melhores air fryers',
  'gera top 15 notebooks custo-benefício',
  'faz uma página com os 10 melhores pneus para chuva',
  'quero comparar 8 mamadeiras',
  'top 50 celulares',
  'top 2 cafeteiras',
];

const message = process.argv.slice(2).join(' ').trim();
const payload = message
  ? parseRankingChatCommand(message)
  : DEFAULT_MESSAGES.map((item) => parseRankingChatCommand(item));

console.log(JSON.stringify(payload, null, 2));
