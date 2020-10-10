import jsonld from "jsonld";
import { JsonWebKey, JsonWebSignature2020 } from "@transmute/json-web-signature-2020";
import vc from "vc-js";
import { PublicKey } from "./types";
import { Config, getConfig } from "./config";

export function getController(fullDid: string) {
  return fullDid.split('#')[0];
}

export function createIssuer(config: Config) {
  const preloadedDocs: { [key: string]: any; } = {};
  const unlockedDid = config.unlockedDid
  const unlockedAssertionMethods = new Map<string, PublicKey>([
    [unlockedDid.publicKey[0].id, unlockedDid.publicKey[0]]
  ]);

  const customLoader = (url: string) => {
    const context = preloadedDocs[url];
    if (context) {
      return {
        contextUrl: null, // this is for a context via a link header
        document: context, // this is the actual document that was loaded
        documentUrl: url // this is the actual contxt URL after redirects
      };
    }
    return jsonld.documentLoaders.node()(url);
  };

  function createJwk(assertionMethod: string) {
    const keyInfo: any = unlockedAssertionMethods.get(assertionMethod);
    return new JsonWebKey(keyInfo);
  }

  function createSuite(assertionMethod: string, date = new Date().toISOString()) {
    const signingKey = createJwk(assertionMethod);
    const signatureSuite = new JsonWebSignature2020({
      key: signingKey,
      date: date
    });
    return signatureSuite;
  }

  async function verify(verifiableCredential: any, options: any) {
    const assertionMethod = options.assertionMethod;
    const suite = createSuite(assertionMethod);
    const controller = getController(assertionMethod);

    // preload docs for docLoader
    preloadedDocs[controller] = unlockedDid;
    preloadedDocs[assertionMethod] = unlockedDid;

    // verify
    let valid = await vc.verifyCredential({
      credential: { ...verifiableCredential },
      documentLoader: customLoader,
      expansionMap: false,
      suite
    });
    return valid;
  }

  async function signCredential(credential: any, options: any) {
    const assertionMethod = options.assertionMethod;
    const suite = createSuite(assertionMethod);
    const controller = getController(assertionMethod);
    // update issuer id
    if (credential.hasOwnProperty('issuer') && credential.issuer.hasOwnProperty('id')) {
      credential.issuer.id = controller;
    } else {
      credential.issuer = controller;
    }

    // add issuanceDate if not provided
    if (!credential.issuanceDate) {
      credential.issuanceDate = new Date().toISOString();
    }

    let result = await vc.issue({
      credential: credential,
      documentLoader: customLoader,
      expansionMap: false,
      suite
    });
    return result;
  }

  // https://github.com/digitalbazaar/vc-js/blob/b5985f8e28a4cf60ac8933b47ba1cbd576de7b68/lib/vc.js
  // TODO: assertion method
  async function createAndSignPresentation(credential: any, assertionMethod: any, challenge: string) {
    const suite = createSuite(assertionMethod);
    const controller = getController(assertionMethod);

    const presentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": "VerifiablePresentation",
      "holder": controller,
    }

    let result = await vc.signPresentation({
      presentation: presentation,
      documentLoader: customLoader,
      expansionMap: false,
      suite,
      challenge: challenge
    });
    return result;
  }

  async function verifyPresentation(verifiablePresentation: any, verificationMethod: string, challenge: string) {
    const suite = createSuite(verificationMethod);
    const controller = getController(verificationMethod);
  
    // preload docs for docLoader
    // TODO
    preloadedDocs[controller] = unlockedDid;
    preloadedDocs[verificationMethod] = unlockedDid;
  
    // verify
    let valid = await vc.verify({
      presentation: { ...verifiablePresentation },
      documentLoader: customLoader,
      challenge: challenge,
      expansionMap: false,
      suite
    });
    return valid;
  }

  return {
    createJwk,
    createSuite,
    verify,
    sign: signCredential,
    createAndSignPresentation,
    verifyPresentation
  }
}


export function getDefaultIssuer() {
  return createIssuer(getConfig())
}
