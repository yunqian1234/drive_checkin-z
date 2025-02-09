/* eslint-disable no-await-in-loop */
require("dotenv").config();
const log4js = require("log4js");
const recording = require("log4js/lib/appenders/recording");
const superagent = require("superagent");
const { CloudClient } = require("cloud189-sdk");

log4js.configure({
  appenders: {
    vcr: { type: "recording" },
    out: { type: "console" },
  },
  categories: { default: { appenders: ["vcr", "out"], level: "info" } },
});

const logger = log4js.getLogger();

const mask = (s, start, end) => s.split("").fill("*", start, end).join("");


const doTask = async (cloudClient, familyID) => {
  const result = [];
  const signPromises1 = [];

  let getSpace = "签到个人云获得";
  for (let i = 0; i < threadx; i++) {
    signPromises1.push((async () => {
      const res1 = await cloudClient.userSign();
      if (!res1.isSign) getSpace+=` ${res1.netdiskBonus}`;
    })());
  }
  result.push(getSpace);
  await Promise.all(signPromises1);

  const signPromises2 = [];
  const { familyInfoResp } = await cloudClient.getFamilyList();
  if (familyInfoResp) {
    const family = familyInfoResp.find((f) => f.familyId == familyID) || familyInfoResp[0];
    result.push(`签到家庭云 ID: ${family.familyId}`);
    let getSpace = "获得";
    for (let i = 0; i < threadx; i++) {
      signPromises2.push((async () => {
        const res = await cloudClient.familyUserSign(family.familyId);
        if (!res.signStatus) getSpace+=` ${res.bonusSpace}`;
      })());
    }
    result.push(getSpace);
    await Promise.all(signPromises2);
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

let threadx = env.threadx; //进程数

const main = async () => {
  accounts = accounts.split(/[\n ]/);

  let firstcloudClient, cloudCapacitySize, familyCapacitySize;

  for (let i = 0; i < accounts.length; i += 2) {
    const [userName, password] = accounts.slice(i, i + 2);
    if (!userName || !password) continue;

    const userNameInfo = mask(userName, 3, 7);
    
    //const tasks = [];
    //tasks.push((async () => {
      try {
        const cloudClient = new CloudClient(userName, password);


        logger.log(`${i / 2 + 1}.账户 ${userNameInfo} 开始执行`);
        await cloudClient.login();
        const { cloudCapacityInfo: cloudCapacityInfo0, familyCapacityInfo: familyCapacityInfo0 } = await cloudClient.getUserSizeInfo();
        const result = await doTask(cloudClient, env.FAMILY_ID);
        if(i == 0){
          firstcloudClient = cloudClient;
          cloudCapacitySize = cloudCapacityInfo0.totalSize;
          familyCapacitySize = familyCapacityInfo0.totalSize;
        }
        const { cloudCapacityInfo, familyCapacityInfo } = await cloudClient.getUserSizeInfo();
        result.forEach((r) => logger.log(r));

        logger.log(
          `个人容量+ ${(cloudCapacityInfo.totalSize - cloudCapacityInfo0.totalSize) / 1024 / 1024}M, 家庭容量+ ${(familyCapacityInfo.totalSize - familyCapacityInfo0.totalSize) / 1024 / 1024}M`
        );
        logger.log(
          `个人总容量：${(cloudCapacityInfo.totalSize /1024 /1024 /1024).toFixed(2)}G,家庭总容量：${(familyCapacityInfo.totalSize /1024 /1024 /1024).toFixed(2)}G`
        );
      } catch (e) {
        logger.error(e);
        if (e.code === "ETIMEDOUT") throw e;
      } finally {
        logger.log(`账户 ${userNameInfo} 执行完毕`);
        logger.log("");
      }
    //})());
  }

  //await Promise.all(tasks);
  const { familyCapacityInfo: familyCapacityInfo0 } = await firstcloudClient.getUserSizeInfo();
        
  if (env.FAMILY_ID) {
    logger.log(`指定家庭云ID ${env.FAMILY_ID} 获得 ${familyCapacityInfo0.totalSize - familyCapacitySize}M`);
  }
};

let family_all = 0.0;

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