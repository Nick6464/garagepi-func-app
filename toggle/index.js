const axios = require('axios');
const passport = require('passport');
const auth = require('../auth'); // Adjust the path as needed
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
    // Initialize Passport
    passport.initialize()(req, context.res, () => {});

    // Check if user is authenticated
    // Replace this check with your bearer strategy middleware
    auth.pAuth(req, context.res, async () => {
      // The request is authenticated
      console.log('User Authenticated:', req.isAuthenticated());

      // You can access the authenticated user and other details from req.user, req.tenant, req.tenantUser

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Handle the case where the token is missing or not in the correct format
        context.res = {
          status: 401,
          body: 'Unauthorized: Token missing or in the wrong format',
        };
        return;
      }

      // Extract the token part from the header
      const token = authHeader.split(' ')[1];

      try {
        // Check the aud claim
        if (
          decodedToken.aud !== AZURE_AD_CLIENT_ID &&
          decodedToken.aud !== AZURE_AD_CLIENT_ID_DEV
        ) {
          context.res = {
            status: 401,
            body: 'Unauthorized: Token has incorrect audience',
          };
          return;
        }

        // Check the tid claim
        if (decodedToken.tid !== AZURE_AD_TENANT_ID) {
          context.res = {
            status: 401,
            body: 'Unauthorized: Token has incorrect tenant',
          };
          return;
        }

        // Check if the token is expired
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (decodedToken.exp && currentTimestamp >= decodedToken.exp) {
          context.res = {
            status: 401,
            body: 'Unauthorized: Token has expired',
          };
          return;
        }

        console.log('Decoded token:', decodedToken);

        // Check if the token contains the required role
        const requiredRole = 'toggle';
        const userRoles = decodedToken.roles || [];

        if (!userRoles.includes(requiredRole)) {
          context.res = {
            status: 403, // Forbidden
            body: 'User does not have the required role',
          };
          return;
        }

        // Make an HTTP request to the Raspberry Pi
        // const response = await axios.get(`${RASPBERRY_PI_ENDPOINT}/toggle`);

        // Return a success response to the client
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
    });
  } catch (error) {
    console.error('Error:', error);

    context.res = {
      status: 500,
      body: 'Error sending toggle request to Raspberry Pi',
    };
  }
};
