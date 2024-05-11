const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cXRnaW5rbHpianJodXNwcHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ1NDU2MDgsImV4cCI6MjAzMDEyMTYwOH0.sYFd9abYQhP7zOXCCeddULNsn6ViA7XEKwyZGZuDSQM';

const supabase = createClient(
  'https://itqtginklzbjrhusppwt.supabase.co',
  SUPABASE_KEY
);

const verifySession = async (token) => {
  let errorCode = '';
  let result = false;
  console.log('Verifying session...');

  // console.log("Headers: ", req.headers);

  // Get the token from the request
  if (!token) {
    console.log('No token provided');
    errorCode = 'Unauthorized - No token provided';
    return { result, errorCode, user: null };
  }

  // Get the user associated with the token, in turn verifying the token
  const { data, error } = await supabase.auth.getUser(token);

  // console.log("Data: ", data);
  // console.log("Error: ", error);

  // If the token is invalid, return an error
  if (error) {
    errorCode = 'Unauthorized';
    return { result, errorCode, data: null };
  }

  result = true;
  // If the token is valid, continue to the next middleware
  console.log('Session verified');
  errorCode = 'Authorized';
  return { result, errorCode, data };
};

module.exports = {
  verifySession,
};
