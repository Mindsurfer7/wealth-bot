const fs = require('fs');
const path = require('path');
const { systemMessage } = require('../consts/consts');
const addTransaction = require('./addTransaction');
// Определяем __dirname в ES-модуле

const processVoice = async (ctx, db, openai, pendingTransactions) => {
  let filePath;
  try {
    // Получаем file_id голосового сообщения
    const fileId = ctx.message.voice.file_id;

    // Получаем информацию о файле из Telegram API
    const file = await ctx.telegram.getFile(fileId);

    // Формируем URL для скачивания файла
    const fileUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;

    // Формируем путь для сохранения файла локально
    const downloadsDir = path.resolve(__dirname, '../downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    filePath = path.join(downloadsDir, `${fileId}.oga`);
    // Скачиваем файл
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Ошибка скачивания файла: ${response.statusText}`);
    }

    // Читаем данные в буфер и записываем в файл
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log('Файл успешно скачан:', filePath);

    // Проверяем, что файл скачан
    if (!fs.existsSync(filePath)) {
      throw new Error('Файл не был загружен корректно');
    }

    // Отправляем файл в OpenAI для расшифровки
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'ru',
    });

    const text = transcription.text;
    console.log('Транскрипция текста:', text);

    const responseAI = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(responseAI.choices[0].message.content);
    await addTransaction(ctx, data, db, pendingTransactions);

    fs.unlinkSync(filePath);
    console.log('Файл удалён:', filePath);
  } catch (error) {
    console.error('Ошибка обработки голоса:', error.message);
    ctx.reply(`Ошибка обработки голоса: ${error.message}`);
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('Файл удалён:', filePath);
      } catch (unlinkError) {
        console.error('Ошибка удаления файла:', unlinkError.message);
      }
    }
  }
};

module.exports = processVoice;
