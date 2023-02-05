import { Injectable } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { getFullUserName, makeRawUserIdLink } from './bot/utils';

@Injectable()
export class AppService {
  onModuleInit() {
    this.botMessage();
  }

  async botMessage() {
    process.env.NTBA_FIX_319 = '1';
    const { BOT_TOKEN } = process.env;
    const bot = new TelegramBot(BOT_TOKEN, { polling: true });

    const callbackQuery = async function onCallbackQuery(callbackQuery) {
      const parseCallBack = JSON.parse(callbackQuery.data);
      const ALL_GOOD_TEXT = `Okay 🙂`;
      const NOT_THIS_USER = 'Ееееее ні, це не тебе питають 🙂';
      const chatId = callbackQuery.message.chat.id;
      const userId = parseCallBack.forUser;
      const fromUnixTime = new Date(parseCallBack.date * 1000);

      if (callbackQuery.from.id.toString() !== parseCallBack.forUser) {
        return bot.answerCallbackQuery(callbackQuery.id, {
          text: NOT_THIS_USER,
        });
      } else {
        if (parseCallBack.a === 'rejectMute') {
          await bot.deleteMessage(
            callbackQuery.message.chat.id,
            callbackQuery.message.message_id,
          );
        }
      }

      if (parseCallBack.a === 'confirmMute') {
        const muted = await bot.restrictChatMember(chatId, userId, {
          can_send_messages: false,
          until_date: parseCallBack.date,
        });
        if (muted) {
          const message = await bot.sendMessage(
            chatId,
            `${makeRawUserIdLink(
              getFullUserName(callbackQuery.from),
              callbackQuery.from.id,
            )}, дякуємо вам за звернення до нас, щоб ми допомогли погасити вашу пожежу, зустрінемось ${fromUnixTime.toLocaleString(
              'uk-UA',
              {
                timeZone: 'Europe/kiev',
              },
            )} :))`,
            { parse_mode: 'Markdown' },
          );
          setTimeout(async () => {
            await bot.deleteMessage(chatId, message.message_id.toString());
          }, 60000);
        }

        await bot.deleteMessage(chatId, callbackQuery.message.message_id);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: ALL_GOOD_TEXT,
        });
      }
    };

    async function mainLogic(msg, arg) {
      const chatId = msg.chat?.id;
      const msgId = msg.message_id.toString();
      const userId = msg.from.id.toString();
      await bot.deleteMessage(chatId, msgId).catch((err) => {
        return err;
      });
      const chatMember = await bot.getChatMember(chatId, userId);
      if (chatMember.status !== 'member') {
        const message = await bot.sendMessage(
          chatId,
          `${makeRawUserIdLink(
            getFullUserName(msg.from),
            msg.from.id,
          )}, ви - Адміністратор, ви маєте страждати 😈`,
          { parse_mode: 'Markdown' },
        );
        setTimeout(async () => {
          await bot.deleteMessage(chatId, message.message_id.toString());
        }, 60000);
        return;
      }

      if (!arg[2] || +arg[2] % 3 > 0 || +arg[2] > 168 || +arg[2] <= 0) {
        const message = await bot.sendMessage(
          chatId,
          `${makeRawUserIdLink(
            getFullUserName(msg.from),
            msg.from.id,
          )}, число має бути кратним 3 та меншим або дорівнювати 168.`,
          { parse_mode: 'Markdown' },
        );
        setTimeout(async () => {
          await bot.deleteMessage(chatId, message.message_id.toString());
        }, 60000);
        return;
      }

      const hour = 3600;
      let date = Math.round(new Date().getTime() / 1000.0);
      date += Number(hour * +arg[2]);

      const confirmKeyboard = await bot.sendMessage(
        chatId,
        `${getFullUserName(
          msg.from,
        )}, ви дійсно підтверджуєте, що хочете посидіти техенько в цьому чатику ${+arg[2]} годин? 🌚`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Я усвідомлюю свій вибір та підтверджую його, потушіть мою пожежу 🫡',
                  callback_data: JSON.stringify({
                    a: 'confirmMute',
                    forUser: userId,
                    date,
                  }),
                },
              ],
              [
                {
                  text: '❌ Ні, заберіть усі мої 💵 але відпустіть, я не хочу в мут 😓',
                  callback_data: JSON.stringify({
                    a: 'rejectMute',
                    forUser: userId,
                  }),
                },
              ],
            ],
          },
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          protect_content: true,
        },
      );
    }

    await bot.onText(/^(\/ro)\s?(\d+)?/i, mainLogic);
    await bot.on('callback_query', callbackQuery);
  }
}
