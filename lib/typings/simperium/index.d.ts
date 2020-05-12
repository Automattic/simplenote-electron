declare module simperium {
  export interface Client<BucketName> {
    bucket(name: BucketName): Bucket;
    on(type: 'message', callback: (message: string) => void);
    on(type: 'ready', callback: () => void);
    on(type: 'send', callback: never);
    on(type: 'connect', callback: () => void);
    on(type: 'disconnect', callback: () => void);
    on(type: 'unauthorized', callback: () => void);
  }

  export interface Bucket {
    on(type: string, callback: Function);
  }

  function initClient<BucketName>(args: {
    appID: string;
    token: string;
    bucketConfig?: object;
  }): Client<BucketName>;

  export function Auth(
    appId: string,
    apiKey: string
  ): {
    authorize(
      username: string,
      password: string
    ): Promise<{ access_token?: string }>;

    create(
      username: string,
      password: string
    ): Promise<{ access_token?: string }>;
  };

  export = initClient;
}
