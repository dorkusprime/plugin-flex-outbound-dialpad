const nodeFetch = require('node-fetch');

async function getAuthentication(token, context) {

  console.log('Validating request token');

  const tokenValidationApi = `https://${context.ACCOUNT_SID}:${context.AUTH_TOKEN}@iam.twilio.com/v1/Accounts/${context.ACCOUNT_SID}/Tokens/validate`;

  const fetchResponse = await nodeFetch(tokenValidationApi, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token
    })
  });

  const tokenResponse = await fetchResponse.json();
  return tokenResponse;
}

exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST');
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('add-conference-participant parameters:');
  Object.keys(event).forEach(key => {
    if (key !== "token") {
      console.log(`${key}: ${event[key]}`);
    }
  });

  if (Object.keys(event).length === 0) {
    console.log('Empty event object, likely an OPTIONS request');
    return callback(null, response);
  }

  const {
    token,
    taskSid,
    to,
    from
  } = event;

  const tokenResponse = await getAuthentication(token, context);
  if (!tokenResponse.valid) {
    response.setStatusCode(401);
    response.setBody({
      status: 401,
      message: 'Your authentication token failed validation',
      detail: tokenResponse.message
    });
    return callback(null, response);
  }

  console.log(`Adding ${to} to named conference ${taskSid}`);
  const client = context.getTwilioClient();
  const participantsResponse = await client
    .conferences(taskSid)
    .participants
    .create({
      to,
      from,
      earlyMedia: true,
      endConferenceOnExit: false
    });
  console.log('Participant response properties:');
  Object.keys(participantsResponse).forEach(key => {
    console.log(`${key}: ${participantsResponse[key]}`);
  });
  response.setBody({
    ...participantsResponse,
    status: 200,
    _version: undefined
  });

  return callback(null, response);
};
