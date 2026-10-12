import { MongoMemoryServer } from "mongodb-memory-server";

export async function startIsolatedMongo(databaseName) {
    const server = await MongoMemoryServer.create();
    process.env.MONGODB_URI = server.getUri(databaseName);
    return server;
}
