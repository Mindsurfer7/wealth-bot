const { debtSystemMessage } = require('../consts/consts');
const getExchangeRate = require('./getExchangeRate');

const processDebt = async (text, db, openai, ctx) => {
  try {
    // Проверяем, что текст передан
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    console.log('Processing debt with text:', text);

    // Парсим текст через OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: debtSystemMessage },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(response.choices[0].message.content);
    console.log('Parsed debt data:', data);

    // Добавляем дату и user_id
    data.date = new Date().toISOString().split('T')[0];
    const userId = ctx.chat.id;
    console.log('userId:', userId, 'date:', data.date);

    try {
      // Получаем курс валюты
      const rate = await getExchangeRate(data.currency, db);
      data.converted_amount = data.amount / rate;
      console.log(
        `Converted amount for ${data.currency}: ${data.converted_amount} RUB (rate: ${rate})`,
      );

      // Сохраняем долг в базу с user_id
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
    } catch (e) {
      console.error('Error getting exchange rate:', e);

      // Сохраняем долг без converted_amount
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
    }
  } catch (e) {
    console.error('Error in processDebt:', e);
    ctx.reply(`Ошибка обработки долга: ${e.message}`);
  }
};

module.exports = processDebt;
