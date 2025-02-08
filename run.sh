#!/bin/sh

cd $(dirname $0)

# username1 psssword1 u2 p2 …
export tyys=""
export tyy_family_id=""

echo > run.log
npm run start | tee -a run.log
