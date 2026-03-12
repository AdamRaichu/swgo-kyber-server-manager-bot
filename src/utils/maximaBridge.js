const { execFile } = require("child_process");
const path = require("path");

const MAXIMA_CLI_PATH = path.join(__dirname, "../../thirdparty/maxima-win/maxima-cli.exe");

/**
 * Runs maxima-cli.exe account-info and retrieves the Access Token.
 * @returns {Promise<string>} The access token.
 */
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    execFile(MAXIMA_CLI_PATH, ["account-info"], (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }

      // Look for "Access Token: <token>" in the output
      const match = stdout.match(/Access Token:\s*([^\r\n]+)/);
      if (match && match[1]) {
        resolve(match[1].trim());
      } else {
        reject(new Error("Access Token not found in maxima-cli output."));
      }
    });
  });
}

module.exports = {
  getAuthToken
};