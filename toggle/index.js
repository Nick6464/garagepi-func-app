const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
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
      const requiredRole = 'toggle';
      const userRoles = decodedToken.roles || [];

      if (!userRoles.includes(requiredRole)) {
        console.log('User does not have the required role');
        context.res = {
          status: 403, 
          body: 'User does not have the required role',
        };
        return;
      }
      // Make an HTTP request to the Raspberry Pi
      let resp = await axios.get(`https://${RASPBERRY_PI_ENDPOINT}/press`, {
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
async function verifyJwtToken(token) {
  try {
    const jwksUri = `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/discovery/v2.0/keys`;

    const signingKey = await getSigningKey(
      jwksUri,
      jwt.decode(token, { complete: true }).header.kid
    );
    const decoded = jwt.verify(token, signingKey, { algorithms: ['RS256'] });
    console.log('JWT verification succeeded');
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
}

async function getSigningKey(jwksUri, kid) {
  try {
    const client = jwksClient({
      jwksUri,
    });
    const key = await new Promise((resolve, reject) => {
      client.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
        } else {
          resolve(key.getPublicKey());
        }
      });
    });
    return key;
  } catch (error) {
    console.error('Error fetching signing key:', error);
    throw error;
  }
}
