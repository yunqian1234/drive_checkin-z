#!/bin/sh

cd $(dirname $0)


# username1 psssword1 u2 p2 …
export tyys=""

#指定签到的家庭云ID
export tyy_family_id=""

#私有云签到线程数量 默认10
export private_threadx=""
#每个家庭云签到线程数量 默认8
export family_threadx=""

export TELEGRAM_CHAT_ID=""
export TELEGRAM_BOT_TOKEN=""
export WX_PUSHER_APP_TOKEN=""
export WX_PUSHER_UID=""
echo > run.log
npm run start | tee -a run.log
