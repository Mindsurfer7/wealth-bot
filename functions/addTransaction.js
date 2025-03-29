const { Markup } = require('telegraf');
const getExchangeRate = require('./getExchangeRate');
const { ALLOWED_CURRENCIES, CRYPTO_CURRENCIES } = require('../consts/consts');
const getTxTypeName = require('../utils/getTxTypeName');

async function addTransaction(ctx, data, db, pendingTransactions) {
  const operationTypeCrypto = CRYPTO_CURRENCIES.includes(data.currency);

  try {
    if (!ALLOWED_CURRENCIES.includes(data.currency.toUpperCase())) {
      throw new Error(
        `Используй только ${ALLOWED_CURRENCIES.join(
          ', ',
        )}, другие валюты не поддерживаются!`,
      );
    }

    data.date = data.date || new Date().toISOString().split('T')[0];
    const rate = await getExchangeRate(data.currency, db);

    if (operationTypeCrypto) {
      data.converted_amount = data.amount * rate;
    } else {
      data.converted_amount = data.amount / rate;
    }

    const transactionId = Date.now().toString();
    const userId = ctx.chat.id; // Получаем user_id из ctx
    pendingTransactions[transactionId] = { ctx, data, db, userId }; // Сохраняем user_id

    const message = `Подтвердите транзакцию: ${getTxTypeName(data.type)}: ${
      data.amount
    } ${data.currency} в категории ${
      data.category
    } (${data.converted_amount.toFixed(2)} RUB)`;
    ctx.reply(
      message,
      Markup.inlineKeyboard([
        Markup.button.callback('Подтвердить', `confirm_${transactionId}`),
        Markup.button.callback('Отклонить', `reject_${transactionId}`),
      ]),
    );
  } catch (e) {
    ctx.reply(`Ошибка получения курса: ${e.message}. Транзакция не сохранена.`);
  }
}

module.exports = addTransaction;
