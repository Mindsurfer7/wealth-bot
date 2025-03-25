const fs = require('fs');
const getExchangeRate = require('./getExchangeRate');

const sendMonthReport = async (db, ctx, targetCurrency) => {
  console.log('yo');
  const month = new Date().toISOString().slice(0, 7);
  const userId = ctx.chat.id;
  console.log(targetCurrency, 'targetCurrency');

  db.all(
    `SELECT * FROM transactions WHERE date LIKE ? AND user_id = ?`,
    [`${month}%`, userId],
    async (err, rows) => {
      if (err) return ctx.reply('Ошибка базы данных');

      let totalEarned = 0;
      let totalSpent = 0;
      const rateToTarget =
        targetCurrency === 'RUB'
          ? 1
          : await getExchangeRate(targetCurrency, db);

      console.log(rateToTarget, 'rateToTarget');

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

      fs.writeFileSync('report.md', table);
      await ctx.replyWithDocument({
        source: 'report.md',
        filename: `report_${month}_${targetCurrency}.md`,
      });
    },
  );
};

module.exports = sendMonthReport;
