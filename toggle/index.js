const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { AZURE_AD_TENANT_ID, RASPBERRY_PI_ENDPOINT } = process.env;

const isDev = process.env.NODE_ENV === 'development';

module.exports = async function (context, req) {
  try {
    const decodedToken = await verifyJwtToken(
      req.headers.authorization.split(' ')[1]
    );

    if (!decodedToken) {
      context.res = {
        status: 401,
        body: 'Unauthorized: Token validation failed',
      };
      return;
    }

    console.log('Decoded token:', decodedToken);

    try {
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
      let resp = await axios.get(`${RASPBERRY_PI_ENDPOINT}/toggle`, {
        headers: {
          Authorization: req.headers.authorization,
        },
      });

      // Return a success response to the client
      console.log('Toggle request sent successfully');
      context.res = {
        status: 200,
        body: resp.data,
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
async function verifyJwtToken(token) {
  let publicKey;
  try {
    publicKey = await fetchPublicKey();
  } catch (error) {
    console.error('Error fetching public key:', error);
  }

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
