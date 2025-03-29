const { default: axios } = require('axios');
const {
  CRYPTO_CURRENCIES,
  ALLOWED_CURRENCIES,
  CURRENCY_MAP,
} = require('../consts/consts');

// Получение курса валют
async function getExchangeRate(currency, db) {
  try {
    // Проверяем, что currency передано и является строкой
    if (!currency || typeof currency !== 'string') {
      throw new Error('Currency must be a non-empty string');
    }

    if (!ALLOWED_CURRENCIES.includes(currency.toUpperCase())) {
      throw new Error(
        `Используй только ${ALLOWED_CURRENCIES.join(
          ', ',
        )}, другие валюты не поддерживаются!`,
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const currencyLabel = CURRENCY_MAP[currency];
    console.log(`Fetching exchange rate for ${currency} on ${today}`);

    if (CRYPTO_CURRENCIES.includes(currency)) {
      console.log(`Fetching crypto rate for ${currency} from CoinGecko`);
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${currencyLabel}&vs_currencies=rub`,
      );

      if (
        !response.data ||
        !response.data[currencyLabel] ||
        !response.data[currencyLabel].rub
      ) {
        throw new Error(
          `Invalid response from CoinGecko for ${currency}: ${JSON.stringify(
            response.data,
          )}`,
        );
      }

      const rate = response.data[currencyLabel].rub;
      console.log(`Crypto rate for ${currency}: ${rate} RUB`);
      return rate;
      // return {
      //   rate,
      //   operationType: 'crypto',
      // };
    }

    // Для обычных валют
    return new Promise((resolve, reject) => {
      console.log('Checking exchange rate in database');
      db.get(
        `SELECT rate FROM exchange_rates WHERE currency = ? AND date = ?`,
        [currency, today],
        async (err, row) => {
          if (err) {
            console.error('Database error (SELECT):', err);
            return reject(new Error(`Database error: ${err.message}`));
          }

          try {
            if (row) {
              console.log(
                `Rate found in database for ${currency}: ${row.rate}`,
              );
              return resolve(row.rate);
              // return resolve({
              //   rate: row.rate,
              //   operationType: 'fiat', //bug, needs to update the db
              // });
            }

            // Если курса нет в базе, запрашиваем его
            console.log(`Fetching rate for ${currency} from currency-api`);
            const response = await axios.get(
              `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/rub.json`,
            );

            // Проверяем, что ответ содержит нужные данные
            if (
              !response.data ||
              !response.data.rub ||
              !response.data.rub[currency.toLowerCase()]
            ) {
              throw new Error(
                `Invalid response from currency-api for ${currency}: ${JSON.stringify(
                  response.data,
                )}`,
              );
            }

            const rate = response.data.rub[currency.toLowerCase()];
            console.log(`Fetched rate for ${currency}: ${rate}`);

            // Сохраняем курс в базу
            db.run(
              `INSERT INTO exchange_rates (currency, date, rate) VALUES (?, ?, ?)`,
              [currency, today, rate],
              (err) => {
                if (err) {
                  console.error('Database error (INSERT):', err);
                  return reject(
                    new Error(`Database error on insert: ${err.message}`),
                  );
                }
                console.log(`Rate for ${currency} saved to database: ${rate}`);
                resolve(rate);

                // resolve({
                //   rate,
                //   operationType: 'fiat',
                // });
              },
            );
          } catch (e) {
            console.error('Error fetching rate from currency-api:', e);
            reject(
              new Error(
                `Failed to fetch exchange rate for ${currency}: ${e.message}`,
              ),
            );
          }
        },
      );
    });
  } catch (e) {
    console.error('Error in getExchangeRate:', e);
    throw new Error(
      `Failed to get exchange rate for ${currency}: ${e.message}`,
    );
  }
}

module.exports = getExchangeRate;
