const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../../thirdparty/kyberapi/Proto/kyber_api.proto");
const PROTO_DIR = path.join(__dirname, "../../thirdparty/kyberapi");

let packageDefinition;
let kyberApi;

function loadProto() {
  if (!kyberApi) {
    packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [PROTO_DIR]
    });
    kyberApi = grpc.loadPackageDefinition(packageDefinition).kyber_api;
  }
  return kyberApi;
}

/**
 * Gets a gRPC client for the specified service.
 * @param {string} serviceName - The name of the service (e.g., 'Authentication', 'ServerManagement').
 * @param {string} address - The address of the gRPC server.
 * @returns {Object} The gRPC client.
 */
function getClient(serviceName, address = "api-rpc.prod.kyber.gg:443") {
  const api = loadProto();
  if (!api[serviceName]) {
    throw new Error(`Service ${serviceName} not found in proto.`);
  }
  return new api[serviceName](address, grpc.credentials.createSsl());
}

/**
 * Gets the default metadata with User-Agent and x-kyber-version.
 * @returns {grpc.Metadata} The gRPC metadata.
 */
function getDefaultMetadata() {
  const metadata = new grpc.Metadata();
  metadata.add("user-agent", "AdamRaichu/KyberServerManagerBot/InDev");
  metadata.add("x-kyber-version", "not-kyber");
  return metadata;
}

module.exports = {
  getClient,
  getDefaultMetadata,
  grpc // Export for convenience
};
