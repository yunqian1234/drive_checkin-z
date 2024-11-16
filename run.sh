#!/bin/sh

cd $(dirname $0)

# username1 psssword1 u2 p2 …
export tyys=""
npm run start > run.log
cat run.log
