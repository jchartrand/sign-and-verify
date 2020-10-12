import jsonld from "jsonld";
import vc from "vc-js";
import { PublicKey } from "./types";
import { Config, getConfig } from "./config";
import { SignatureOptions, getDefaultSigner } from './signatures';

const { createSuite } = getDefaultSigner();

export function createIssuer(config: Config) {
  const preloadedDocs: { [key: string]: any; } = {};

  const customLoader = (url: string) => {
    const context = preloadedDocs[url];
    if (context) {
      return {
        contextUrl: null, // this is for a context via a link header
        document: context, // this is the actual document that was loaded
        documentUrl: url // this is the actual context URL after redirects
      };
    }
    return jsonld.documentLoaders.node()(url);
  };

  async function sign(credential: any, options: SignatureOptions) {
    const suite = createSuite(options);

    try {
      let result = await vc.issue({
        credential: credential,
        documentLoader: customLoader,
        expansionMap: false,
        suite
      });
      return result;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  return {
    sign
  }
}


export function getDefaultIssuer() {
  return createIssuer(getConfig())
}
