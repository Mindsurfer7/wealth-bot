const sendDebts = (db, ctx, type) => {
  const userId = ctx.chat.id;
  console.log(`Fetching debts for userId: ${userId}, type: ${type || 'all'}`);

  // Формируем SQL-запрос в зависимости от type
  let query = `SELECT * FROM debts WHERE user_id = ?`;
  const params = [userId];

  if (type === 'owed') {
    query += ` AND type = 'owed'`;
  } else if (type === 'lent') {
    query += ` AND type = 'lent'`;
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error in sendDebts:', err);
      return ctx.reply('Ошибка базы данных при получении списка долгов');
    }

    if (rows.length === 0) {
      let message = 'У вас нет долгов.';
      if (type === 'owed') {
        message = 'У вас нет долгов, которые вы должны.';
      } else if (type === 'lent') {
        message = 'Нет долгов, которые вам должны.';
      }
      return ctx.reply(message);
    }

    // Формируем таблицу долгов
    let table = '| Дата      | Тип   | Имя   | Сумма | Валюта | RUB|\n';
    table += '|-----------|-------|-------|-------|--------|-----|\n';

    for (const row of rows) {
      const typeText = row.type === 'owed' ? 'должен' : 'одолжил';
      const convertedAmount = row.converted_amount
        ? row.converted_amount
        : 'N/A';
      table += `| ${row.date} | ${typeText} | ${row.name} | ${row.amount} | ${row.currency}   | ${convertedAmount}   |\n`;
    }

    console.log('Generated debts table:', table);

    let title = 'Ваши текущие долги:';
    if (type === 'owed') {
      title = 'Долги, которые вы должны:';
    } else if (type === 'lent') {
      title = 'Долги, которые вам должны:';
    }

    ctx.reply(`${title}\n\`\`\`\n${table}\n\`\`\``, {
      parse_mode: 'Markdown',
    });
  });
};

module.exports = sendDebts;
// const sendDebts = async (db, ctx) => {
//   const userId = ctx.chat.id;
//   console.log(`Fetching debts for userId: ${userId}`);

//   db.all(`SELECT * FROM debts WHERE user_id = ?`, [userId], (err, rows) => {
//     if (err) {
//       console.error('Database error in sendDebts:', err);
//       return ctx.reply('Ошибка базы данных при получении списка долгов');
//     }

//     if (rows.length === 0) {
//       return ctx.reply('У вас нет долгов.');
//     }

//     // Формируем таблицу долгов
//     let table =
//       '| Дата       | Тип     | Имя     | Сумма   | Валюта | Сумма (RUB) | Описание       |\n';
//     table +=
//       '|------------|---------|---------|---------|--------|-------------|----------------|\n';

//     for (const row of rows) {
//       const typeText = row.type === 'owed' ? 'должен' : 'одолжил';
//       const convertedAmount = row.converted_amount
//         ? row.converted_amount.toFixed(2)
//         : 'N/A';
//       table += `| ${row.date} | ${typeText} | ${row.name} | ${row.amount} | ${
//         row.currency
//       } | ${convertedAmount} | ${row.description || 'N/A'} |\n`;
//     }

//     console.log('Generated debts table:', table);
//     ctx.reply(`Ваши текущие долги:\n\`\`\`\n${table}\n\`\`\``, {
//       parse_mode: 'Markdown',
//     });
//   });
// };

// module.exports = sendDebts;
