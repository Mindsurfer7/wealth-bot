const getTxTypeName = require('../utils/getTxTypeName');

const sendTodayReport = (db, ctx) => {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
  const userId = ctx.chat.id; // Получаем user_id

  db.all(
    `SELECT * FROM transactions WHERE date = ? AND user_id = ?`,
    [today, userId],
    (err, rows) => {
      if (err) return ctx.reply('Ошибка базы данных');

      if (rows.length === 0) {
        return ctx.reply('Сегодня нет транзакций.');
      }

      let table = '| Тип | Сумма | Валюта | RUB | Категория |\n';
      table += '|-----|-------|--------|-----|-----------|\n';

      for (const row of rows) {
        table += `| ${getTxTypeName(row.type)} | ${row.amount} | ${
          row.currency
        } | ${
          row.converted_amount ? row.converted_amount.toFixed(2) : 'N/A'
        } | ${row.category} |\n`;
      }

      ctx.reply(`Транзакции за сегодня (${today}):\n\`\`\`\n${table}\n\`\`\``, {
        parse_mode: 'Markdown',
      });
    },
  );
};

module.exports = sendTodayReport;
