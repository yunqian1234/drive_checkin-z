/**
 * @name aliyundrive_autoSignin.js
 * @author zhlhlf
 * @version 1.0
 * @thanks Anonym-w 、mrabit
 */

const updateAccesssTokenURL = "https://auth.aliyundrive.com/v2/account/token"
const signinURL = "https://member.aliyundrive.com/v1/activity/sign_in_list"
const axios = require('axios')
const log4js = require('log4js');
const logger = log4js.getLogger();
log4js.configure({
    appenders: {
      vcr: {
        type: 'recording',
      },
      out: {
        type: 'console',
      },
    },
    categories: { default: { appenders: ['vcr', 'out'], level: 'info' } },
});

let alirefreshToeknArry = process.env.alirefreshToeknArry;

!(async() => {
    logger.log("开始阿里云盘签到");
    if(!alirefreshToeknArry) {
        logger.log("没有获取到阿里云盘refresh_token信息，请设置环境变量alirefreshToeknArry");
        return;
    }
    alirefreshToeknArry = alirefreshToeknArry.split(' ');
    for (let elem of alirefreshToeknArry) {
        console.log()
        const queryBody = {
            "grant_type": 'refresh_token',
            "refresh_token": elem
        };

        //使用 refresh_token 更新 access_token
        axios(updateAccesssTokenURL, {
            method: "POST",    
            data: queryBody,
		    headers: {'Content-Type': 'application/json'}
        })
        .then((json) => {
            let access_token = json.data.access_token;
            let username = json.data.user_name;
            logger.log("获取access_token成功");
            //签到
            axios(signinURL, {
                method: "POST",
                data: {zhlhlf: true},
                headers: {'Authorization': access_token,'Content-Type': 'application/json'}
            })
            .then((json) => {
                logger.log(username,"签到成功");
            })
            .catch((err) => logger.error("签到失败"));
            
        })
        .catch((err) => logger.error("获取access_token失败，refresh_token错误或者失效"))
    }

})().catch((e) => {
    logger.error(`❗️  运行错误！\n${e}`)
}).finally()

