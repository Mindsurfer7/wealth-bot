const { debtSystemMessage, ALLOWED_CURRENCIES } = require('../consts/consts');
const getExchangeRate = require('./getExchangeRate');
const sendDebts = require('./sendDebts');

const processDebt = async (text, db, openai, ctx) => {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    console.log('Processing debt with text:', text);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: debtSystemMessage },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(response.choices[0].message.content);

    if (
      !data.currency ||
      !ALLOWED_CURRENCIES.includes(data.currency.toUpperCase())
    ) {
      throw new Error(
        `Используй только ${ALLOWED_CURRENCIES.join(
          ', ',
        )}, другие валюты не поддерживаются!`,
      );
    }

    data.date = new Date().toISOString().split('T')[0];
    const userId = ctx.chat.id;
    console.log('userId:', userId, 'date:', data.date);

    try {
      const rate = await getExchangeRate(data.currency, db);
      data.converted_amount = data.amount / rate;
      console.log(
        `Converted amount for ${data.currency}: ${data.converted_amount} RUB (rate: ${rate})`,
      );

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO debts (user_id, date, type, name, amount, currency, converted_amount, description) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            data.date,
            data.type,
            data.name,
            data.amount,
            data.currency,
            data.converted_amount,
            data.description,
          ],
          (err) => {
            if (err) {
              console.error('Database error (INSERT debt):', err);
              return reject(new Error(`Database error: ${err.message}`));
            }
            console.log('Debt saved to database');
            resolve();
          },
        );
      });

      ctx.reply(
        `Добавлен долг: ${data.type === 'owed' ? 'должен' : 'одолжил'} ${
          data.name
        } ${data.amount} ${data.currency} (${data.converted_amount.toFixed(
          2,
        )} RUB)`,
      );

      // Показываем долги только того же типа, что был добавлен
      sendDebts(db, ctx, data.type);
    } catch (e) {
      console.error('Error getting exchange rate:', e);

      data.converted_amount = null;
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO debts (user_id, date, type, name, amount, currency, converted_amount, description) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            data.date,
            data.type,
            data.name,
            data.amount,
            data.currency,
            null,
            data.description,
          ],
          (err) => {
            if (err) {
              console.error(
                'Database error (INSERT debt without converted_amount):',
                err,
              );
              return reject(new Error(`Database error: ${err.message}`));
            }
            console.log('Debt saved to database without converted_amount');
            resolve();
          },
        );
      });

      ctx.reply(
        `Ошибка получения курса: ${e.message}. Долг сохранён, повторите позже с /retry`,
      );

      // Показываем долги того же типа, что был добавлен
      sendDebts(db, ctx, data.type);
    }
  } catch (e) {
    console.error('Error in processDebt:', e);
    ctx.reply(`Ошибка обработки долга: ${e.message}`);
  }
};

module.exports = processDebt;
