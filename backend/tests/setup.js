import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod;

// Start in-memory MongoDB before all tests
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

// Clean up all collections between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Tear down after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
