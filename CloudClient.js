"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const url_1 = __importDefault(require("url"));
const node_jsencrypt_1 = __importDefault(require("node-jsencrypt"));
const crypto_1 = __importDefault(require("crypto"));
const got_1 = __importDefault(require("got"));
const tough_cookie_1 = require("tough-cookie");

const config = {
    clientId: "538135150693412",
    model: "KB2000",
    version: "9.0.6",
};

const headers = {
    "User-Agent": `Mozilla/5.0 (Linux; U; Android 11; ${config.model} Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.136 Mobile Safari/537.36 Ecloud/${config.version} Android/30 clientId/${config.clientId} clientModel/${config.model} clientChannelId/qq proVersion/1.0.6`,
    Referer: "https://m.cloud.189.cn/zhuanti/2016/sign/index.jsp?albumBackupOpened=1",
    "Accept-Encoding": "gzip, deflate",
    Host: "cloud.189.cn",
};

class CloudClient {

    constructor() {
    }

    //设置登录账号密码
    _setLogin(username, password) {
        this.accessToken = ""; // 私有变量
        this.username = username;
        this.password = password;
        this.cookieJar = new tough_cookie_1.CookieJar();
    }

    // 构建登录表单
    _builLoginForm(encrypt, appConf) {
        const jsencrypt = new node_jsencrypt_1.default();
        const keyData = `-----BEGIN PUBLIC KEY-----\n${encrypt.pubKey}\n-----END PUBLIC KEY-----`;
        jsencrypt.setPublicKey(keyData);
        const usernameEncrypt = Buffer.from(jsencrypt.encrypt(this.username), "base64").toString("hex");
        const passwordEncrypt = Buffer.from(jsencrypt.encrypt(this.password), "base64").toString("hex");
        const data = {
            appKey: "cloud",
            version: "2.0",
            accountType: "01",
            mailSuffix: "@189.cn",
            validateCode: "",
            captchaToken: "",
            dynamicCheck: "FALSE",
            clientType: "1",
            cb_SaveName: "0",
            isOauth2: false,
            returnUrl: appConf.returnUrl,
            paramId: appConf.paramId,
            userName: `${encrypt.pre}${usernameEncrypt}`,
            password: `${encrypt.pre}${passwordEncrypt}`,
        };
        return data;
    }

    // 排序参数
    _sortParameter(data) {
        if (!data) {
            return "";
        }
        const e = Object.entries(data).map((t) => t.join("="));
        e.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
        return e.join("&");
    }

    // 获取签名
    _getSignature(data) {
        const parameter = this._sortParameter(data);
        return crypto_1.default.createHash("md5").update(parameter).digest("hex");
    }

    // 获取加密配置
    getEncrypt() {
        return got_1.default.post("https://open.e.189.cn/api/logbox/config/encryptConf.do").json();
    }

    // 获取重定向 URL
    redirectURL() {
        return new Promise((resolve, reject) => {
            got_1.default
                .get("https://cloud.189.cn/api/portal/loginUrl.action?redirectURL=https://cloud.189.cn/web/redirect.html?returnURL=/main.action")
                .then((res) => {
                    const { query } = url_1.default.parse(res.url, true);
                    resolve(query);
                })
                .catch((e) => reject(e));
        });
    }

    // 获取应用配置
    appConf(query) {
        return got_1.default
            .post("https://open.e.189.cn/api/logbox/oauth2/appConf.do", {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:74.0) Gecko/20100101 Firefox/76.0",
                    Referer: "https://open.e.189.cn/",
                    lt: query.lt,
                    REQID: query.reqId,
                },
                form: { version: "2.0", appKey: query.appId },
            })
            .json();
    }

    // 登录
    async login() {
        let code = await new Promise((resolve, reject) => {
            Promise.all([
                this.getEncrypt(),
                this.redirectURL().then((query) => {
                    this.cacheQuery = query;
                    return this.appConf(query);
                }),
            ])
                .then((res) => {
                    const encrypt = res[0].data;
                    const appConf = res[1].data;
                    const data = this._builLoginForm(encrypt, appConf);
                    return got_1.default
                        .post("https://open.e.189.cn/api/logbox/oauth2/loginSubmit.do", {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:74.0) Gecko/20100101 Firefox/76.0",
                                Referer: "https://open.e.189.cn/",
                                REQID: this.cacheQuery.reqId,
                                lt: this.cacheQuery.lt,
                            },
                            form: data,
                        })
                        .json();
                })
                .then((res) => {
                    if (res.result !== 0) {
                        reject(res.msg);
                    } else {
                        return got_1.default
                            .get(res.toUrl, { headers, cookieJar: this.cookieJar })
                            .then((r) =>{

                                resolve(r.statusCode)
                            } );
                    }
                })
                .catch((e) => reject(e));
        });
        const { sessionKey } = await this.getUserBriefInfo();
        const { accessToken } = await this.getAccessTokenBySsKey(sessionKey);
        this.accessToken = accessToken;
    }

    // 获取 API 数据
    fetchAPI = (task) => {
        const q = url_1.default.parse(task, true);
        config.log(this.cookieJar)
        return got_1.default
            .get(task, {
            headers: Object.assign(Object.assign({}, headers), { Host: q.host }),
            cookieJar: this.cookieJar,
        })
            .json();
    };

    // 获取 Cookie 映射
    getCookieMap() {
        let cookies = this.cookieJar.toJSON()["cookies"];
        let cookie;
        for (let i = 0; i < cookies.length; i++) {
            if (cookies[i].key === 'COOKIE_LOGIN_USER') {
                cookie = cookies[i].value;
                break;
            }
        }
        const a = {
            account: this.username,
            password: this.password,
            accesstoken: this.accessToken,
            cookie: `COOKIE_LOGIN_USER=${cookie}`,
            cookieJar: this.cookieJar
        };
        return a;
    }

    // 设置 Cookie 映射
    setCookieMap(a) {
        this.accessToken = a.accesstoken
        this.username = a.account
        this.password = a.password
        this.cookieJar = a.cookieJar
    }

    // 获取用户大小信息
    getUserSizeInfo() {
        return got_1.default
            .get("https://cloud.189.cn/api/portal/getUserSizeInfo.action", {
                headers: {
                    Accept: "application/json;charset=UTF-8",
                },
                cookieJar: this.cookieJar,
            })
            .json();
    }

    // 用户签到
    userSign() {
        return this.fetchAPI(`https://cloud.189.cn/mkt/userSign.action?rand=${new Date().getTime()}&clientType=TELEANDROID&version=${config.version}&model=${config.model}`);
    }

    // 任务签到
    taskSign() {
        return this.fetchAPI("https://m.cloud.189.cn/v2/drawPrizeMarketDetails.action?taskId=TASK_SIGNIN&activityId=ACT_SIGNIN");
    }

    // 任务照片
    taskPhoto() {
        return this.fetchAPI("https://m.cloud.189.cn/v2/drawPrizeMarketDetails.action?taskId=TASK_SIGNIN_PHOTOS&activityId=ACT_SIGNIN");
    }

    // 任务 KJ
    taskKJ() {
        return this.fetchAPI("https://m.cloud.189.cn/v2/drawPrizeMarketDetails.action?taskId=TASK_2022_FLDFS_KJ&activityId=ACT_SIGNIN");
    }

    // 获取用户简要信息
    getUserBriefInfo() {
        return got_1.default
            .get("https://cloud.189.cn/api/portal/v2/getUserBriefInfo.action", {
                cookieJar: this.cookieJar,
            })
            .json();
    }

    // 通过 SessionKey 获取 AccessToken
    getAccessTokenBySsKey(sessionKey) {
        const appkey = "600100422";
        const time = String(Date.now());
        const signature = this._getSignature({
            sessionKey,
            Timestamp: time,
            AppKey: appkey,
        });
        return got_1.default
            .get(`https://cloud.189.cn/api/open/oauth2/getAccessTokenBySsKey.action?sessionKey=${sessionKey}`, {
                headers: {
                    "Sign-Type": "1",
                    Signature: signature,
                    Timestamp: time,
                    Appkey: appkey,
                },
                cookieJar: this.cookieJar,
            })
            .json();
    }

    // 获取家庭 API 数据
    async fetchFamilyAPI(path) {
        const { query } = url_1.default.parse(path, true);
        const time = String(Date.now());
        const signature = this._getSignature(Object.assign(Object.assign({}, query), { Timestamp: time, AccessToken: this.accessToken }));
        return got_1.default
            .get(path, {
                headers: {
                    "Sign-Type": "1",
                    Signature: signature,
                    Timestamp: time,
                    Accesstoken: this.accessToken,
                    Accept: "application/json;charset=UTF-8",
                },
                cookieJar: this.cookieJar,
            })
            .json();
    }

    // 获取家庭列表
    getFamilyList() {
        return this.fetchFamilyAPI("https://api.cloud.189.cn/open/family/manage/getFamilyList.action");
    }

    // 家庭用户签到
    familyUserSign(familyId) {
        const gturl = `https://api.cloud.189.cn/open/family/manage/exeFamilyUserSign.action?familyId=${familyId}`;
        return this.fetchFamilyAPI(gturl);
    }
}

module.exports = CloudClient;