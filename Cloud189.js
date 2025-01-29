/* eslint-disable no-await-in-loop */
require("dotenv").config();
const log4js = require("log4js");
const recording = require("log4js/lib/appenders/recording");
log4js.configure({
  appenders: {
    vcr: {
      type: "recording",
    },
    out: {
      type: "console",
    },
  },
  categories: { default: { appenders: ["vcr", "out"], level: "info" } },
});

const logger = log4js.getLogger();
// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
const superagent = require("superagent");
const { CloudClient } = require("cloud189-sdk");
// const serverChan = require("./push/serverChan");
// const telegramBot = require("./push/telegramBot");
// const wecomBot = require("./push/wecomBot");
// const wxpush = require("./push/wxPusher");


const mask = (s, start, end) => s.split("").fill("*", start, end).join("");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 任务 
const doTask = async (cloudClient) => {
  const result = [];
  // 普通签到
  const res1 = await cloudClient.userSign();
  result.push(
    `${res1.isSign ? "已经签到过了，" : ""}签到获得${res1.netdiskBonus}M空间`
  );
  
  // 家庭云签到
  const { familyInfoResp } = await cloudClient.getFamilyList();
  if (familyInfoResp) {
    for (let index = 0; index < familyInfoResp.length; index += 1) {
      const { familyId } = familyInfoResp[index];
      const res = await cloudClient.familyUserSign(familyId);
      result.push(
        "家庭任务" +
          `${res.signStatus ? "已经签到过了，" : ""}签到获得${
            res.bonusSpace
          }M空间`
      );
    }
  }

  return result;
};


const pushTelegramBot = (title, desp) => {
  if (!(telegramBotToken && telegramBotId)) {
    return;
  }
  const data = {
    chat_id: telegramBotId,
    text: `${title}\n\n${desp}`,
  };
  superagent
    .post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`)
    .send(data)
    .timeout(3000)
    .end((err, res) => {
      if (err) {
        logger.error(`TelegramBot推送失败:${JSON.stringify(err)}`);
        return;
      }
      const json = JSON.parse(res.text);
      if (!json.ok) {
        logger.error(`TelegramBot推送失败:${JSON.stringify(json)}`);
      } else {
        logger.info("TelegramBot推送成功");
      }
    });
};

const pushWxPusher = (title, desp) => {
  if (!(WX_PUSHER_APP_TOKEN && WX_PUSHER_UID)) {
    return;
  }
  const data = {
    appToken: WX_PUSHER_APP_TOKEN,
    contentType: 1,
    summary: title,
    content: desp,
    uids: [WX_PUSHER_UID],
  };
  superagent
    .post("https://wxpusher.zjiecode.com/api/send/message")
    .send(data)
    .timeout(3000)
    .end((err, res) => {
      if (err) {
        logger.error(`wxPusher推送失败:${JSON.stringify(err)}`);
        return;
      }
      const json = JSON.parse(res.text);
      if (json.data[0].code !== 1000) {
        logger.error(`wxPusher推送失败:${JSON.stringify(json)}`);
      } else {
        logger.info("wxPusher推送成功");
      }
    });
};

const push = (title, desp) => {
  pushWxPusher(title, desp)
  pushTelegramBot(title,desp)
}

const env = require("./env");
let accounts = env.tyys

let WX_PUSHER_UID = env.WX_PUSHER_UID
let WX_PUSHER_APP_TOKEN = env.WX_PUSHER_APP_TOKEN

let telegramBotToken = env.TELEGRAM_BOT_TOKEN
let telegramBotId = env.TELEGRAM_CHAT_ID

// 开始执行程序
async function main() {
  accounts = accounts.split(/[\n ]/);
  for (let index = 0; index < accounts.length; index += 2) {
    userName = accounts[index];
    password = accounts[index+1];
    
    if (userName && password) {
      const userNameInfo = mask(userName, 3, 7);
      try {
        logger.log(`账户 ${userNameInfo}开始执行`);
        const cloudClient = new CloudClient(userName, password);
        await cloudClient.login();
        const result = await doTask(cloudClient);
        result.forEach((r) => logger.log(r));
        logger.log("任务执行完毕");
        const { cloudCapacityInfo, familyCapacityInfo } = await cloudClient.getUserSizeInfo();
        logger.log(
          `个人总容量：${(
            cloudCapacityInfo.totalSize /
            1024 /
            1024 /
            1024
          ).toFixed(2)}G,家庭总容量：${(
            familyCapacityInfo.totalSize /
            1024 /
            1024 /
            1024
          ).toFixed(2)}G`
        );
      } catch (e) {
        logger.error(e);
        if (e.code === "ETIMEDOUT") {
          throw e;
        }
      } finally {
        logger.log(`账户 ${userNameInfo}执行完毕`);
      }
    }
  }
}

(async () => {
  try {
    await main();
  } finally {
    const events = recording.replay();
    const content = events.map((e) => `${e.data.join("")}`).join("  \n");
    push("天翼云盘自动签到任务", content);
    recording.erase();
  }
})();
