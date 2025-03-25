const sendTodayReport = require('./sendTodayReport');

const confirmTx = async (transaction, ctx) => {
  const { data, db: transactionDb, ctx: transactionCtx, userId } = transaction;

  transactionDb.run(
    `INSERT INTO transactions (user_id, date, type, amount, currency, converted_amount, category, description) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.date,
      data.type,
      data.amount,
      data.currency,
      data.converted_amount,
      data.category,
      data.description,
    ],
    (err) => {
      if (err) {
        ctx.editMessageText('Ошибка добавления в базу данных.');
        return;
      }

      ctx.editMessageText(
        ctx.callbackQuery.message.text.replace('Подтвердите', 'Подтверждена'),
      );
      ctx.reply('Да, добавлено в базу данных ✔️');
      sendTodayReport(transactionDb, transactionCtx);
    },
  );
};

module.exports = confirmTx;
