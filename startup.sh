# The initial version
if [ ! -f .env ]
then
  export $(cat ./.env | xargs)
fi

set -a && source ./.env && set +a

npm run dev