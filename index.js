require('dotenv') .config();
const https = require('https');
const GoogleSpreadsheet = require('google-spreadsheet');

const date = new Date();
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formattedDate = `${months[date.getMonth()]}${date.getDate()}`;

const POST_OPTIONS = {
  hostname: 'hooks.slack.com',
  path: `/services/${process.env.SLACK_KEY}`,
  method: 'POST',
  port: 443,
};

exports.handler = (event, context) => {
  const doc = new GoogleSpreadsheet(process.env.SHEET_KEY);
  doc.useServiceAccountAuth(
    {
      client_email: process.env.CLIENT_EMAIL,
      private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    err => {
      if (err) return console.log(err);
      doc.getRows(
        1,
        {
          limit: 5,
          query: `date = ${formattedDate} & active = TRUE`,
        },
        (error, rows) => {
          if (err) return console.err(error);
          const info =
            rows &&
            rows.map(x => ({
              name: x.name,
              date: x.date,
              cake: x.favouritecake,
              active: x.active && x.active.toUpperCase() === 'TRUE',
            }));
          if (info && info.length > 0) {
            const names = info.map(({ name }) => name).join(' & ');
            const cakes = info.map(({ cake }) => cake).join(' & ');
            const message = JSON.stringify({
              username: 'Captain Picard',
              icon_url: 'https://s3-us-west-2.amazonaws.com/intergalactic-assets/picard-avatar.jpg',
              text: `Happy Birthday ${names}! Their favourite ${
                info.length > 1 ? 'cakes are' : 'cake is'
              } ${cakes} \n https://s3-us-west-2.amazonaws.com/intergalactic-assets/cake-it-so.jpg`,
            });

            const req = https.request(POST_OPTIONS, res => {
              res.setEncoding('utf8');
              res.on('data', data => context.succeed('Message Sent: ' + data));
            });
            req.on('error', e => {
              context.fail(`Failed ${e}`);
            });
            req.write(message);
            req.end();
          }
          return;
        },
      );
    },
  );
};
