import fastify from 'fastify';
import { getDefaultIssuer } from './issuer';
import { getDemoCredential } from './request';
import { getConfig } from "./config"

const server = fastify({
  logger: true
});

const { sign, verify, verifyPresentation /*TODO*/ } = getDefaultIssuer();

server.setErrorHandler(function (error, request, reply) {
  reply
  .code(500)
  .header('Content-Type', 'application/json; charset=utf-8')
  .send(error);
});
server.register(require('fastify-cors'), {

});

server.get('/ping', async (request, reply) => {
  return `pong\n`
});


server.post(
  '/issue/credentials', async (request, reply) => {
    const credential = request.body;
    //const options = requestBody['options'];
    const options = {
      assertionMethod: 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs'
    };

    const result = await sign(credential, options);
    reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(result);
  }
)

server.post(
  '/verify/credentials', async (request, reply) => {
    const credential = request.body;
    //const options = requestBody['options'];
    const options = {
      assertionMethod: 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs'
    };

    const result = await verify(credential, options);
    reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(result);
  }
)

server.post(
  '/sample', async (request, reply) => {
    const requestInfo = request.body;

    const result = getDemoCredential(requestInfo);
    reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(result);
  }
)

server.post(
  '/checkDid', async (request, reply) => {
    const requestInfo: any = request.body;
    const challenge = requestInfo['challenge'];
    const presentation = requestInfo['presentation'];

    // TODO
    const identifer = 'did:web:digitalcredentials.github.io#96K4BSIWAkhcclKssb8yTWMQSz4QzPWBy-JsAFlwoIs';

    const verificationResult = await verifyPresentation(presentation, identifer, challenge);
    if (verificationResult.verified) {
      reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(presentation['holder']);
    } else {
      reply
      .code(500)
      .send('Could not validate DID');
    }

  }
)


server.listen(getConfig().port, '::', (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
});
