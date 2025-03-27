const systemMessage = `Ты — помощник, который преобразует текст о финансовых транзакциях в структурированный JSON. Текст может содержать информацию о доходах, расходах, трансферах или инвестициях. Твоя задача — извлечь тип транзакции, сумму, валюту, категорию и описание. Поддерживаемые валюты: RUB, KZT, USD, EUR, BTC, ETH, SOL и другие. Категории: медицина, спорт, еда, транспорт, прочее, аренда, другое, развлечения, связь, бизнес, зарплата, инвестиции. Если что-то не указано, оставь поле пустым или используй значение по умолчанию.
  
  Формат ответа должен быть чистым JSON без дополнительных символов или обертки (например, без \`\`\`json или других тегов Markdown):
  {
    "type": "income|expense|transfer|investment",
    "amount": число,
    "currency": "RUB|KZT|USD|...",
    "category": "медицина|спорт|еда|...",
    "description": "строка"
  }`;

const debtSystemMessage = `Ты — помощник, который преобразует текст о долгах в структурированный JSON. Текст может содержать информацию о том, кому я должен (owed) или кто мне должен (lent). Твоя задача — извлечь тип долга, имя человека, сумму, валюту и описание. Поддерживаемые валюты: RUB, KZT, USD, EUR, BTC, ETH, SOL и другие.
  
  Формат ответа должен быть чистым JSON без дополнительных символов или обертки (например, без \`\`\`json или других тегов Markdown):
  {
    "type": "owed|lent",
    "name": "строка",
    "amount": число,
    "currency": "RUB|KZT|USD|...",
    "description": "строка"
  }`;

const START_MESSAGE = `
  *Добро пожаловать в WealthBot!*
  
  *Команды:*
  - /start — Показать это сообщение
  - /report <валюта> — Отчет за месяц (пример: /report USD)
  - /debt <описание> — Добавить займ/долг (Пример: /debt owed Васян 5000 RUB)

  Занял - owed, одолжил - lent 
  
  *Ввод дохода/расхода:*
  - Голосом: "Потратил 1200 тенге на такси"
  - Текстом: "зарплата 100к рублей"

Так как ввод обрабатывается через ИИ, можно говорить и сленгом (типа, 100к руб), а ИИ определит категорию, валюту и тд.
  `;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CRYPTO_CURRENCIES = ['BTC', 'ETH', 'SOL', 'XRP', 'DOT', 'STRK'];
const ALLOWED_CURRENCIES = [
  'RUB',
  'KZT',
  'USD',
  'EUR',
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'DOT',
  'STRK',
];

const CURRENCY_MAP = {
  SOL: 'solana',
  ETH: 'ethereum',
  BTC: 'bitcoin',
};

module.exports = {
  START_MESSAGE,
  systemMessage,
  debtSystemMessage,
  OPENAI_API_KEY,
  BOT_TOKEN,
  CRYPTO_CURRENCIES,
  ALLOWED_CURRENCIES,
  CURRENCY_MAP,
};

//   *Поля базы данных:*
//   - transactions: id, date, type (income/expense/transfer/investment), amount, currency, converted_amount (RUB), category, description
//   - debts: id, date, type (owed/lent), name, amount, currency, converted_amount (RUB), description
//   - exchange_rates: currency, date, rate (к RUB)

//   Бот конвертирует суммы в RUB и поддерживает отчеты в других валютах.
