const passport = require('passport');
const passportAzureAd = require('passport-azure-ad');

const dotenv = require('dotenv');
dotenv.config();

const env = process.env;

const {
  AZURE_AD_TENANT_ID,
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_ID_DEV,
  RASPBERRY_PI_ENDPOINT,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_CLIENT_SECRET_DEV, // Add your Azure AD client secret here
} = process.env;

const isDev = process.env.NODE_ENV === 'development';

const options = {
  identityMetadata:
    'https://login.microsoftonline.com/common/.well-known/openid-configuration',
  clientID: isDev ? AZURE_AD_CLIENT_ID_DEV : AZURE_AD_CLIENT_ID,
  clientSecret: isDev ? AZURE_AD_CLIENT_SECRET_DEV : AZURE_AD_CLIENT_SECRET, // Add your client secret here
  responseType: 'code id_token',
  responseMode: 'form_post',
  allowHttpForRedirectUrl: isDev, // Set to true for development purposes
  redirectUrl: isDev
    ? 'http://localhost:7071/api/toggle'
    : 'https://garagepi-func.azurewebsites.net/api/toggle',
  scope: ['profile', 'offline_access', 'https://graph.microsoft.com/mail.read'],
  validateIssuer: !isDev, // Set to true for production
};

const bearerStrategy = new passportAzureAd.BearerStrategy(
  options,
  (req, token, done) => {
    /**
     * Access tokens that have no 'scp' (for delegated permissions).
     */
    if (!token.hasOwnProperty('scp')) {
      console.log('no delegated permissions found');
      return done(
        new Error('Unauthorized'),
        null,
        'No delegated permissions found'
      );
    }
    done(null, {}, token);
  }
);

exports.bearerStrategy = bearerStrategy;

const pAuth = (req, res, next) => {
  passport.authenticate(
    'oauth-bearer',
    {
      session: false,
    },
    async (err, user, info) => {
      if (err) return res.status(401).json({ error: err.message });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (info) {
        // access token payload will be available in req.authInfo downstream
        req.authInfo = info;

        //grab the user and tenantUsers if available

        // console.log('getting auth user + details to add to request');
        let aa = await getAuthUser(req);

        // console.log('result from getAuthUser', aa);

        req.user = aa.user;
        req.tenant = aa.tenant;
        req.tenantUser = aa.tenantUser;

        return next();
      }
    }
  )(req, res, next);
};

exports.pAuth = pAuth;

const tenantIDRequired = (req, res, next) => {
  // console.log('tenantIDRequired:', req.originalUrl);

  // console.log('req.tenant', req.tenant);
  // console.log('req.tenantUser', req.tenantUser);
  // console.log('req.user', req.user);

  if (!req.user) {
    console.log('No user added in MW - return 401');
    return res.status(401).send('Unauthorized');
  }

  if (!req.tenantUser) {
    console.log('No tenantUser added in MW - return 401');
    return res.status(401).send('Unauthorized');
  }

  if (!req.tenant) {
    console.log('No tenant added in MW - return 401');
    return res.status(401).send('Unauthorized');
  }

  next();
};

exports.tenantIDRequired = tenantIDRequired;
