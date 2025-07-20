# The initial version
if [ ! -f .env ]
then
  export $(cat ./.env | xargs)
fi

set -a && source ./.env && set +a

node src/index.js