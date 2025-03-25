const createDbTables = (db) => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,  -- Добавляем поле для ID пользователя
        date TEXT,
        type TEXT,
        amount REAL,
        currency TEXT,
        converted_amount REAL,
        category TEXT,
        description TEXT
      )`);

    db.run(`CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,  -- Добавляем поле для ID пользователя
        date TEXT,
        type TEXT,
        name TEXT,
        amount REAL,
        currency TEXT,
        converted_amount REAL,
        description TEXT
      )`);

    db.run(`CREATE TABLE IF NOT EXISTS exchange_rates (
        currency TEXT,
        date TEXT,
        rate REAL,
        PRIMARY KEY (currency, date)
      )`);
  });
};

module.exports = createDbTables;
