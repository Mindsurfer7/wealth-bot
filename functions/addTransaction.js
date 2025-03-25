const { Markup } = require('telegraf');
const getExchangeRate = require('./getExchangeRate');

async function addTransaction(ctx, data, db, pendingTransactions) {
  try {
    data.date = data.date || new Date().toISOString().split('T')[0];
    const rate = await getExchangeRate(data.currency, db);
    data.converted_amount = data.amount / rate;

    const transactionId = Date.now().toString();
    const userId = ctx.chat.id; // Получаем user_id из ctx
    pendingTransactions[transactionId] = { ctx, data, db, userId }; // Сохраняем user_id

    const message = `Подтвердите транзакцию: ${
      data.type === 'expense' ? 'трата' : data.type
    }: ${data.amount} ${data.currency} в категории ${
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
