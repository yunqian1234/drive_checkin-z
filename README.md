### 天翼云盘签到脚本

### 账号和密码、家庭ID、推送

在 Settings - Settings and variables - Actions - Repository secrets 这里新建
- `TYYS`  账号和密码的格式为：账号1 密码1 账号2 密码2
- `TYY_FAMILY_ID`  抓家庭ID请参考Ailst文档https://alist.nn.ci/zh/guide/drivers/189.html#%E5%AE%B6%E5%BA%AD%E8%BD%AC%E7%A7%BB
- `WX_PUSHER_UID`  接收推送 UID
 扫描底下二维码进行关联，然后拿到 UID 后,把 WX_PUSHER_UID 填入你拿到的 UID
  https://wxpusher.zjiecode.com/api/qrcode/4Ix7noqD3L7DMBoSlvig3t4hqjFWzPkdHqAYsg8IzkPreW7d8uGUHi9LJO4EcyJg.jpg

### 执行任务

1. 点击**Action**，再点击**I understand my workflows, go ahead and enable them**
2. 给自己仓库点个 start 或者手动点击运行
   ![](http://tu.yaohuo.me/imgs/2020/06/34ca160c972b9927.png)
3. 北京时间 5 点执行任务


感谢 https://github.com/wes-lin/Cloud189Checkin 

```linux
git clone https://github.com/zhlhlf/drive_checkin --depth=1

cd drive_checkin && npm install

#账号密码空格隔开每个账号也空格隔开 例：username1 psssword1 u2 p2 …
export tyys=""

#私有云签到线程数量 默认10
export private_threadx=""
#每个家庭云签到线程数量 默认8
export family_threadx=""

#推送相关
export TELEGRAM_CHAT_ID=""
export TELEGRAM_BOT_TOKEN=""
export WX_PUSHER_APP_TOKEN=""
export WX_PUSHER_UID=""
npm run start
```

