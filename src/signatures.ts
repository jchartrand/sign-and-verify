import { JsonWebKey, JsonWebSignature2020 } from "@transmute/json-web-signature-2020";
import { Config, getConfig } from "./config";
import { PublicKey } from "./types";

export class SignatureOptions {
  public verificationMethod?: string;
  public proofPurpose?: string = "assertionMethod";
  public created?: string;
  public domain?: string;
  public challenge?: string;

  public constructor(options: SignatureOptions) {
    Object.assign(this, options);
  }
}

// Added to work around confusing naming schemes. Later, there may be some layer of indirection
// but for now, it's just the verificationMethod for our use cases.
export function getSigningKeyIdentifier(options: SignatureOptions): string {
  return options.verificationMethod!;
};


export function createSigner(config: Config) {

  const unlockedDid = config.unlockedDid
  const unlockedSigningKeys = new Map<string, PublicKey>([
    [unlockedDid.publicKey[0].id, unlockedDid.publicKey[0]]
  ]);

  function createSuite(options: SignatureOptions) {
    const signingKey = new JsonWebKey(unlockedSigningKeys.get(getSigningKeyIdentifier(options)));
    const signatureSuite = new JsonWebSignature2020({
      key: signingKey,
      // TODO: double-check this is how it's being used
      date: options.created ? options.created! : new Date().toISOString()
    });
    return signatureSuite;
  }

  return {
    createSuite
  }

}

export function getDefaultSigner() {
  return createSigner(getConfig());
}

