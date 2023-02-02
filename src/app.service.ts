import { Injectable } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class AppService {
  onModuleInit() {
    this.botMessage();
  }

  async botMessage() {
    process.env.NTBA_FIX_319 = '1';
    const { BOT_TOKEN } = process.env;
    const bot = new TelegramBot(BOT_TOKEN, { polling: false });
    await bot.onText(/^(\/ro)\s?(\d+)?$/i, async function (msg, arg) {
      const chatId = msg.chat?.id;
      const msgId = msg.message_id.toString();
      const userId = msg.from.id.toString();

      if (+arg[2] % 6 > 0 || +arg[2] > 168) {
        const message = await bot.sendMessage(
          chatId,
          `@${msg.from.username}, число має бути кратним 6 та меншим або дорівнювати 168.`,
        );
        setTimeout(async () => {
          await bot.deleteMessage(chatId, message.message_id.toString());
        }, 60000);
        return;
      }

      await bot.deleteMessage(chatId, msgId).catch((err) => {
        return err;
      });
      const hour = 3600;
      let date = Math.round(new Date().getTime() / 1000.0);
      date += Number(hour * +arg[2]);
      const fromUnixTime = new Date(date * 1000);

      let isNotAdmin = false;
      await bot.getChatMember(chatId, userId).then(function (data) {
        if (data.status === 'member') {
          isNotAdmin = true;
        }
      });
      if (isNotAdmin) {
        const muted = await bot.restrictChatMember(chatId, userId, {
          can_send_messages: false,
          until_date: date,
        });
        if (muted) {
          const message = await bot.sendMessage(
            chatId,
            `@${
              msg.from.username
            }, дякуємо вам, що ви звернулись до нас, щоб ми допомогли потушити вашу пожежу, зустрінемось ${fromUnixTime.toLocaleString(
              'uk-UA',
              {
                timeZone: 'Europe/kiev',
              },
            )} :))`,
          );
          setTimeout(async () => {
            await bot.deleteMessage(chatId, message.message_id.toString());
          }, 60000);
        }
      } else {
        const message = await bot.sendMessage(
          chatId,
          `@${msg.from.username}, ви - Адміністратор, ви маєте страждати 😈`,
        );
        setTimeout(async () => {
          await bot.deleteMessage(chatId, message.message_id.toString());
        }, 60000);
      }
    });
  }
}
