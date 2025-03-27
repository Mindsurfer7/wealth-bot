const fs = require('fs');
const getExchangeRate = require('./getExchangeRate');
const { ALLOWED_CURRENCIES } = require('../consts/consts');

const sendMonthReport = async (db, ctx, targetCurrency) => {
  const month = new Date().toISOString().slice(0, 7);
  const userId = ctx.chat.id;
  console.log(targetCurrency, 'targetCurrency');

  db.all(
    `SELECT * FROM transactions WHERE date LIKE ? AND user_id = ?`,
    [`${month}%`, userId],
    async (err, rows) => {
      if (err) return ctx.reply('Ошибка базы данных');

      if (!targetCurrency || typeof targetCurrency !== 'string') {
        return ctx.reply(
          'Ошибка: валюта отчёта не указана. Используйте /report <валюта>, например /report USD',
        );
      }

      if (!ALLOWED_CURRENCIES.includes(targetCurrency.toUpperCase())) {
        return ctx.reply(
          `Используй только ${ALLOWED_CURRENCIES.join(
            ', ',
          )}, другие валюты не поддерживаются!`,
        );
      }

      let totalEarned = 0;
      let totalSpent = 0;
      const rateToTarget =
        targetCurrency === 'RUB'
          ? 1
          : await getExchangeRate(targetCurrency, db);

      let table =
        '| Дата       | Тип     | Сумма   | Валюта | Цель (RUB) | Категория |\n';
      table +=
        '|------------|---------|---------|--------|------------|-----------|\n';

      for (const row of rows) {
        const targetAmount = row.converted_amount * rateToTarget;
        table += `| ${row.date} | ${row.type} | ${row.amount} | ${
          row.currency
        } | ${targetAmount.toFixed(2)} | ${row.category} |\n`;
        if (row.type === 'income') totalEarned += targetAmount;
        if (row.type === 'expense') totalSpent += targetAmount;
      }

      table += `\nTotal Earned: ${totalEarned.toFixed(
        2,
      )} ${targetCurrency}\nTotal Spent: ${totalSpent.toFixed(
        2,
      )} ${targetCurrency}`;
      console.log(table);

      const mdFilePath = 'report.md';
      const txtFilePath = 'report.txt';
      fs.writeFileSync(mdFilePath, table);
      fs.writeFileSync(txtFilePath, table);

      // Отправляем сообщение с итогами
      await ctx.reply(
        `Отчёт за ${month} (${targetCurrency}):\n` +
          `Доходы: ${totalEarned.toFixed(0)} ${targetCurrency}\n` +
          `Расходы: ${totalSpent.toFixed(0)} ${targetCurrency}\n` +
          `Итого: ${(totalEarned - totalSpent).toFixed(0)} ${targetCurrency}`,
      );

      await ctx.replyWithMediaGroup([
        {
          media: { source: mdFilePath },
          type: 'document',
          caption: `Отчёт за ${month} (${targetCurrency}) в формате .md`,
        },
        {
          media: { source: txtFilePath },
          type: 'document',
          caption: `Отчёт за ${month} (${targetCurrency}) в формате .txt`,
        },
      ]);

      fs.unlinkSync(mdFilePath);
      fs.unlinkSync(txtFilePath);
    },
  );
};

module.exports = sendMonthReport;
