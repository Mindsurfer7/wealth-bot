require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const {
  systemMessage,
  BOT_TOKEN,
  OPENAI_API_KEY,
  START_MESSAGE,
} = require('./consts/consts');
const processDebt = require('./functions/addDebt');
const OpenAI = require('openai');
const getExchangeRate = require('./functions/getExchangeRate');
const addTransaction = require('./functions/addTransaction');
const createDbTables = require('./functions/createDBtables');
const confirmTx = require('./functions/confirmTx');
const sendTodayReport = require('./functions/sendTodayReport');
const sendMonthReport = require('./functions/sendMonthReport');
const processVoice = require('./functions/processVoice');

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const bot = new Telegraf(BOT_TOKEN);
const db = new sqlite3.Database('./finance.db');
const pendingTransactions = {};

createDbTables(db);

bot.command('start', (ctx) => {
  ctx.reply(START_MESSAGE, { parse_mode: 'Markdown' });
});

bot.on('message', async (ctx) => {
  if (ctx.message.voice) {
    console.log('voice comm');
    processVoice(ctx, db, openai, pendingTransactions);
    return;
  }

  const text = ctx.message.text;
  console.log(text, 'on msg');

  if (text && text.startsWith('/report')) {
    const targetCurrency = text.split(' ')[1];
    await sendMonthReport(db, ctx, targetCurrency);
  }

  if (text && text.startsWith('/')) {
    return;
  }

  if (text) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(response.choices[0].message.content);
    console.log(data, 'data gpt');
    await addTransaction(ctx, data, db, pendingTransactions);
  }
});

bot.on('voice', async (ctx) => {
  console.log('voice comm');
  processVoice(ctx, db, openai, pendingTransactions);
});

bot.command('retry', (ctx) => {
  const userId = ctx.chat.id;
  db.all(
    `SELECT * FROM transactions WHERE converted_amount IS NULL AND user_id = ?`,
    [userId],
    async (err, rows) => {
      if (err) return ctx.reply('Ошибка базы данных');
      for (const row of rows) {
        const rate = await getExchangeRate(row.currency, db);
        const converted_amount = row.amount / rate;
        db.run(`UPDATE transactions SET converted_amount = ? WHERE id = ?`, [
          converted_amount,
          row.id,
        ]);
      }
      ctx.reply('Все транзакции обновлены');
    },
  );
});

bot.command('debt', async (ctx) => {
  const text = ctx.message.text.replace('/debt ', '');
  await processDebt(text, db, openai, ctx);
});

bot.command('today', async (ctx) => {
  sendTodayReport(db, ctx);
});

bot.action(/confirm_(\d+)/, async (ctx) => {
  const transactionId = ctx.match[1];
  const transaction = pendingTransactions[transactionId];

  if (!transaction) {
    ctx.editMessageText('Транзакция не найдена или уже обработана.');
    return;
  }

  await confirmTx(transaction, ctx);
  delete pendingTransactions[transactionId];
});

bot.action(/reject_(\d+)/, (ctx) => {
  const transactionId = ctx.match[1];
  const transaction = pendingTransactions[transactionId];

  if (!transaction) {
    ctx.editMessageText('Транзакция не найдена или уже обработана.');
    return;
  }

  delete pendingTransactions[transactionId];
  ctx.editMessageText('Транзакция отклонена');
});

bot.launch();
console.log('Бот запущен');
