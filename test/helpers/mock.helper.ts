import debug from 'debug';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

const log = debug('pulse:mock-mongodb');

export interface IMockMongo {
  disconnect: () => Promise<void>;
  mongo: MongoClient;
  mongod: MongoMemoryServer;
  uri: string;
}

export async function mockMongoDb(): Promise<IMockMongo> {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  log('mongod started', uri);

  const mongo = await MongoClient.connect(uri);

  const disconnect = async (): Promise<void> => {
    try {
      // Close mongo client first
      if (mongo) {
        await mongo.close();
        log('mongo client closed');
      }
    } catch (error) {
      // Ignore connection pool errors during cleanup
      if (error instanceof Error && !error.message?.includes('MongoPoolClosedError')) {
        log('error closing mongo client:', error.message);
      }
    }

    try {
      // Stop mongod server
      if (mongod) {
        await mongod.stop();
        log('mongod stopped');
      }
    } catch (error) {
      if (error instanceof Error) {
        log('error stopping mongod:', error.message);
      }
    }
  };

  const self: IMockMongo = {
    disconnect,
    mongo,
    mongod,
    uri,
  };

  return self;
}
