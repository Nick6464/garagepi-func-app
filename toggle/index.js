const axios = require('axios');
const passport = require('passport');
const auth = require('../auth'); // Adjust the path as needed
const jwt = require('jsonwebtoken');
require('dotenv').config();

const {
  AZURE_AD_TENANT_ID,
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_ID_DEV,
  RASPBERRY_PI_ENDPOINT,
} = process.env;

const isDev = process.env.NODE_ENV === 'development';

module.exports = async function (context, req) {
  try {
    const publicKey = await fetchPublicKey();

    const decodedToken = verifyJwtToken(
      req.headers.authorization.split(' ')[1],
      publicKey
    );

    if (!decodedToken) {
      context.res = {
        status: 401,
        body: 'Unauthorized: Token validation failed',
      };
      return;
    }

    try {
      // Check the aud claim
      if (
        decodedToken.aud !== AZURE_AD_CLIENT_ID &&
        decodedToken.aud !== AZURE_AD_CLIENT_ID_DEV
      ) {
        console.log('Invalid audience');
        context.res = {
          status: 401,
          body: 'Unauthorized: Token has incorrect audience',
        };
        return;
      }

      // Check the tid claim
      if (decodedToken.tid !== AZURE_AD_TENANT_ID) {
        console.log('Invalid tenant');
        context.res = {
          status: 401,
          body: 'Unauthorized: Token has incorrect tenant',
        };
        return;
      }

      // Check if the token is expired
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (decodedToken.exp && currentTimestamp >= decodedToken.exp) {
        console.log('Token has expired');
        context.res = {
          status: 401,
          body: 'Unauthorized: Token has expired',
        };
        return;
      }

      // Check if the token contains the required role
      const requiredRole = 'toggle';
      const userRoles = decodedToken.roles || [];

      if (!userRoles.includes(requiredRole)) {
        console.log('User does not have the required role');
        context.res = {
          status: 403, // Forbidden
          body: 'User does not have the required role',
        };
        return;
      }

      // Make an HTTP request to the Raspberry Pi
      // const response = await axios.get(`${RASPBERRY_PI_ENDPOINT}/toggle`);

      // Return a success response to the client
      console.log('Toggle request sent successfully');
      context.res = {
        status: 200,
        body: 'Toggle request sent successfully',
      };
    } catch (error) {
      console.error('Error:', error);

      context.res = {
        status: 401, // Unauthorized
        body: 'Unauthorized: Token validation failed',
      };
    }
  } catch (error) {
    console.error('Error:', error);

    context.res = {
      status: 500,
      body: 'Error sending toggle request to Raspberry Pi',
    };
  }
};

// Function to verify a JWT token
function verifyJwtToken(token, publicKey) {
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    // If the token is valid, 'decoded' will contain the token payload
    console.log('JWT verification succeeded');
    // console.log('JWT verification succeeded:', decoded);
    return decoded;
  } catch (error) {
    // If the token is invalid or has expired, an error will be thrown
    console.error('JWT verification failed:', error.message);
    return null;
  }
}

async function fetchPublicKey() {
  const opt = (
    await axios.get(
      `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`
    )
  ).data;

  // Use the jwks_uri to get the signing keys
  const jwksResponse = await axios.get(opt.jwks_uri);
  const jwks = jwksResponse.data;

  // Extract the X.509 certificate
  const x5c = jwks.keys[0].x5c[0];

  // Parse the X.509 certificate into a usable public key format (PEM)
  const publicKeyPem = `-----BEGIN CERTIFICATE-----\n${x5c}\n-----END CERTIFICATE-----`;

  return publicKeyPem;
}
